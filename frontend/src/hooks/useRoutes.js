// src/hooks/useRoutes.js
import { useState, useEffect } from 'react';
import { routeAPI } from '../services/api';

export const useRoutes = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const data = await routeAPI.getAll();
      setRoutes(data);
      setError(null);
    } catch (err) {
      console.error('Lỗi khi tải tuyến xe:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  return { routes, loading, error, refetch: fetchRoutes };
};
