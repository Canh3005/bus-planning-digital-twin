// src/components/Controls/TripResultBox.jsx
import React from 'react';
import './TripResultBox.css'; // Tạo file CSS tương ứng

// Hàm chuyển đổi phút sang giờ và phút
const formatTime = (totalMinutes) => {
  const minutes = Math.round(totalMinutes);
  if (minutes < 60) {
    return `${minutes} phút`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} giờ ${remainingMinutes} phút`;
};

const TripResultBox = ({ results, isLoading, onSelectTrip }) => {
  if (isLoading) {
    return (
      <div className="trip-results-box loading">
        <p>⏳ Đang tìm kiếm các tùy chọn chuyến đi...</p>
      </div>
    );
  }

  if (!results || results.trips.length === 0) {
    return (
      <div className="trip-results-box empty">
        <p>⚠️ Không tìm thấy lộ trình phù hợp.</p>
      </div>
    );
  }

  return (
    <div className="trip-results-box">
      <h3>🛣️ {results.trips.length} Lộ trình được tìm thấy</h3>
      <div className="trip-options-list">
        {results.trips.map((trip, index) => (
          <div key={index} className="trip-option-card" onClick={() => onSelectTrip(trip)}>
            <div className="trip-header">
              <span className="trip-time">Tổng thời gian: 
                <strong> {formatTime(trip.totalTime)}</strong>
              </span>
              <span className={`trip-type type-${trip.routeSegments.length - 1}`}>
                {trip.routeSegments.length - 1} Lần chuyển
              </span>
            </div>
            
            <p className="trip-summary">{trip.description}</p>
            
            <div className="segment-details">
              {trip.routeSegments.map((segment, segIndex) => (
                <div key={segIndex} className="trip-segment">
                  <span className="route-name">
                    🚌 Tuyến {segment.routeName}
                  </span>
                  {/* Đã sử dụng đúng trường 'onBoard' và 'offBoard' từ backend */}
                  <span className="segment-info">
                    **{segment.onBoard} → {segment.offBoard}** ({formatTime(segment.time)} trên bus)
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TripResultBox;
