import React, { useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { readSignageSettings } from '../../utils/signageSettings.js';

export const DAYS = [
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
  { value: 0, short: 'Sun', long: 'Sunday' },
];
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [6, 0];
const DURATION_PRESETS = [10, 15, 20, 30];
export const MIN_DURATION = 3;
export const MAX_DURATION = 300;
const TZ = 'Asia/Manila';

const PUBLISH_OPTIONS = [
  { value: 'now', label: 'Publish immediately' },
  { value: 'schedule', label: 'Schedule for later' },
  { value: 'draft', label: 'Save as draft' },
];

const todayManila = () =>
  new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);

export const defaultSchedule = () => {
  const settings = readSignageSettings();
  const expiryDays = Number(settings.defaultExpiryDays) || 0;
  const start = todayManila();
  const end = expiryDays > 0
    ? new Date(Date.now() + 8 * 3600000 + expiryDays * 86400000).toISOString().slice(0, 10)
    : '';
  return {
    publishMode: settings.defaultPublishMode || 'now',
    startDate: start,
    endDate: end,
    noEnd: expiryDays <= 0,
    allDay: true,
    startTime: '08:00',
    endTime: '17:00',
    playbackDuration: settings.defaultSlideDuration || 15,
    priority: 'normal',
    recurrenceDays: [...ALL_DAYS],
  };
};

const toDateInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() + 8 * 3600000).toISOString().slice(0, 10);
};

/** Build scheduler state from a saved announcement row. */
export function scheduleFromAnnouncement(a) {
  const base = defaultSchedule();
  if (!a) return base;
  const hasDaily = Boolean(a.daily_start_time && a.daily_end_time);
  const status = a.publish_status || (a.status === 'draft' ? 'draft' : 'published');
  const future = a.starts_at && new Date(a.starts_at).getTime() > Date.now();
  return {
    ...base,
    publishMode: status === 'draft' ? 'draft' : future ? 'schedule' : 'now',
    startDate: a.starts_at ? toDateInput(a.starts_at) : base.startDate,
    endDate: toDateInput(a.ends_at),
    noEnd: !a.ends_at,
    allDay: !hasDaily,
    startTime: hasDaily ? String(a.daily_start_time).slice(0, 5) : base.startTime,
    endTime: hasDaily ? String(a.daily_end_time).slice(0, 5) : base.endTime,
    playbackDuration: a.playback_duration || 15,
    priority: a.priority || 'normal',
    recurrenceDays: Array.isArray(a.recurrence_days) && a.recurrence_days.length
      ? a.recurrence_days.map(Number)
      : [...ALL_DAYS],
  };
}

export const isOvernight = (s) => !s.allDay && s.startTime && s.endTime && s.endTime < s.startTime;

/** Returns an error string, or '' when the schedule is valid. */
export function validateSchedule(s) {
  if (s.publishMode === 'schedule' && !s.startDate) return 'Choose a start date for the scheduled broadcast.';
  if (!s.noEnd && s.endDate && s.startDate && s.endDate < s.startDate) return 'End date must be on or after the start date.';
  if (!s.noEnd && s.publishMode !== 'draft' && !s.endDate) return 'Choose an end date or enable "No end date".';
  if (!s.allDay && (!s.startTime || !s.endTime)) return 'Set both daily display times.';
  if (!s.allDay && s.startTime === s.endTime) return 'Daily start and end times must differ.';
  if (s.playbackDuration !== null && (s.playbackDuration < MIN_DURATION || s.playbackDuration > MAX_DURATION)) {
    return `Slide duration must be between ${MIN_DURATION} and ${MAX_DURATION} seconds.`;
  }
  if (s.recurrenceDays.length === 0) return 'Select at least one day of the week.';
  return '';
}

/** Map scheduler state to API fields (see announcements columns). */
export function scheduleToPayload(s) {
  const payload = {
    publish_status: s.publishMode === 'draft' ? 'draft' : 'published',
    priority: s.priority,
    recurrence_days: JSON.stringify([...s.recurrenceDays].sort((a, b) => a - b)),
  };
  payload.starts_at =
    s.publishMode === 'schedule' && s.startDate
      ? new Date(`${s.startDate}T00:00:00+08:00`).toISOString()
      : new Date().toISOString();
  if (s.noEnd || !s.endDate) {
    payload.indefinite = 'true';
  } else {
    payload.ends_at = new Date(`${s.endDate}T23:59:59+08:00`).toISOString();
  }
  payload.daily_start_time = s.allDay ? '' : s.startTime;
  payload.daily_end_time = s.allDay ? '' : s.endTime;
  payload.playback_duration = String(s.playbackDuration || 15);
  return payload;
}

