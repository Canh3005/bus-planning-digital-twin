// src/components/Admin/RouteTable.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AddRouteModal from './AddRouteModal';
import EditRouteModal from './EditRouteModal';
import ViewRouteModal from './ViewRouteModal';
import { routeAPI } from '../../services/api';
import './Table.css';

const RouteTable = ({ routes, loading, onRefetch, allStations }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('searchText') || '');
  const [filteredRoutes, setFilteredRoutes] = useState(routes || []);
  const [, setIsSearching] = useState(false);

  // useEffect to call API when searchTerm changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim()) {
        setIsSearching(true);
        try {
          const results = await routeAPI.search(searchTerm);
          setFilteredRoutes(results);
          // Update URL with search query
          setSearchParams({ searchText: searchTerm });
        } catch (error) {
          console.error('Error searching routes:', error);
          setFilteredRoutes([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setFilteredRoutes(routes || []);
        // Remove search query from URL
        setSearchParams({});
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, routes, setSearchParams]);

  // Update filtered routes when routes prop changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRoutes(routes || []);
    }
  }, [routes, searchTerm]);

  const handleAddSuccess = (newRoute) => {
    console.log('New route created:', newRoute);
    onRefetch(); // Làm mới danh sách tuyến
  };

  const handleEditSuccess = (updatedRoute) => {
    console.log('Route updated:', updatedRoute);
    onRefetch(); // Làm mới danh sách tuyến
  };

  const handleView = (route) => {
    setSelectedRoute(route);
    setIsViewModalOpen(true);
  };

  const handleEdit = (route) => {
    setSelectedRoute(route);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (route) => {
    const routeId = route._id || route.id;
    const routeName = route.routeName || route.name;
    
    const confirmDelete = window.confirm(
      `⚠️ Bạn có chắc chắn muốn xóa tuyến "${routeName}"?\n\nHành động này không thể hoàn tác!`
    );

    if (!confirmDelete) return;

    try {
      await routeAPI.delete(routeId);
      alert(`✅ Đã xóa tuyến "${routeName}" thành công!`);
      onRefetch(); // Làm mới danh sách
    } catch (error) {
      console.error('Error deleting route:', error);
      alert(`❌ Lỗi khi xóa tuyến: ${error.message}`);
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

  if (!routes || routes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🚌</div>
        <h3>Chưa có tuyến xe nào</h3>
        <p>Hệ thống chưa có dữ liệu tuyến xe buýt</p>
        <button className="btn-add" onClick={() => setIsAddModalOpen(true)}>
          <span>➕</span> Thêm Tuyến Mới
        </button>
        
        {/* Add Route Modal */}
        <AddRouteModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddSuccess}
          allStations={allStations}
        />
      </div>
    );
  }

  return (
    <div className="table-container">
      <div className="table-header">
        <h3>Danh sách tuyến xe ({filteredRoutes.length}/{routes.length})</h3>
        <div className="header-actions">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Tìm kiếm tuyến..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="btn-add" onClick={() => setIsAddModalOpen(true)}>
            <span>➕</span> Thêm Tuyến Mới
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên Tuyến</th>
              <th>Điểm Đầu</th>
              <th>Điểm Cuối</th>
              <th>Số Điểm Dừng</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredRoutes.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                  Không tìm thấy tuyến nào phù hợp với "{searchTerm}"
                </td>
              </tr>
            ) : (
              filteredRoutes.map((route) => {
              // Xử lý cấu trúc dữ liệu MongoDB
              const routeId = route._id || route.id;
              const routeName = route.routeName || route.name;
              const startStation = route.startStationId?.name || route.start || 'N/A';
              const endStation = route.endStationId?.name || route.end || 'N/A';
              
              // Số điểm dừng = số trạm trong stations array
              const stationCount = route.stations?.length || 0;

              return (
                <tr key={routeId}>
                  <td className="td-id">{routeId}</td>
                  <td className="td-name">
                    <strong>{routeName}</strong>
                  </td>
                  <td className="td-station">{startStation}</td>
                  <td className="td-station">{endStation}</td>
                  <td className="td-count">
                    <span className="badge">{stationCount} trạm</span>
                  </td>
                  <td className="td-actions">
                    <button 
                      className="btn-action btn-view" 
                      title="Xem chi tiết"
                      onClick={() => handleView(route)}
                    >
                      👁️
                    </button>
                    <button 
                      className="btn-action btn-edit" 
                      title="Chỉnh sửa"
                      onClick={() => handleEdit(route)}
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-action btn-delete" 
                      title="Xóa"
                      onClick={() => handleDelete(route)}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Route Modal */}
      <AddRouteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
        allStations={allStations}
      />

      {/* Edit Route Modal */}
      <EditRouteModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        route={selectedRoute}
        allStations={allStations}
      />

      {/* View Route Modal */}
      <ViewRouteModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        route={selectedRoute}
      />
    </div>
  );
};

export default RouteTable;
