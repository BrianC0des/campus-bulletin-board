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
      <div className="page-header">
        <h1 className="page-title">Announcements</h1>
        <button className="btn btn-primary" onClick={() => alert('Announcement form')}>
          + New Announcement
        </button>
      </div>

      <div className="announcements-filter-row">
        <input
          type="text"
          className="announcements-search"
          placeholder="Search announcements..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-secondary" onClick={() => setActiveTab('all')}>All</button>
        <button className="btn btn-secondary" onClick={() => setActiveTab('active')}>Active</button>
        <button className="btn btn-secondary" onClick={() => setActiveTab('scheduled')}>Scheduled</button>
        <button className="btn btn-secondary" onClick={() => setActiveTab('expired')}>Expired</button>
      </div>

      {filteredAnnouncements.length === 0 ? (
        <p className="empty-text">No announcements found.</p>
      ) : (
        <div className="announcements-grid">
          {filteredAnnouncements.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))}
        </div>
      )}
    </div>
  );
}
