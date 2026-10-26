import React, { useState, useEffect } from 'react';
import AnnouncementCard from '../components/announcements/AnnouncementCard.jsx';
import AnnouncementForm from '../components/announcements/AnnouncementForm.jsx';
import AnnouncementPreview from '../components/announcements/AnnouncementPreview.jsx';
import api from '../services/api.js';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);

  // Preview modal state
  const [previewData, setPreviewData] = useState(null);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/announcements');
      setAnnouncements(res?.announcements || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const filteredAnnouncements = announcements.filter((item) => {
    const matchesTab = activeTab === 'all' || item.status === activeTab;
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || item.title?.toLowerCase().includes(q) || item.body?.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  // Open form for creating
  const handleOpenCreate = () => {
    setEditingAnnouncement(null);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open form pre-filled for editing
  const handleOpenEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAnnouncement(null);
  };

  // Save (create or update) with live FormData
  const handleSave = async (item) => {
    try {
      const formData = new FormData();
      formData.append('title', item.title);
      if (item.body) formData.append('body', item.body);
      if (item.starts_at) formData.append('starts_at', item.starts_at);
      if (item.ends_at) formData.append('ends_at', item.ends_at);
      if (item.imageFile) formData.append('image', item.imageFile);
      if (item.display_ids) formData.append('display_ids', JSON.stringify(item.display_ids));

      if (item.id) {
        // Edit existing notice
        await api.put(`/announcements/${item.id}`, formData);
      } else {
        // Create new notice
        await api.post('/announcements', formData);
      }

      await fetchAnnouncements();
      handleCloseForm();
    } catch (err) {
      alert(err.message || 'Failed to save announcement');
    }
  };

  // Delete
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      if (editingAnnouncement?.id === id) handleCloseForm();
    } catch (err) {
      alert(err.message || 'Failed to delete announcement');
    }
  };

  // Preview modal
  const handlePreview = (announcement) => {
    setPreviewData({
      title: announcement.title,
      body: announcement.body,
      imageUrl: announcement.image_url,
    });
  };

  return (
    <div>
      {/* Full-screen preview modal */}
      {previewData && (
        <AnnouncementPreview
          title={previewData.title}
          body={previewData.body}
          imageUrl={previewData.imageUrl}
          onClose={() => setPreviewData(null)}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-sub">Campus Bulletin Notices & Digital Signage Feed</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={isFormOpen ? handleCloseForm : handleOpenCreate}
        >
          {isFormOpen ? '✕ Close Form' : '+ New Announcement'}
        </button>
      </div>

      {/* Create / Edit form */}
      {isFormOpen && (
        <AnnouncementForm
          initialData={editingAnnouncement}
          onSave={handleSave}
          onCancel={handleCloseForm}
          onPreview={(data) => setPreviewData(data)}
        />
      )}

      {/* Search & tab filters */}
      <div className="announcements-filter-row">
        <input
          type="text"
          className="announcements-search"
          placeholder="Search announcements..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {['all', 'active', 'scheduled', 'expired'].map((tab) => (
          <button
            key={tab}
            className={`btn btn-secondary${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Announcement cards grid */}
      {loading ? (
        <p className="empty-text">Loading notices...</p>
      ) : filteredAnnouncements.length === 0 ? (
        <p className="empty-text">No announcements found.</p>
      ) : (
        <div className="announcements-grid">
          {filteredAnnouncements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onPreview={handlePreview}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
