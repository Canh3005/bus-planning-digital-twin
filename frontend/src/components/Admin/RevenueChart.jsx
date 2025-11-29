// src/components/Admin/RevenueChart.jsx
import React, { useState, useEffect } from 'react';
import { revenueAPI } from '../../services/api';
import './RevenueChart.css';

const RevenueChart = () => {
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'yearly'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const months = [
    { value: 1, label: 'Tháng 1' },
    { value: 2, label: 'Tháng 2' },
    { value: 3, label: 'Tháng 3' },
    { value: 4, label: 'Tháng 4' },
    { value: 5, label: 'Tháng 5' },
    { value: 6, label: 'Tháng 6' },
    { value: 7, label: 'Tháng 7' },
    { value: 8, label: 'Tháng 8' },
    { value: 9, label: 'Tháng 9' },
    { value: 10, label: 'Tháng 10' },
    { value: 11, label: 'Tháng 11' },
    { value: 12, label: 'Tháng 12' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchRevenueData();
  }, [viewMode, selectedMonth, selectedYear]);

  const fetchRevenueData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = viewMode === 'monthly' 
        ? { month: selectedMonth, year: selectedYear }
        : { year: selectedYear };

      const response = await revenueAPI.getRevenueReport(params.month, params.year);
      if (response.success) {
        setRevenueData(response.data || []);
      } else {
        setError(response.message || 'Không thể tải dữ liệu');
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu doanh thu:', err);
      setError('Lỗi khi tải dữ liệu doanh thu');
      setRevenueData([]);
    } finally {
      setLoading(false);
    }
  };

  const maxRevenue = Math.max(...revenueData.map(item => item.totalRevenue || 0), 1);
  const totalRevenue = revenueData.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);

  return (
    <div className="revenue-chart-container">
      <div className="revenue-header">

        <div className="revenue-controls">
          <div className="view-mode-toggle">
            <button
              className={`mode-btn ${viewMode === 'monthly' ? 'active' : ''}`}
              onClick={() => setViewMode('monthly')}
            >
              📅 Theo Tháng
            </button>
            <button
              className={`mode-btn ${viewMode === 'yearly' ? 'active' : ''}`}
              onClick={() => setViewMode('yearly')}
            >
              📆 Theo Năm
            </button>
          </div>

          <div className="filter-controls">
            {viewMode === 'monthly' && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="filter-select"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="filter-select"
            >
              {years.map(year => (
                <option key={year} value={year}>
                  Năm {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="revenue-summary">
        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <p className="summary-label">Tổng Doanh Thu</p>
            <p className="summary-value">{totalRevenue.toLocaleString()} VND</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">🚌</div>
          <div className="summary-content">
            <p className="summary-label">Số Tuyến</p>
            <p className="summary-value">{revenueData.length}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">📈</div>
          <div className="summary-content">
            <p className="summary-label">Trung Bình/Tuyến</p>
            <p className="summary-value">
              {revenueData.length > 0 
                ? Math.round(totalRevenue / revenueData.length).toLocaleString() 
                : 0} VND
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="chart-loading">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : error ? (
        <div className="chart-error">
          <p>❌ {error}</p>
          <button onClick={fetchRevenueData} className="retry-btn">
            🔄 Thử Lại
          </button>
        </div>
      ) : revenueData.length === 0 ? (
        <div className="chart-empty">
          <p>📭 Chưa có dữ liệu doanh thu</p>
        </div>
      ) : (
        <div className="chart-content">
          <div className="chart-bars">
            {revenueData.map((item, index) => {
              const percentage = (item.totalRevenue / maxRevenue) * 100;
              return (
                <div key={item.routeId || index} className="chart-bar-row">
                  <div className="bar-label">
                    <span className="route-name">{item.routeName || 'N/A'}</span>
                  </div>
                  <div className="bar-container">
                    <div 
                      className="bar-fill"
                      style={{ width: `${percentage}%` }}
                    >
                      <span className="bar-value">
                        {item.totalRevenue.toLocaleString()} VND
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueChart;
