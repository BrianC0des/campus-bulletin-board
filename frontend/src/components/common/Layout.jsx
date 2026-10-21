import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import TopNav from './TopNav.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth();

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-layout">
      <Navbar onLogout={logout} />
      <main className="main-content">
        <TopNav />
        <Outlet />
      </main>
    </div>
  );
}
