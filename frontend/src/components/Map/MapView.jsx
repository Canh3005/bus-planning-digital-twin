// src/components/Map/MapView.jsx
import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { MAP_CONFIG } from '../../config/constants';
import LocationHandler from './LocationHandler';
import StationMarkers from './StationMarkers';
import RoutePolylines from './RoutePolylines';
import CurrentLocationMarker from './CurrentLocationMarker';

const MapView = ({ 
  stations, 
  routes, 
  currentLocation,
  manualStartLocation,
  destinationLocation,
  highlightedRouteId,
  selectedRouteId,
  hideOtherStations 
}) => {
  // Lấy danh sách station IDs từ route được chọn
  const selectedRoute = routes.find(r => (r._id || r.id) === selectedRouteId);
  const highlightedStationIds = selectedRoute?.stations?.map(s => s.stationId?._id || s.stationId) || [];
  
  // Filter stations nếu cần ẩn trạm khác
  const displayStations = hideOtherStations && selectedRouteId
    ? stations.filter(station => highlightedStationIds.includes(station._id || station.id))
    : stations;
  
  // Xác định vị trí bắt đầu (ưu tiên manual, fallback GPS)
  const startLocation = manualStartLocation || currentLocation;
  
  return (
    <MapContainer
      center={startLocation || MAP_CONFIG.DEFAULT_CENTER}
      zoom={MAP_CONFIG.DEFAULT_ZOOM}
      style={{ height: '100vh', width: '100%' }}
      scrollWheelZoom={true}
    >
      <LocationHandler center={startLocation} />
      
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Hiển thị marker xanh lá cho điểm bắt đầu */}
      <CurrentLocationMarker position={startLocation} label="Điểm bắt đầu" />
      
      {/* Hiển thị marker xanh lá cho điểm đến */}
      <CurrentLocationMarker position={destinationLocation} label="Điểm đến" />
      
      <RoutePolylines routes={routes} highlightedRouteId={highlightedRouteId} />
      <StationMarkers stations={displayStations} highlightedStationIds={highlightedStationIds} />
    </MapContainer>
  );
};

export default MapView;
