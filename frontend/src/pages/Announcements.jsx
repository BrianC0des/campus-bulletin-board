import React, { useState } from 'react';
import { MOCK_ANNOUNCEMENTS } from '../mocks/mockData.js';
import AnnouncementCard from '../components/announcements/AnnouncementCard.jsx';
import AnnouncementForm from '../components/announcements/AnnouncementForm.jsx';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState(MOCK_ANNOUNCEMENTS);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Announcements</h1>
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
      </div>
      <div className="announcements-grid">
        {announcements.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
      </div>
    </div>
  );
}
