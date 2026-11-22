import React, { useState, useEffect } from 'react';
import AnnouncementCard from '../components/announcements/AnnouncementCard.jsx';
import AnnouncementForm from '../components/announcements/AnnouncementForm.jsx';
import AnnouncementPreview from '../components/announcements/AnnouncementPreview.jsx';
import AssignDisplayModal from '../components/announcements/AssignDisplayModal.jsx';
import FacebookShareModal from '../components/announcements/FacebookShareModal.jsx';
import api from '../services/api.js';

export const WMSU_COLLEGES = [
  { code: 'ALL_FILTER', label: 'All Colleges (Show Everything)' },
  { code: 'ALL', label: 'Campus-Wide (ALL)' },
  { code: 'CCS', label: 'CCS — College of Computing Studies' },
  { code: 'COE', label: 'COE — College of Engineering' },
  { code: 'CN', label: 'CN — College of Nursing' },
  { code: 'CLA', label: 'CLA — College of Liberal Arts' },
  { code: 'CTE', label: 'CTE — College of Teacher Education' },
  { code: 'CSWCD', label: 'CSWCD — College of Social Work & Community Dev.' },
  { code: 'CA', label: 'CA — College of Agriculture' },
  { code: 'CBA', label: 'CBA — College of Business & Accountancy' },
];

