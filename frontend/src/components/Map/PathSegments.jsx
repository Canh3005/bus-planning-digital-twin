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

  useEffect(() => {
    const fetchRealPaths = async () => {
      if (!foundPaths || !foundPaths.paths || foundPaths.paths.length === 0) {
        setSegmentsWithRealPaths([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const bestPath = foundPaths.paths[0];

      try {
        // Fetch real paths cho tất cả các routes trong path
        const segmentsWithPaths = await Promise.all(
          bestPath.routes.map(async (segment) => {
            const routeId = segment.route._id || segment.route.id;
            try {
              const routeWithRealPath = await routeAPI.getRealPathById(routeId);
              console.log(`✅ Fetched real path for segment: ${segment.route.routeName}`);
              return {
                ...segment,
                route: routeWithRealPath
              };
            } catch (error) {
              console.error(`❌ Error fetching real path for ${segment.route.routeName}:`, error);
              // Fallback to original route
              return segment;
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
  const getPathBetweenStations = (route, boardStation, alightStation) => {
    const routePath = route.realPath || route.routePath?.coordinates || [];
    
    if (routePath.length === 0) {
      // Fallback: vẽ đường thẳng giữa 2 trạm
      const start = getStationCoordinates(boardStation);
      const end = getStationCoordinates(alightStation);
      if (start && end) {
        return [start, end];
      }
      return [];
    }

    // Tìm điểm gần nhất với trạm lên và trạm xuống
    const boardCoords = getStationCoordinates(boardStation);
    const alightCoords = getStationCoordinates(alightStation);

    if (!boardCoords || !alightCoords) {
      return [];
    }

    // Tìm index của điểm gần trạm lên và trạm xuống nhất
    let boardIndex = 0;
    let alightIndex = routePath.length - 1;
    let minBoardDist = Infinity;
    let minAlightDist = Infinity;

    routePath.forEach((coord, index) => {
      const lat = coord[1];
      const lng = coord[0];
      
      // Khoảng cách đến trạm lên
      const distToBoard = Math.sqrt(
        Math.pow(lat - boardCoords[0], 2) + Math.pow(lng - boardCoords[1], 2)
      );
      if (distToBoard < minBoardDist) {
        minBoardDist = distToBoard;
        boardIndex = index;
      }

      // Khoảng cách đến trạm xuống
      const distToAlight = Math.sqrt(
        Math.pow(lat - alightCoords[0], 2) + Math.pow(lng - alightCoords[1], 2)
      );
      if (distToAlight < minAlightDist) {
        minAlightDist = distToAlight;
        alightIndex = index;
      }
    });

    // Lấy đoạn path từ boardIndex đến alightIndex
    if (boardIndex <= alightIndex) {
      const segment = routePath.slice(boardIndex, alightIndex + 1);
      return segment.map(coord => [coord[1], coord[0]]); // [lat, lng]
    }

    return [];
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
        const { route, boardStation, alightStation, distance } = segment;
        const routeName = route.routeName || route.name;
        
        // Lấy đoạn path giữa 2 trạm
        const positions = getPathBetweenStations(route, boardStation, alightStation);

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
