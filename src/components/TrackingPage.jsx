// src/components/TrackingPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api/client';

export default function TrackingPage({ orderId }) {
  const [order, setOrder] = useState(null);
  const [riderCoords, setRiderCoords] = useState(null);
  const [etaMinutes, setEtaMinutes] = useState(15);
  const [distanceKm, setDistanceKm] = useState(3.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!orderId) return;

    // Fetch initial order details
    const fetchOrder = async () => {
      try {
        const res = await api.orders.getById(orderId);
        setOrder(res.order);
        if (res.order.riderLocation?.coordinates?.length === 2 && res.order.riderLocation.coordinates[0] !== 0) {
          setRiderCoords([res.order.riderLocation.coordinates[1], res.order.riderLocation.coordinates[0]]);
        } else {
          setRiderCoords([res.order.pickup.location.coordinates[1], res.order.pickup.location.coordinates[0]]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    // Initialize Socket.io connection for live updates
    const token = api.getToken();
    if (window.io && token) {
      const socket = window.io('http://localhost:5000', {
        auth: { token }
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('order:join', { orderId });
      });

      socket.on('order:init', (data) => {
        if (data.riderLocation?.coordinates?.length === 2) {
          setRiderCoords([data.riderLocation.coordinates[1], data.riderLocation.coordinates[0]]);
        }
        if (data.etaMinutes) setEtaMinutes(data.etaMinutes);
        if (data.distanceKm) setDistanceKm(data.distanceKm);
      });

      socket.on('order:location', (data) => {
        setRiderCoords([data.lat, data.lng]);
        if (data.etaMinutes) setEtaMinutes(data.etaMinutes);
        if (data.distanceKm) setDistanceKm(data.distanceKm);
      });

      socket.on('order:status', (data) => {
        setOrder((prev) => (prev ? { ...prev, status: data.status } : prev));
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [orderId]);

  if (loading) return <div style={{ padding: 20 }}>Loading live delivery tracking...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>;
  if (!order) return <div style={{ padding: 20 }}>Order not found.</div>;

  const currentLat = riderCoords ? riderCoords[0] : order.pickup.location.coordinates[1];
  const currentLng = riderCoords ? riderCoords[1] : order.pickup.location.coordinates[0];

  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${currentLng - 0.015}%2C${currentLat - 0.015}%2C${currentLng + 0.015}%2C${currentLat + 0.015}&layer=mapnik&marker=${currentLat}%2C${currentLng}`;

  const stages = [
    { key: 'placed', label: 'Order Placed', icon: '📝' },
    { key: 'accepted', label: 'Rider Assigned', icon: '🛵' },
    { key: 'picked_up', label: 'Food Picked Up', icon: '🍲' },
    { key: 'on_the_way', label: 'On The Way', icon: '🚀' },
    { key: 'delivered', label: 'Delivered', icon: '✅' }
  ];

  const currentStageIndex = stages.findIndex((s) => s.key === order.status);

  return (
    <div className="biteshare-tracking-page" style={{ maxWidth: 800, margin: '20px auto', padding: 20, background: '#fff', borderRadius: 12, border: '1px solid #ebdccb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: 12 }}>
        <div>
          <span style={{ background: '#2d6a4f', color: '#fff', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
            ● LIVE TRACKING
          </span>
          <h2 style={{ margin: '6px 0 0 0', color: '#2b2b2b' }}>Order #{order._id.slice(-6)}</h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f25c05' }}>{etaMinutes} Mins</div>
          <div style={{ fontSize: 12, color: '#666' }}>Est. Delivery Time (25 km/h)</div>
        </div>
      </div>

      {/* Live Map with Rider Marker */}
      <div style={{ margin: '16px 0', height: 320, borderRadius: 8, overflow: 'hidden', border: '1px solid #ddd' }}>
        <iframe
          title="Live Tracking Map"
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          src={mapEmbedUrl}
        />
      </div>

      {/* Status Timeline */}
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '24px 0', position: 'relative' }}>
        {stages.map((stage, idx) => {
          const isPassed = idx <= currentStageIndex;
          const isCurrent = idx === currentStageIndex;
          return (
            <div key={stage.key} style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  margin: '0 auto 6px auto',
                  borderRadius: '50%',
                  background: isCurrent ? '#f25c05' : isPassed ? '#2d6a4f' : '#e0e0e0',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16
                }}
              >
                {stage.icon}
              </div>
              <div style={{ fontSize: 12, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#f25c05' : '#444' }}>
                {stage.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Handoff Codes Display (Customer & Provider view) */}
      <div style={{ background: '#fdfbf7', border: '1px solid #ebdccb', borderRadius: 8, padding: 14, marginTop: 16 }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#2d6a4f' }}>🔐 Secure 4-Digit Handoff Codes</h4>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {order.demoPickupCode && (
            <div style={{ flex: 1, minWidth: 200, padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #eee' }}>
              <span style={{ fontSize: 12, color: '#666' }}>Community Pickup Code:</span>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#2d6a4f' }}>{order.demoPickupCode}</div>
              <small style={{ color: '#888' }}>Share with rider when giving food</small>
            </div>
          )}
          {order.demoDeliveryCode && (
            <div style={{ flex: 1, minWidth: 200, padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #eee' }}>
              <span style={{ fontSize: 12, color: '#666' }}>Customer Delivery Code:</span>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f25c05' }}>{order.demoDeliveryCode}</div>
              <small style={{ color: '#888' }}>Share with rider upon receiving food</small>
            </div>
          )}
        </div>
      </div>

      {/* Route Addresses */}
      <div style={{ marginTop: 16, fontSize: 13, color: '#444' }}>
        <div>📍 <strong>Pickup:</strong> {order.pickup.address}</div>
        <div style={{ marginTop: 4 }}>🏠 <strong>Drop:</strong> {order.drop.address}</div>
        {order.rider && (
          <div style={{ marginTop: 4 }}>🛵 <strong>Rider:</strong> {order.rider.name} ({order.rider.phone})</div>
        )}
      </div>
    </div>
  );
}
