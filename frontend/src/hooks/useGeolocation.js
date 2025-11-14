// src/hooks/useGeolocation.js
import { useState } from 'react';
import { getCurrentPosition } from '../utils/geolocation';
import { GPS_CONFIG } from '../config/constants';

export const useGeolocation = () => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const fetchCurrentLocation = async () => {
    setIsLoadingLocation(true);
    
    try {
      const position = await getCurrentPosition();
      setCurrentLocation(position);
      return {
        success: true,
        position,
        message: `Đã lấy vị trí GPS: Lat ${position[0].toFixed(4)}, Lng ${position[1].toFixed(4)}`,
      };
    } catch (error) {
      // Sử dụng vị trí giả lập nếu GPS thất bại
      setCurrentLocation(GPS_CONFIG.FALLBACK_LOCATION);
      return {
        success: false,
        position: GPS_CONFIG.FALLBACK_LOCATION,
        message: 'Không thể lấy GPS. Đã dùng vị trí giả lập.',
      };
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const clearLocation = () => {
    setCurrentLocation(null);
  };

  return {
    currentLocation,
    isLoadingLocation,
    fetchCurrentLocation,
    clearLocation,
  };
};
