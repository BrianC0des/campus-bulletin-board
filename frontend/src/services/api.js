import axios from 'axios';

const defaultBaseUrl =
  typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost'
    ? `http://${window.location.hostname}:5000/api`
    : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// attach user id to every request if logged in & handle FormData
api.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    const savedUser = localStorage.getItem('campus_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        if (user.id) {
          config.headers['x-user-id'] = user.id;
        }
      } catch (e) {}
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// handle errors globally
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
