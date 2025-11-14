// src/components/Map/LocationHandler.jsx
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { MAP_CONFIG } from '../../config/constants';

/**
 * Component xử lý việc di chuyển bản đồ khi vị trí thay đổi
 */
const LocationHandler = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, MAP_CONFIG.LOCATION_ZOOM);
    }
  }, [map, center]);
  
  return null;
};

export default LocationHandler;
