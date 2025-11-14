// src/pages/BusMapPage.jsx
import React, { useState, useCallback } from 'react';
import MapView from '../components/Map/MapView';
import ControlPanel from '../components/Controls/ControlPanel';
import UserMenu from '../components/UserMenu';
import { useStations } from '../hooks/useStations';
import { useRoutes } from '../hooks/useRoutes';
import { useGeolocation } from '../hooks/useGeolocation';
import { findClosestStation } from '../utils/geolocation';
import './BusMapPage.css';

const BusMapPage = () => {
  const { stations, loading: stationsLoading } = useStations();
  const { routes, loading: routesLoading } = useRoutes();
  const { currentLocation, isLoadingLocation, fetchCurrentLocation, clearLocation } = useGeolocation();

  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [startStationName, setStartStationName] = useState('');
  const [destinationName, setDestinationName] = useState('Đại học Bách Khoa');
  const [foundTripRouteId, setFoundTripRouteId] = useState(null);
  const [tripCost, setTripCost] = useState(null);

  // Handler: Lấy vị trí GPS
  const handleGetLocation = async () => {
    setFoundTripRouteId(null);
    setTripCost(null);
    setStartStationName('');

    const result = await fetchCurrentLocation();
    alert(result.message);
  };

  // Handler: Tìm chuyến xe
  const handleFindTrip = useCallback(() => {
    setFoundTripRouteId(null);
    setTripCost(null);

    // A. Xác định trạm khởi hành
    let actualStartStation;
    if (startStationName) {
      actualStartStation = stations.find(s =>
        s.name.toLowerCase().trim() === startStationName.toLowerCase().trim()
      );
    } else if (currentLocation) {
      actualStartStation = findClosestStation(
        currentLocation[0],
        currentLocation[1],
        stations
      );
    } else {
      alert('Vui lòng chọn trạm đi hoặc xác định vị trí GPS.');
      return;
    }

    // B. Xác định trạm đích
    const destinationStation = stations.find(s =>
      s.name.toLowerCase().trim() === destinationName.toLowerCase().trim()
    );

    if (!actualStartStation || !destinationStation) {
      alert(`Không tìm thấy trạm: ${!actualStartStation ? (startStationName || 'GPS') : destinationName}`);
      return;
    }

    // C. Tìm tuyến phù hợp
    const foundRoute = routes.find(route => {
      const startName = route.startStationId?.name || route.start || '';
      const endName = route.endStationId?.name || route.end || '';
      return (
        startName.toLowerCase() === actualStartStation.name.toLowerCase() &&
        endName.toLowerCase() === destinationStation.name.toLowerCase()
      );
    });

    if (foundRoute) {
      const routeId = foundRoute._id || foundRoute.id;
      const routeName = foundRoute.routeName || foundRoute.name;
      setFoundTripRouteId(routeId);
      const cost = foundRoute.ticketPrice || Math.floor(Math.random() * 5 + 7) * 1000;
      setTripCost(cost);
      alert(`🚌 Tuyến phù hợp: ${routeName}. Giá vé: ${cost.toLocaleString()} VND.`);
    } else {
      alert('Không tìm thấy tuyến xe buýt trực tiếp nào phù hợp.');
    }
  }, [startStationName, destinationName, currentLocation, stations, routes]);

  // Handler: Thanh toán
  const handleCheckout = () => {
    if (!foundTripRouteId || !tripCost) {
      alert('Vui lòng tìm chuyến xe trước khi thanh toán.');
      return;
    }

    alert(`Thanh toán ${tripCost.toLocaleString()} VND thành công! Chúc bạn có chuyến đi vui vẻ.`);

    // Reset state
    setFoundTripRouteId(null);
    setTripCost(null);
    setStartStationName('');
    setDestinationName('');
    clearLocation();
  };

  // Handler: Lọc tuyến
  const handleRouteSelect = (routeId) => {
    setSelectedRouteId(routeId);
    setFoundTripRouteId(null);
    setTripCost(null);
  };

  // Filter routes để hiển thị
  const routesToDisplay = selectedRouteId
    ? routes.filter(r => r.id === selectedRouteId)
    : routes;

  if (stationsLoading || routesLoading) {
    return <div className="loading">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="bus-map-page">
      <div className="user-menu-container">
        <UserMenu />
      </div>
      
      <ControlPanel
        stations={stations}
        routes={routes}
        startStationName={startStationName}
        destinationName={destinationName}
        currentLocation={currentLocation}
        isLoadingLocation={isLoadingLocation}
        tripCost={tripCost}
        selectedRouteId={selectedRouteId}
        onStartChange={setStartStationName}
        onDestinationChange={setDestinationName}
        onGetLocation={handleGetLocation}
        onFindTrip={handleFindTrip}
        onCheckout={handleCheckout}
        onRouteSelect={handleRouteSelect}
      />

      <MapView
        stations={stations}
        routes={routesToDisplay}
        currentLocation={currentLocation}
        highlightedRouteId={foundTripRouteId}
      />
    </div>
  );
};

export default BusMapPage;
