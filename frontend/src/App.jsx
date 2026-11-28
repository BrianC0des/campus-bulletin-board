import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import api from './services/api.js';

// Layout & Context
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Layout from './components/common/Layout.jsx';

// Pages
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Announcements from './pages/Announcements.jsx';
import Displays from './pages/Displays.jsx';
import Users from './pages/Users.jsx';
import Settings from './pages/Settings.jsx';
import LiveScreen from './pages/LiveScreen.jsx';

function RequireLeadAdmin({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'lead_admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  // Refresh the cached session profile so scope/role changes apply without re-login
  useEffect(() => {
    let cancelled = false;
    let saved = null;
    try {
      saved = localStorage.getItem('campus_user');
    } catch (e) {
      return undefined;
    }
    if (!saved) return undefined;

    api.get('/auth/me')
      .then((res) => {
        if (cancelled || !res?.user) return;
        localStorage.setItem('campus_user', JSON.stringify(res.user));
        window.dispatchEvent(new Event('campus_user_updated'));
      })
      .catch(() => {
        // Keep the cached profile on network errors; server rejects are handled by API calls
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthProvider>
      <Routes>
        {/* Physical display screen / live broadcast — no admin layout */}
        <Route path="/live" element={<LiveScreen />} />
        <Route path="/display" element={<Navigate to="/live" replace />} />

        <Route path="/login" element={<Login />} />

        {/* Admin dashboard routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="displays" element={<Displays />} />
          <Route
            path="users"
            element={
              <RequireLeadAdmin>
                <Users />
              </RequireLeadAdmin>
            }
          />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