function getDisplayCount(item) {
  if (typeof item.display_count === 'number') return item.display_count;
  if (Array.isArray(item.assigned_displays)) return item.assigned_displays.length;
  if (Array.isArray(item.display_ids)) return item.display_ids.length;
  return 0;
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [displays, setDisplays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCollege, setSelectedCollege] = useState('ALL_FILTER');

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);

  // Preview modal state
  const [previewData, setPreviewData] = useState(null);

  // Assign Display modal state
  const [assigningAnnouncement, setAssigningAnnouncement] = useState(null);

  // Facebook Share Confirm modal state
  const [sharingAnnouncement, setSharingAnnouncement] = useState(null);

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

  const fetchDisplays = async () => {
    try {
      const res = await api.get('/displays');
      if (res?.displays) {
        setDisplays(res.displays.filter((d) => d.is_paired !== false));
      }
    } catch (err) {
      console.error('Failed to load displays:', err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchDisplays();
  }, []);

  // Step 1: Filter by search & college first so status tab counts reflect current college/search scope
  const collegeAndSearchFiltered = announcements.filter((item) => {
    const itemCollege = (item.target_college || 'ALL').toUpperCase();
    const matchesCollege =
      selectedCollege === 'ALL_FILTER' || itemCollege === selectedCollege;

    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.title?.toLowerCase().includes(q) ||
      item.body?.toLowerCase().includes(q) ||
      item.author_name?.toLowerCase().includes(q);

    return matchesCollege && matchesSearch;
  });

  // Step 2: Filter by selected status / broadcast tab
  const filteredAnnouncements = collegeAndSearchFiltered.filter((item) => {
    const count = getDisplayCount(item);
    if (activeTab === 'all') return true;
    if (activeTab === 'broadcasting') return count > 0;
    if (activeTab === 'unassigned') return count === 0;
    return item.status === activeTab;
  });

  // Counts for status tabs
  const tabCounts = {
    all: collegeAndSearchFiltered.length,
    broadcasting: collegeAndSearchFiltered.filter((a) => getDisplayCount(a) > 0).length,
    unassigned: collegeAndSearchFiltered.filter((a) => getDisplayCount(a) === 0).length,
    active: collegeAndSearchFiltered.filter((a) => a.status === 'active').length,
    scheduled: collegeAndSearchFiltered.filter((a) => a.status === 'scheduled').length,
    expired: collegeAndSearchFiltered.filter((a) => a.status === 'expired').length,
  };

  // Export currently filtered announcements to a clean CSV spreadsheet report
  const handleExportCSV = () => {
    if (filteredAnnouncements.length === 0) {
      alert('No announcements match the current filter to export.');
      return;
    }

    const headers = [
      'Title',
      'Body',
      'Target College',
      'Assigned Displays',
      'Author',
      'Department',
      'Created At',
      'Facebook URL',
    ];

    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = filteredAnnouncements.map((a) => {
      const collegeScope =
        !a.target_college || a.target_college.toUpperCase() === 'ALL'
          ? 'Campus-Wide (ALL)'
          : a.target_college.toUpperCase();

      const assignedNames =
        Array.isArray(a.assigned_displays) && a.assigned_displays.length > 0
          ? a.assigned_displays
              .map((d) => (typeof d === 'string' ? d : d.name))
              .filter(Boolean)
              .join('; ')
          : `0 Displays (Unassigned)`;

      return [
        escapeCsv(a.title || 'Graphic Poster'),
        escapeCsv(a.body || ''),
        escapeCsv(collegeScope),
        escapeCsv(assignedNames),
        escapeCsv(a.author_name || 'Campus Administrator'),
        escapeCsv(a.author_department || 'WMSU Administration'),
        escapeCsv(a.created_at ? new Date(a.created_at).toLocaleString() : ''),
        escapeCsv(a.fb_post_url || 'Not shared'),
      ];
    });

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const suffix =
      selectedCollege === 'ALL_FILTER' ? 'all-colleges' : selectedCollege.toLowerCase();
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `wmsu-announcements-report-${suffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
      if (item.target_college) formData.append('target_college', item.target_college);
      if (item.starts_at) formData.append('starts_at', item.starts_at);
      if (item.ends_at) formData.append('ends_at', item.ends_at);
      if (item.imageFile) formData.append('image', item.imageFile);
      formData.append('display_ids', JSON.stringify(item.display_ids || []));

      if (item.id) {
        await api.put(`/announcements/${item.id}`, formData);
      } else {
        await api.post('/announcements', formData);
      }

      await fetchAnnouncements();
      handleCloseForm();
    } catch (err) {
      alert(err.message || 'Failed to save announcement');
    }
  };

  // Assign announcement to specific displays with 1-click duration preset
  const handleSaveAssign = async (announcementId, { display_ids, duration_hours }) => {
    try {
      await api.put(`/announcements/${announcementId}/assign`, {
        display_ids,
        duration_hours,
      });
      await fetchAnnouncements();
      setAssigningAnnouncement(null);
    } catch (err) {
      alert(err.message || 'Failed to assign display screens');
    }
  };

  // Confirm & post announcement to Facebook Page
  const handleConfirmShare = async (announcementId, { caption }) => {
    try {
      const res = await api.post(`/announcements/${announcementId}/facebook`, {
        caption,
      });
      const postUrl =
        res?.fb_post_url || `https://www.facebook.com/wmsu.edu.ph/posts/${announcementId}`;
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === announcementId ? { ...a, fb_post_url: postUrl } : a
        )
      );
      setSharingAnnouncement(null);
    } catch (err) {
      alert(err.message || 'Failed to share announcement to Facebook');
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
      imageUrl:
        (Array.isArray(announcement.image_urls) && announcement.image_urls[0]) ||
        announcement.image_url,
    });
  };

  const STATUS_TABS = [
    { id: 'all', label: `All (${tabCounts.all})` },
    { id: 'broadcasting', label: `Broadcasting (${tabCounts.broadcasting})` },
    { id: 'unassigned', label: `Unassigned (${tabCounts.unassigned})` },
    { id: 'active', label: `Active (${tabCounts.active})` },
    { id: 'scheduled', label: `Scheduled (${tabCounts.scheduled})` },
    { id: 'expired', label: `Expired (${tabCounts.expired})` },
  ];

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

      {/* Assign Display Modal */}
      {assigningAnnouncement && (
        <AssignDisplayModal
          announcement={assigningAnnouncement}
          displays={displays}
          onClose={() => setAssigningAnnouncement(null)}
          onSaveAssign={handleSaveAssign}
        />
      )}

      {/* Facebook Share Confirm Modal */}
      {sharingAnnouncement && (
        <FacebookShareModal
          announcement={sharingAnnouncement}
          onClose={() => setSharingAnnouncement(null)}
          onConfirmShare={handleConfirmShare}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-sub">Campus Bulletin Notices &amp; Digital Signage Feed</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-export-csv"
            onClick={handleExportCSV}
            disabled={filteredAnnouncements.length === 0}
            title="Export currently filtered announcements as a CSV spreadsheet"
          >
            📥 Export CSV ({filteredAnnouncements.length})
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={isFormOpen ? handleCloseForm : handleOpenCreate}
          >
            {isFormOpen ? '✕ Close Form' : '+ New Announcement'}
          </button>
        </div>
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

      {/* Filter Panel: Search + College Filter + Status Tabs */}
      <div className="announcements-filter-panel">
        <div className="announcements-filter-top">
          <div className="filter-field-group">
            <label htmlFor="announcementSearch" className="filter-field-label">
              Search:
            </label>
            <input
              id="announcementSearch"
              type="text"
              className="announcements-search"
              placeholder="Search notices by title, content, or author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-field-group">
            <label htmlFor="collegeFilterSelect" className="filter-field-label">
              College:
            </label>
            <select
              id="collegeFilterSelect"
              className="college-filter-select"
              value={selectedCollege}
              onChange={(e) => setSelectedCollege(e.target.value)}
            >
              {WMSU_COLLEGES.map((col) => (
                <option key={col.code} value={col.code}>
                  {col.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick College Filter Tabs */}
        <div className="college-filter-tabs">
          <span className="filter-field-label">Quick Scope:</span>
          {['ALL_FILTER', 'ALL', 'CCS', 'COE', 'CN', 'CLA', 'CTE', 'CSWCD', 'CA', 'CBA'].map(
            (code) => (
              <button
                key={code}
                type="button"
                className={`college-tab-btn${
                  selectedCollege === code ? ' active' : ''
                }`}
                onClick={() => setSelectedCollege(code)}
              >
                {code === 'ALL_FILTER'
                  ? 'All Colleges'
                  : code === 'ALL'
                  ? 'Campus-Wide (ALL)'
                  : code}
              </button>
            )
          )}
        </div>

        {/* Status & Broadcast Filter Row */}
        <div className="announcements-filter-row">
          <span className="filter-field-label">Status:</span>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`btn btn-secondary${
                activeTab === tab.id ? ' active' : ''
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Announcement cards grid */}
      {loading ? (
        <p className="empty-text">Loading notices...</p>
      ) : filteredAnnouncements.length === 0 ? (
        <p className="empty-text">
          No announcements found for the selected college and status filter.
        </p>
      ) : (
        <div className="announcements-grid">
          {filteredAnnouncements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onPreview={handlePreview}
              onOpenAssign={setAssigningAnnouncement}
              onAssign={setAssigningAnnouncement}
              onOpenFacebook={setSharingAnnouncement}
              onShareFacebook={setSharingAnnouncement}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
