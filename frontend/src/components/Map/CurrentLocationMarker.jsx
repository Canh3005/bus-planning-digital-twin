// src/components/Map/CurrentLocationMarker.jsx
import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Icon tùy chỉnh cho vị trí hiện tại
const currentLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const CurrentLocationMarker = ({ position }) => {
  if (!position) return null;
  
  return (
    <Marker position={position} icon={currentLocationIcon}>
      <Popup>
        <b>📍 Vị trí hiện tại (GPS)</b>
      </Popup>
    </Marker>
  );
};

export default CurrentLocationMarker;
