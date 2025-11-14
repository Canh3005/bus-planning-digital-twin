// src/hooks/useStations.js
import { useState, useEffect } from 'react';
import { stationAPI } from '../services/api';

export const useStations = () => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStations = async () => {
    try {
      setLoading(true);
      const data = await stationAPI.getAll();
      setStations(data);
      setError(null);
    } catch (err) {
      console.error('Lỗi khi tải trạm xe:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  return { stations, loading, error, refetch: fetchStations };
};
