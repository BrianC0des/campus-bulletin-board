import React, { useState } from 'react';
import { Outlet, Navigate, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Megaphone,
  Monitor,
  Users,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import PaskilLogo from './PaskilLogo.jsx';
import ConfirmModal from './ConfirmModal.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isLeadAdmin = user?.role === 'lead_admin';
  const userName = user?.full_name || user?.name || user?.email?.split('@')[0] || 'Administrator';
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="admin-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <aside className="sidebar">
        <div className="system-mark">
          <PaskilLogo />
        </div>

        <nav aria-label="Primary navigation">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={15} />
            Dashboard
          </NavLink>
          <NavLink
            to="/announcements"
            className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
          >
            <Megaphone size={15} />
            Content
          </NavLink>
          <NavLink
            to="/displays"
            className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
          >
            <Monitor size={15} />
            Displays
          </NavLink>
          {isLeadAdmin && (
            <NavLink
              to="/users"
              className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
            >
              <Users size={15} />
              Users
            </NavLink>
          )}
          <NavLink
            to="/settings"
            className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
          >
            <Settings size={15} />
            Settings
          </NavLink>
        </nav>

        <button
          type="button"
          className="sidebar-bottom"
          onClick={() => setConfirmLogout(true)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <LogOut size={13} />
          Log out
        </button>
      </aside>

      <div className="admin-workspace">
        <header className="admin-header">
          <span>PASKIL Admin Portal</span>
          <div className="header-actions">
            <div className="admin-profile">
              <span>{userInitials}</span>
              <strong>{userName}</strong>
            </div>
          </div>
        </header>

        <main id="main-content" className="admin-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <ConfirmModal
        open={confirmLogout}
        title="Log out of PASKIL?"
        description="You will return to the administrator login screen."
        confirmLabel="Log out"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          logout();
        }}
      />
    </div>
  );
}
