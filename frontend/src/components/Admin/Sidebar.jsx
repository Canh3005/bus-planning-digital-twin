// src/components/Admin/Sidebar.jsx
import React from 'react';
import './Sidebar.css';

const Sidebar = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'stations', icon: '🚏', label: 'Trạm Xe' },
    { id: 'routes', icon: '🚌', label: 'Tuyến Xe' },
    { id: 'revenue', icon: '📊', label: 'Thống Kê' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>🚍 Bus Admin</h2>
        <p>Quản Lý Hệ Thống</p>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">👤</div>
          <div className="user-details">
            <p className="user-name">Admin</p>
            <p className="user-role">Quản trị viên</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
