import React, { useState } from 'react';
import { MOCK_ANNOUNCEMENTS } from '../mocks/mockData.js';
import AnnouncementCard from '../components/announcements/AnnouncementCard.jsx';

export default function Announcements() {
  const [announcements] = useState(MOCK_ANNOUNCEMENTS);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const filteredAnnouncements = announcements.filter((item) => {
    const matchesTab = activeTab === 'all' || item.status === activeTab;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      item.title?.toLowerCase().includes(query) ||
      item.body?.toLowerCase().includes(query);
    return matchesTab && matchesSearch;
  });

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
        <h1 className="page-title">Announcements</h1>
        <button className="btn btn-primary" onClick={() => alert('Announcement form')}>
          + New Announcement
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '10px 0 20px 0', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search announcements..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #000', fontSize: '14px', width: '240px' }}
        />
        <button className="btn btn-secondary" onClick={() => setActiveTab('all')}>All</button>
        <button className="btn btn-secondary" onClick={() => setActiveTab('active')}>Active</button>
        <button className="btn btn-secondary" onClick={() => setActiveTab('scheduled')}>Scheduled</button>
        <button className="btn btn-secondary" onClick={() => setActiveTab('expired')}>Expired</button>
      </div>

      {filteredAnnouncements.length === 0 ? (
        <p style={{ color: '#666', padding: '20px 0' }}>No announcements found.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filteredAnnouncements.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))}
        </div>
      )}
    </div>
  );
}
