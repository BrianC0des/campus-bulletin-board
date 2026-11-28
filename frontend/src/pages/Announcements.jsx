import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, Megaphone, Share2, CheckCircle2, Monitor, Eye, Pencil, Trash2, Star } from 'lucide-react';
import AnnouncementForm from '../components/announcements/AnnouncementForm.jsx';
import AnnouncementPreview from '../components/announcements/AnnouncementPreview.jsx';
import AssignDisplayModal from '../components/announcements/AssignDisplayModal.jsx';
import FacebookShareModal from '../components/announcements/FacebookShareModal.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import LayoutToggle from '../components/common/LayoutToggle.jsx';
import CustomSelect from '../components/common/CustomSelect.jsx';
import Pagination from '../components/common/Pagination.jsx';
import ConfirmModal from '../components/common/ConfirmModal.jsx';
import { MOCK_ANNOUNCEMENTS, MOCK_DISPLAYS } from '../mocks/mockData.js';
import api from '../services/api.js';
import { getImageUrl } from '../utils/imageUrl.js';
import { useColleges } from '../utils/colleges.js';
import { getTemplate } from '../components/announcements/templates/templateRegistry.js';

// RFC 4180: wrap every field in quotes and double any embedded quotes.
const csvField = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const PRIORITY_LABELS = { priority: 'Priority', emergency: 'Emergency' };

function scheduleBadgeText(item) {
  const parts = [];
  if (item.starts_at && new Date(item.starts_at).getTime() > Date.now()) {
    parts.push(`Starts ${new Date(item.starts_at).toLocaleDateString()}`);
  }
  if (item.daily_start_time && item.daily_end_time) {
    parts.push(`${String(item.daily_start_time).slice(0, 5)}–${String(item.daily_end_time).slice(0, 5)}`);
  }
  if (item.playback_duration) parts.push(`${item.playback_duration}s`);
  return parts.join(' • ');
}

const STATUS_LABELS = {
  active: 'Active',
  scheduled: 'Scheduled',
  expired: 'Expired',
  draft: 'Draft',
};

function getExpiryBadge(endsAt, rawStatus) {
  if (rawStatus === 'draft') return null;
  if (!endsAt) {
    return { text: 'Permanent', detail: 'Until unassigned', tone: 'permanent' };
  }
  const endMs = new Date(endsAt).getTime();
  if (Number.isNaN(endMs)) return null;
  const shortDate = new Date(endMs).toLocaleDateString();
  const diff = endMs - Date.now();
  if (diff <= 0 || rawStatus === 'expired') {
    return { text: 'Expired', detail: shortDate, tone: 'expired' };
  }
  if (diff < 3600000) {
    return { text: 'Exp in <1h', detail: shortDate, tone: 'soon' };
  }
  if (diff < 86400000) {
    return { text: `Exp in ${Math.max(1, Math.ceil(diff / 3600000))}h`, detail: shortDate, tone: 'soon' };
  }
  const days = Math.ceil(diff / 86400000);
  return {
    text: `Exp in ${days}d`,
    detail: shortDate,
    tone: days <= 3 ? 'soon' : 'normal',
  };
}

function readCampusUser() {
  try {
    return JSON.parse(localStorage.getItem('campus_user') || 'null');
  } catch (e) {
    return null;
  }
}

function isCampusWide(item) {
  const t = String(item?.target_college || '').trim().toLowerCase();
  return t === '' || t === 'all' || t === 'campus-wide';
}

const READ_ONLY_TITLE = 'Only Lead Admins can modify Campus-Wide announcements';

