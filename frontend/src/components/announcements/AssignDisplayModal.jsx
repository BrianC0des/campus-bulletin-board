import React, { useState, useEffect, useId, useMemo } from 'react';
import { ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Monitor } from 'lucide-react';
import { useColleges } from '../../utils/colleges.js';
import { readSignageSettings } from '../../utils/signageSettings.js';
import { DAYS, MIN_DURATION, MAX_DURATION } from './BroadcastScheduler.jsx';

const DURATION_CHOICES = [
  { value: 'indefinite', label: 'Until Unassigned' },
  { value: '24h', label: '24 Hours' },
  { value: '3d', label: '3 Days' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'custom', label: 'Custom Dates' },
];

const SLIDE_PRESETS = [10, 15, 20, 30];

const LAYOUT_LABELS = {
  carousel: 'Single Slide',
  split_2: '2-Slide Split',
  grid_4: '4-Slide Grid',
};

const todayManila = () =>
  new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);

const toDateInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : new Date(d.getTime() + 8 * 3600000).toISOString().slice(0, 10);
};

function readCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('campus_user') || localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

export default function AssignDisplayModal({ announcement, displays = [], saving = false, error = '', onClose, onSave }) {
  const titleId = useId();
  const { formatLabel } = useColleges();
  const currentUser = useMemo(() => readCurrentUser(), []);
  const isLeadAdmin = currentUser?.role === 'lead_admin';
  const assignedColleges = useMemo(() => {
    if (isLeadAdmin) return [];
    const raw = Array.isArray(currentUser?.allowed_colleges) && currentUser.allowed_colleges.length > 0
      ? currentUser.allowed_colleges
      : (currentUser?.college ? [currentUser.college] : []);
    return raw.filter((c) => c && c !== 'ALL' && c !== 'Campus-Wide');
  }, [isLeadAdmin, currentUser]);
  const hasCampusWideScope = useMemo(
    () => Array.isArray(currentUser?.allowed_colleges)
      && currentUser.allowed_colleges.some((c) => ['ALL', 'CAMPUS-WIDE'].includes(String(c || '').trim().toUpperCase())),
    [currentUser]
  );

  const scopedDisplays = useMemo(() => {
    const annScope = String(announcement?.target_college || '').trim();
    const isAnnCampusWide = !annScope || ['ALL', 'CAMPUS-WIDE'].includes(annScope.toUpperCase());

    return displays.filter((d) => {
      const dept = String(d.department || d.college || 'Campus-Wide').trim();
      const isDispCampusWide = ['ALL', 'CAMPUS-WIDE', ''].includes(dept.toUpperCase());

      if (!isLeadAdmin) {
        if (isDispCampusWide) {
          if (!hasCampusWideScope) return false;
        } else if (!assignedColleges.some((c) => String(c).trim().toUpperCase() === dept.toUpperCase())) {
          return false;
        }
      }

      if (!isAnnCampusWide) {
        return dept.toUpperCase() === annScope.toUpperCase();
      }
      return true;
    });
  }, [displays, announcement?.target_college, isLeadAdmin, hasCampusWideScope, assignedColleges]);
  const [step, setStep] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [durationMode, setDurationMode] = useState('indefinite');
  const [startDate, setStartDate] = useState(todayManila());
  const [endDate, setEndDate] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [playbackDuration, setPlaybackDuration] = useState(() => readSignageSettings().defaultSlideDuration || 15);
  const [priority, setPriority] = useState('normal');
  const [recurrenceDays, setRecurrenceDays] = useState([1, 2, 3, 4, 5, 6, 0]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!announcement) return;
    setStep(1);
    setSelectedIds(
      (announcement.assigned_displays || []).map((d) => (typeof d === 'object' ? d.id : d))
    );
    setDurationMode(announcement.ends_at ? 'custom' : 'indefinite');
    setStartDate(announcement.starts_at ? toDateInput(announcement.starts_at) : todayManila());
    setEndDate(toDateInput(announcement.ends_at));
    const hasDaily = Boolean(announcement.daily_start_time && announcement.daily_end_time);
    setAllDay(!hasDaily);
    setStartTime(hasDaily ? String(announcement.daily_start_time).slice(0, 5) : '08:00');
    setEndTime(hasDaily ? String(announcement.daily_end_time).slice(0, 5) : '17:00');
    setPlaybackDuration(announcement.playback_duration || readSignageSettings().defaultSlideDuration || 15);
    setPriority(announcement.priority || 'normal');
    setRecurrenceDays(
      Array.isArray(announcement.recurrence_days) && announcement.recurrence_days.length
        ? announcement.recurrence_days.map(Number)
        : [1, 2, 3, 4, 5, 6, 0]
    );
    setShowAdvanced(hasDaily);
    setLocalError('');
  }, [announcement]);

  useEffect(() => {
    if (!announcement) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [announcement, onClose]);

  if (!announcement) return null;

  const toggleDisplay = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleDay = (d) => {
    setRecurrenceDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const handleSubmit = () => {
    if (durationMode === 'custom' && !endDate) {
      setLocalError('Choose an end date or pick a duration preset.');
      return;
    }
    if (durationMode === 'custom' && endDate && startDate && endDate < startDate) {
      setLocalError('End date must be on or after the start date.');
      return;
    }
    if (!allDay && (!startTime || !endTime || startTime === endTime)) {
      setLocalError('Daily start and end times must be set and differ.');
      return;
    }
    if (recurrenceDays.length === 0) {
      setLocalError('Select at least one day of the week.');
      return;
    }

    setLocalError('');
    const now = new Date();
    const preservedStart = announcement.starts_at || now.toISOString();
    const existingStartDate = toDateInput(announcement.starts_at);
    let computedStart = preservedStart;
    let computedEnd = null;
    let indefinite = false;

    const baseMs = Math.max(now.getTime(), new Date(preservedStart).getTime() || now.getTime());

    if (durationMode === 'indefinite') {
      indefinite = true;
    } else if (durationMode === '24h') {
      computedEnd = new Date(baseMs + 24 * 3600000).toISOString();
    } else if (durationMode === '3d') {
      computedEnd = new Date(baseMs + 3 * 86400000).toISOString();
    } else if (durationMode === '7d') {
      computedEnd = new Date(baseMs + 7 * 86400000).toISOString();
    } else if (durationMode === '30d') {
      computedEnd = new Date(baseMs + 30 * 86400000).toISOString();
    } else if (durationMode === 'custom') {
      if (announcement.starts_at && startDate === existingStartDate) {
        computedStart = announcement.starts_at;
      } else {
        computedStart = startDate ? new Date(`${startDate}T00:00:00+08:00`).toISOString() : preservedStart;
      }
      computedEnd = endDate ? new Date(`${endDate}T23:59:59+08:00`).toISOString() : null;
      if (!computedEnd) indefinite = true;
    }

    const clampedDuration = Math.min(
      MAX_DURATION,
      Math.max(MIN_DURATION, Number(playbackDuration) || 15)
    );
    const preservedStatus =
      announcement.publish_status || (announcement.status === 'draft' ? 'draft' : 'published');

    onSave({
      display_ids: selectedIds,
      publish_status: preservedStatus,
      starts_at: computedStart,
      ends_at: computedEnd,
      indefinite,
      daily_start_time: allDay ? '' : startTime,
      daily_end_time: allDay ? '' : endTime,
      playback_duration: clampedDuration,
      priority,
      recurrence_days: recurrenceDays,
    });
  };

  return (
    <div className="user-modal-wash" onClick={onClose}>
      <div
        className="sketch-box assignment-modal assignment-modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <div className="eyebrow">STEP {step} OF 2 • DISPLAY ASSIGNMENT</div>
            <h2 id={titleId}>Assign: {announcement.title}</h2>
          </div>
          <button type="button" className="text-action" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="wizard-steps-bar" role="tablist" aria-label="Assignment steps">
          <button
            type="button"
            role="tab"
            aria-selected={step === 1}
            className={`wizard-step-tab ${step === 1 ? 'active' : 'done'}`}
            onClick={() => setStep(1)}
          >
            <span>1</span> Target Displays ({selectedIds.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={step === 2}
            className={`wizard-step-tab ${step === 2 ? 'active' : ''}`}
            onClick={() => setStep(2)}
          >
            <span>2</span> Duration &amp; Schedule
          </button>
        </div>

        {step === 1 && (
          <div className="assignment-section">
            <div className="scheduler-row-head" style={{ marginBottom: 10 }}>
              <label style={{ margin: 0 }}>CHOOSE WHERE THIS ANNOUNCEMENT PLAYS</label>
              <div className="scheduler-quick-links">
                <button type="button" className="text-action" onClick={() => setSelectedIds(scopedDisplays.map((d) => d.id))}>
                  All Displays
                </button>
                <button type="button" className="text-action" onClick={() => setSelectedIds([])}>
                  Clear
                </button>
              </div>
            </div>

            <div className="display-checklist" style={{ maxHeight: 300 }}>
              {scopedDisplays.length === 0 ? (
                <div className="empty-inline-note">
                  {displays.length === 0
                    ? 'No paired displays found. Pair a screen in Displays first, then come back to assign.'
                    : 'No displays match your scope or this announcement’s target college.'}
                </div>
              ) : (
                scopedDisplays.map((d) => {
                  const isChecked = selectedIds.includes(d.id);
                  return (
                    <label key={d.id} className={`display-check-item ${isChecked ? 'checked' : ''}`}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleDisplay(d.id)} />
                      <Monitor size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
                      <div style={{ flex: 1 }}>
                        <strong>{d.name}</strong>
                        <small>
                          {d.location || 'Campus'} • {formatLabel(d.department || d.college || 'Campus-Wide')} •{' '}
                          {LAYOUT_LABELS[d.layout_mode || 'carousel'] || 'Single Slide'}
                        </small>
                      </div>
                      <span className={`fleet-badge ${d.is_paired ? 'online' : 'offline'}`}>
                        {d.is_paired ? 'ONLINE' : 'UNPAIRED'}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <>
            <div className="assignment-section">
              <label>BROADCAST PERIOD / EXPIRATION</label>
              <div className="duration-chips" style={{ marginBottom: durationMode === 'custom' ? 12 : 0 }}>
                {DURATION_CHOICES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={durationMode === c.value ? 'active' : ''}
                    onClick={() => setDurationMode(c.value)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {durationMode === 'custom' && (
                <div className="scheduler-two-col">
                  <div>
                    <span className="field-caption">START DATE</span>
                    <input
                      className="field"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <span className="field-caption">END DATE</span>
                    <input
                      className="field"
                      type="date"
                      min={startDate || undefined}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="assignment-section">
              <div className="scheduler-row-head" style={{ marginBottom: 8 }}>
                <label style={{ margin: 0 }}>SLIDE DURATION</label>
                <strong className="duration-readout">{playbackDuration || 15} seconds</strong>
              </div>
              <input
                type="range"
                className="scheduler-slider"
                min={MIN_DURATION}
                max={MAX_DURATION}
                value={Math.min(MAX_DURATION, Math.max(MIN_DURATION, Number(playbackDuration) || 15))}
                onChange={(e) => setPlaybackDuration(Number(e.target.value))}
              />
              <div className="duration-chips">
                {SLIDE_PRESETS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={playbackDuration === s ? 'active' : ''}
                    onClick={() => setPlaybackDuration(s)}
                  >
                    {s}s
                  </button>
                ))}
                <input
                  className="field duration-custom-input"
                  type="number"
                  placeholder="Custom (3–300s)"
                  min={MIN_DURATION}
                  max={MAX_DURATION}
                  value={SLIDE_PRESETS.includes(playbackDuration) ? '' : playbackDuration}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setPlaybackDuration('');
                      return;
                    }
                    const n = Number(raw);
                    if (!Number.isNaN(n)) setPlaybackDuration(n);
                  }}
                  onBlur={() => {
                    const clamped = Math.min(
                      MAX_DURATION,
                      Math.max(MIN_DURATION, Number(playbackDuration) || 15)
                    );
                    setPlaybackDuration(clamped);
                  }}
                />
              </div>
            </div>

            <div className="assignment-section" style={{ marginBottom: 8 }}>
              <button
                type="button"
                className="accordion-toggle-btn"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                <span>Advanced: Daily Hours &amp; Repeat Days</span>
                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showAdvanced && (
                <div className="accordion-body">
                  <div className="scheduler-row-head" style={{ marginBottom: 8 }}>
                    <span className="field-caption" style={{ margin: 0 }}>DAILY HOURS (ASIA/MANILA)</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={allDay}
                      className={`pill-switch ${allDay ? 'on' : ''}`}
                      onClick={() => setAllDay((v) => !v)}
                    >
                      {allDay ? 'All day (24h)' : 'Custom hours'}
                    </button>
                  </div>
                  {!allDay && (
                    <div className="scheduler-two-col" style={{ marginBottom: 10 }}>
                      <div>
                        <span className="field-caption">START TIME</span>
                        <input className="field" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                      </div>
                      <div>
                        <span className="field-caption">END TIME</span>
                        <input className="field" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                      </div>
                    </div>
                  )}
                  <span className="field-caption">REPEAT ON DAYS</span>
                  <div className="scheduler-day-pills">
                    {DAYS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        className={recurrenceDays.includes(d.value) ? 'active' : ''}
                        onClick={() => toggleDay(d.value)}
                      >
                        {d.short}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {(localError || error) && (
          <div className="pairing-error" role="alert" style={{ marginBottom: 12 }}>
            {localError || error}
          </div>
        )}

        <div className="wizard-nav-footer" style={{ marginTop: 16 }}>
          {step === 1 ? (
            <>
              <button type="button" className="wire-button" onClick={onClose}>
                Cancel
              </button>
              <div className="wizard-nav-right">
                <button type="button" className="wire-button" onClick={() => setStep(2)}>
                  Next: Duration &amp; Schedule <ChevronRight size={14} />
                </button>
                <button type="button" className="wire-button dark" disabled={saving} onClick={handleSubmit}>
                  {saving ? 'Saving...' : `Save & Broadcast (${selectedIds.length})`}
                </button>
              </div>
            </>
          ) : (
            <>
              <button type="button" className="wire-button" onClick={() => setStep(1)}>
                <ChevronLeft size={14} /> Back
              </button>
              <button type="button" className="wire-button dark" disabled={saving} onClick={handleSubmit}>
                {saving ? 'Saving...' : `Save assignment (${selectedIds.length} Display${selectedIds.length === 1 ? '' : 's'})`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
