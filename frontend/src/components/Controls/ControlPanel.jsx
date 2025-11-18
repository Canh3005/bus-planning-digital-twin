// src/components/Controls/ControlPanel.jsx
import React from 'react';
import TripPlanner from './TripPlanner';
import CheckoutBox from './CheckoutBox';
import RouteFilter from './RouteFilter';
import './ControlPanel.css';

const ControlPanel = ({
  stations,
  routes,
  startStationName,
  destinationName,
  currentLocation,
  isLoadingLocation,
  tripCost,
  selectedRouteId,
  hideOtherStations,
  onStartChange,
  onDestinationChange,
  onGetLocation,
  onFindTrip,
  onCheckout,
  onRouteSelect,
  onToggleOtherStations,
}) => {
  return (
    <div className="controls">
      <TripPlanner
        startStationName={startStationName}
        destinationName={destinationName}
        stations={stations}
        currentLocation={currentLocation}
        isLoadingLocation={isLoadingLocation}
        onStartChange={onStartChange}
        onDestinationChange={onDestinationChange}
        onGetLocation={onGetLocation}
        onFindTrip={onFindTrip}
      />
      
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
