// src/components/Admin/AddRouteModal.jsx
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { routeAPI } from '../../services/api';
import './AddStationModal.css';
import './AddRouteModal.css';

// Icon cho trạm được chọn
const selectedStationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Icon cho trạm chưa chọn
const availableStationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const AddRouteModal = ({ isOpen, onClose, onSuccess, allStations }) => {
  // Form data
  const [formData, setFormData] = useState({
    routeName: '',
    operatingHours: '',
    ticketPrice: '',
    description: ''
  });

  // Danh sách trạm đã chọn
  const [selectedStations, setSelectedStations] = useState([]);

  // Reset khi mở modal
  useEffect(() => {
    if (isOpen) {
      setFormData({
        routeName: '',
        operatingHours: '',
        ticketPrice: '',
        description: ''
      });
      setSelectedStations([]);
    }
  }, [isOpen]);

  // Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Toggle chọn/bỏ chọn trạm khi click vào marker
  const handleStationClick = (station) => {
    const stationId = station._id || station.id;
    const alreadySelected = selectedStations.find(s => (s._id || s.id) === stationId);
    
    if (alreadySelected) {
      // Bỏ chọn (click lần 2)
      setSelectedStations(prev => {
        const updated = prev.filter(s => (s._id || s.id) !== stationId);
        return updated.map((s, index) => ({ ...s, order: index + 1 }));
      });
    } else {
      // Chọn (click lần 1)
      setSelectedStations(prev => [...prev, {
        ...station,
        order: prev.length + 1
      }]);
    }
  };

  const handleRemoveStation = (stationId) => {
    setSelectedStations(prev => {
      const updated = prev.filter(s => (s._id || s.id) !== stationId);
      return updated.map((s, index) => ({ ...s, order: index + 1 }));
    });
  };

  // Map helpers
  const getPolylinePositions = () => {
    return selectedStations.map(s => [
      s.location.coordinates[1],
      s.location.coordinates[0]
    ]);
  };

  const getMapCenter = () => {
    if (!allStations || allStations.length === 0) {
      return [10.8231, 106.6297]; // TP.HCM mặc định
    }
    // Tính center từ tất cả các trạm
    const latSum = allStations.reduce((sum, s) => sum + s.location.coordinates[1], 0);
    const lngSum = allStations.reduce((sum, s) => sum + s.location.coordinates[0], 0);
    return [latSum / allStations.length, lngSum / allStations.length];
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.routeName.trim()) {
      alert('⚠️ Vui lòng nhập tên tuyến!');
      return;
    }

    if (selectedStations.length < 2) {
      alert('⚠️ Vui lòng chọn ít nhất 2 trạm!');
      return;
    }

    const stationsData = selectedStations.map(s => ({
      stationId: s._id || s.id,
      order: s.order
    }));
    
    const coordinates = selectedStations.map(s => [
      s.location.coordinates[0],
      s.location.coordinates[1]
    ]);

    try {
      const payload = {
        routeName: formData.routeName,
        operatingHours: formData.operatingHours || null,
        ticketPrice: formData.ticketPrice ? parseFloat(formData.ticketPrice) : null,
        description: formData.description || null,
        coordinates,
        stations: stationsData,
        startStationId: selectedStations[0]._id || selectedStations[0].id,
        endStationId: selectedStations[selectedStations.length - 1]._id || selectedStations[selectedStations.length - 1].id
      };

      const newRoute = await routeAPI.create(payload);
      alert('✅ Tuyến xe đã được tạo thành công!');
      onSuccess(newRoute);
      onClose();
    } catch (error) {
      console.error('Error creating route:', error);
      alert(`❌ Lỗi: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content route-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>➕ Thêm Tuyến Đường Mới</h2>
          <button className="btn-close" onClick={onClose}>✖</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            
            {/* BƯỚC 1: THÔNG TIN CƠ BẢN */}
            <div className="route-step-header">
              <span className="step-icon">✏️</span>
              <h3>Bước 1: Thông tin cơ bản</h3>
            </div>

            <div className="route-basic-info-section">
              {/* Tên tuyến - Full width */}
              <div className="form-group">
                <label className="route-label">
                  <span className="label-icon">🚌</span>
                  <span className="label-text">Tên tuyến <span className="required">*</span></span>
                </label>
                <input
                  type="text"
                  name="routeName"
                  className="route-input route-input-large"
                  value={formData.routeName}
                  onChange={handleInputChange}
                  placeholder="VD: Tuyến số 8 – Bến xe Miền Tây → Bến xe An Sương"
                  required
                />
              </div>

              {/* Row with 2 columns */}
              <div className="route-form-row">
                <div className="form-group">
                  <label className="route-label">
                    <span className="label-icon">⏰</span>
                    <span className="label-text">Thời gian hoạt động</span>
                  </label>
                  <div className="route-input-wrapper">
                    <span className="route-input-prefix">🕐</span>
                    <input
                      type="text"
                      name="operatingHours"
                      className="route-input route-input-with-prefix"
                      value={formData.operatingHours}
                      onChange={handleInputChange}
                      placeholder="VD: 5h00 - 22h00"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="route-label">
                    <span className="label-icon">💰</span>
                    <span className="label-text">Giá vé (VNĐ)</span>
                  </label>
                  <div className="route-input-wrapper">
                    <span className="route-input-prefix">₫</span>
                    <input
                      type="number"
                      name="ticketPrice"
                      className="route-input route-input-with-prefix"
                      value={formData.ticketPrice}
                      onChange={handleInputChange}
                      placeholder="VD: 7000"
                      min="0"
                      step="1000"
                    />
                  </div>
                </div>
              </div>

              {/* Mô tả - Full width */}
              <div className="form-group">
                <label className="route-label">
                  <span className="label-icon">📝</span>
                  <span className="label-text">Mô tả về tuyến xe</span>
                  <span className="label-optional">(tùy chọn)</span>
                </label>
                <textarea
                  name="description"
                  className="route-textarea"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Nhập mô tả chi tiết về tuyến xe, các trạm nổi bật, thời gian chạy..."
                  rows="3"
                />
              </div>
            </div>

            {/* BẢN ĐỒ CHỌN TRẠM */}
            <div className="route-step-header">
              <span className="step-icon">🗺️</span>
              <h3>Chọn các trạm thuộc tuyến</h3>
            </div>

            <div className="route-map-instruction">
              <p>
                <span className="icon">👆</span>
                Click vào các trạm trên bản đồ để chọn. Click lần 2 để bỏ chọn. Các trạm sẽ được nối theo thứ tự đã chọn.
              </p>
            </div>

            <div className="route-map-wrapper">
              <div className="route-map-container">
                <MapContainer
                  center={getMapCenter()}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                  />

                  {/* Hiển thị tất cả trạm */}
                  {allStations && allStations.map(station => {
                    const stationId = station._id || station.id;
                    const isSelected = selectedStations.find(s => (s._id || s.id) === stationId);
                    const coords = station.location.coordinates;
                    return (
                      <Marker
                        key={stationId}
                        position={[coords[1], coords[0]]}
                        icon={isSelected ? selectedStationIcon : availableStationIcon}
                        eventHandlers={{
                          click: () => handleStationClick(station)
                        }}
                      />
                    );
                  })}

                  {/* Polyline nối các trạm đã chọn */}
                  {getPolylinePositions().length >= 2 && (
                    <Polyline
                      positions={getPolylinePositions()}
                      color="#6366f1"
                      weight={5}
                      opacity={0.8}
                    />
                  )}
                </MapContainer>
              </div>
            </div>

            {/* DANH SÁCH TRẠM ĐÃ CHỌN */}
            <div className="route-step-header">
              <span className="step-icon">📋</span>
              <h3>Danh sách trạm đã chọn ({selectedStations.length})</h3>
            </div>

            {selectedStations.length === 0 ? (
              <div className="route-empty-state">
                <div className="route-empty-icon">🚏</div>
                <p className="route-empty-text">Chưa có trạm nào được chọn. Click vào trạm trên bản đồ để thêm.</p>
              </div>
            ) : (
              <ul className="route-selected-list">
                {selectedStations.map((station, index) => {
                  const stationId = station._id || station.id;
                  return (
                    <li key={stationId} className="route-selected-item">
                      <span className="route-item-order">{station.order}</span>
                      <div className="route-item-info">
                        <strong className="route-item-name">{station.name}</strong>
                        <small className="route-item-address">{station.address || 'Không có địa chỉ'}</small>
                      </div>
                      <div className="route-item-actions">
                        <button
                          type="button"
                          className="route-action-btn delete"
                          onClick={() => handleRemoveStation(stationId)}
                          title="Xóa"
                        >
                          🗑️
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Footer */}
            <div className="route-modal-footer">
              <button type="button" className="route-btn-cancel" onClick={onClose}>
                ❌ Hủy
              </button>
              <button type="submit" className="route-btn-submit">
                ✅ Lưu Tuyến
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddRouteModal;
