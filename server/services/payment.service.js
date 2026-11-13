// server/services/payment.service.js
const crypto = require('crypto');
const { logger } = require('../utils/logger');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

/**
 * Create a Razorpay Order (test mode / live)
 */
const createRazorpayOrder = async (amountRupees, receiptId) => {
  const amountPaise = Math.round(amountRupees * 100);

  // If Razorpay keys provided in .env, call Razorpay REST API
  if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    try {
      const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: receiptId.toString()
        })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      logger.error(`Razorpay API Error: ${err.message}`);
    }
  }

  // Test mode fallback
  const mockOrderId = `order_test_${crypto.randomBytes(8).toString('hex')}`;
  logger.info(`[RAZORPAY TEST ORDER CREATED]: ${mockOrderId} for INR ${amountRupees}`);
  return {
    id: mockOrderId,
    entity: 'order',
    amount: amountPaise,
    currency: 'INR',
    receipt: receiptId.toString(),
    status: 'created'
  };
};

/**
 * Verify Razorpay payment signature from client checkout
 */
const verifyRazorpaySignature = (orderId, paymentId, clientSignature) => {
  if (!clientSignature) return false;

  // In test mode without secret, accept test payments
  if (!RAZORPAY_KEY_SECRET) {
    return true;
  }

  const generatedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return generatedSignature === clientSignature;
};

/**
 * Verify Razorpay webhook signature
 */
const verifyWebhookSignature = (rawBody, webhookSignature) => {
  if (!RAZORPAY_WEBHOOK_SECRET) return true;

  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  return expectedSignature === webhookSignature;
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpaySignature,
  verifyWebhookSignature
};