export default function Announcements() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState(readCampusUser);
  useEffect(() => {
    const sync = () => setCurrentUser(readCampusUser());
    window.addEventListener('campus_user_updated', sync);
    return () => window.removeEventListener('campus_user_updated', sync);
  }, []);
  const isLeadAdmin = currentUser?.role === 'lead_admin';
  const [announcements, setAnnouncements] = useState([]);
  const [displays, setDisplays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiOffline, setApiOffline] = useState(false);
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [displayFilter, setDisplayFilter] = useState('All');
  const [collegeFilter, setCollegeFilter] = useState('All');
  const [contentLayout, setContentLayout] = useState('table');
  const [contentPage, setContentPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  const [assigningAnnouncement, setAssigningAnnouncement] = useState(null);
  const [savingAssign, setSavingAssign] = useState(false);
  const [fbShareTarget, setFbShareTarget] = useState(null);

  const { getOptions: getCollegeOptions, formatLabel } = useColleges();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [togglingPriorityId, setTogglingPriorityId] = useState(null);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const [annRes, dispRes] = await Promise.allSettled([
        api.get('/announcements'),
        api.get('/displays'),
      ]);
      const annOk = annRes.status === 'fulfilled' && annRes.value?.announcements;
      const dispOk = dispRes.status === 'fulfilled' && dispRes.value?.displays;
      setAnnouncements(annOk ? annRes.value.announcements : MOCK_ANNOUNCEMENTS);
      setDisplays(dispOk ? dispRes.value.displays : MOCK_DISPLAYS);
      setApiOffline(!annOk || !dispOk);
    } catch {
      setAnnouncements(MOCK_ANNOUNCEMENTS);
      setDisplays(MOCK_DISPLAYS);
      setApiOffline(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Support deep-links from Dashboard (?new=1 or ?edit=<id>) and Displays (?newForDisplay=<id>)
  useEffect(() => {
    const newForDisplay = searchParams.get('newForDisplay');
    if (searchParams.get('new') === '1') {
      setEditingAnnouncement(null);
      setIsFormOpen(true);
      setSearchParams({}, { replace: true });
    } else if (newForDisplay) {
      const matched = displays.find((d) => String(d.id) === String(newForDisplay));
      const resolvedId = matched
        ? matched.id
        : (/^\d+$/.test(newForDisplay) ? Number(newForDisplay) : newForDisplay);
      setEditingAnnouncement({ assigned_displays: [resolvedId] });
      setIsFormOpen(true);
      setSearchParams({}, { replace: true });
    } else {
      const editId = searchParams.get('edit');
      if (editId && announcements.length > 0) {
        const match = announcements.find((a) => String(a.id) === String(editId));
        if (match) {
          if (!isLeadAdmin && isCampusWide(match)) {
            setActionError(READ_ONLY_TITLE);
          } else {
            setEditingAnnouncement(match);
            setIsFormOpen(true);
          }
        }
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, announcements, displays, setSearchParams, isLeadAdmin]);

  const collegeOptions = useMemo(() => {
    if (!isLeadAdmin) {
      const raw = Array.isArray(currentUser?.allowed_colleges) && currentUser.allowed_colleges.length > 0
        ? currentUser.allowed_colleges
        : (currentUser?.college ? [currentUser.college] : []);
      const scoped = raw.filter((c) => c && c !== 'ALL' && c !== 'Campus-Wide');
      return [
        { value: 'All', label: 'All Visible Notices', shortLabel: 'All Visible' },
        ...scoped.map((c) => ({ value: c, label: formatLabel(c), shortLabel: c })),
        { value: 'Campus-Wide', label: 'Campus-Wide (Read-only)', shortLabel: 'Campus-Wide' },
      ];
    }
    return getCollegeOptions({
      includeAllFilter: true,
      includeCampusWide: true,
      extraValues: [
        ...displays.map((d) => d.department || d.college),
        ...announcements.map((a) => a.target_college),
      ],
    }).map((opt) =>
      opt.value === 'All'
        ? { ...opt, label: 'All Colleges & Departments', shortLabel: 'All Colleges & Departments' }
        : opt
    );
  }, [isLeadAdmin, currentUser, displays, announcements, getCollegeOptions, formatLabel]);

  const selectedDisplay =
    displayFilter === 'All'
      ? null
      : displays.find((disp) => String(disp.id) === String(displayFilter));

  const filteredAnnouncements = announcements.filter((a) => {
    const matchesSearch = (a.title || '').toLowerCase().includes(search.toLowerCase());
    const itemStatus = (a.status || 'active').toLowerCase();
    const matchesStatus = statusFilter === 'All' || itemStatus === statusFilter.toLowerCase();
    const matchesCollege =
      collegeFilter === 'All' ||
      (collegeFilter === 'Campus-Wide'
        ? isCampusWide(a)
        : String(a.target_college || '').trim().toLowerCase() === collegeFilter.toLowerCase());
    const matchesDisplay =
      displayFilter === 'All' ||
      (a.assigned_displays || []).some((d) => {
        if (typeof d === 'object' && d !== null) {
          if (String(d.id) === String(displayFilter)) return true;
          if (selectedDisplay?.name && d.name) {
            return d.name.toLowerCase() === selectedDisplay.name.toLowerCase();
          }
          return false;
        }
        if (String(d) === String(displayFilter)) return true;
        if (selectedDisplay?.name) {
          return String(d).toLowerCase() === selectedDisplay.name.toLowerCase();
        }
        return false;
      });
    return matchesSearch && matchesStatus && matchesCollege && matchesDisplay;
  });

  const contentPageSize = contentLayout === 'table' ? 5 : 4;
  const safeContentPage = Math.min(
    contentPage,
    Math.max(1, Math.ceil(filteredAnnouncements.length / contentPageSize))
  );
  const pagedContent = filteredAnnouncements.slice(
    (safeContentPage - 1) * contentPageSize,
    safeContentPage * contentPageSize
  );

  const handleOpenCreate = () => {
    setEditingAnnouncement(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAnnouncement(null);
  };

  const handleFormSaved = (savedAnnouncement, shouldShareFb = false, fbMeta = {}) => {
    setIsFormOpen(false);
    setEditingAnnouncement(null);
    fetchAnnouncements();
    if (shouldShareFb && savedAnnouncement) {
      setFbShareTarget(savedAnnouncement);
    } else if (fbMeta?.fbError) {
      setAlertModal({
        title: 'Announcement saved',
        description: `Saved to Content Management, but Facebook share failed: ${fbMeta.fbError}`,
      });
    } else if (savedAnnouncement?.fb_post_id) {
      setAlertModal({
        title: 'Announcement published & shared',
        description: 'Your announcement has been saved and posted to the connected Facebook Page.',
      });
    } else {
      setAlertModal({
        title: 'Announcement saved',
        description: 'Your announcement has been saved to Content Management.',
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    try {
      setActionError('');
      await api.delete(`/announcements/${target.id}`);
      setAnnouncements((prev) => prev.filter((item) => item.id !== target.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteTarget(null);
      setActionError(err.message || `Failed to delete "${target.title}".`);
    }
  };

  const handleOpenAssign = (announcement) => {
    setActionError('');
    setAssigningAnnouncement(announcement);
  };

  const handleTogglePriority = async (item) => {
    if (togglingPriorityId === item.id) return;
    const prevPriority = item.priority || 'normal';
    const isStarred = prevPriority === 'priority' || prevPriority === 'emergency';
    const nextPriority = isStarred ? 'normal' : 'priority';

    setActionError('');
    setTogglingPriorityId(item.id);
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, priority: nextPriority } : a))
    );

    try {
      const res = await api.patch(`/announcements/${item.id}/priority`, { priority: nextPriority });
      if (res?.announcement?.priority) {
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === item.id ? { ...a, priority: res.announcement.priority } : a))
        );
      }
    } catch (err) {
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, priority: prevPriority } : a))
      );
      setActionError(err.message || `Failed to update priority for "${item.title}".`);
    } finally {
      setTogglingPriorityId(null);
    }
  };

  const executeSaveAssignment = async (payload) => {
    if (!assigningAnnouncement) return;
    try {
      setSavingAssign(true);
      setActionError('');
      await api.put(`/announcements/${assigningAnnouncement.id}`, {
        display_ids: payload.display_ids,
        publish_status: payload.publish_status,
        starts_at: payload.starts_at,
        ends_at: payload.ends_at,
        indefinite: payload.indefinite,
        daily_start_time: payload.daily_start_time,
        daily_end_time: payload.daily_end_time,
        playback_duration: payload.playback_duration,
        priority: payload.priority,
        recurrence_days: JSON.stringify(payload.recurrence_days),
      });

      await fetchAnnouncements();
      const count = payload.display_ids.length;
      setAssigningAnnouncement(null);
      setAlertModal({
        title: 'Display assignment updated',
        description:
          count > 0
            ? `Assigned to ${count} display${count > 1 ? 's' : ''} with updated broadcast schedule.`
            : 'Announcement unassigned from all displays.',
      });
    } catch (err) {
      setActionError(err.message || 'Failed to update display assignment.');
    } finally {
      setSavingAssign(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Title', 'Template', 'Priority', 'Status', 'College', 'Display Count', 'Displays',
      'Starts', 'Ends', 'Daily Hours', 'Playback Seconds',
    ];
    const rows = announcements.map((a) => [
      a.title,
      getTemplate(a.template_id).name,
      a.priority || 'normal',
      a.status || 'active',
      a.target_college || 'Campus-Wide',
      (a.assigned_displays || []).length,
      (a.assigned_displays || []).map((d) => (typeof d === 'object' ? d.name : d)).join('; '),
      a.starts_at || '',
      a.ends_at || 'Permanent',
      a.daily_start_time && a.daily_end_time
        ? `${String(a.daily_start_time).slice(0, 5)}-${String(a.daily_end_time).slice(0, 5)}`
        : 'All day',
      a.playback_duration || 'Display default',
    ]);

    const csv = [headers, ...rows].map((r) => r.map(csvField).join(',')).join('\r\n');
    // BOM keeps Excel from mangling UTF-8; Blob avoids data-URI length limits.
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'paskil-announcements.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  // Preview must be checked before the form so 'Preview on display' works from
  // inside AnnouncementForm. The form stays mounted (hidden) while previewing so
  // the in-progress draft is not lost when the preview closes.
  if (previewData || isFormOpen) {
    return (
      <>
        {isFormOpen && (
          <div style={previewData ? { display: 'none' } : undefined}>
            <AnnouncementForm
              initialData={editingAnnouncement}
              displays={displays}
              onSuccess={handleFormSaved}
              onCancel={handleCloseForm}
              onPreview={(draft) =>
                setPreviewData({ ...draft, title: draft.title || 'CAMPUS ANNOUNCEMENT' })
              }
            />
          </div>
        )}
        {previewData && (
          <AnnouncementPreview
            announcement={previewData}
            onClose={() => setPreviewData(null)}
          />
        )}
      </>
    );
  }

  const filtersActive =
    search.trim() !== '' ||
    statusFilter !== 'All' ||
    displayFilter !== 'All' ||
    collegeFilter !== 'All';

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setDisplayFilter('All');
    setCollegeFilter('All');
    setContentPage(1);
  };

  const displayOptions = [
    { value: 'All', label: 'All displays' },
    ...displays.map((d) => ({ value: String(d.id), label: d.name })),
  ];

  return (
    <div>
      {apiOffline && (
        <div className="offline-banner" role="status">
          <AlertCircle size={15} />
          <span>Backend unreachable — showing cached announcements.</span>
        </div>
      )}

      {actionError && (
        <div className="pairing-error" role="alert" style={{ marginBottom: '12px' }}>
          {actionError}
        </div>
      )}

      <div className="page-heading">
        <div>
          <div className="eyebrow">CONTROL ROOM / CONTENT</div>
          <h2>Content Management</h2>
        </div>
        <div className="page-actions">
          <button type="button" className="wire-button" onClick={handleExportCSV}>
            <svg className="button-icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 15.5h12" />
            </svg>
            Export CSV
          </button>
          <button type="button" className="wire-button dark" onClick={handleOpenCreate}>
            Add announcement <span>+</span>
          </button>
        </div>
      </div>

      <div className="sketch-box toolbar">
        <input
          className="toolbar-search"
          aria-label="Search announcements"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setContentPage(1);
          }}
          placeholder="Search announcements"
        />
        <CustomSelect
          className="toolbar-filter"
          value={collegeFilter}
          onChange={(val) => {
            setCollegeFilter(val);
            setContentPage(1);
          }}
          ariaLabel="Filter by college department"
          options={collegeOptions}
        />
        <CustomSelect
          className="toolbar-filter"
          value={statusFilter}
          onChange={(val) => {
            setStatusFilter(val);
            setContentPage(1);
          }}
          ariaLabel="Filter by announcement status"
          options={[
            { value: 'All', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'draft', label: 'Draft' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'expired', label: 'Expired' },
          ]}
        />
        <CustomSelect
          className="toolbar-filter"
          value={displayFilter}
          onChange={(val) => {
            setDisplayFilter(val);
            setContentPage(1);
          }}
          ariaLabel="Filter by display"
          options={displayOptions}
        />
        <LayoutToggle
          value={contentLayout}
          onChange={(layout) => {
            setContentLayout(layout);
            setContentPage(1);
          }}
        />
      </div>

      <div className="list-view-toolbar">
        <span className="toolbar-caption">
          {filteredAnnouncements.length} announcement{filteredAnnouncements.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className={`sketch-box content-table ${contentLayout}-layout`}>
        <div className="table-head">
          <span>CONTENT</span>
          <span>STATUS</span>
          <span>DISPLAY</span>
          <span>ACTIONS</span>
        </div>

        {loading ? (
          <div className="empty-row">Loading announcements...</div>
        ) : pagedContent.length === 0 ? (
          <EmptyState
            icon={<Megaphone size={26} />}
            title={filtersActive ? 'No announcements match your filters' : 'No announcements yet'}
            description={
              filtersActive
                ? 'Try clearing or adjusting your search, college, status, or display filters.'
                : 'Create your first announcement using a ready-made template or upload a graphic poster.'
            }
            actionLabel={filtersActive ? 'Clear filters' : 'Add announcement +'}
            onAction={filtersActive ? handleClearFilters : handleOpenCreate}
          />
        ) : (
          pagedContent.map((item, index) => {
            const displayCount = item.assigned_displays?.length || 0;
            const rawStatus = (item.status || 'active').toLowerCase();
            const statusText = STATUS_LABELS[rawStatus] || 'Draft';
            const expiryBadge = getExpiryBadge(item.ends_at, rawStatus);
            const thumbSrc = item.image_urls?.[0] || item.image_url;
            const isStarred = item.priority === 'priority' || item.priority === 'emergency';
            const isCards = contentLayout === 'cards';
            const readOnly = !isLeadAdmin && isCampusWide(item);
            const ownsFbScope = isLeadAdmin ? isCampusWide(item) : !isCampusWide(item);
            const canShareFb = !readOnly && ownsFbScope && rawStatus !== 'draft' && rawStatus !== 'expired';

            const renderActions = () => (
              <span className="row-actions">
                {!readOnly && (
                  <>
                    <button
                      type="button"
                      className={`icon-action-btn priority-star-btn ${isStarred ? 'is-starred' : ''}`}
                      title={isStarred ? 'Remove priority star' : 'Mark as priority'}
                      aria-label={isStarred ? `Remove priority from ${item.title}` : `Mark ${item.title} as priority`}
                      aria-pressed={isStarred}
                      disabled={togglingPriorityId === item.id}
                      onClick={() => handleTogglePriority(item)}
                    >
                      <Star size={15} fill={isStarred ? 'currentColor' : 'none'} />
                      <span className="btn-label">{isStarred ? 'Priority' : 'Star'}</span>
                    </button>
                    <button
                      type="button"
                      className="icon-action-btn"
                      title="Assign to displays"
                      aria-label={`Assign ${item.title} to displays`}
                      onClick={() => handleOpenAssign(item)}
                    >
                      <Monitor size={15} />
                      <span className="btn-label">Assign</span>
                    </button>
                  </>
                )}
                {canShareFb && (
                  <button
                    type="button"
                    className={`icon-action-btn ${item.fb_post_id ? 'fb-posted-btn' : ''}`}
                    title={item.fb_post_id ? 'Shared on Facebook' : 'Share to Facebook'}
                    aria-label={`Share ${item.title} to Facebook`}
                    onClick={() => setFbShareTarget(item)}
                  >
                    {item.fb_post_id ? <CheckCircle2 size={15} /> : <Share2 size={15} />}
                    <span className="btn-label">{item.fb_post_id ? 'FB Posted' : 'Share FB'}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="icon-action-btn"
                  title="Preview announcement"
                  aria-label={`Preview ${item.title}`}
                  onClick={() => setPreviewData(item)}
                >
                  <Eye size={15} />
                  <span className="btn-label">Preview</span>
                </button>
                {!readOnly && (
                  <>
                    <button
                      type="button"
                      className="icon-action-btn"
                      title="Edit announcement"
                      aria-label={`Edit ${item.title}`}
                      onClick={() => handleOpenEdit(item)}
                    >
                      <Pencil size={15} />
                      <span className="btn-label">Edit</span>
                    </button>
                    <button
                      type="button"
                      className="icon-action-btn danger"
                      title="Delete announcement"
                      aria-label={`Delete ${item.title}`}
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 size={15} />
                      <span className="btn-label">Delete</span>
                    </button>
                  </>
                )}
              </span>
            );

            return (
              <div className="content-row" key={item.id || item.title}>
                <div
                  className={`item-thumb board-preview preview-${(index % 4) + 1} ${thumbSrc ? 'has-image' : ''}`}
                  role="button"
                  tabIndex={0}
                  title={`Preview ${item.title}`}
                  aria-label={`Preview of ${item.title}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setPreviewData(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setPreviewData(item);
                    }
                  }}
                >
                  {thumbSrc ? (
                    <>
                      <img
                        src={getImageUrl(thumbSrc)}
                        alt={item.title}
                        className="thumb-real-img"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement?.classList.remove('has-image');
                        }}
                      />
                      {isCards && <div className="card-blur-fade" />}
                    </>
                  ) : (
                    <>
                      <span className="board-preview-header" />
                      <span className="board-preview-title" />
                      <span className="board-preview-copy" />
                      <span className="board-preview-photo" />
                    </>
                  )}
                  {isCards && (
                    <span className={`content-status ${rawStatus}`}>
                      {statusText}
                    </span>
                  )}
                </div>

                <div className="content-title-cell" style={{ minWidth: 0 }}>
                  <strong>{item.title}</strong>
                  <div className="content-badges">
                    <span className="template-badge orientation-badge">{getTemplate(item.template_id).name}</span>
                    <span className="orientation-badge">{formatLabel(item.target_college)}</span>
                    {readOnly && (
                      <span className="orientation-badge" title={READ_ONLY_TITLE}>Read-only</span>
                    )}
                    {PRIORITY_LABELS[item.priority] && (
                      <span className={`priority-badge priority-${item.priority}`}>{PRIORITY_LABELS[item.priority]}</span>
                    )}
                    {scheduleBadgeText(item) && (
                      <span className="schedule-badge orientation-badge">{scheduleBadgeText(item)}</span>
                    )}
                  </div>
                </div>

                {!isCards && (
                  <span className={`content-status ${rawStatus}`}>
                    {statusText}
                  </span>
                )}

                <span className="assignment-cell">
                  {displayCount === 0 ? (
                    <span className="unassigned-badge">○ Unassigned (0 Displays)</span>
                  ) : (
                    <span className="assignment-summary">
                      <span>
                        {displayCount} Display{displayCount > 1 ? 's' : ''}
                      </span>
                      {!isCards && expiryBadge && (
                        <small className={`expiry-pill tone-${expiryBadge.tone}`} title={`Ends: ${expiryBadge.detail}`}>
                          {expiryBadge.text}
                        </small>
                      )}
                    </span>
                  )}
                  {!isCards && displayCount === 0 && expiryBadge && item.ends_at && (
                    <small className={`expiry-pill tone-${expiryBadge.tone}`} title={`Ends: ${expiryBadge.detail}`}>
                      {expiryBadge.text}
                    </small>
                  )}
                </span>

                {isCards ? (
                  <div className="card-footer">
                    {expiryBadge ? (
                      <small className={`expiry-pill tone-${expiryBadge.tone}`} title={`Ends: ${expiryBadge.detail}`}>
                        {expiryBadge.text}
                      </small>
                    ) : (
                      <span />
                    )}
                    {renderActions()}
                  </div>
                ) : (
                  renderActions()
                )}
              </div>
            );
          })
        )}
      </div>

      <Pagination
        currentPage={safeContentPage}
        totalItems={filteredAnnouncements.length}
        pageSize={contentPageSize}
        onPageChange={setContentPage}
      />

      <AssignDisplayModal
        announcement={assigningAnnouncement}
        displays={displays}
        saving={savingAssign}
        error={actionError}
        onClose={() => setAssigningAnnouncement(null)}
        onSave={executeSaveAssignment}
      />

      <FacebookShareModal
        announcement={fbShareTarget}
        onClose={() => setFbShareTarget(null)}
        onPublished={(id, res) => {
          setAnnouncements((prev) =>
            prev.map((a) =>
              a.id === id ? { ...a, fb_post_id: res.fb_post_id, fb_post_url: res.fb_post_url } : a
            )
          );
        }}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={`Delete "${deleteTarget?.title || ''}"?`}
        description="This announcement will be removed from all assigned campus displays."
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <ConfirmModal
        open={Boolean(alertModal)}
        eyebrow="STATUS"
        title={alertModal?.title || ''}
        description={alertModal?.description || ''}
        confirmLabel="OK"
        isAlert
        onConfirm={() => setAlertModal(null)}
      />
    </div>
  );
}
