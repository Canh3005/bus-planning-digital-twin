// src/components/Controls/TripPlanner.jsx
import React, { useState, useRef, useEffect } from 'react';
import './TripPlanner.css';

const TripPlanner = ({
  startStationName,
  destinationName,
  stations,
  currentLocation,
  isLoadingLocation,
  onStartChange,
  onDestinationChange,
  onStartLocationChange,
  onDestinationLocationChange,
  onGetLocation,
  onFindTrip,
}) => {
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [isLoadingStart, setIsLoadingStart] = useState(false);
  const [isLoadingDest, setIsLoadingDest] = useState(false);
  const startInputRef = useRef(null);
  const destInputRef = useRef(null);
  const startSuggestionsRef = useRef(null);
  const destSuggestionsRef = useRef(null);

  // Fetch địa điểm từ Nominatim API cho điểm bắt đầu
  useEffect(() => {
    if (!startStationName || startStationName.trim().length === 0) {
      setStartSuggestions([]);
      return;
    }

    setIsLoadingStart(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            startStationName
          )}&limit=5&countrycodes=vn`
        );
        const data = await response.json();
        setStartSuggestions(data);
      } catch (error) {
        console.error('Error fetching start suggestions:', error);
        setStartSuggestions([]);
      } finally {
        setIsLoadingStart(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [startStationName]);

  // Fetch địa điểm từ Nominatim API cho điểm đến
  useEffect(() => {
    if (!destinationName || destinationName.trim().length === 0) {
      setDestSuggestions([]);
      return;
    }

    setIsLoadingDest(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            destinationName
          )}&limit=5&countrycodes=vn`
        );
        const data = await response.json();
        setDestSuggestions(data);
      } catch (error) {
        console.error('Error fetching destination suggestions:', error);
        setDestSuggestions([]);
      } finally {
        setIsLoadingDest(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [destinationName]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (startSuggestionsRef.current && !startSuggestionsRef.current.contains(event.target) &&
          !startInputRef.current.contains(event.target)) {
        setShowStartSuggestions(false);
      }
      if (destSuggestionsRef.current && !destSuggestionsRef.current.contains(event.target) &&
          !destInputRef.current.contains(event.target)) {
        setShowDestSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handler chọn gợi ý điểm bắt đầu
  const handleSelectStartSuggestion = (place) => {
    onStartChange(place.display_name);
    // Gọi callback để cập nhật location với tọa độ
    if (onStartLocationChange && place.lat && place.lon) {
      onStartLocationChange(place.lat, place.lon, place.display_name);
    }
    setShowStartSuggestions(false);
  };

  // Handler chọn gợi ý điểm đến
  const handleSelectDestSuggestion = (place) => {
    onDestinationChange(place.display_name);
    // Gọi callback để cập nhật location với tọa độ
    if (onDestinationLocationChange && place.lat && place.lon) {
      onDestinationLocationChange(place.lat, place.lon, place.display_name);
    }
    setShowDestSuggestions(false);
  };

  return (
    <div className="trip-planner">
      {/* Điểm bắt đầu với autocomplete */}
      <div className="input-wrapper">
        <input
          ref={startInputRef}
          type="text"
          placeholder="Trạm Đi (Bắt Đầu)"
          value={startStationName}
          onChange={(e) => {
            onStartChange(e.target.value);
            setShowStartSuggestions(true);
          }}
          onFocus={() => setShowStartSuggestions(true)}
        />
        {showStartSuggestions && !isLoadingStart && startStationName && startSuggestions.length > 0 && (
          <ul ref={startSuggestionsRef} className="suggestions-dropdown">
            {startSuggestions.map((place, index) => (
              <li
                key={place.place_id || index}
                onClick={() => handleSelectStartSuggestion(place)}
                className="suggestion-item"
              >
                <span className="suggestion-icon">📍</span>
                <div className="suggestion-info">
                  <div className="suggestion-name">{place.display_name}</div>
                  {place.type && (
                    <div className="suggestion-address">{place.type}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {showStartSuggestions && isLoadingStart && (
          <div className="suggestions-dropdown loading">
            <div className="suggestion-item">⏳ Đang tìm kiếm...</div>
          </div>
        )}
      </div>
      
      <button 
        onClick={onGetLocation} 
        className="btn-gps"
        disabled={isLoadingLocation}
      >
        {isLoadingLocation ? '⏳ Đang lấy...' : currentLocation ? '✅ GPS' : '📍 Dùng GPS'}
      </button>
      
      {/* Điểm đến với autocomplete */}
      <div className="input-wrapper">
        <input
          ref={destInputRef}
          type="text"
          placeholder="Trạm Đích (Điểm Xuống)"
          value={destinationName}
          onChange={(e) => {
            onDestinationChange(e.target.value);
            setShowDestSuggestions(true);
          }}
          onFocus={() => setShowDestSuggestions(true)}
        />
        {showDestSuggestions && !isLoadingDest && destinationName && destSuggestions.length > 0 && (
          <ul ref={destSuggestionsRef} className="suggestions-dropdown">
            {destSuggestions.map((place, index) => (
              <li
                key={place.place_id || index}
                onClick={() => handleSelectDestSuggestion(place)}
                className="suggestion-item"
              >
                <span className="suggestion-icon">📍</span>
                <div className="suggestion-info">
                  <div className="suggestion-name">{place.display_name}</div>
                  {place.type && (
                    <div className="suggestion-address">{place.type}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {showDestSuggestions && isLoadingDest && (
          <div className="suggestions-dropdown loading">
            <div className="suggestion-item">⏳ Đang tìm kiếm...</div>
          </div>
        )}
      </div>

      <button
        onClick={onFindTrip}
        className="btn-find-trip"
        disabled={!startStationName && !currentLocation}
      >
        Tìm Chuyến Xe
      </button>
    </div>
  );
};

export default TripPlanner;
