import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Navbar({ onLogout }) {
  const { user } = useAuth();
  const isLeadAdmin = user?.role === 'lead_admin';

  return (
    <nav className="navbar">
      <div className="nav-brand">Campus Bulletin Board</div>
      <div className="nav-links">
        <NavLink to="/dashboard" className="nav-link">Dashboard</NavLink>
        <NavLink to="/announcements" className="nav-link">Announcements</NavLink>
        <NavLink to="/displays" className="nav-link">Displays</NavLink>
        {isLeadAdmin && (
          <NavLink to="/users" className="nav-link">Users</NavLink>
        )}
      </div>

      <button className="logout-btn" onClick={onLogout}>
        LOG OUT
      </button>
    </nav>
  );
}
