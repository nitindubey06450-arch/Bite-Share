// server/utils/geo.js

/**
 * Calculate distance in kilometers between two [longitude, latitude] or (lat, lng) pairs
 * using the Haversine formula.
 */
const calculateDistanceKm = (coord1, coord2) => {
  // Support both [lng, lat] arrays and { lat, lng } objects
  const lat1 = Array.isArray(coord1) ? coord1[1] : coord1.lat;
  const lon1 = Array.isArray(coord1) ? coord1[0] : coord1.lng;
  const lat2 = Array.isArray(coord2) ? coord2[1] : coord2.lat;
  const lon2 = Array.isArray(coord2) ? coord2[0] : coord2.lng;

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
};

/**
 * Calculate Estimated Time of Arrival (ETA) in minutes
 * Assumption from requirement: speed = 25 km/h
 */
const calculateEtaMinutes = (distanceKm) => {
  const averageSpeedKmH = 25;
  const timeHours = distanceKm / averageSpeedKmH;
  const timeMinutes = Math.round(timeHours * 60);
  return Math.max(1, timeMinutes); // Minimum 1 minute
};

/**
 * Generate interpolated route points between pickup and drop as a fallback
 * if external OSRM service is unreachable
 */
const generateFallbackRoute = (startCoord, endCoord, steps = 10) => {
  const startLat = Array.isArray(startCoord) ? startCoord[1] : startCoord.lat;
  const startLng = Array.isArray(startCoord) ? startCoord[0] : startCoord.lng;
  const endLat = Array.isArray(endCoord) ? endCoord[1] : endCoord.lat;
  const endLng = Array.isArray(endCoord) ? endCoord[0] : endCoord.lng;

  const points = [];
  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    points.push([
      Number((startLat + (endLat - startLat) * fraction).toFixed(6)),
      Number((startLng + (endLng - startLng) * fraction).toFixed(6))
    ]);
  }
  return points;
};

module.exports = {
  calculateDistanceKm,
  calculateEtaMinutes,
  generateFallbackRoute
};
