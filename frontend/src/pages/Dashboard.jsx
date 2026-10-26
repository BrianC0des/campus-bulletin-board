import React, { useState, useEffect } from 'react';
import '../styles/dashboard.css';
import { MOCK_ANNOUNCEMENTS, MOCK_DISPLAYS } from '../mocks/mockData.js';
import api from '../services/api.js';

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

export function DashboardHome() {
  const [announcements, setAnnouncements] = useState([]);
  const [displays, setDisplays] = useState([]);

  useEffect(() => {
    Promise.allSettled([api.get('/announcements'), api.get('/displays')])
      .then(([annRes, dispRes]) => {
        if (annRes.status === 'fulfilled' && annRes.value?.announcements) {
          setAnnouncements(annRes.value.announcements);
        } else {
          setAnnouncements(MOCK_ANNOUNCEMENTS);
        }

        if (dispRes.status === 'fulfilled' && dispRes.value?.displays) {
          setDisplays(dispRes.value.displays);
        } else {
          setDisplays(MOCK_DISPLAYS);
        }
      })
      .catch(() => {
        setAnnouncements(MOCK_ANNOUNCEMENTS);
        setDisplays(MOCK_DISPLAYS);
      });
  }, []);

  const activeCount = announcements.filter((a) => a.status === 'active').length;
  const scheduledCount = announcements.filter((a) => a.status === 'scheduled').length;
  const expiredCount = announcements.filter((a) => a.status === 'expired').length;
  const displaysCount = displays.filter((d) => d.is_paired).length;

  const contentData = {
    active: { value: activeCount, status: 'LIVE' },
    scheduled: { value: scheduledCount, status: 'PENDING' },
    expired: { value: expiredCount, status: 'ARCHIVED' },
    displays: { value: displaysCount, status: 'ONLINE' },
  };

  const recent = announcements.slice(0, 4);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Campus Bulletin Board Administrator Overview</p>
        </div>
      </div>

      <div className="stats-grid">
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
        <Panel title="Recent Content">
          <div className="panel-list">
            {recent.length === 0 ? (
              <p className="empty-text">No recent notices available.</p>
            ) : (
              recent.map((a) => (
                <div key={a.id} className="panel-list-item">
                  <div>
                    <div className="panel-item-title">{a.title}</div>
                    <div className="panel-item-sub">Ends: {new Date(a.ends_at).toLocaleDateString()}</div>
                  </div>
                  <span className="panel-item-status">[ {a.status?.toUpperCase() || 'ACTIVE'} ]</span>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Campus Displays">
          <div className="panel-list">
            {displays.length === 0 ? (
              <p className="empty-text">No displays registered.</p>
            ) : (
              displays.slice(0, 5).map((d) => (
                <div key={d.id} className="panel-list-item">
                  <div>
                    <div className="panel-item-title">{d.name}</div>
                    <div className="panel-item-sub">{d.location || 'Unassigned location'}</div>
                  </div>
                  <span className="panel-item-status">
                    [ {d.is_paired ? 'ONLINE' : 'UNPAIRED'} ]
                  </span>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return <DashboardHome />;
}
