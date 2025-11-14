// src/components/Controls/TripPlanner.jsx
import React from 'react';
import './TripPlanner.css';

const TripPlanner = ({
  startStationName,
  destinationName,
  stations,
  currentLocation,
  isLoadingLocation,
  onStartChange,
  onDestinationChange,
  onGetLocation,
  onFindTrip,
}) => {
  return (
    <div className="trip-planner">
      <input
        type="text"
        placeholder="Trạm Đi (Bắt Đầu)"
        value={startStationName}
        onChange={(e) => onStartChange(e.target.value)}
        list="station-names"
      />
      
      <button 
        onClick={onGetLocation} 
        className="btn-gps"
        disabled={isLoadingLocation}
      >
        {isLoadingLocation ? '⏳ Đang lấy...' : currentLocation ? '✅ GPS' : '📍 Dùng GPS'}
      </button>
      
      <input
        type="text"
        placeholder="Trạm Đích (Điểm Xuống)"
        value={destinationName}
        onChange={(e) => onDestinationChange(e.target.value)}
        list="station-names"
      />
      
      <datalist id="station-names">
        {stations.map(s => (
          <option key={s.id} value={s.name} />
        ))}
      </datalist>

      <button
        onClick={onFindTrip}
        className="btn-find-trip"
        disabled={!startStationName && !currentLocation}
      >
        Tìm Chuyến Xe
      </button>
    </div>
  );
};

export default TripPlanner;
