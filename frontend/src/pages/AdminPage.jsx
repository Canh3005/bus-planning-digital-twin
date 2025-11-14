// src/pages/AdminPage.jsx
import React, { useState } from 'react';
import Sidebar from '../components/Admin/Sidebar';
import StationTable from '../components/Admin/StationTable';
import RouteTable from '../components/Admin/RouteTable';
import UserMenu from '../components/UserMenu';
import { useStations } from '../hooks/useStations';
import { useRoutes } from '../hooks/useRoutes';
import './AdminPage.css';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('stations'); // 'stations' or 'routes'
  const { stations, loading: stationsLoading, refetch: refetchStations } = useStations();
  const { routes, loading: routesLoading, refetch: refetchRoutes } = useRoutes();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="admin-page">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      
      <div className="admin-content">
        <div className="admin-header">
          <div className="admin-header-text">
            <h1>
              {activeTab === 'stations' ? '🚏 Quản Lý Trạm Xe' : '🚌 Quản Lý Tuyến Xe'}
            </h1>
            <p className="admin-subtitle">
              {activeTab === 'stations' 
                ? 'Danh sách các trạm xe buýt trong hệ thống'
                : 'Danh sách các tuyến xe buýt trong hệ thống'
              }
            </p>
          </div>
          <UserMenu />
        </div>

        {activeTab === 'stations' ? (
          <StationTable 
            stations={stations} 
            loading={stationsLoading}
            onRefetch={refetchStations}
          />
        ) : (
          <RouteTable 
            routes={routes} 
            loading={routesLoading}
            onRefetch={refetchRoutes}
            allStations={stations}
          />
        )}
      </div>
    </div>
  );
};

export default AdminPage;
