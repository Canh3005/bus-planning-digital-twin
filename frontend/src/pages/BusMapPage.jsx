// src/pages/BusMapPage.jsx
import React, { useState, useCallback, useEffect } from 'react';
import MapView from '../components/Map/MapView';
import ControlPanel from '../components/Controls/ControlPanel';
import UserMenu from '../components/UserMenu';
import { useStations } from '../hooks/useStations';
import { useRoutes } from '../hooks/useRoutes';
import { useGeolocation } from '../hooks/useGeolocation';
import { pathfindingAPI, paymentAPI } from '../services/api';
import './BusMapPage.css';

const BusMapPage = () => {
  const { stations, loading: stationsLoading } = useStations();
  const { routes, loading: routesLoading } = useRoutes();
  const { currentLocation, isLoadingLocation, fetchCurrentLocation, clearLocation } = useGeolocation();

  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [startStationName, setStartStationName] = useState('');
  const [destinationName, setDestinationName] = useState('');
  const [foundTripRouteId, setFoundTripRouteId] = useState(null);
  const [tripCost, setTripCost] = useState(null);
  const [hideOtherStations, setHideOtherStations] = useState(false);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [manualStartLocation, setManualStartLocation] = useState(null); // Vị trí chọn từ search
  const [foundPaths, setFoundPaths] = useState(null); // Lưu kết quả tìm đường
  const [isSearching, setIsSearching] = useState(false);
  const [isPaid, setIsPaid] = useState(false); // Trạng thái thanh toán
  const [isShowingTripResult, setIsShowingTripResult] = useState(false);

  // Kiểm tra payment result từ localStorage khi component mount
  useEffect(() => {
    const paymentData = localStorage.getItem('paymentResult');
    const tripData = localStorage.getItem('tripData');
    
    // Restore payment status
    if (paymentData) {
      try {
        const parsed = JSON.parse(paymentData);
        if (parsed.isPaid) {
          setIsPaid(true);
          console.log('✅ Thanh toán đã hoàn tất:', parsed);
          
          // Xóa payment result sau khi đọc
          localStorage.removeItem('paymentResult');
        }
      } catch (error) {
        console.error('Lỗi parse payment result:', error);
      }
    }

    // Restore trip search data
    if (tripData) {
      try {
        const parsed = JSON.parse(tripData);
        setStartStationName(parsed.startStationName || '');
        setDestinationName(parsed.destinationName || '');
        setManualStartLocation(parsed.manualStartLocation || null);
        setDestinationLocation(parsed.destinationLocation || null);
        setFoundPaths(parsed.foundPaths || null);
        setFoundTripRouteId(parsed.foundTripRouteId || null);
        setTripCost(parsed.tripCost || null);
        
        console.log('🔄 Đã khôi phục thông tin tìm kiếm:', parsed);
        
        // Xóa trip data sau khi restore
        localStorage.removeItem('tripData');
      } catch (error) {
        console.error('Lỗi parse trip data:', error);
      }
    }
  }, []);

  // Handler: Đóng kết quả tìm kiếm
  const handleCloseTripResult = () => {
    setFoundPaths(null);
    setIsShowingTripResult(false);
  };

  // Handler: Lấy vị trí GPS
  const handleGetLocation = async () => {
    setFoundTripRouteId(null);
    setTripCost(null);
    setStartStationName('');
    setManualStartLocation(null); // Xóa vị trí manual khi dùng GPS

    const result = await fetchCurrentLocation();
    alert(result.message);
  };

  // Handler: Cập nhật vị trí bắt đầu từ Nominatim
  const handleStartLocationChange = (lat, lon, displayName) => {
    if (lat && lon) {
      setManualStartLocation([parseFloat(lat), parseFloat(lon)]);
      setStartStationName(displayName);
      clearLocation(); // Xóa GPS location khi chọn manual
    }
  };

  // Handler: Cập nhật vị trí đích từ Nominatim
  const handleDestinationLocationChange = (lat, lon, displayName) => {
    if (lat && lon) {
      setDestinationLocation([parseFloat(lat), parseFloat(lon)]);
      setDestinationName(displayName);
    }
  };

  // Handler: Tìm chuyến xe
  const handleFindTrip = useCallback(async () => {
    setFoundTripRouteId(null);
    setTripCost(null);
    setFoundPaths(null);
    setIsSearching(true);
    setIsPaid(false); // Reset trạng thái thanh toán khi tìm chuyến mới

    try {
      // Xác định tọa độ điểm bắt đầu
      let startLat, startLon;
      const startLocation = manualStartLocation || currentLocation;
      
      if (!startLocation && !startStationName) {
        alert('Vui lòng chọn điểm bắt đầu hoặc dùng GPS.');
        setIsSearching(false);
        return;
      }

      if (startLocation) {
        startLat = startLocation[0];
        startLon = startLocation[1];
      } else {
        // Tìm trạm từ tên
        const station = stations.find(s =>
          s.name.toLowerCase().trim() === startStationName.toLowerCase().trim()
        );
        if (station && station.location && station.location.coordinates) {
          startLon = station.location.coordinates[0];
          startLat = station.location.coordinates[1];
        } else {
          alert('Không tìm thấy tọa độ điểm bắt đầu.');
          setIsSearching(false);
          return;
        }
      }

      // Xác định tọa độ điểm đến
      let endLat, endLon;
      
      if (!destinationLocation && !destinationName) {
        alert('Vui lòng chọn điểm đến.');
        setIsSearching(false);
        return;
      }

      if (destinationLocation) {
        endLat = destinationLocation[0];
        endLon = destinationLocation[1];
      } else {
        // Tìm trạm từ tên
        const station = stations.find(s =>
          s.name.toLowerCase().trim() === destinationName.toLowerCase().trim()
        );
        if (station && station.location && station.location.coordinates) {
          endLon = station.location.coordinates[0];
          endLat = station.location.coordinates[1];
        } else {
          alert('Không tìm thấy tọa độ điểm đến.');
          setIsSearching(false);
          return;
        }
      }

      console.log('🔍 Tìm đường từ:', { startLat, startLon }, 'đến:', { endLat, endLon });

      // Gọi API tìm đường
      const result = await pathfindingAPI.findRoute(startLat, startLon, endLat, endLon, 1000);

      console.log('📍 Kết quả tìm đường:', result);

      if (result.success && result.paths && result.paths.length > 0) {
        setFoundPaths(result);
        setIsShowingTripResult(true);
        
        const bestPath = result.paths[0];
        // Bây giờ segment có routeId thay vì route object
        const routeIds = bestPath.routes.map(r => r.routeId);
        
        // Hiển thị tuyến đầu tiên
        if (routeIds.length > 0) {
          setFoundTripRouteId(routeIds[0]);
        }
        
        setTripCost(bestPath.totalCost);
      } else {
        alert(result.message || 'Không tìm thấy tuyến xe buýt phù hợp.');
      }
    } catch (error) {
      console.error('❌ Lỗi khi tìm đường:', error);
      alert('Lỗi khi tìm đường. Vui lòng thử lại.');
    } finally {
      setIsSearching(false);
    }
  }, [startStationName, destinationName, currentLocation, manualStartLocation, destinationLocation, stations]);

  // Handler: Thanh toán
  const handleCheckout = async () => {
    if (!foundTripRouteId || !tripCost) {
      alert('Vui lòng tìm chuyến xe trước khi thanh toán.');
      return;
    }

    try {
      // Lấy danh sách routeIds từ foundPaths
      const routeIds = foundPaths?.paths?.[0]?.routes?.map(r => r.routeId) || [];
      
      // Lưu thông tin tìm kiếm vào localStorage trước khi redirect
      const tripData = {
        startStationName,
        destinationName,
        manualStartLocation,
        destinationLocation,
        foundPaths,
        foundTripRouteId,
        tripCost,
        routeIds,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('tripData', JSON.stringify(tripData));
      
      // Gọi API tạo URL thanh toán VNPay với routeIds
      const result = await paymentAPI.createPaymentUrl(
        tripCost,
        `Thanh toán vé xe buýt - ${tripCost.toLocaleString()} VND`,
        routeIds
      );

      if (result.success && result.paymentUrl) {
        // Redirect đến trang thanh toán VNPay
        window.location.href = result.paymentUrl;
      } else {
        alert('Lỗi khi tạo thanh toán. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('❌ Lỗi thanh toán:', error);
      alert('Lỗi khi tạo thanh toán. Vui lòng thử lại.');
    }
  };

  // Handler: Lọc tuyến
  const handleRouteSelect = (routeId) => {
    setSelectedRouteId(routeId);
    setFoundTripRouteId(null);
    setTripCost(null);
    // Không reset hideOtherStations - giữ nguyên trạng thái
  };

  // Handler: Toggle ẩn/hiện trạm khác
  const handleToggleOtherStations = () => {
    setHideOtherStations(!hideOtherStations);
  };

  // Filter routes để hiển thị
  const routesToDisplay = selectedRouteId
    ? routes.filter(r => (r._id || r.id) === selectedRouteId)
    : []; // Không hiển thị full routes khi tìm path

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
        isSearching={isSearching}
        tripCost={tripCost}
        isPaid={isPaid}
        selectedRouteId={selectedRouteId}
        hideOtherStations={hideOtherStations}
        foundPaths={foundPaths}
        onStartChange={setStartStationName}
        onDestinationChange={setDestinationName}
        onStartLocationChange={handleStartLocationChange}
        onDestinationLocationChange={handleDestinationLocationChange}
        onGetLocation={handleGetLocation}
        onFindTrip={handleFindTrip}
        onCheckout={handleCheckout}
        onRouteSelect={handleRouteSelect}
        onToggleOtherStations={handleToggleOtherStations}
        onCloseTripResult={handleCloseTripResult}
        isShowingTripResult={isShowingTripResult}
      />

      <div className="map-container">
        <MapView
          stations={stations}
          routes={routesToDisplay}
          currentLocation={currentLocation}
          manualStartLocation={manualStartLocation}
          destinationLocation={destinationLocation}
          highlightedRouteId={foundTripRouteId}
          selectedRouteId={selectedRouteId}
          hideOtherStations={hideOtherStations}
          foundPaths={foundPaths}
        />
      </div>
    </div>
  );
};

export default BusMapPage;
