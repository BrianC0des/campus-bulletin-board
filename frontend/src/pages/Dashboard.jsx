import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Clock, AlertCircle, Megaphone, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { MOCK_ANNOUNCEMENTS, MOCK_DISPLAYS } from '../mocks/mockData.js';
import api from '../services/api.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [displays, setDisplays] = useState([]);
  const [apiOffline, setApiOffline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([api.get('/announcements'), api.get('/displays')])
      .then(([annRes, dispRes]) => {
        const annOk = annRes.status === 'fulfilled' && Array.isArray(annRes.value?.announcements);
        const dispOk = dispRes.status === 'fulfilled' && Array.isArray(dispRes.value?.displays);
        const bothFailed = !annOk && !dispOk;
        setAnnouncements(annOk ? annRes.value.announcements : bothFailed ? MOCK_ANNOUNCEMENTS : []);
        setDisplays(dispOk ? dispRes.value.displays : bothFailed ? MOCK_DISPLAYS : []);
        setApiOffline(!annOk || !dispOk);
      })
      .catch(() => {
        setAnnouncements(MOCK_ANNOUNCEMENTS);
        setDisplays(MOCK_DISPLAYS);
        setApiOffline(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.full_name || user?.name || user?.email?.split('@')[0] || 'Admin').split(' ')[0];

  const activeCount = announcements.filter(
    (a) => a.status === 'active' && (a.assigned_displays?.length > 0)
  ).length;
  const scheduledCount = announcements.filter((a) => a.status === 'scheduled').length;
  const reviewItems = announcements.filter(
    (a) => a.status === 'expired' || a.status === 'draft' || !(a.assigned_displays?.length > 0)
  );
  const pairedDisplays = displays.filter((d) => d.is_paired);
  const onlineCount = pairedDisplays.filter((d) => d.is_online).length;

  const pad = (n) => (loading ? '--' : String(n).padStart(2, '0'));

  const summaries = [
    { label: 'Live now', value: pad(activeCount), note: 'Active broadcasts', tone: 'lime' },
    { label: 'Queued', value: pad(scheduledCount), note: 'Pending schedule', tone: 'paper' },
    { label: 'Needs review', value: pad(reviewItems.length), note: 'Draft, expired, or unassigned', tone: 'coral' },
    {
      label: 'Screens online',
      value: loading ? '--/--' : `${pad(onlineCount)}/${pad(pairedDisplays.length)}`,
      note: loading ? 'Loading...' : `${onlineCount} connected`,
      tone: 'ink',
    },
    { label: 'Total notices', value: pad(announcements.length), note: 'In bulletin system', tone: 'paper' },
  ];

  const recent = announcements.slice(0, 4);

  return (
    <div>
      {apiOffline && (
        <div className="offline-banner" role="status">
          <AlertCircle size={15} />
          <span>Backend unreachable — showing cached preview data. Changes will not persist until reconnected.</span>
        </div>
      )}

      <div className="page-heading">
        <div>
          <div className="eyebrow">CONTROL ROOM / DASHBOARD</div>
          <h2>{greeting}, {firstName}.</h2>
          <p className="page-description">
            {loading
              ? 'Loading dashboard...'
              : pairedDisplays.length > 0
                ? `${onlineCount} of ${pairedDisplays.length} registered displays are broadcasting.`
                : 'No active displays currently paired.'}
          </p>
        </div>
        <button
          type="button"
          className="wire-button dark"
          onClick={() => navigate('/announcements?new=1')}
        >
          Create announcement <span>+</span>
        </button>
      </div>

      <div className="summary-grid">
        {summaries.map((item) => (
          <div className={`sketch-box summary ${item.tone}`} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
          </div>
        ))}
      </div>

      <div className="dashboard-lower">
        <div className="sketch-box table-placeholder clickable-box">
          <div className="block-header">
            <span>Recent broadcasts</span>
            <button type="button" onClick={() => navigate('/announcements')}>
              View all →
            </button>
          </div>
          <div className="broadcast-table">
            {recent.length === 0 ? (
              <EmptyState
                compact
                icon={<Megaphone size={22} />}
                title={loading ? 'Loading broadcasts...' : 'No recent broadcasts'}
                description={loading ? undefined : 'Publish an announcement to see recent activity here.'}
                actionLabel={loading ? undefined : 'Create announcement +'}
                onAction={loading ? undefined : () => navigate('/announcements?new=1')}
              />
            ) : (
              recent.map((a) => {
                const statusText = (a.status || 'active').toUpperCase();
                const displayCount = a.assigned_displays?.length || 0;
                const displayLabel = displayCount > 0 ? `${displayCount} display${displayCount > 1 ? 's' : ''}` : 'Unassigned';
                const timeLabel = a.starts_at
                  ? new Date(a.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '—';
                return (
                  <button
                    type="button"
                    className="broadcast-row"
                    onClick={() => navigate(`/announcements?edit=${encodeURIComponent(a.id)}`)}
                    key={a.id || a.title}
                  >
                    <strong>{a.title}</strong>
                    <span className={`broadcast-status ${statusText.toLowerCase()}`}>
                      {statusText}
                    </span>
                    <span>{displayLabel}</span>
                    <time>{timeLabel}</time>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="sketch-box attention-panel">
          <div className="block-header">
            <span>Needs attention</span>
            <button type="button" onClick={() => navigate('/announcements')}>
              Review all →
            </button>
          </div>
          <div className="attention-list">
            {loading ? (
              <p className="empty-text" style={{ padding: '20px 0' }}>
                Loading...
              </p>
            ) : reviewItems.length === 0 ? (
              <EmptyState
                compact
                icon={<CheckCircle2 size={22} />}
                title="All caught up"
                description="All announcements are assigned and actively broadcasting."
              />
            ) : (
              reviewItems.slice(0, 4).map((item) => {
                const reason =
                  item.status === 'expired'
                    ? 'Expired'
                    : item.status === 'draft'
                      ? 'Draft'
                      : 'Unassigned';
                return (
                  <button
                    type="button"
                    className="attention-row"
                    key={item.id || item.title}
                    onClick={() => navigate(`/announcements?edit=${encodeURIComponent(item.id)}`)}
                  >
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.target_college || 'Campus-Wide'}</small>
                    </div>
                    <span className={`attention-tag ${reason.toLowerCase()}`}>{reason}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="sketch-box fleet-panel">
        <div className="block-header">
          <span>Connected display fleet</span>
          <button type="button" onClick={() => navigate('/displays')}>
            Manage screens →
          </button>
        </div>
        {loading ? (
          <p className="empty-text" style={{ padding: '20px 0' }}>
            Loading displays...
          </p>
        ) : displays.length === 0 ? (
          <EmptyState
            compact
            icon={<Monitor size={22} />}
            title="No displays paired yet"
            description="Pair a campus display to monitor its connection and playback status here."
            actionLabel="Pair a Display"
            onAction={() => navigate('/displays')}
          />
        ) : (
          <div className="fleet-grid">
            {displays.slice(0, 4).map((d) => (
              <button
                type="button"
                className="fleet-card"
                key={d.id || d.name}
                onClick={() => navigate('/displays')}
              >
                <div className="fleet-card-top">
                  <Monitor size={14} />
                  <span className={`fleet-badge ${d.is_paired && d.is_online ? 'online' : d.is_paired ? 'standby' : 'offline'}`}>
                    {!d.is_paired ? 'UNPAIRED' : d.is_online ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <strong>{d.name}</strong>
                <small>{d.location || 'Campus Building'} • {d.department || d.college || 'Campus-Wide'}</small>
                <div className="fleet-meta">
                  <Clock size={11} />
                  <span>{d.rotation_speed || d.rotationSpeed || 10}s slide</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
