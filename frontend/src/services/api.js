import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// attach bearer token to every request if logged in & handle FormData
api.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    const token = localStorage.getItem('campus_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    } else {
      // Only honoured by the backend when NODE_ENV === 'test'
      const savedUser = localStorage.getItem('campus_user');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          if (user.id) {
            config.headers['x-user-id'] = user.id;
          }
        } catch (e) {}
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// handle errors globally; keep campus_token in sync with login/logout
api.interceptors.response.use(
  (response) => {
    const url = response.config?.url || '';
    if (url.endsWith('/auth/login') && response.data?.token) {
      localStorage.setItem('campus_token', response.data.token);
    } else if (url.endsWith('/auth/logout')) {
      localStorage.removeItem('campus_token');
    }
    return response.data;
  },
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.endsWith('/auth/login')) {
      localStorage.removeItem('campus_token');
    }
    const message = error.response?.data?.error || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
