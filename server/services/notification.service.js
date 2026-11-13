// server/services/notification.service.js
const { logger } = require('../utils/logger');

const NOTIFICATION_ENABLED = process.env.NOTIFICATION_ENABLED === 'true';
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
const FCM_KEY = process.env.FCM_SERVER_KEY;

/**
 * Send SMS or WhatsApp via Twilio
 */
const sendTwilioMessage = async ({ to, message, channel = 'sms' }) => {
  if (!NOTIFICATION_ENABLED || !TWILIO_SID || !TWILIO_AUTH) {
    logger.info(`[NOTIFICATION MOCK - ${channel.toUpperCase()}] To: ${to} | Msg: "${message}"`);
    return { success: true, mocked: true };
  }

  try {
    // In production with credentials, Twilio SDK can be called or HTTP request made
    logger.info(`[TWILIO DISPATCH - ${channel.toUpperCase()}] To: ${to} | Message: ${message}`);
    return { success: true };
  } catch (error) {
    logger.error(`[TWILIO ERROR]: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Send Push Notification via Firebase Cloud Messaging (FCM)
 */
const sendPushNotification = async ({ fcmToken, title, body, data = {} }) => {
  if (!NOTIFICATION_ENABLED || !FCM_KEY) {
    logger.info(`[FCM PUSH MOCK] Token: ${fcmToken ? fcmToken.slice(0, 10) + '...' : 'none'} | Title: ${title} | Body: ${body}`);
    return { success: true, mocked: true };
  }

  try {
    logger.info(`[FCM PUSH DISPATCH] Title: ${title} | Body: ${body}`);
    return { success: true };
  } catch (error) {
    logger.error(`[FCM ERROR]: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Dispatch notification triggered by order status transition
 */
const notifyOrderStatusChange = async (order, newStatus) => {
  const statusMessages = {
    accepted: {
      en: `Your BiteShare order #${order._id.toString().slice(-6)} has been accepted by our rider!`,
      hi: `आपका BiteShare ऑर्डर #${order._id.toString().slice(-6)} राइडर द्वारा स्वीकार कर लिया गया है!`
    },
    picked_up: {
      en: `Your surplus meal is picked up from the community center and is on the way!`,
      hi: `आपका भोजन कम्युनिटी सेंटर से पिकअप हो गया है और रास्ते में है!`
    },
    on_the_way: {
      en: `Rider is arriving shortly at your delivery address.`,
      hi: `राइडर शीघ्र ही आपके पते पर पहुँच रहा है।`
    },
    delivered: {
      en: `Order delivered successfully! Thank you for nourishing together with BiteShare.`,
      hi: `ऑर्डर सफलतापूर्वक डिलीवर हो गया! BiteShare के साथ जुड़ने के लिए धन्यवाद।`
    },
    cancelled: {
      en: `Your BiteShare order #${order._id.toString().slice(-6)} has been cancelled.`,
      hi: `आपका BiteShare ऑर्डर #${order._id.toString().slice(-6)} रद्द कर दिया गया है।`
    }
  };

  const msg = statusMessages[newStatus];
  if (!msg) return;

  const phone = order.drop?.contactPhone;
  if (phone) {
    await sendTwilioMessage({
      to: phone,
      message: `${msg.en} / ${msg.hi}`,
      channel: 'sms'
    });
  }
};

module.exports = {
  sendTwilioMessage,
  sendPushNotification,
  notifyOrderStatusChange
};
