// src/components/Admin/ViewRouteModal.jsx
import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ViewRouteModal.css';

// Icon cho trạm
const stationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const ViewRouteModal = ({ isOpen, onClose, route }) => {
  if (!isOpen || !route) return null;

  // Lấy thông tin route
  const routeName = route.routeName || route.name;
  const routePath = route.routePath || route.path;
  const stations = route.stations || [];

  // Tính toán center của map
  const getMapCenter = () => {
    if (!routePath?.coordinates || routePath.coordinates.length === 0) {
      return [10.8231, 106.6297]; // TP.HCM mặc định
    }
    const coords = routePath.coordinates;
    const latSum = coords.reduce((sum, c) => sum + c[1], 0);
    const lngSum = coords.reduce((sum, c) => sum + c[0], 0);
    return [latSum / coords.length, lngSum / coords.length];
  };

  // Convert coordinates cho polyline
  const getPolylinePositions = () => {
    if (!routePath?.coordinates) return [];
    return routePath.coordinates.map(c => [c[1], c[0]]); // [lat, lng]
  };

  return (
    <div className="view-route-overlay" onClick={onClose}>
      <div className="view-route-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="view-route-header">
          <div className="view-route-title">
            <span className="icon">🗺️</span>
            <h2>{routeName}</h2>
          </div>
          <button className="view-route-close" onClick={onClose} title="Đóng">
            ✖
          </button>
        </div>

        {/* Route Info */}
        <div className="view-route-info">
          <div className="info-item">
            <span className="info-label">🚏 Số trạm:</span>
            <span className="info-value">{stations.length} trạm</span>
          </div>
          {route.startTime && (
            <div className="info-item">
              <span className="info-label">🕐 Giờ bắt đầu:</span>
              <span className="info-value">{route.startTime}</span>
            </div>
          )}
          {route.frequencyMinutes && (
            <div className="info-item">
              <span className="info-label">🔄 Tần suất:</span>
              <span className="info-value">{route.frequencyMinutes} phút</span>
            </div>
          )}
          {route.ticketPrice && (
            <div className="info-item">
              <span className="info-label">💰 Giá vé:</span>
              <span className="info-value">{route.ticketPrice.toLocaleString()} VNĐ</span>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="view-route-map">
          <MapContainer
            center={getMapCenter()}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />

            {/* Hiển thị các trạm */}
            {stations.map((station, index) => {
              const stationData = station.stationId;
              if (!stationData?.location?.coordinates) return null;
              const coords = stationData.location.coordinates;
              
              return (
                <Marker
                  key={index}
                  position={[coords[1], coords[0]]}
                  icon={stationIcon}
                />
              );
            })}

            {/* Polyline nối các trạm */}
            {getPolylinePositions().length >= 2 && (
              <Polyline
                positions={getPolylinePositions()}
                color="#6366f1"
                weight={5}
                opacity={0.8}
              />
            )}
          </MapContainer>
        </div>

        {/* Danh sách trạm */}
        <div className="view-route-stations">
          <h3>📋 Danh sách trạm ({stations.length})</h3>
          <ul className="stations-list">
            {stations.map((station, index) => {
              const stationData = station.stationId;
              return (
                <li key={index} className="station-item">
                  <span className="station-order">{station.order}</span>
                  <div className="station-info">
                    <strong>{stationData?.name || 'N/A'}</strong>
                    {stationData?.address && (
                      <small>{stationData.address}</small>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ViewRouteModal;
