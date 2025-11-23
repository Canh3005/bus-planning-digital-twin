// src/components/Controls/ControlPanel.jsx
import React from 'react';
import TripPlanner from './TripPlanner';
import CheckoutBox from './CheckoutBox';
import RouteFilter from './RouteFilter';
import TripResult from './TripResult';
import './ControlPanel.css';

const ControlPanel = ({
  stations,
  routes,
  startStationName,
  destinationName,
  currentLocation,
  isLoadingLocation,
  isSearching,
  tripCost,
  selectedRouteId,
  hideOtherStations,
  foundPaths,
  onStartChange,
  onDestinationChange,
  onStartLocationChange,
  onDestinationLocationChange,
  onGetLocation,
  onFindTrip,
  onCheckout,
  onRouteSelect,
  onToggleOtherStations,
  onCloseTripResult,
}) => {
  return (
    <div className="controls">
      <div className="controls-header">
        <h2 className="controls-title">🚌 Lập Kế Hoạch Chuyến Đi</h2>
        <p className="controls-subtitle">Tìm kiếm và đặt vé xe buýt dễ dàng</p>
      </div>
      
      <TripPlanner
        startStationName={startStationName}
        destinationName={destinationName}
        stations={stations}
        currentLocation={currentLocation}
        isLoadingLocation={isLoadingLocation}
        isSearching={isSearching}
        onStartChange={onStartChange}
        onDestinationChange={onDestinationChange}
        onStartLocationChange={onStartLocationChange}
        onDestinationLocationChange={onDestinationLocationChange}
        onGetLocation={onGetLocation}
        onFindTrip={onFindTrip}
      />
      
      <TripResult foundPaths={foundPaths} onClose={onCloseTripResult} />
      
      <CheckoutBox tripCost={tripCost} onCheckout={onCheckout} />
      
      <RouteFilter
        routes={routes}
        selectedRouteId={selectedRouteId}
        hideOtherStations={hideOtherStations}
        onRouteSelect={onRouteSelect}
        onToggleOtherStations={onToggleOtherStations}
      />
    </div>
  );
};

export default ControlPanel;
