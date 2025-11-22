// src/config/constants.js
export const MAP_CONFIG = {
  DEFAULT_CENTER: [21.0285, 105.8542], // Hà Nội
  DEFAULT_ZOOM: 12,
  LOCATION_ZOOM: 14,
};

export const ROUTE_COLORS = {
  DEFAULT: '#FF6B00',      // Cam nổi bật
  HIGHLIGHT: '#00D9FF',    // Xanh cyan sáng
  SECONDARY: '#FFD600',    // Vàng rực
  SUCCESS: '#00E676',      // Xanh lá neon
  PATH_SEGMENTS: [
    '#9C27B0', // Tím - Segment 1
    '#E91E63', // Hồng - Segment 2
    '#FF6F00', // Cam đậm - Segment 3
    '#00BCD4', // Xanh cyan - Segment 4
    '#4CAF50', // Xanh lá - Segment 5
    '#FFC107', // Vàng - Segment 6
    '#673AB7', // Tím đậm - Segment 7
    '#03A9F4', // Xanh dương - Segment 8
  ],
};

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const GPS_CONFIG = {
  ENABLE_HIGH_ACCURACY: true,
  TIMEOUT: 5000,
  MAXIMUM_AGE: 0,
  // Vị trí giả lập (Bến xe Mỹ Đình)
  FALLBACK_LOCATION: [21.0315, 105.7766],
};
