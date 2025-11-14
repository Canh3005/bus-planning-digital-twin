// src/components/UserMenu.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './UserMenu.css';

const UserMenu = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    // Lấy user từ localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Close menu khi click outside
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    authAPI.logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="user-menu" ref={menuRef}>
      <button 
        className="user-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="user-avatar">
          {user.username?.charAt(0).toUpperCase() || '👤'}
        </div>
        <div className="user-info">
          <span className="user-name">{user.username}</span>
          <span className="user-role">
            {user.role === 'admin' ? '👑 Admin' : '👤 User'}
          </span>
        </div>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <div className="user-avatar-large">
              {user.username?.charAt(0).toUpperCase() || '👤'}
            </div>
            <div className="user-details">
              <strong>{user.username}</strong>
              <small>{user.email}</small>
            </div>
          </div>

          <div className="user-menu-divider"></div>

          <div className="user-menu-items">
            {user.role === 'admin' && (
              <button 
                className="user-menu-item"
                onClick={() => {
                  navigate('/admin');
                  setIsOpen(false);
                }}
              >
                <span className="item-icon">⚙️</span>
                <span>Quản trị</span>
              </button>
            )}
            
            <button 
              className="user-menu-item"
              onClick={() => {
                navigate('/');
                setIsOpen(false);
              }}
            >
              <span className="item-icon">🗺️</span>
              <span>Bản đồ</span>
            </button>

            <div className="user-menu-divider"></div>

            <button 
              className="user-menu-item logout"
              onClick={handleLogout}
            >
              <span className="item-icon">🚪</span>
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
