// src/pages/BusMapPage.jsx
import React, { useState, useCallback } from 'react';
import MapView from '../components/Map/MapView';
import ControlPanel from '../components/Controls/ControlPanel';
import UserMenu from '../components/UserMenu';
import TripResultBox from '../components/Controls/TripResultBox'; // <-- Import mới
import { useStations } from '../hooks/useStations';
import { useRoutes } from '../hooks/useRoutes';
import { useGeolocation } from '../hooks/useGeolocation';
import { findClosestStation } from '../utils/geolocation';
import { routeAPI } from '../services/api'; // <-- Import mới
import './BusMapPage.css';

const BusMapPage = () => {
    const { stations, loading: stationsLoading } = useStations();
    const { routes, loading: routesLoading } = useRoutes();
    const { currentLocation, isLoadingLocation, fetchCurrentLocation, clearLocation } = useGeolocation();

    // --- State Cũ ---
    const [selectedRouteId, setSelectedRouteId] = useState(null);
    const [startStationName, setStartStationName] = useState('');
    const [destinationName, setDestinationName] = useState('');
    // const [foundTripRouteId, setFoundTripRouteId] = useState(null); // Không dùng nữa, thay bằng selectedTrip
    const [tripCost, setTripCost] = useState(null);
    const [hideOtherStations, setHideOtherStations] = useState(false);
    const [destinationLocation, setDestinationLocation] = useState(null); // [lat, lon]
    const [manualStartLocation, setManualStartLocation] = useState(null); // [lat, lon]

    // --- State Mới cho Logic Tìm chuyến đi Nối tuyến ---
    const [tripResults, setTripResults] = useState(null); // Chứa kết quả đầy đủ từ routeAPI.findTrip
    const [isFindingTrip, setIsFindingTrip] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState(null); // Chuyến đi chi tiết được chọn từ TripResultBox
    
    // Hàm Helper: Lấy vị trí bắt đầu (ưu tiên GPS nếu đang bật)
    const getStartLocation = useCallback(() => {
        if (currentLocation && !manualStartLocation) {
            // Dùng GPS
            return {
                lat: currentLocation[0],
                lng: currentLocation[1],
                name: startStationName || 'Vị trí hiện tại',
            };
        }
        if (manualStartLocation) {
            // Dùng vị trí chọn thủ công
            return {
                lat: manualStartLocation[0],
                lng: manualStartLocation[1],
                name: startStationName,
            };
        }
        return null;
    }, [currentLocation, manualStartLocation, startStationName]);


    // Handler: Lấy vị trí GPS
    const handleGetLocation = async () => {
        // Reset trip states
        setTripResults(null);
        setSelectedTrip(null);
        setTripCost(null);
        setStartStationName('');
        setManualStartLocation(null); 
        
        const result = await fetchCurrentLocation();
        if (result.success) {
             // Sau khi lấy GPS thành công, tìm trạm gần nhất để hiển thị tên
             const closest = findClosestStation(result.location[0], result.location[1], stations);
             if (closest) {
                 alert(`Đã lấy vị trí. Trạm gần nhất: ${closest.name}`);
                 // Cập nhật tên trạm cho input nhưng vẫn dùng tọa độ GPS
                 setStartStationName(closest.name); 
             }
        } else {
             alert(result.message);
        }
    };

    // Handler: Cập nhật vị trí bắt đầu từ Nominatim
    const handleStartLocationChange = (lat, lon, displayName) => {
        if (lat && lon) {
            setManualStartLocation([parseFloat(lat), parseFloat(lon)]);
            setStartStationName(displayName);
            clearLocation(); // Xóa GPS location khi chọn manual
            setTripResults(null);
            setSelectedTrip(null);
        }
    };

    // Handler: Cập nhật vị trí đích từ Nominatim
    const handleDestinationLocationChange = (lat, lon, displayName) => {
        if (lat && lon) {
            setDestinationLocation([parseFloat(lat), parseFloat(lon)]);
            setDestinationName(displayName);
            setTripResults(null);
            setSelectedTrip(null);
        }
    };

    // Handler: Tìm chuyến xe (Gọi API tìm nối tuyến)
    const handleFindTrip = useCallback(async () => {
        const startLoc = getStartLocation();
        
        if (!startLoc || !destinationLocation) {
            alert('Vui lòng chọn đầy đủ điểm bắt đầu và điểm đến.');
            return;
        }

        setIsFindingTrip(true);
        setTripResults(null);
        setSelectedTrip(null); // Xóa chuyến đi cũ trên bản đồ
        setTripCost(null);

        try {
            const tripData = {
                // Backend mong muốn [lat, lng]
                startLocation: [startLoc.lat, startLoc.lng], 
                destinationLocation: [destinationLocation[0], destinationLocation[1]], 
                startName: startLoc.name,
                destinationName: destinationName,
            };
            
            const results = await routeAPI.findTrip(tripData);

            if (results.trips.length > 0) {
                // Tự động chọn chuyến đi tối ưu nhất để hiển thị trên bản đồ
                const bestTrip = results.trips[0];
                setSelectedTrip(bestTrip);
                setTripCost(bestTrip.routeSegments[0]?.ticketPrice || 10000); // Tạm thời lấy giá cố định
                alert(`🚌 Tìm thấy ${results.trips.length} lộ trình! Lộ trình tối ưu có tổng thời gian ${Math.round(bestTrip.totalTime)} phút.`);
            } else {
                alert(results.message || 'Không tìm thấy tuyến xe buýt phù hợp, kể cả nối tuyến.');
            }
            
            setTripResults(results);

        } catch (error) {
            console.error("Lỗi tìm chuyến đi:", error);
            alert("Lỗi khi tìm chuyến đi. Vui lòng thử lại.");
            setTripResults({ trips: [], message: "Lỗi hệ thống khi tìm chuyến đi." });
        } finally {
            setIsFindingTrip(false);
        }
    }, [destinationLocation, destinationName, getStartLocation]);

    // Handler: Chọn một tùy chọn chuyến đi từ TripResultBox
    const handleSelectTrip = useCallback((trip) => {
        setSelectedTrip(trip);
        setTripCost(trip.routeSegments[0]?.ticketPrice || 10000); // Cập nhật giá vé (giả định)
    }, []);

    // Handler: Thanh toán
    const handleCheckout = () => {
        if (!selectedTrip || !tripCost) {
            alert('Vui lòng tìm và chọn chuyến xe trước khi thanh toán.');
            return;
        }

        alert(`Thanh toán ${tripCost.toLocaleString()} VND thành công cho lộ trình đã chọn!`);

        // Reset state
        setTripResults(null);
        setSelectedTrip(null);
        setTripCost(null);
        setStartStationName('');
        setDestinationName('');
        clearLocation();
        setDestinationLocation(null);
        setManualStartLocation(null);
    };

    // Handler: Lọc tuyến
    const handleRouteSelect = (routeId) => {
        setSelectedRouteId(routeId);
        // Reset trip states khi chuyển sang chế độ lọc tuyến đơn
        setTripResults(null);
        setSelectedTrip(null);
        setTripCost(null);
    };

    // Handler: Toggle ẩn/hiện trạm khác
    const handleToggleOtherStations = () => {
        setHideOtherStations(!hideOtherStations);
    };

    // Filter routes để hiển thị (khi người dùng dùng RouteFilter)
    const routesToDisplay = selectedRouteId
        ? routes.filter(r => (r._id || r.id) === selectedRouteId)
        : [];
        
    // Lấy tuyến từ chuyến đi được chọn để MapView hiển thị
    const tripRoutesToDisplay = selectedTrip 
        ? selectedTrip.routeSegments.map(seg => routes.find(r => (r._id || r.id).toString() === seg.routeId.toString())).filter(Boolean)
        : [];

    if (stationsLoading || routesLoading || isFindingTrip) {
        return <div className="loading">Đang tải dữ liệu...</div>;
    }

    // Xác định điểm Start/End để MapView có thể highlight marker
    const mapStartLocation = manualStartLocation || (currentLocation ? currentLocation : null);
    const mapDestinationLocation = destinationLocation;

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
                hideOtherStations={hideOtherStations}
                onStartChange={setStartStationName}
                onDestinationChange={setDestinationName}
                onStartLocationChange={handleStartLocationChange}
                onDestinationLocationChange={handleDestinationLocationChange}
                onGetLocation={handleGetLocation}
                onFindTrip={handleFindTrip}
                onCheckout={handleCheckout}
                onRouteSelect={handleRouteSelect}
                onToggleOtherStations={handleToggleOtherStations}
            >
                {/* Chèn TripResultBox vào ControlPanel, dưới TripPlanner */}
                {tripResults && (
                    <TripResultBox 
                        results={tripResults} 
                        isLoading={isFindingTrip} 
                        onSelectTrip={handleSelectTrip} 
                    />
                )}
            </ControlPanel>

            <div className="map-container">
                <MapView
                    stations={stations}
                    routes={selectedRouteId ? routesToDisplay : tripRoutesToDisplay} // Ưu tiên hiển thị tuyến từ Trip, nếu không thì tuyến lọc
                    currentLocation={currentLocation}
                    manualStartLocation={mapStartLocation}
                    destinationLocation={mapDestinationLocation}
                    highlightedTrip={selectedTrip} // Truyền toàn bộ đối tượng chuyến đi được chọn
                    selectedRouteId={selectedRouteId}
                    hideOtherStations={hideOtherStations}
                />
            </div>
        </div>
    );
};

export default BusMapPage;
