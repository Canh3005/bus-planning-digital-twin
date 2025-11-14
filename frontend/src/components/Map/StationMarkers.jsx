// src/components/Map/StationMarkers.jsx
import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { geojsonPointToLatLng } from '../../utils/mapHelpers';

const StationMarkers = ({ stations }) => {
  return (
    <>
      {stations.map(station => {
        const position = geojsonPointToLatLng(station.location);
        
        if (!position) return null;
        
        return (
          <Marker key={station.id} position={position}>
            <Popup>
              <h3>{station.name}</h3>
              <p>{station.description}</p>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

export default StationMarkers;
