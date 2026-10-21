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
    <div className="stat-cards" style={{ border: '1px solid #000', padding: '18px 16px', minHeight: '110px', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px' }}>
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
    <section className="panel" style={{ border: '1px solid #000', padding: '16px', minHeight: '200px', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <h3 className="panel-title" style={{ margin: '0 0 16px 0', paddingBottom: '8px', borderBottom: '1px solid #000', fontSize: '18px', fontWeight: 'bold' }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function RecentContent() {
  const recent = MOCK_ANNOUNCEMENTS.slice(0, 3);
  return (
    <Panel title="Recent Content">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {recent.map((a) => (
          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #eee' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{a.title}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>Ends: {new Date(a.ends_at).toLocaleDateString()}</div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>[ {a.status.toUpperCase()} ]</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function DisplaysPanel() {
  return (
    <Panel title="DISPLAYS">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {MOCK_DISPLAYS.map((d) => (
          <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #eee' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{d.name}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{d.location}</div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
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
