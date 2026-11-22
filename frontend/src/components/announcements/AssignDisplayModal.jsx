import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';

const DURATION_PRESETS = [
  { label: 'Until Manually Unassigned', hours: null },
  { label: '24 Hours', hours: 24 },
  { label: '3 Days', hours: 72 },
  { label: '7 Days', hours: 168 },
];

export default function AssignDisplayModal({
  announcement,
  displays: propDisplays,
  onClose,
  onSaveAssign,
}) {
  const [displays, setDisplays] = useState(propDisplays || []);
  const [loadingDisplays, setLoadingDisplays] = useState(!propDisplays || propDisplays.length === 0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [durationHours, setDurationHours] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!announcement) return;
    const initialIds =
      announcement.display_ids ||
      (Array.isArray(announcement.assigned_displays)
        ? announcement.assigned_displays
            .map((d) => (typeof d === 'string' ? d : d?.id))
            .filter(Boolean)
        : []);
    setSelectedIds(initialIds);
    setDurationHours(announcement.duration_hours ?? null);
  }, [announcement]);

  useEffect(() => {
    if (propDisplays && propDisplays.length > 0) {
      setDisplays(propDisplays);
      setLoadingDisplays(false);
      return;
    }
    let mounted = true;
    setLoadingDisplays(true);
    api
      .get('/displays')
      .then((res) => {
        if (!mounted) return;
        const list = (res?.displays || []).filter((d) => d.is_paired !== false);
        setDisplays(list);
      })
      .catch((err) => {
        console.error('Failed to load displays for assignment:', err);
      })
      .finally(() => {
        if (mounted) setLoadingDisplays(false);
      });
    return () => {
      mounted = false;
    };
  }, [propDisplays]);

  if (!announcement) return null;

  const targetCollege =
    announcement.target_college && announcement.target_college !== 'ALL'
      ? announcement.target_college.toUpperCase()
      : 'CCS';

  const toggleDisplay = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(displays.map((d) => d.id));
  };

  const handleSelectCollege = () => {
    const collegeMatches = displays.filter((d) => {
      const col = (d.college || '').toUpperCase();
      const nameLoc = `${d.name || ''} ${d.location || ''}`.toUpperCase();
      return col === targetCollege || nameLoc.includes(targetCollege);
    });
    if (collegeMatches.length > 0) {
      setSelectedIds(collegeMatches.map((d) => d.id));
    } else {
      setSelectedIds(displays.map((d) => d.id));
    }
  };

  const handleClearAll = () => {
    setSelectedIds([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSaveAssign(announcement.id, {
        display_ids: selectedIds,
        duration_hours: durationHours,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="assign-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="assign-modal-header">
          <div>
            <p className="assign-modal-eyebrow">DISPLAY BROADCAST ROUTING</p>
            <h3 className="assign-modal-title">
              📺 Assign Announcement to Specific Displays
            </h3>
            <p className="assign-modal-subtitle">
              Notice: <strong>{announcement.title || 'Graphic Poster'}</strong>
            </p>
          </div>
          <button
            type="button"
            className="assign-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="assign-quick-select">
            <span className="assign-quick-label">Quick Select:</span>
            <button
              type="button"
              className="assign-quick-btn"
              onClick={handleSelectAll}
            >
              All Campus Displays
            </button>
            <button
              type="button"
              className="assign-quick-btn"
              onClick={handleSelectCollege}
            >
              Only {targetCollege} Displays
            </button>
            <button
              type="button"
              className="assign-quick-btn"
              onClick={handleClearAll}
            >
              Clear
            </button>
          </div>

          <div className="display-checkbox-list">
            {loadingDisplays ? (
              <p className="assign-empty-msg">Loading paired campus displays...</p>
            ) : displays.length === 0 ? (
              <p className="assign-empty-msg">
                No paired displays yet. You can pair a display later and come back to assign.
              </p>
            ) : (
              displays.map((d) => {
                const isChecked = selectedIds.includes(d.id);
                const collegeTag =
                  d.college ||
                  (/ccs|computing|computer/i.test(`${d.name} ${d.location}`)
                    ? 'CCS'
                    : /eng|coe/i.test(`${d.name} ${d.location}`)
                    ? 'COE'
                    : 'ALL');
                const isOnline = d.is_online !== false;

                return (
                  <label
                    key={d.id}
                    className={`display-checkbox-item${isChecked ? ' selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleDisplay(d.id)}
                    />
                    <div className="display-checkbox-info">
                      <span className="display-checkbox-name">
                        {d.name} <span className="display-college-tag">({collegeTag})</span>
                      </span>
                      {d.location && (
                        <span className="display-checkbox-location">{d.location}</span>
                      )}
                    </div>
                    <span
                      className={`display-status-pill ${
                        isOnline ? 'online' : 'offline'
                      }`}
                    >
                      {isOnline ? '● Online' : '○ Offline'}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          <div className="duration-presets">
            <label className="duration-presets-label">
              How long should this stay on screen? (1-Click Duration Preset):
            </label>
            <div className="preset-pills">
              {DURATION_PRESETS.map((preset) => {
                const isActive = durationHours === preset.hours;
                return (
                  <button
                    type="button"
                    key={preset.label}
                    className={isActive ? 'pill active' : 'pill'}
                    onClick={() => setDurationHours(preset.hours)}
                  >
                    <span className="pill-radio">{isActive ? '(●)' : '( )'}</span>{' '}
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="assign-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? 'Saving...'
                : `Save Assignment (${selectedIds.length} Display${
                    selectedIds.length === 1 ? '' : 's'
                  })`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
