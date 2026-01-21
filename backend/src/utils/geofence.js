/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} - Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

/**
 * Check if a point is within a geofence
 * @param {Object} point - Point to check { lat, lng }
 * @param {Object} center - Center of geofence { lat, lng }
 * @param {number} radius - Radius in meters
 * @returns {Object} - Result with isWithin boolean and distance
 */
export const isWithinGeofence = (point, center, radius) => {
    const distance = calculateDistance(
        point.lat,
        point.lng,
        center.lat,
        center.lng
    );

    return {
        isWithin: distance <= radius,
        distance: Math.round(distance),
        radius,
        exceededBy: distance > radius ? Math.round(distance - radius) : 0
    };
};

/**
 * Validate GPS coordinates format
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} - Whether coordinates are valid
 */
export const validateCoordinates = (lat, lng) => {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return false;
    }

    if (lat < -90 || lat > 90) {
        return false;
    }

    if (lng < -180 || lng > 180) {
        return false;
    }

    return true;
};

/**
 * Detect potential GPS spoofing based on movement speed
 * @param {Object} previousLocation - Previous location with timestamp
 * @param {Object} currentLocation - Current location with timestamp
 * @param {number} maxSpeedKmh - Maximum realistic speed in km/h (default: 150)
 * @returns {Object} - Spoofing detection result
 */
export const detectGPSSpoofing = (previousLocation, currentLocation, maxSpeedKmh = 150) => {
    if (!previousLocation || !previousLocation.timestamp) {
        return { isSuspicious: false, reason: null };
    }

    const distance = calculateDistance(
        previousLocation.lat,
        previousLocation.lng,
        currentLocation.lat,
        currentLocation.lng
    );

    const timeDiffMs = new Date(currentLocation.timestamp) - new Date(previousLocation.timestamp);
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

    if (timeDiffHours <= 0) {
        return {
            isSuspicious: true,
            reason: 'Invalid timestamp sequence'
        };
    }

    const speedKmh = (distance / 1000) / timeDiffHours;

    if (speedKmh > maxSpeedKmh) {
        return {
            isSuspicious: true,
            reason: `Unrealistic movement speed detected: ${Math.round(speedKmh)} km/h`,
            speed: Math.round(speedKmh),
            distance: Math.round(distance)
        };
    }

    return { isSuspicious: false, reason: null };
};

/**
 * Create a simple geofence polygon from center and radius
 * @param {Object} center - Center point { lat, lng }
 * @param {number} radius - Radius in meters
 * @param {number} points - Number of points to generate (default: 32)
 * @returns {Array} - Array of { lat, lng } points forming the polygon
 */
export const createGeofencePolygon = (center, radius, points = 32) => {
    const polygon = [];
    const radiusInDegrees = radius / 111320; // Approximate meters to degrees

    for (let i = 0; i < points; i++) {
        const angle = (i / points) * 2 * Math.PI;
        const lat = center.lat + radiusInDegrees * Math.cos(angle);
        const lng = center.lng + radiusInDegrees * Math.sin(angle) / Math.cos(center.lat * Math.PI / 180);
        polygon.push({ lat, lng });
    }

    return polygon;
};
