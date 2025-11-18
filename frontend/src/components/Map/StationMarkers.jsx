// src/components/Map/StationMarkers.jsx
import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { geojsonPointToLatLng } from '../../utils/mapHelpers';

// Tạo custom icons cho trạm thường và trạm được highlight
const defaultIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const highlightedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const StationMarkers = ({ stations, highlightedStationIds = [] }) => {
  return (
    <>
      {stations.map(station => {
        const position = geojsonPointToLatLng(station.location);
        
        if (!position) return null;
        
        const stationId = station._id || station.id;
        const isHighlighted = highlightedStationIds.includes(stationId);
        
        return (
          <Marker 
            key={stationId} 
            position={position}
            icon={isHighlighted ? highlightedIcon : defaultIcon}
          >
            <Popup>
              <h3>{station.name}</h3>
              <p>{station.description}</p>
              {isHighlighted && <p><strong>🚌 Thuộc tuyến được chọn</strong></p>}
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

export default StationMarkers;
