// src/components/Admin/StationTable.jsx
import React, { useState } from 'react';
import AddStationModal from './AddStationModal';
import EditStationModal from './EditStationModal';
import { stationAPI } from '../../services/api';
import './Table.css';

const StationTable = ({ stations, loading, onRefetch }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);

  const handleAddSuccess = (newStation) => {
    setIsAddModalOpen(false);
    onRefetch();
  };

  const handleEditSuccess = (updatedStation) => {
    setIsEditModalOpen(false);
    setSelectedStation(null);
    onRefetch();
  };

  const handleEdit = (station) => {
    setSelectedStation(station);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (station) => {
    const stationId = station._id || station.id;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa trạm "${station.name}"?\n\nHành động này không thể hoàn tác!`
    );

    if (!confirmed) return;

    try {
      await stationAPI.delete(stationId);
      alert('✅ Xóa trạm thành công!');
      onRefetch();
    } catch (error) {
      console.error('Lỗi khi xóa trạm:', error);
      alert('❌ Có lỗi xảy ra khi xóa trạm!');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (!stations || stations.length === 0) {
    return (
      <>
        <div className="empty-state">
          <div className="empty-icon">🚏</div>
          <h3>Chưa có trạm xe nào</h3>
          <p>Hệ thống chưa có dữ liệu trạm xe buýt</p>
          <button className="btn-add" onClick={() => setIsAddModalOpen(true)}>
            <span>➕</span> Thêm Trạm Đầu Tiên
          </button>
        </div>
        
        <AddStationModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddSuccess}
        />
      </>
    );
  }

  return (
    <>
      <div className="table-container">
        <div className="table-header">
          <h3>Danh sách trạm xe ({stations.length})</h3>
          <button className="btn-add" onClick={() => setIsAddModalOpen(true)}>
            <span>➕</span> Thêm Trạm Mới
          </button>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên Trạm</th>
                <th>Mô Tả</th>
                <th>Vị Trí (Lat, Lng)</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((station) => {
                const stationId = station._id || station.id;
                const coords = station.location?.coordinates || [0, 0];
                return (
                  <tr key={stationId}>
                    <td className="td-id">{stationId}</td>
                    <td className="td-name">
                      <strong>{station.name}</strong>
                    </td>
                    <td className="td-description">{station.description || station.address || '—'}</td>
                    <td className="td-location">
                      <code>
                        {coords[1].toFixed(6)}, {coords[0].toFixed(6)}
                      </code>
                    </td>
                    <td className="td-actions">
                      <button 
                        className="btn-action btn-edit" 
                        title="Chỉnh sửa"
                        onClick={() => handleEdit(station)}
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-action btn-delete" 
                        title="Xóa"
                        onClick={() => handleDelete(station)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AddStationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      <EditStationModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedStation(null);
        }}
        onSuccess={handleEditSuccess}
        station={selectedStation}
      />
    </>
  );
};

export default StationTable;
