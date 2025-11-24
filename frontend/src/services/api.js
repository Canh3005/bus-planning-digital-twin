// src/services/api.js
import axios from 'axios';
import { API_BASE_URL } from '../config/constants';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API cho Stations
export const stationAPI = {
  // ... (Không thay đổi)
  getAll: async () => {
    const response = await apiClient.get('/api/stations');
    return response.data;
  },
  
  getById: async (id) => {
    const response = await apiClient.get(`/api/stations/${id}`);
    return response.data;
  },
  
  create: async (stationData) => {
    const response = await apiClient.post('/api/stations', stationData);
    return response.data;
  },
  
  update: async (id, stationData) => {
    const response = await apiClient.put(`/api/stations/${id}`, stationData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await apiClient.delete(`/api/stations/${id}`);
    return response.data;
  },
};

// API cho Routes
export const routeAPI = {
  getAll: async () => {
    const response = await apiClient.get('/api/routes');
    return response.data;
  },

  getRealPaths: async () => {
    const response = await apiClient.get('/api/routes/real-paths');
    return response.data;
  },

  getRealPathById: async (id) => {
    const response = await apiClient.get(`/api/routes/${id}/real-path`);
    return response.data;
  },
  
  getById: async (id) => {
    const response = await apiClient.get(`/api/routes/${id}`);
    return response.data;
  },
  
  create: async (routeData) => {
    const response = await apiClient.post('/api/routes', routeData);
    return response.data;
  },
  
  update: async (id, routeData) => {
    const response = await apiClient.put(`/api/routes/${id}`, routeData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await apiClient.delete(`/api/routes/${id}`);
    return response.data;
  },
  
  // Phương thức mới: Tìm chuyến đi <--- ĐÃ THÊM
  findTrip: async (tripData) => {
    const response = await apiClient.post('/api/routes/find-trip', tripData);
    return response.data;
  },
};

// API cho Authentication
export const authAPI = {
  register: async (userData) => {
    const response = await apiClient.post('/api/auth/register', userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await apiClient.post('/api/auth/login', credentials);
    return response.data;
  },

  getMe: async () => {
    const token = localStorage.getItem('token');
    const response = await apiClient.get('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

// Interceptor để tự động thêm token vào headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor để handle 401 errors (token hết hạn)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
