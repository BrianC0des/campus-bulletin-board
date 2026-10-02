import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout & Context
import { AuthProvider } from './context/AuthContext.jsx';
import Layout from './components/common/Layout.jsx';

// Pages
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Announcements from './pages/Announcements.jsx';
import Displays from './pages/Displays.jsx';
import Users from './pages/Users.jsx';
import DisplayScreen from './pages/DisplayScreen.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Physical Display Screen Route (No Admin Layout) */}
        <Route path="/display" element={<DisplayScreen />} />

        {/* Administrator Login */}
        <Route path="/login" element={<Login />} />

        {/* Protected Administrator Dashboard Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="displays" element={<Displays />} />
          <Route path="users" element={<Users />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
