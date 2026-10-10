import React from 'react';
import '../styles/dashboard.css';
import { MOCK_ANNOUNCEMENTS, MOCK_DISPLAYS } from '../mocks/mockData.js';

const cardText = [
  { id: 'active', title: 'Active Content' },
  { id: 'scheduled', title: 'Scheduled Content' },
  { id: 'expired', title: 'Expired Content' },
  { id: 'displays', title: 'Registered Displays' },
];

function StatCard({ title, value, status }) {
  const hasData = value !== undefined && value !== null;

  return (
    <div className="stat-cards">
      <div className="stat-card-header">
        <span>{title.toUpperCase()}</span>
        {status && <span className="status-tag">[ {status} ]</span>}
      </div>
      <div className={hasData ? 'cardValue' : 'cardValue empty'}>
        {hasData ? value : '0'}
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="panel">
      <h3 className="panel-title">{title}</h3>
      {children}
    </section>
  );
}

function RecentContent() {
  const recent = MOCK_ANNOUNCEMENTS.slice(0, 3);
  return (
    <Panel title="Recent Content">
      <div className="panel-list">
        {recent.map((a) => (
          <div key={a.id} className="panel-list-item">
            <div>
              <div className="panel-item-title">{a.title}</div>
              <div className="panel-item-sub">Ends: {new Date(a.ends_at).toLocaleDateString()}</div>
            </div>
            <span className="panel-item-status">[ {a.status.toUpperCase()} ]</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function DisplaysPanel() {
  return (
    <Panel title="DISPLAYS">
      <div className="panel-list">
        {MOCK_DISPLAYS.map((d) => (
          <div key={d.id} className="panel-list-item">
            <div>
              <div className="panel-item-title">{d.name}</div>
              <div className="panel-item-sub">{d.location}</div>
            </div>
            <span className="panel-item-status">
              [ {d.is_paired ? 'ONLINE' : 'UNPAIRED'} ]
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function DashboardHome() {
  const activeCount = MOCK_ANNOUNCEMENTS.filter((a) => a.status === 'active').length;
  const scheduledCount = MOCK_ANNOUNCEMENTS.filter((a) => a.status === 'scheduled').length;
  const expiredCount = MOCK_ANNOUNCEMENTS.filter((a) => a.status === 'expired').length;
  const displaysCount = MOCK_DISPLAYS.filter((d) => d.is_paired).length;

  const contentData = {
    active: { value: activeCount, status: 'LIVE' },
    scheduled: { value: scheduledCount, status: 'PENDING' },
    expired: { value: expiredCount, status: 'ARCHIVED' },
    displays: { value: displaysCount, status: 'ONLINE' },
  };

  return (
    <>
      <div className="main-label">
        <p className="main-text">Administrator Dashboard</p>
        <h1>Dashboard</h1>
      </div>

      <div className="stat-cards stats-grid">
        {cardText.map((card) => (
          <StatCard
            key={card.id}
            title={card.title}
            value={contentData[card.id]?.value}
            status={contentData[card.id]?.status}
          />
        ))}
      </div>

      <div className="panels">
        <RecentContent />
        <DisplaysPanel />
      </div>
    </>
  );
}

export default function Dashboard() {
  return <DashboardHome />;
}
