import React from 'react';

export default function Dashboard() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Administrator Dashboard</h1>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Active Announcements</div>
          <div className="stat-value">0</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Connected Displays</div>
          <div className="stat-value">0</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Upcoming Scheduled</div>
          <div className="stat-value">0</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Expired Notices</div>
          <div className="stat-value">0</div>
        </div>
      </div>
    </div>
  );
}
