// src/components/Controls/TripResult.jsx
import React from 'react';
// Giả sử bạn có file constants chứa ROUTE_COLORS
import { ROUTE_COLORS } from '../../config/constants'; 
import './TripResult.css';

/**
 * Component hiển thị kết quả tìm đường đi (chuyến đi)
 * @param {object} foundPaths - Dữ liệu kết quả tìm đường từ API
 * @param {function} onClose - Hàm đóng kết quả
 */
const TripResult = ({ foundPaths, onClose }) => {
  // 1. Xử lý trường hợp không có kết quả
  if (!foundPaths || !foundPaths.success || !foundPaths.paths || foundPaths.paths.length === 0) {
    return null;
  }

  // Lấy đường đi tối ưu nhất (bestPath)
  const bestPath = foundPaths.paths[0];

  // Destructure các trường thông tin cần hiển thị
  const { 
    routes, 
    totalDistance, 
    totalCost, 
    transfers, 
    // Các trường mới từ PathfindingService.js
    totalTravelTimeFormatted, 
    totalTravelTimeSeconds 
  } = bestPath;

  /**
   * Hàm tiện ích để chuyển đổi giây thành định dạng dễ đọc cho các phân đoạn
   */
  const formatSegmentTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (minutes > 0) {
      return `${minutes} phút ${secs} giây`;
    }
    return `${secs} giây`;
  };

  // Hàm để kết hợp cả đi xe và đi bộ (nếu cần)
  // Trong trường hợp này, `routes` chỉ chứa các segment RIDE.
  // Ta cần tái cấu trúc lại dữ liệu nếu muốn hiển thị WALK segments
  // Nhưng dựa trên cấu trúc hiện tại của bạn, ta chỉ hiển thị RIDE segments
  // và tổng thời gian đã bao gồm WALK time (từ pathfindingService).
  
  // Hiển thị một thông báo nếu tổng thời gian không có (chắc chắn có nếu code service đúng)
  const timeDisplay = totalTravelTimeFormatted 
    ? totalTravelTimeFormatted 
    : `${Math.round(totalTravelTimeSeconds / 60)} phút`;

  // Giả định rằng `routes` cũng có thể chứa các segment WALK đã được service thêm vào
  // Tuy nhiên, dựa trên `reconstructPath` vừa sửa, `routes` chỉ là `rideSegments`.
  // Ta chỉ hiển thị các chặng xe buýt.

  return (
    <div className="trip-result">
      <div className="trip-result-header">
        <h3>🎯 Kết Quả Tìm Kiếm</h3>
        <button className="close-btn" onClick={onClose} title="Đóng">
          ✕
        </button>
      </div>
      
      {/* ------------------------------------- */}
      {/* PHẦN TÓM TẮT CHUYẾN ĐI (Summary) */}
      {/* ------------------------------------- */}
      <div className="trip-summary">
        {/* HIỂN THỊ THỜI GIAN ĐI LẠI ƯỚC TÍNH */}
        <div className="summary-item time-item">
          <span className="summary-label">⏱️ Thời gian ước tính:</span>
          <span className="summary-value time-value">{timeDisplay}</span>
        </div>

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
      
      {/* ------------------------------------- */}
      {/* PHẦN CHI TIẾT HÀNH TRÌNH (Segments) */}
      {/* ------------------------------------- */}
      <div className="trip-routes">
        <h4>📋 Chi Tiết Hành Trình</h4>
        {routes.map((segment, index) => {
          // Lưu ý: Trong code này, tôi giả định `routes` chỉ là các segment RIDE
          const routeName = segment.routeName || `Tuyến ${segment.routeId}`;
          const boardStationName = segment.boardStation?.name || 'Điểm lên';
          const alightStationName = segment.alightStation?.name || 'Điểm xuống';
          const segmentColor = ROUTE_COLORS.PATH_SEGMENTS[index % ROUTE_COLORS.PATH_SEGMENTS.length];

          // Dữ liệu thời gian và quãng đường của segment RIDE
          const segmentTimeDisplay = segment.travelTime 
            ? formatSegmentTime(segment.travelTime) 
            : 'N/A';
          const segmentDistanceDisplay = segment.distance 
            ? `${segment.distance.toFixed(2)} km` 
            : 'N/A';

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
                
                {/* HIỂN THỊ THỜI GIAN ĐI LẠI CỦA SEGMENT NÀY */}
                <div className="segment-time-distance">
                    <span>⏳ Thời gian đi xe: {segmentTimeDisplay}</span>
                </div>
                
                <div className="segment-time-distance">
                    <span>📍 Quãng đường: {segmentDistanceDisplay}</span>
                </div>
              </div>
              
              {/* Hiển thị chỉ báo chuyển tuyến nếu không phải chặng cuối */}
              {index < routes.length - 1 && (
                <div className="transfer-indicator">
                  <span className="transfer-icon">🚶</span> Chuyển tuyến tại **{alightStationName}**
                  {/* Có thể thêm ước tính thời gian đi bộ tại đây, nhưng hiện tại ta dùng tổng chung */}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ------------------------------------- */}
      {/* PHẦN TUYẾN ĐƯỜNG THAY THẾ (Alternatives) */}
      {/* ------------------------------------- */}
      {foundPaths.paths.length > 1 && (
        <div className="alternative-routes">
          <p className="alt-routes-note">
            💡 Có **{foundPaths.paths.length - 1}** tuyến đường thay thế khác. 
            <button className="btn-view-alternatives">Xem tất cả</button>
          </p>
          {/* Bạn có thể thêm logic để hiển thị hoặc cho phép chọn các tuyến khác */}
        </div>
      )}
    </div>
  );
};

export default TripResult;