const fmtDate = (v) =>
  v ? new Date(`${v}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

const fmtTime = (v) => {
  if (!v) return '';
  const [h, m] = v.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export function summarizeSchedule(s) {
  const parts = [];
  if (s.publishMode === 'draft') return 'Saved as a draft. It will not be shown until you publish it.';
  parts.push(
    s.publishMode === 'schedule'
      ? `Starts ${fmtDate(s.startDate) || '(pick a date)'}`
      : 'Goes live immediately'
  );
  parts.push(s.noEnd || !s.endDate ? 'with no end date (until unassigned)' : `through ${fmtDate(s.endDate)}`);
  const sortDays = (list) => [...list].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
  const days = sortDays(s.recurrenceDays);
  let dayText;
  if (days.length === 7) dayText = 'every day';
  else if (days.join() === WEEKDAYS.join()) dayText = 'on weekdays';
  else if (days.join() === WEEKENDS.join()) dayText = 'on weekends';
  else dayText = `on ${days.map((d) => DAYS.find((x) => x.value === d)?.short).filter(Boolean).join(', ') || 'no days'}`;
  const hours = s.allDay
    ? 'all day (24h)'
    : `${fmtTime(s.startTime)} – ${fmtTime(s.endTime)}${isOvernight(s) ? ' (overnight, ends next day)' : ''}`;
  const dur = `${s.playbackDuration || 15}s per slide`;
  const pri = { normal: 'Normal priority', priority: 'High priority', emergency: 'Emergency override' }[s.priority];
  return `${parts.join(' ')}, shown ${dayText}, ${hours} (${TZ}). Plays for ${dur}. ${pri}.`;
}

export default function BroadcastScheduler({ value, onChange }) {
  const endDateRef = useRef(null);
  const [showAdvanced, setShowAdvanced] = useState(!value.allDay || value.recurrenceDays.length < 7);
  const set = (patch) => onChange({ ...value, ...patch });

  const toggleDay = (d) =>
    set({
      recurrenceDays: value.recurrenceDays.includes(d)
        ? value.recurrenceDays.filter((x) => x !== d)
        : [...value.recurrenceDays, d],
    });

  const handleActivateEndDate = () => {
    if (value.noEnd) {
      set({ noEnd: false });
      setTimeout(() => {
        endDateRef.current?.focus();
        if (typeof endDateRef.current?.showPicker === 'function') {
          try {
            endDateRef.current.showPicker();
          } catch {
            // ignore
          }
        }
      }, 0);
    }
  };

  const duration = value.playbackDuration || 15;
  const err = validateSchedule(value);

  const modeBadge =
    value.publishMode === 'draft'
      ? { text: 'Draft', cls: 'draft' }
      : value.publishMode === 'schedule'
        ? { text: 'Scheduled', cls: 'scheduled' }
        : { text: 'Immediate', cls: 'active' };

  return (
    <div className="broadcast-scheduler">
      <div className="scheduler-head">
        <div>
          <span className="eyebrow">PLAYBACK &amp; TIMING</span>
          <h3>Broadcast scheduling</h3>
        </div>
        <span className={`content-status ${modeBadge.cls}`}>{modeBadge.text}</span>
      </div>

      <div className="scheduler-block">
        <label className="scheduler-label">PUBLISHING MODE</label>
        <div className="scheduler-segmented" role="radiogroup" aria-label="Publishing options">
          {PUBLISH_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={value.publishMode === o.value}
              className={`scheduler-seg-btn ${value.publishMode === o.value ? 'active' : ''}`}
              onClick={() => set({ publishMode: o.value })}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {value.publishMode !== 'draft' && (
        <div className="scheduler-block">
          {value.publishMode === 'schedule' ? (
            <div className="scheduler-two-col">
              <div>
                <span className="field-caption">BROADCAST START DATE</span>
                <input
                  className="field"
                  type="date"
                  aria-label="Broadcast start date"
                  value={value.startDate || todayManila()}
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    set({ startDate: nextDate });
                  }}
                />
              </div>

              {!value.noEnd && (
                <div className="end-date-slot">
                  <span className="field-caption">BROADCAST END DATE</span>
                  <input
                    ref={endDateRef}
                    className="field"
                    type="date"
                    aria-label="Broadcast end date"
                    min={value.startDate || todayManila()}
                    value={value.endDate}
                    onChange={(e) => set({ noEnd: false, endDate: e.target.value })}
                  />
                </div>
              )}
            </div>
          ) : (
            !value.noEnd && (
              <div className="end-date-slot" style={{ marginBottom: 10 }}>
                <span className="field-caption">BROADCAST END DATE</span>
                <input
                  ref={endDateRef}
                  className="field"
                  type="date"
                  aria-label="Broadcast end date"
                  min={todayManila()}
                  value={value.endDate}
                  onChange={(e) => set({ noEnd: false, endDate: e.target.value })}
                />
              </div>
            )
          )}

          <div className="scheduler-toggle-row">
            <div>
              <strong>Automatically expire</strong>
              <small>
                {value.noEnd
                  ? 'No — stays active until manually unassigned'
                  : 'Yes — stops displaying after the broadcast end date'}
              </small>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!value.noEnd}
              className={`pill-switch ${!value.noEnd ? 'on' : ''}`}
              onClick={() => {
                if (value.noEnd) {
                  set({ noEnd: false });
                  setTimeout(() => endDateRef.current?.focus(), 0);
                } else {
                  set({ noEnd: true });
                }
              }}
            >
              {value.noEnd ? 'No (Indefinite)' : 'Yes (Expires)'}
            </button>
          </div>
        </div>
      )}

      <div className="scheduler-block">
        <div className="scheduler-row-head">
          <label className="scheduler-label">SLIDE DURATION</label>
          <strong className="duration-readout">{duration} seconds</strong>
        </div>
        <input
          type="range"
          className="scheduler-slider"
          aria-label="Slide duration in seconds"
          min={MIN_DURATION}
          max={60}
          value={Math.min(60, duration)}
          onChange={(e) => set({ playbackDuration: Number(e.target.value) })}
        />
        <div className="duration-chips">
          {DURATION_PRESETS.map((s) => (
            <button
              key={s}
              type="button"
              className={duration === s ? 'active' : ''}
              onClick={() => set({ playbackDuration: s })}
            >
              {s}s
            </button>
          ))}
          <input
            className="field duration-custom-input"
            type="number"
            aria-label="Custom slide duration seconds"
            placeholder="Custom (3–300s)"
            min={MIN_DURATION}
            max={MAX_DURATION}
            value={!DURATION_PRESETS.includes(duration) ? duration : ''}
            onChange={(e) => set({ playbackDuration: e.target.value === '' ? 15 : Number(e.target.value) })}
          />
        </div>
      </div>

      {value.publishMode !== 'draft' && (
        <div>
          <button
            type="button"
            className="accordion-toggle-btn"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            <span>Advanced: Daily Hours &amp; Repeat Schedule</span>
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showAdvanced && (
            <div className="accordion-body">
              <div className="scheduler-row-head" style={{ marginBottom: 10 }}>
                <label className="scheduler-label">
                  DAILY DISPLAY HOURS <span className="orientation-badge">{TZ}</span>
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={value.allDay}
                  className={`pill-switch ${value.allDay ? 'on' : ''}`}
                  onClick={() => set({ allDay: !value.allDay })}
                >
                  {value.allDay ? 'All day (24h)' : 'Custom hours'}
                </button>
              </div>
              {!value.allDay && (
                <div className="scheduler-two-col" style={{ marginBottom: 10 }}>
                  <div>
                    <span className="field-caption">START TIME</span>
                    <input
                      className="field"
                      type="time"
                      aria-label="Daily start time"
                      value={value.startTime}
                      onChange={(e) => set({ startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <span className="field-caption">END TIME</span>
                    <input
                      className="field"
                      type="time"
                      aria-label="Daily end time"
                      value={value.endTime}
                      onChange={(e) => set({ endTime: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="scheduler-row-head" style={{ marginBottom: 8 }}>
                <label className="scheduler-label">REPEAT SCHEDULE</label>
                <div className="scheduler-quick-links">
                  <button type="button" className="text-action" onClick={() => set({ recurrenceDays: [...ALL_DAYS] })}>
                    Every day
                  </button>
                  <button type="button" className="text-action" onClick={() => set({ recurrenceDays: [...WEEKDAYS] })}>
                    Weekdays
                  </button>
                  <button type="button" className="text-action" onClick={() => set({ recurrenceDays: [...WEEKENDS] })}>
                    Weekends
                  </button>
                </div>
              </div>
              <div className="scheduler-day-pills">
                {DAYS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    aria-pressed={value.recurrenceDays.includes(d.value)}
                    aria-label={d.long}
                    className={value.recurrenceDays.includes(d.value) ? 'active' : ''}
                    onClick={() => toggleDay(d.value)}
                  >
                    {d.short}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="schedule-summary-card" role="status" aria-live="polite">
        <strong>SCHEDULE SUMMARY</strong>
        <div>{summarizeSchedule(value)}</div>
        {err && (
          <div className="pairing-error" role="alert" style={{ marginTop: 6, marginBottom: 0 }}>
            {err}
          </div>
        )}
      </div>
    </div>
  );
}
