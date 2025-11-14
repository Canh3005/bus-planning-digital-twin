// ~/bus-admin-backend/bus-admin-frontend/src/components/Admin/AddStationModal.jsx
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { stationAPI } from '../../services/api';
import './AddStationModal.css';

// Icon cho marker mới
const newStationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component xử lý click trên map
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });
  return null;
}

// Component xử lý resize map khi fullscreen
function MapResizeHandler({ isFullscreen }) {
  const map = useMap();
  
  useEffect(() => {
    // Delay một chút để đợi CSS transition hoàn thành
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isFullscreen, map]);
  
  return null;
}

const AddStationModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    latitude: null,
    longitude: null,
  });
  
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errors, setErrors] = useState({});
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // Reverse geocoding - lấy địa chỉ từ tọa độ
  const reverseGeocode = async (lat, lng) => {
    setIsLoadingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'vi',
          }
        }
      );
      const data = await response.json();
      
      if (data.display_name) {
        setFormData(prev => ({
          ...prev,
          address: data.display_name,
        }));
      }
    } catch (error) {
      console.error('Lỗi reverse geocoding:', error);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  // Forward geocoding - tìm kiếm địa điểm
  const searchPlace = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=vn`,
        {
          headers: {
            'Accept-Language': 'vi',
          }
        }
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Lỗi tìm kiếm:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchPlace(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handler: Click trên map
  const handleMapClick = (lat, lng) => {
    setSelectedLocation([lat, lng]);
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
    reverseGeocode(lat, lng);
  };

  // Handler: Chọn địa điểm từ search
  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    setSelectedLocation([lat, lng]);
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address: result.display_name,
      name: prev.name || result.name || result.display_name.split(',')[0],
    }));
    setSearchQuery('');
    setSearchResults([]);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Tên trạm không được để trống';
    }
    
    if (!formData.latitude || !formData.longitude) {
      newErrors.location = 'Vui lòng chọn vị trí trên bản đồ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const newStation = await stationAPI.create(formData);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        address: '',
        latitude: null,
        longitude: null,
      });
      setSelectedLocation(null);
      setErrors({});
      setIsMapFullscreen(false);
      
      // Callback success
      onSuccess(newStation);
      
      alert('✅ Thêm trạm thành công!');
    } catch (error) {
      console.error('Lỗi khi thêm trạm:', error);
      alert('❌ Có lỗi xảy ra. Vui lòng thử lại!');
    }
  };

  // Toggle fullscreen map
  const toggleFullscreen = () => {
    setIsMapFullscreen(!isMapFullscreen);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>➕ Thêm Trạm Mới</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Phần 1: Tìm kiếm địa điểm */}
          <div className="search-section">
            <label className="form-label">
              🔍 Tìm kiếm địa điểm
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Nhập tên địa điểm (VD: Bến xe Miền Đông, ĐH Bách Khoa...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            {isSearching && (
              <div className="search-loading">Đang tìm kiếm...</div>
            )}
            
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="search-result-item"
                    onClick={() => handleSelectSearchResult(result)}
                  >
                    <div className="result-icon">📍</div>
                    <div className="result-info">
                      <div className="result-name">{result.name || result.display_name.split(',')[0]}</div>
                      <div className="result-address">{result.display_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Phần 2: Bản đồ chọn vị trí */}
          <div className="map-section">
            <label className="form-label">
              📍 Click vào bản đồ để chọn vị trí
            </label>
            <div className={`map-container-modal ${isMapFullscreen ? 'fullscreen' : ''}`}>
              <button 
                className="btn-fullscreen" 
                onClick={toggleFullscreen}
                type="button"
                title={isMapFullscreen ? 'Thu nhỏ' : 'Mở rộng'}
              >
                {isMapFullscreen ? '✕' : '⛶'}
              </button>
              <MapContainer
                center={selectedLocation || [21.0285, 105.8542]}
                zoom={13}
                style={{ height: '300px', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                <MapClickHandler onLocationSelect={handleMapClick} />
                <MapResizeHandler isFullscreen={isMapFullscreen} />
                {selectedLocation && (
                  <Marker position={selectedLocation} icon={newStationIcon} />
                )}
              </MapContainer>
            </div>
            {errors.location && (
              <div className="error-message">{errors.location}</div>
            )}
          </div>

          {/* Phần 3: Form nhập thông tin */}
          <form onSubmit={handleSubmit} className="station-form">
            <div className="form-group">
              <label className="form-label">
                🏷️ Tên trạm <span className="required">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.name ? 'error' : ''}`}
                placeholder="VD: Bến xe Miền Đông"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {errors.name && (
                <div className="error-message">{errors.name}</div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">📍 Vĩ độ (Latitude)</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="21.0285"
                  value={formData.latitude || ''}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">📍 Kinh độ (Longitude)</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="105.8542"
                  value={formData.longitude || ''}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                🏙️ Địa chỉ
                {isLoadingAddress && <span className="loading-text"> (Đang tải...)</span>}
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Địa chỉ sẽ được tự động điền khi bạn chọn vị trí"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">📝 Mô tả / Ghi chú</label>
              <textarea
                className="form-textarea"
                placeholder="Thông tin bổ sung về trạm xe..."
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>
                Hủy
              </button>
              <button type="submit" className="btn-submit">
                💾 Lưu Trạm
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddStationModal;
