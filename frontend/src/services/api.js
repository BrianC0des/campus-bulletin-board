import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For passing display HTTP-only credential cookies
});

// Request Interceptor: Attach current user ID if logged in
api.interceptors.request.use(
  (config) => {
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

// Response Interceptor: Handle common API errors (e.g. 401 Unauthorized)
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
