// src/components/Controls/TripResult.jsx
import React from 'react';
import { ROUTE_COLORS } from '../../config/constants';
import './TripResult.css';

const TripResult = ({ foundPaths, onClose }) => {
  if (!foundPaths || !foundPaths.success || !foundPaths.paths || foundPaths.paths.length === 0) {
    return null;
  }

  const bestPath = foundPaths.paths[0];
  const { routes, totalDistance, totalCost, transfers } = bestPath;

  return (
    <div className="trip-result">
      <div className="trip-result-header">
        <h3>🎯 Kết Quả Tìm Kiếm</h3>
        <button className="close-btn" onClick={onClose} title="Đóng">
          ✕
        </button>
      </div>

      <div className="trip-summary">
        <div className="summary-item">
          <span className="summary-label">📏 Khoảng cách:</span>
          <span className="summary-value">{totalDistance.toFixed(2)} km</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">💰 Chi phí:</span>
          <span className="summary-value">{totalCost.toLocaleString()} đ</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">🔄 Chuyển tuyến:</span>
          <span className="summary-value">{transfers} lần</span>
        </div>
      </div>

      <div className="trip-routes">
        <h4>📋 Chi Tiết Hành Trình</h4>
        {routes.map((segment, index) => {
          // Bây giờ segment có routeName trực tiếp
          const routeName = segment.routeName;
          const boardStationName = segment.boardStation.name;
          const alightStationName = segment.alightStation.name;
          const segmentColor = ROUTE_COLORS.PATH_SEGMENTS[index % ROUTE_COLORS.PATH_SEGMENTS.length];

          return (
            <div key={index} className="route-segment" style={{ borderLeftColor: segmentColor }}>
              <div className="segment-header">
                <span className="segment-number" style={{ background: segmentColor }}>{index + 1}</span>
                <span className="route-name">{routeName}</span>
              </div>
              <div className="segment-details">
                <div className="station-info">
                  <span className="station-label">🟣 Lên xe:</span>
                  <span className="station-name">{boardStationName}</span>
                </div>
                <div className="station-info">
                  <span className="station-label">🔴 Xuống xe:</span>
                  <span className="station-name">{alightStationName}</span>
                </div>
                <div className="segment-distance">
                  <span>📍 {segment.distance.toFixed(2)} km</span>
                </div>
              </div>
              
              {index < routes.length - 1 && (
                <div className="transfer-indicator">
                  ↓ Chuyển tuyến tại {alightStationName}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {foundPaths.paths.length > 1 && (
        <div className="alternative-routes">
          <p className="alt-routes-note">
            💡 Có {foundPaths.paths.length - 1} tuyến đường khác
          </p>
        </div>
      )}
    </div>
  );
};

export default TripResult;
