import React, { useState } from 'react';
import { MOCK_ANNOUNCEMENTS } from '../mocks/mockData.js';
import AnnouncementCard from '../components/announcements/AnnouncementCard.jsx';
import AnnouncementForm from '../components/announcements/AnnouncementForm.jsx';
import AnnouncementPreview from '../components/announcements/AnnouncementPreview.jsx';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState(MOCK_ANNOUNCEMENTS);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [previewData, setPreviewData] = useState({ title: '', body: '', imageUrl: null });
  const [showPreview, setShowPreview] = useState(false);

  const filteredAnnouncements = announcements.filter((item) => {
    const matchesTab = activeTab === 'all' || item.status === activeTab;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      item.title?.toLowerCase().includes(query) ||
      item.body?.toLowerCase().includes(query);
    return matchesTab && matchesSearch;
  });

  const handleCreateAnnouncement = (newAnnouncement) => {
    const item = {
      id: `ann-${Date.now()}`,
      ...newAnnouncement,
      created_at: new Date().toISOString(),
      assigned_displays: [],
    };
    setAnnouncements([item, ...announcements]);
    setIsFormOpen(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Announcements</h1>
        <button
          className="btn btn-primary"
          onClick={() => setIsFormOpen((prev) => !prev)}
        >
          {isFormOpen ? '✕ Close Form' : '+ New Announcement'}
        </button>
      </div>

      {isFormOpen && (
        <AnnouncementForm
          onSave={handleCreateAnnouncement}
          onCancel={() => setIsFormOpen(false)}
          onPreviewChange={(title, body, imageUrl) => setPreviewData({ title, body, imageUrl })}
        />
      )}

      {isFormOpen && (
        <div className="preview-section">
          <div className="preview-section-header">
            <span className="preview-label">TV Preview</span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowPreview((v) => !v)}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>
          {showPreview && (
            <AnnouncementPreview
              title={previewData.title}
              body={previewData.body}
              imageUrl={previewData.imageUrl}
            />
          )}
        </div>
      )}

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
