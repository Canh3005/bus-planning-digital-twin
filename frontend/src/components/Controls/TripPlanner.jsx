// src/components/Controls/TripPlanner.jsx
import React, { useState, useRef, useEffect } from 'react';
import './TripPlanner.css';

const TripPlanner = ({
  startStationName,
  destinationName,
  stations,
  currentLocation,
  isLoadingLocation,
  isSearching,
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

  // Fetch địa điểm từ Goong Maps API cho điểm bắt đầu
  useEffect(() => {
    if (!startStationName || startStationName.trim().length === 0) {
      setStartSuggestions([]);
      return;
    }

    setIsLoadingStart(true);
    const timer = setTimeout(async () => {
      try {
        // Sử dụng Goong Autocomplete API (miễn phí với API key)
        const GOONG_API_KEY = 'WOZZEOLjXEv4aUGKRUdtjRu1injMl1lCyx8bVwwh'; // Demo key, nên thay bằng key riêng
        const response = await fetch(
          `https://rsapi.goong.io/Place/AutoComplete?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(
            startStationName
          )}&limit=5&location=10.762622,106.660172&radius=50000`
        );
        const data = await response.json();
        console.log('Goong Autocomplete response:', data);
        
        // Transform Goong response to match expected format
        const suggestions = (data.predictions || []).map(place => ({
          place_id: place.place_id,
          display_name: place.description,
          lat: null, // Will be fetched on selection
          lon: null,
          type: place.structured_formatting?.secondary_text || '',
          goong_place_id: place.place_id
        }));
        
        setStartSuggestions(suggestions);
      } catch (error) {
        console.error('Error fetching start suggestions:', error);
        setStartSuggestions([]);
      } finally {
        setIsLoadingStart(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [startStationName]);

  // Fetch địa điểm từ Goong Maps API cho điểm đến
  useEffect(() => {
    if (!destinationName || destinationName.trim().length === 0) {
      setDestSuggestions([]);
      return;
    }

    setIsLoadingDest(true);
    const timer = setTimeout(async () => {
      try {
        // Sử dụng Goong Autocomplete API (miễn phí với API key)
        const GOONG_API_KEY = 'WOZZEOLjXEv4aUGKRUdtjRu1injMl1lCyx8bVwwh'; // Demo key, nên thay bằng key riêng
        const response = await fetch(
          `https://rsapi.goong.io/Place/AutoComplete?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(
            destinationName
          )}&limit=5&location=10.762622,106.660172&radius=50000`
        );
        const data = await response.json();
        
        // Transform Goong response to match expected format
        const suggestions = (data.predictions || []).map(place => ({
          place_id: place.place_id,
          display_name: place.description,
          lat: null, // Will be fetched on selection
          lon: null,
          type: place.structured_formatting?.secondary_text || '',
          goong_place_id: place.place_id
        }));
        
        setDestSuggestions(suggestions);
      } catch (error) {
        console.error('Error fetching destination suggestions:', error);
        setDestSuggestions([]);
      } finally {
        setIsLoadingDest(false);
      }
    }, 300);

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
  const handleSelectStartSuggestion = async (place) => {
    onStartChange(place.display_name);
    setShowStartSuggestions(false);
    
    // Fetch tọa độ từ Goong Place Detail API
    if (onStartLocationChange && place.goong_place_id) {
      try {
        const GOONG_API_KEY = 'WOZZEOLjXEv4aUGKRUdtjRu1injMl1lCyx8bVwwh';
        const response = await fetch(
          `https://rsapi.goong.io/Place/Detail?place_id=${place.goong_place_id}&api_key=${GOONG_API_KEY}`
        );
        const data = await response.json();
        
        if (data.result && data.result.geometry && data.result.geometry.location) {
          const { lat, lng } = data.result.geometry.location;
          onStartLocationChange(lat, lng, place.display_name);
        }
      } catch (error) {
        console.error('Error fetching place details:', error);
      }
    }
  };

  // Handler chọn gợi ý điểm đến
  const handleSelectDestSuggestion = async (place) => {
    onDestinationChange(place.display_name);
    setShowDestSuggestions(false);
    
    // Fetch tọa độ từ Goong Place Detail API
    if (onDestinationLocationChange && place.goong_place_id) {
      try {
        const GOONG_API_KEY = 'WOZZEOLjXEv4aUGKRUdtjRu1injMl1lCyx8bVwwh';
        const response = await fetch(
          `https://rsapi.goong.io/Place/Detail?place_id=${place.goong_place_id}&api_key=${GOONG_API_KEY}`
        );
        const data = await response.json();
        
        if (data.result && data.result.geometry && data.result.geometry.location) {
          const { lat, lng } = data.result.geometry.location;
          onDestinationLocationChange(lat, lng, place.display_name);
        }
      } catch (error) {
        console.error('Error fetching place details:', error);
      }
    }
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
        disabled={(!startStationName && !currentLocation) || isSearching}
      >
        {isSearching ? '🔍 Đang tìm...' : 'Tìm Chuyến Xe'}
      </button>
    </div>
  );
};

export default TripPlanner;
