import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-brand">Campus Bulletin Board</div>
      <div className="nav-links">
        <NavLink to="/dashboard" className="nav-link">Dashboard</NavLink>
        <NavLink to="/announcements" className="nav-link">Announcements</NavLink>
        <NavLink to="/displays" className="nav-link">Displays</NavLink>
        <NavLink to="/users" className="nav-link">Users</NavLink>
      </div>
      <div>
        {/* TODO: Logout button */}
      </div>
    </nav>
  );
}
