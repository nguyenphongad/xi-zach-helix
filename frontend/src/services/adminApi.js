import axios from 'axios';

// Ưu tiên lấy base URL từ env, fallback localhost cho môi trường dev
const ADMIN_API_BASE_URL =
  import.meta.env.VITE_ADMIN_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api';

const adminApi = axios.create({
  baseURL: ADMIN_API_BASE_URL,
  timeout: 10000,
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      if (window.location.pathname !== '/admin') {
        window.location.href = '/admin';
      }
    }
    return Promise.reject(error);
  }
);

export default adminApi;
