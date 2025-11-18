// src/components/Controls/RouteFilter.jsx
import React from 'react';
import './RouteFilter.css';

const RouteFilter = ({ routes, selectedRouteId, hideOtherStations, onRouteSelect, onToggleOtherStations }) => {
  return (
    <div className="route-filter-container">
      <select 
        className="route-filter"
        onChange={(e) => onRouteSelect(e.target.value === "" ? null : e.target.value)}
        value={selectedRouteId || ""}
      >
        <option value="">-- Lọc Tuyến Xe --</option>
        {routes.map(route => {
          const routeId = route._id || route.id;
          const routeName = route.routeName || route.name;
          return (
            <option key={routeId} value={routeId}>
              {routeName}
            </option>
          );
        })}
      </select>
      
      {selectedRouteId && (
        <button 
          className="btn-toggle-stations"
          onClick={onToggleOtherStations}
        >
          {hideOtherStations ? '👁️ Hiện tất cả trạm' : '🙈 Ẩn trạm khác'}
        </button>
      )}
    </div>
  );
};

export default RouteFilter;
