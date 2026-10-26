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
import LiveScreen from './pages/LiveScreen.jsx';

export default function App() {
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
          <Route path="users" element={<Users />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
