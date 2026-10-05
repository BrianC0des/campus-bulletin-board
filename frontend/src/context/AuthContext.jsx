import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial local session
    const token = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('user_profile');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_profile');
      }
    }
    setLoading(false);
  }, []);

  const login = (token, userProfile) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_profile', JSON.stringify(userProfile));
    setUser(userProfile);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_profile');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
