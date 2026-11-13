// src/components/MapSection.jsx
import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api/client';

export default function MapSection({ onSelectLocation, mode = 'view' }) {
  const [coords, setCoords] = useState([28.5355, 77.391]); // Default Noida Community Center
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addressLabel, setAddressLabel] = useState('Noida Community Relief Hub');
  const watchIdRef = useRef(null);
  const mapRef = useRef(null);

  // Watch position
  useEffect(() => {
    if (!navigator.geolocation) {
      setPermissionDenied(true);
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords([latitude, longitude]);
        setPermissionDenied(false);

        // Update backend user location if logged in
        if (api.getToken()) {
          api.location.update(latitude, longitude).catch(() => {});
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Use my location manual button
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords([latitude, longitude]);
        setPermissionDenied(false);
        setAddressLabel(`Current GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        setLoading(false);
        if (onSelectLocation) onSelectLocation({ lat: latitude, lng: longitude, address: 'Current GPS Location' });
      },
      () => {
        setPermissionDenied(true);
        setLoading(false);
      }
    );
  };

  // Search Address via OpenStreetMap Nominatim
  const handleAddressSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResult = (item) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    setCoords([lat, lon]);
    setAddressLabel(item.display_name);
    setSearchResults([]);
    setSearchQuery('');
    if (onSelectLocation) onSelectLocation({ lat, lng: lon, address: item.display_name });
  };

  // OpenStreetMap embed URL
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${coords[1] - 0.01}%2C${coords[0] - 0.01}%2C${coords[1] + 0.01}%2C${coords[0] + 0.01}&layer=mapnik&marker=${coords[0]}%2C${coords[1]}`;

  return (
    <div className="biteshare-map-section" style={{ background: '#ffffff', borderRadius: 12, padding: 16, border: '1px solid #ebdccb', margin: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, color: '#2d6a4f', fontSize: 18 }}>📍 BiteShare Live Community & Delivery Map</h3>
          <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: 13 }}>{addressLabel}</p>
        </div>
        <button
          onClick={handleUseMyLocation}
          disabled={loading}
          style={{ background: '#2d6a4f', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
        >
          🎯 Use My Live Location
        </button>
      </div>

      {permissionDenied && (
        <div style={{ background: '#fff3cd', color: '#856404', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 10 }}>
          ⚠️ Location permission is disabled in your browser. Showing default community relief center. You can search your address below.
        </div>
      )}

      {/* Nominatim Address Search */}
      <form onSubmit={handleAddressSearch} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search landmark, shelter, or street (Nominatim OpenStreetMap)..."
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #ebdccb', borderRadius: 6, fontSize: 14 }}
        />
        <button type="submit" style={{ background: '#f25c05', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
          🔍 Search
        </button>
      </form>

      {/* Search Results Dropdown */}
      {searchResults.length > 0 && (
        <div style={{ background: '#fbf8f3', border: '1px solid #ebdccb', borderRadius: 6, marginBottom: 10, maxHeight: 150, overflowY: 'auto' }}>
          {searchResults.map((item, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectResult(item)}
              style={{ padding: '8px 12px', borderBottom: '1px solid #ebdccb', cursor: 'pointer', fontSize: 13 }}
            >
              📍 {item.display_name}
            </div>
          ))}
        </div>
      )}

      {/* Interactive Map Frame */}
      <div style={{ width: '100%', height: 280, borderRadius: 8, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
        <iframe
          title="BiteShare Live Map"
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight="0"
          marginWidth="0"
          src={osmEmbedUrl}
        />
      </div>
    </div>
  );
}
