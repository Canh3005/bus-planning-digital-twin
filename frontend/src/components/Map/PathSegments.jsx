// src/components/Map/PathSegments.jsx
import React, { useEffect, useState } from 'react';
import { Polyline, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
import { ROUTE_COLORS } from '../../config/constants';
import { routeAPI } from '../../services/api';

// Icon cho trạm lên/xuống xe
const boardStationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const alightStationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const PathSegments = ({ foundPaths }) => {
  const [segmentsWithRealPaths, setSegmentsWithRealPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchedPathsRef = React.useRef(null);

  useEffect(() => {
    const fetchRealPaths = async () => {
      if (!foundPaths || !foundPaths.paths || foundPaths.paths.length === 0) {
        setSegmentsWithRealPaths([]);
        setLoading(false);
        fetchedPathsRef.current = null;
        return;
      }

      const bestPath = foundPaths.paths[0];
      
      // Kiểm tra nếu đã fetch paths này rồi thì skip
      const pathKey = JSON.stringify(bestPath.routes.map(r => r.routeId));
      if (fetchedPathsRef.current === pathKey) {
        console.log('⏭️ Skipping duplicate fetch for same paths');
        return;
      }

      console.log('🔄 Fetching real paths for path segments...');
      setLoading(true);
      fetchedPathsRef.current = pathKey;

      try {
        // Fetch real paths cho tất cả các routes trong path
        const segmentsWithPaths = await Promise.all(
          bestPath.routes.map(async (segment) => {
            // Sử dụng segment.coordinates để lấy real path
            const coordinates = segment.coordinates || [];
            
            if (coordinates.length < 2) {
              console.warn(`⚠️ Segment ${segment.routeName} không có đủ coordinates`);
              return {
                ...segment,
                realPath: coordinates
              };
            }
            
            try {
              const result = await routeAPI.getRealPathFromCoordinates(coordinates);
              console.log(`✅ Fetched real path for segment: ${segment.routeName}`);
              return {
                ...segment,
                realPath: result.success ? result.realPath : coordinates
              };
            } catch (error) {
              console.error(`❌ Error fetching real path for ${segment.routeName}:`, error);
              // Fallback: sử dụng coordinates có sẵn trong segment
              return {
                ...segment,
                realPath: coordinates
              };
            }
          })
        );

        setSegmentsWithRealPaths(segmentsWithPaths);
      } catch (error) {
        console.error('❌ Error fetching real paths:', error);
        setSegmentsWithRealPaths(bestPath.routes);
      } finally {
        setLoading(false);
      }
    };

    fetchRealPaths();
  }, [foundPaths]);

  // Hàm lấy tọa độ của trạm
  const getStationCoordinates = (station) => {
    if (station.location && station.location.coordinates) {
      return [station.location.coordinates[1], station.location.coordinates[0]]; // [lat, lng]
    }
    return null;
  };

  // Hàm lấy đoạn path giữa 2 trạm trên một tuyến
  const getPathBetweenStations = (segment, boardStation, alightStation) => {
    // Sử dụng realPath nếu có, nếu không fallback sang coordinates trong segment
    const routePath = segment.realPath || segment.coordinates || [];
    
    if (routePath.length === 0) {
      // Fallback: vẽ đường thẳng giữa 2 trạm
      const start = getStationCoordinates(boardStation);
      const end = getStationCoordinates(alightStation);
      if (start && end) {
        return [start, end];
      }
      return [];
    }

    // Chuyển đổi coordinates sang [lat, lng] format
    return routePath.map(coord => [coord[1], coord[0]]);
  };

  if (loading) {
    return null;
  }

  if (!segmentsWithRealPaths || segmentsWithRealPaths.length === 0) {
    return null;
  }

  return (
    <>
      {segmentsWithRealPaths.map((segment, segmentIndex) => {
        const { routeName, boardStation, alightStation, distance } = segment;
        
        // Lấy đoạn path giữa 2 trạm
        const positions = getPathBetweenStations(segment, boardStation, alightStation);

        if (positions.length === 0) return null;

        // Màu cho từng segment - lấy từ mảng màu theo index, lặp lại nếu vượt quá
        const color = ROUTE_COLORS.PATH_SEGMENTS[segmentIndex % ROUTE_COLORS.PATH_SEGMENTS.length];

        const boardCoords = getStationCoordinates(boardStation);
        const alightCoords = getStationCoordinates(alightStation);

        return (
          <React.Fragment key={`segment-${segmentIndex}`}>
            {/* Vẽ đường đi */}
            <Polyline
              positions={positions}
              color={color}
              weight={8}
              opacity={1}
              smoothFactor={1}
            >
              <Popup>
                <b>🚌 Segment {segmentIndex + 1}</b><br/>
                Tuyến: <b>{routeName}</b><br/>
                Lên xe: {boardStation.name}<br/>
                Xuống xe: {alightStation.name}<br/>
                Khoảng cách: {distance.toFixed(2)} km
              </Popup>
            </Polyline>

            {/* Marker cho trạm lên xe */}
            {boardCoords && (
              <Marker position={boardCoords} icon={boardStationIcon}>
                <Popup>
                  <b>🚏 Trạm lên xe</b><br/>
                  {boardStation.name}<br/>
                  {boardStation.address && <small>{boardStation.address}</small>}
                </Popup>
              </Marker>
            )}

            {/* Marker cho trạm xuống xe */}
            {alightCoords && (
              <Marker position={alightCoords} icon={alightStationIcon}>
                <Popup>
                  <b>🚏 Trạm xuống xe</b><br/>
                  {alightStation.name}<br/>
                  {alightStation.address && <small>{alightStation.address}</small>}
                </Popup>
              </Marker>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default PathSegments;
