// src/components/Map/RoutePolylines.jsx
import React from 'react';
import { Polyline, Popup } from 'react-leaflet';
import { geojsonToLatLng } from '../../utils/mapHelpers';
import { ROUTE_COLORS } from '../../config/constants';

const RoutePolylines = ({ routes, highlightedRouteId }) => {
  return (
    <>
      {routes.map(route => {
        const routeId = route._id || route.id;
        const isHighlight = highlightedRouteId === routeId;
        const path = route.routePath || route.path;
        const positions = geojsonToLatLng(path);
        
        if (positions.length === 0) return null;
        
        const routeName = route.routeName || route.name;
        const startStation = route.startStationId?.name || route.start || 'N/A';
        const endStation = route.endStationId?.name || route.end || 'N/A';
        
        return (
          <Polyline
            key={routeId}
            positions={positions}
            color={isHighlight ? ROUTE_COLORS.HIGHLIGHT : ROUTE_COLORS.DEFAULT}
            weight={isHighlight ? 8 : 4}
            opacity={0.8}
            dashArray={isHighlight ? '10, 5' : null}
          >
            <Popup>
              Tuyến: <b>{routeName}</b> <br/>
              Từ: {startStation} → Đến: {endStation}
            </Popup>
          </Polyline>
        );
      })}
    </>
  );
};

export default RoutePolylines;
