// src/utils/geolocation.js
import { GPS_CONFIG } from '../config/constants';

/**
 * Lấy vị trí hiện tại từ GPS
 * @returns {Promise<[number, number]>} [latitude, longitude]
 */
export const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Trình duyệt không hỗ trợ GPS'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve([latitude, longitude]);
      },
      (error) => {
        console.error('Lỗi GPS:', error);
        reject(error);
      },
      {
        enableHighAccuracy: GPS_CONFIG.ENABLE_HIGH_ACCURACY,
        timeout: GPS_CONFIG.TIMEOUT,
        maximumAge: GPS_CONFIG.MAXIMUM_AGE,
      }
    );
  });
};

/**
 * Tính khoảng cách bình phương giữa 2 điểm
 */
export const calculateDistanceSquared = (lat1, lng1, lat2, lng2) => {
  return Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2);
};

/**
 * Tìm trạm gần nhất với vị trí cho trước
 */
export const findClosestStation = (lat, lng, stations) => {
  let closest = null;
  let minDistanceSq = Infinity;

  stations.forEach(station => {
    const stationLng = station.location.coordinates[0];
    const stationLat = station.location.coordinates[1];
    
    const distanceSq = calculateDistanceSquared(lat, lng, stationLat, stationLng);

    if (distanceSq < minDistanceSq) {
      minDistanceSq = distanceSq;
      closest = station;
    }
  });
  
  return closest;
};
