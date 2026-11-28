import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const readSavedUser = () => {
      const savedUser = localStorage.getItem('campus_user');
      if (!savedUser) return null;
      try {
        return JSON.parse(savedUser);
      } catch {
        localStorage.removeItem('campus_user');
        return null;
      }
    };

    // Check initial local session from localStorage
    setUser(readSavedUser());
    setLoading(false);

    const onUserUpdated = () => {
      setUser(readSavedUser());
    };
    window.addEventListener('campus_user_updated', onUserUpdated);
    return () => window.removeEventListener('campus_user_updated', onUserUpdated);
  }, []);

  const login = (userProfile) => {
    localStorage.setItem('campus_user', JSON.stringify(userProfile));
    setUser(userProfile);
  };

  const logout = () => {
    localStorage.removeItem('campus_user');
    localStorage.removeItem('campus_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
