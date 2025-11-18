// src/components/Map/RoutePolylines.jsx
import React, { useEffect, useState } from 'react';
import { Polyline, Popup } from 'react-leaflet';
import { routeAPI } from '../../services/api';
import { ROUTE_COLORS } from '../../config/constants';

const RoutePolylines = ({ routes, highlightedRouteId }) => {
  const [routesWithRealPaths, setRoutesWithRealPaths] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRealRoutes = async () => {
      if (!routes || routes.length === 0) {
        setRoutesWithRealPaths([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      console.log('🔄 Fetching real route paths for', routes.length, 'route(s)...');
      
      try {
        // Fetch đường đi thật cho từng route được hiển thị
        const routesWithPaths = await Promise.all(
          routes.map(async (route) => {
            const routeId = route._id || route.id;
            try {
              const routeWithPath = await routeAPI.getRealPathById(routeId);
              console.log(`✅ Fetched real path for ${route.routeName || route.name}`);
              return routeWithPath;
            } catch (error) {
              console.error(`❌ Error fetching path for ${route.routeName}:`, error);
              // Fallback to original path
              return {
                ...route,
                realPath: route.routePath?.coordinates || []
              };
            }
          })
        );
        
        setRoutesWithRealPaths(routesWithPaths);
      } catch (error) {
        console.error('❌ Error fetching real route paths:', error);
        // Fallback to original routes
        console.log('⚠️ Using fallback original routes');
        setRoutesWithRealPaths(routes.map(route => ({
          ...route,
          realPath: route.routePath?.coordinates || []
        })));
      }
      setLoading(false);
    };

    fetchRealRoutes();
  }, [routes]);

  if (loading || routesWithRealPaths.length === 0) {
    // Hiển thị đường thẳng tạm thời trong khi loading
    return (
      <>
        {routes.map(route => {
          const routeId = route._id || route.id;
          const isHighlight = highlightedRouteId === routeId;
          const path = route.routePath || route.path;
          const coordinates = path?.coordinates || [];
          
          // Chuyển đổi [lng, lat] sang [lat, lng] cho Leaflet
          const positions = coordinates.map(coord => [coord[1], coord[0]]);
          
          if (positions.length === 0) return null;
          
          const routeName = route.routeName || route.name;
          const startStation = route.startStationId?.name || route.start || 'N/A';
          const endStation = route.endStationId?.name || route.end || 'N/A';
          
          return (
            <Polyline
              key={routeId}
              positions={positions}
              color={isHighlight ? ROUTE_COLORS.HIGHLIGHT : ROUTE_COLORS.DEFAULT}
              weight={isHighlight ? 10 : 6}
              opacity={0.7}
              dashArray="8, 4"
            >
              <Popup>
                Tuyến: <b>{routeName}</b> <br/>
                Từ: {startStation} → Đến: {endStation}
                <br/><small>(Đang tải đường đi thật...)</small>
              </Popup>
            </Polyline>
          );
        })}
      </>
    );
  }

  return (
    <>
      {routesWithRealPaths.map(route => {
        const routeId = route._id || route.id;
        const isHighlight = highlightedRouteId === routeId;
        const coordinates = route.realPath || [];
        
        // Chuyển đổi [lng, lat] sang [lat, lng] cho Leaflet
        const positions = coordinates.map(coord => [coord[1], coord[0]]);
        
        if (positions.length === 0) return null;
        
        const routeName = route.routeName || route.name;
        const startStation = route.startStationId?.name || route.start || 'N/A';
        const endStation = route.endStationId?.name || route.end || 'N/A';
        
        return (
          <Polyline
            key={routeId}
            positions={positions}
            color={isHighlight ? ROUTE_COLORS.HIGHLIGHT : ROUTE_COLORS.DEFAULT}
            weight={isHighlight ? 10 : 6}
            opacity={0.9}
            dashArray={isHighlight ? '12, 6' : null}
            smoothFactor={1}
            className={isHighlight ? 'route-highlight' : 'route-normal'}
          >
            <Popup>
              Tuyến: <b>{routeName}</b> <br/>
              Từ: {startStation} → Đến: {endStation}
              <br/><small>✅ Đường đi thật trên bản đồ</small>
            </Popup>
          </Polyline>
        );
      })}
    </>
  );
};

export default RoutePolylines;
