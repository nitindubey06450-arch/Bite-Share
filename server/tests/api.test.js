// server/tests/api.test.js
const request = require('supertest');
const { app, server } = require('../server');
const mongoose = require('mongoose');

describe('🍛 BiteShare Full Platform API Test Suite', () => {
  let customerToken;
  let riderToken;
  let communityToken;
  let testOrderId;
  let demoPickupCode;
  let demoDeliveryCode;

  const testCustomerPhone = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testCommunityPhone = `92${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testRiderPhone = `93${Math.floor(10000000 + Math.random() * 90000000)}`;

  afterAll(async () => {
    server.close();
    await mongoose.disconnect();
  });

  describe('1. Authentication & Multi-Role Flow', () => {
    it('should register a new Customer with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test Customer',
          phone: testCustomerPhone,
          email: `cust_${testCustomerPhone}@test.com`,
          password: 'TestPassword123',
          role: 'customer'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.role).toBe('customer');
      customerToken = res.body.token;
    });

    it('should register a new Community provider', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Feeding Shelter NGO',
          phone: testCommunityPhone,
          email: `ngo_${testCommunityPhone}@test.com`,
          password: 'TestPassword123',
          role: 'community'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.user.role).toBe('community');
      communityToken = res.body.token;
    });

    it('should register a new Delivery Rider', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Rapid Rider',
          phone: testRiderPhone,
          email: `rider_${testRiderPhone}@test.com`,
          password: 'TestPassword123',
          role: 'rider'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.user.role).toBe('rider');
      riderToken = res.body.token;
    });

    it('should login with valid phone and password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          phone: testCustomerPhone,
          password: 'TestPassword123',
          role: 'customer'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
    });

    it('should request and return a 6-digit demo OTP in DEMO_MODE', async () => {
      const res = await request(app)
        .post('/api/auth/otp/request')
        .send({
          phone: testCustomerPhone
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('otp');
      expect(res.body.otp.length).toBe(6);

      // Verify OTP
      const verifyRes = await request(app)
        .post('/api/auth/otp/verify')
        .send({
          phone: testCustomerPhone,
          code: res.body.otp
        });

      expect(verifyRes.statusCode).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body).toHaveProperty('token');
    });
  });

  describe('2. Delivery Order Lifecycle & Handoff OTP Rules', () => {
    it('should allow customer to create an order', async () => {
      // Decode community token to get ID
      const communityProfile = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${communityToken}`);

      const communityId = communityProfile.body.user._id;

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          provider: communityId,
          items: [{ title: 'Surplus Lunch Boxes', portions: 3, dietary: 'veg' }],
          pickup: {
            address: 'Community Center 62',
            location: { coordinates: [77.391, 28.5355] }
          },
          drop: {
            address: 'Sector 50 Flat 101',
            location: { coordinates: [77.385, 28.54] }
          }
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.order.status).toBe('placed');
      testOrderId = res.body.order._id;
    });

    it('should allow rider to accept order and generate 4-digit handoff codes', async () => {
      const res = await request(app)
        .post(`/api/orders/${testOrderId}/accept`)
        .set('Authorization', `Bearer ${riderToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.order.status).toBe('accepted');
      expect(res.body.order).toHaveProperty('demoPickupCode');
      expect(res.body.order).toHaveProperty('demoDeliveryCode');

      demoPickupCode = res.body.order.demoPickupCode;
      demoDeliveryCode = res.body.order.demoDeliveryCode;
    });

    it('should reject invalid status transition directly from accepted to delivered', async () => {
      const res = await request(app)
        .patch(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({ status: 'delivered' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject wrong pickup handoff code and count attempts', async () => {
      const res = await request(app)
        .post(`/api/orders/${testOrderId}/handoff`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          type: 'pickup',
          code: '0000' // wrong code
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Wrong pickup code');
    });

    it('should verify correct pickup handoff code and advance status to on_the_way', async () => {
      const res = await request(app)
        .post(`/api/orders/${testOrderId}/handoff`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          type: 'pickup',
          code: demoPickupCode
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.order.status).toBe('on_the_way');
      expect(res.body.order.pickupHandoffVerified).toBe(true);
    });

    it('should verify delivery handoff code and complete order to delivered', async () => {
      const res = await request(app)
        .post(`/api/orders/${testOrderId}/handoff`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          type: 'delivery',
          code: demoDeliveryCode
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.order.status).toBe('delivered');
      expect(res.body.order.deliveryHandoffVerified).toBe(true);
    });
  });

  describe('3. Ratings and Reviews Rules', () => {
    it('should allow customer to rate rider after delivery', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: testOrderId,
          targetType: 'rider',
          rating: 5,
          comment: 'Outstanding food rescue service!'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.review.rating).toBe(5);
    });

    it('should reject duplicate review for the same order and target', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: testOrderId,
          targetType: 'rider',
          rating: 4,
          comment: 'Trying to review again'
        });

      expect([409, 400]).toContain(res.statusCode);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. AI Search Bar Endpoint', () => {
    it('should return helpful AI response with BiteShare domain fallback', async () => {
      const res = await request(app)
        .post('/api/ai/search')
        .send({ query: 'Surplus food recipe ideas' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('answer');
    });
  });
});
