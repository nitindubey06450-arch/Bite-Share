// server/sockets/tracking.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Order = require('../models/Order');
const { calculateDistanceKm, calculateEtaMinutes, generateFallbackRoute } = require('../utils/geo');
const { logger } = require('../utils/logger');

const initializeTrackingSockets = (io) => {
  // Socket.io Handshake JWT Authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || 'biteshare_jwt_secret_key_2026_super_safe');

      const user = await User.findById(decoded.id).select('-passwordHash');
      if (!user || user.isBlocked) {
        return next(new Error('Authentication error: Invalid or blocked user'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket Connected: User ${socket.user.name} (${socket.user.role}) [ID: ${socket.id}]`);

    // Admins automatically join admin alerts room
    if (socket.user.role === 'admin') {
      socket.join('admin:alerts');
      socket.join('admin:riders');
    }

    /**
     * Join Order Room
     * Event: "order:join" { orderId }
     */
    socket.on('order:join', async ({ orderId }) => {
      try {
        const order = await Order.findById(orderId);
        if (!order) {
          return socket.emit('error', { message: 'Order not found' });
        }

        // Only customer, rider, provider or admin can join the room
        const isParticipant =
          socket.user.role === 'admin' ||
          order.customer.toString() === socket.user._id.toString() ||
          order.provider.toString() === socket.user._id.toString() ||
          (order.rider && order.rider.toString() === socket.user._id.toString());

        if (!isParticipant) {
          return socket.emit('error', { message: 'Access denied to this order tracking channel' });
        }

        const roomName = `order:${orderId}`;
        socket.join(roomName);
        logger.info(`User ${socket.user.name} joined room ${roomName}`);

        // Calculate initial distance & ETA if rider location is known
        const riderCoords = order.riderLocation?.coordinates?.length === 2 && order.riderLocation.coordinates[0] !== 0
          ? order.riderLocation.coordinates
          : order.pickup.location.coordinates;

        const distanceKm = calculateDistanceKm(riderCoords, order.drop.location.coordinates);
        const etaMinutes = calculateEtaMinutes(distanceKm);
        const route = generateFallbackRoute(riderCoords, order.drop.location.coordinates);

        socket.emit('order:init', {
          orderId: order._id,
          status: order.status,
          pickup: order.pickup,
          drop: order.drop,
          riderLocation: order.riderLocation,
          distanceKm,
          etaMinutes,
          route,
          statusHistory: order.statusHistory
        });
      } catch (err) {
        logger.error(`Error joining order room: ${err.message}`);
      }
    });

    /**
     * Rider Location Broadcast
     * Event: "rider:location" { orderId, lat, lng }
     */
    socket.on('rider:location', async ({ orderId, lat, lng }) => {
      try {
        if (socket.user.role !== 'rider') {
          return socket.emit('error', { message: 'Only delivery riders can broadcast location' });
        }

        const order = await Order.findById(orderId);
        if (!order) return;

        // Verify the rider owns this order
        if (!order.rider || order.rider.toString() !== socket.user._id.toString()) {
          return socket.emit('error', { message: 'You are not assigned to this order' });
        }

        const latitude = Number(lat);
        const longitude = Number(lng);

        // Update in database
        order.riderLocation = {
          type: 'Point',
          coordinates: [longitude, latitude],
          updatedAt: new Date()
        };
        await order.save();

        // Calculate live ETA to drop point
        const targetCoords = order.status === 'on_the_way' ? order.drop.location.coordinates : order.pickup.location.coordinates;
        const distanceKm = calculateDistanceKm([longitude, latitude], targetCoords);
        const etaMinutes = calculateEtaMinutes(distanceKm);

        // Broadcast to customer and provider in the room
        io.to(`order:${orderId}`).emit('order:location', {
          orderId,
          lat: latitude,
          lng: longitude,
          distanceKm,
          etaMinutes,
          updatedAt: new Date()
        });

        // Also broadcast to admin live fleet monitor
        io.to('admin:riders').emit('admin:rider_update', {
          riderId: socket.user._id,
          riderName: socket.user.name,
          orderId,
          lat: latitude,
          lng: longitude
        });
      } catch (err) {
        logger.error(`Error broadcasting rider location: ${err.message}`);
      }
    });

    /**
     * Rider SOS Button Alert
     * Event: "rider:sos" { orderId, lat, lng, reason }
     */
    socket.on('rider:sos', async ({ orderId, lat, lng, reason }) => {
      try {
        const order = orderId ? await Order.findById(orderId) : null;
        const emergencyContact = socket.user.emergencyContact || { name: 'Emergency Services', phone: '112' };

        const sosPayload = {
          riderId: socket.user._id,
          riderName: socket.user.name,
          riderPhone: socket.user.phone,
          emergencyContact,
          orderId: order ? order._id : 'N/A',
          coordinates: [Number(lng) || 77.391, Number(lat) || 28.5355],
          reason: reason || 'EMERGENCY DISTRESS SIGNAL TRIGGERED',
          timestamp: new Date()
        };

        logger.error(`🚨 [RIDER SOS EMERGENCY ALERT]:`, sosPayload);

        // Alert all connected admins immediately
        io.to('admin:alerts').emit('admin:sos_alert', sosPayload);

        socket.emit('rider:sos_ack', {
          success: true,
          message: 'SOS signal transmitted to Admin and Emergency Contacts!',
          messageHi: 'एसओएस सिग्नल व्यवस्थापक और आपातकालीन संपर्कों को प्रेषित किया गया!'
        });
      } catch (err) {
        logger.error(`Error processing SOS alert: ${err.message}`);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket Disconnected: User ${socket.user.name} [ID: ${socket.id}]`);
    });
  });
};

module.exports = { initializeTrackingSockets };
