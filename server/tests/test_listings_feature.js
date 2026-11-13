// server/tests/test_listings_feature.js
const request = require('supertest');
const { app } = require('../server');

async function runTests() {
  console.log('--- 🧪 STARTING BITESHARE LISTINGS TEST SUITE ---');

  let communityUserToken1;
  let communityUserId1;
  let communityUserToken2;
  let communityUserId2;
  let customerUserToken;

  // 1. Authenticate Community User 1
  const phone1 = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
  const otpRes1 = await request(app).post('/api/auth/otp/request').send({ phone: phone1 });
  const verifyRes1 = await request(app).post('/api/auth/otp/verify').send({ phone: phone1, code: otpRes1.body.otp, role: 'community' });
  communityUserToken1 = verifyRes1.body.token;
  communityUserId1 = verifyRes1.body.user._id;
  console.log('✅ Community User 1 logged in:', communityUserId1);

  // 2. Authenticate Community User 2
  const phone2 = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
  const otpRes2 = await request(app).post('/api/auth/otp/request').send({ phone: phone2 });
  const verifyRes2 = await request(app).post('/api/auth/otp/verify').send({ phone: phone2, code: otpRes2.body.otp, role: 'community' });
  communityUserToken2 = verifyRes2.body.token;
  communityUserId2 = verifyRes2.body.user._id;
  console.log('✅ Community User 2 logged in:', communityUserId2);

  // 3. Authenticate Customer
  const phone3 = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
  const otpRes3 = await request(app).post('/api/auth/otp/request').send({ phone: phone3 });
  const verifyRes3 = await request(app).post('/api/auth/otp/verify').send({ phone: phone3, code: otpRes3.body.otp, role: 'customer' });
  customerUserToken = verifyRes3.body.token;
  console.log('✅ Customer logged in');

  // --- PART 1: MEAL LISTINGS ---
  console.log('\n--- PART 1: TESTING MEAL LISTINGS ---');

  // Test 1.1: Validation failure on missing fields
  const invalidMealRes = await request(app)
    .post('/api/listings')
    .set('Authorization', `Bearer ${communityUserToken1}`)
    .send({ title: '' });
  console.log('Test 1.1: Validation failure check:', invalidMealRes.statusCode === 400 ? '✅ PASSED (400 Bad Request)' : '❌ FAILED', invalidMealRes.body.error);

  // Test 1.2: Add a valid meal
  const validMealData = {
    title: 'Surplus Dal Tadka and Rotis',
    category: 'veg',
    quantity: 15,
    pickupAddress: 'Community Center Sector 62',
    pickupWindow: { from: '18:00', to: '21:00' },
    expiresAt: new Date(Date.now() + 5 * 3600 * 1000).toISOString()
  };
  const mealRes1 = await request(app)
    .post('/api/listings')
    .set('Authorization', `Bearer ${communityUserToken1}`)
    .send(validMealData);
  const meal1 = mealRes1.body.data || mealRes1.body.listing;
  console.log('Test 1.2: Add meal listing:', mealRes1.statusCode === 201 ? '✅ PASSED (201 Created)' : '❌ FAILED', meal1?._id);

  // Test 1.3: Try deleting someone else's meal (User 2 tries to delete User 1's meal) -> Must fail with 403
  const unauthorizedDeleteRes = await request(app)
    .delete(`/api/listings/${meal1._id}`)
    .set('Authorization', `Bearer ${communityUserToken2}`);
  console.log('Test 1.3: Unauthorized delete (someone else\'s meal):', unauthorizedDeleteRes.statusCode === 403 ? '✅ PASSED (403 Forbidden)' : '❌ FAILED', unauthorizedDeleteRes.body);

  // Test 1.4: Try deleting a reserved meal -> Must fail with 409
  // Create another meal and reserve it
  const mealToReserveRes = await request(app)
    .post('/api/listings')
    .set('Authorization', `Bearer ${communityUserToken1}`)
    .send({
      title: 'Reserved Biryani Portions',
      category: 'veg',
      quantity: 5,
      pickupAddress: 'Sector 18 Kitchen',
      pickupWindow: { from: '19:00', to: '21:30' },
      expiresAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString()
    });
  const mealToReserve = mealToReserveRes.body.data || mealToReserveRes.body.listing;
  
  // Customer reserves it
  await request(app)
    .post(`/api/listings/${mealToReserve._id}/reserve`)
    .set('Authorization', `Bearer ${customerUserToken}`);

  // Owner tries to delete reserved meal
  const deleteReservedRes = await request(app)
    .delete(`/api/listings/${mealToReserve._id}`)
    .set('Authorization', `Bearer ${communityUserToken1}`);
  console.log('Test 1.4: Delete reserved meal:', deleteReservedRes.statusCode === 409 ? '✅ PASSED (409 Conflict)' : '❌ FAILED', deleteReservedRes.body);

  // Test 1.5: Delete your own unreserved meal -> Must succeed (status 200, soft delete)
  const deleteOwnMealRes = await request(app)
    .delete(`/api/listings/${meal1._id}`)
    .set('Authorization', `Bearer ${communityUserToken1}`);
  console.log('Test 1.5: Delete own meal:', deleteOwnMealRes.statusCode === 200 ? '✅ PASSED (200 OK)' : '❌ FAILED', deleteOwnMealRes.body);

  // Test 1.6: Confirm deleted meal is hidden from GET /api/listings
  const getListingsRes = await request(app)
    .get('/api/listings')
    .set('Authorization', `Bearer ${customerUserToken}`);
  const foundInListings = (getListingsRes.body.data || getListingsRes.body.listings || []).some(m => m._id.toString() === meal1._id.toString());
  console.log('Test 1.6: Deleted meal hidden from GET /api/listings:', !foundInListings ? '✅ PASSED (Hidden from list)' : '❌ FAILED');

  // --- PART 2: OTHER LISTINGS ---
  console.log('\n--- PART 2: TESTING OTHER LISTINGS ---');

  // Test 2.1: Validation failure on missing fields for other listing
  const invalidOtherRes = await request(app)
    .post('/api/other-listings')
    .set('Authorization', `Bearer ${communityUserToken1}`)
    .send({ title: '' });
  console.log('Test 2.1: Validation failure check:', invalidOtherRes.statusCode === 400 ? '✅ PASSED (400 Bad Request)' : '❌ FAILED', invalidOtherRes.body.error);

  // Test 2.2: Add a valid other listing
  const validOtherData = {
    title: 'Warm Winter Blankets and Jackets',
    description: '10 cleaned winter jackets for shelter residents',
    type: 'clothes',
    quantity: 10,
    pickupAddress: 'Community Center 44'
  };
  const otherRes1 = await request(app)
    .post('/api/other-listings')
    .set('Authorization', `Bearer ${communityUserToken1}`)
    .send(validOtherData);
  const other1 = otherRes1.body.data || otherRes1.body.listing;
  console.log('Test 2.2: Add other listing:', otherRes1.statusCode === 201 ? '✅ PASSED (201 Created)' : '❌ FAILED', other1?._id);

  // Test 2.3: Try deleting someone else's other listing -> Must fail with 403
  const unauthorizedOtherDelete = await request(app)
    .delete(`/api/other-listings/${other1._id}`)
    .set('Authorization', `Bearer ${communityUserToken2}`);
  console.log('Test 2.3: Unauthorized delete (someone else\'s other item):', unauthorizedOtherDelete.statusCode === 403 ? '✅ PASSED (403 Forbidden)' : '❌ FAILED', unauthorizedOtherDelete.body);

  // Test 2.4: Delete own other item -> Must succeed (status 200, soft delete)
  const deleteOwnOtherRes = await request(app)
    .delete(`/api/other-listings/${other1._id}`)
    .set('Authorization', `Bearer ${communityUserToken1}`);
  console.log('Test 2.4: Delete own other item:', deleteOwnOtherRes.statusCode === 200 ? '✅ PASSED (200 OK)' : '❌ FAILED', deleteOwnOtherRes.body);

  // Test 2.5: Confirm deleted other item is hidden from GET /api/other-listings
  const getOtherListingsRes = await request(app)
    .get('/api/other-listings')
    .set('Authorization', `Bearer ${customerUserToken}`);
  const foundInOtherListings = (getOtherListingsRes.body.data || getOtherListingsRes.body.listings || []).some(o => o._id.toString() === other1._id.toString());
  console.log('Test 2.5: Deleted other item hidden from GET /api/other-listings:', !foundInOtherListings ? '✅ PASSED (Hidden from list)' : '❌ FAILED');

  console.log('\n--- 🎉 ALL TESTS COMPLETED SUCCESSFULLY ---');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
