// src/components/Map/RoutePolylines.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Polyline, Popup } from 'react-leaflet';
import { routeAPI } from '../../services/api';
import { ROUTE_COLORS } from '../../config/constants';

const RoutePolylines = ({ routes, highlightedRouteId }) => {
  const [routesWithRealPaths, setRoutesWithRealPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const cacheRef = useRef({}); // Cache để lưu real paths đã fetch
  const prevRouteIdsRef = useRef(''); // Lưu route IDs trước đó

  useEffect(() => {
    const fetchRealRoutes = async () => {
      if (!routes || routes.length === 0) {
        setRoutesWithRealPaths([]);
        setLoading(false);
        return;
      }
      
      // Lấy danh sách route IDs hiện tại
      const currentRouteIds = routes.map(r => r._id || r.id).sort().join(',');
      
      // Nếu route IDs không thay đổi, không cần fetch lại
      if (prevRouteIdsRef.current === currentRouteIds) {
        return;
      }
      
      prevRouteIdsRef.current = currentRouteIds;
      
      // Kiểm tra xem có route nào chưa được cache không
      const uncachedRoutes = routes.filter(route => {
        const routeId = route._id || route.id;
        return !cacheRef.current[routeId];
      });
      
      // Nếu tất cả routes đều đã có trong cache, dùng cache
      if (uncachedRoutes.length === 0) {
        console.log('✨ Using cached real paths for', routes.length, 'route(s)');
        const cachedRoutes = routes.map(route => {
          const routeId = route._id || route.id;
          return cacheRef.current[routeId];
        });
        setRoutesWithRealPaths(cachedRoutes);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      console.log('🔄 Fetching real route paths for', uncachedRoutes.length, 'new route(s)...');
      
      try {
        // Fetch đường đi thật cho các route chưa có trong cache
        await Promise.all(
          uncachedRoutes.map(async (route) => {
            const routeId = route._id || route.id;
            try {
              const routeWithPath = await routeAPI.getRealPathById(routeId);
              console.log(`✅ Fetched real path for ${route.routeName || route.name}`);
              // Lưu vào cache
              cacheRef.current[routeId] = routeWithPath;
            } catch (error) {
              console.error(`❌ Error fetching path for ${route.routeName}:`, error);
              // Fallback to original path
              const fallbackRoute = {
                ...route,
                realPath: route.routePath?.coordinates || []
              };
              cacheRef.current[routeId] = fallbackRoute;
            }
          })
        );
        
        // Kết hợp cached routes và new routes
        const allRoutes = routes.map(route => {
          const routeId = route._id || route.id;
          return cacheRef.current[routeId];
        });
        
        setRoutesWithRealPaths(allRoutes);
      } catch (error) {
        console.error('❌ Error fetching real route paths:', error);
        // Fallback to original routes
        console.log('⚠️ Using fallback original routes');
        const fallbackRoutes = routes.map(route => ({
          ...route,
          realPath: route.routePath?.coordinates || []
        }));
        setRoutesWithRealPaths(fallbackRoutes);
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
