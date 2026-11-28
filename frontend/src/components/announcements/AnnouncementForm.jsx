import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Palette, Info, Facebook } from 'lucide-react';
import CustomSelect from '../common/CustomSelect.jsx';
import ConfirmModal from '../common/ConfirmModal.jsx';
import TemplateGallery from './TemplateGallery.jsx';
import LivePreviewPane from './LivePreviewPane.jsx';
import BroadcastScheduler, {
  scheduleFromAnnouncement,
  scheduleToPayload,
  validateSchedule,
} from './BroadcastScheduler.jsx';
import {
  DEFAULT_TEMPLATE_ID,
  WEEKLY_ROW_TEMPLATE,
  getTemplate,
  defaultTemplateData,
} from './templates/templateRegistry.js';
import { useColleges } from '../../utils/colleges.js';
import api from '../../services/api.js';
import { getImageUrl } from '../../utils/imageUrl.js';

const MAX_PHOTOS = 10;

const THEME_PRESETS = [
  { id: 'default', label: 'Default PASKIL', bg_color: '', text_color: '', accent_color: '' },
  { id: 'crimson', label: 'WMSU Crimson', bg_color: '#7a0a16', text_color: '#ffffff', accent_color: '#facc15' },
  { id: 'navy', label: 'Midnight Navy', bg_color: '#101827', text_color: '#f8fafc', accent_color: '#c9f23a' },
  { id: 'emerald', label: 'Forest Emerald', bg_color: '#064e3b', text_color: '#ecfdf5', accent_color: '#a7f3d0' },
  { id: 'royal', label: 'Royal Blue', bg_color: '#1e3a8a', text_color: '#ffffff', accent_color: '#93c5fd' },
  { id: 'sand', label: 'Warm Sand', bg_color: '#f4f1e8', text_color: '#101827', accent_color: '#ff6b57' },
];

function parseTemplateData(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) || {};
    } catch {
      return {};
    }
  }
  return value;
}

function initialPhotos(initialData) {
  const urls = initialData?.image_urls?.length
    ? initialData.image_urls
    : initialData?.image_url
      ? [initialData.image_url]
      : [];
  return urls.map((rawUrl, i) => ({ name: `photo-${i + 1}`, url: getImageUrl(rawUrl), rawUrl }));
}

function readCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('campus_user') || localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

function FieldInput({ field, value, onChange }) {
  const id = `tpl-${field.key}`;
  if (field.type === 'textarea') {
    return (
      <textarea
        id={id}
        className="field"
        rows={3}
        value={value || ''}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field.type === 'list') {
    const rows = Array.isArray(value) ? value : [];
    const update = (i, patch) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    return (
      <div className="schedule-rows" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '92px 115px 1fr 1fr auto', gap: 6 }}>
            <select
              className="field"
              aria-label={`Row ${i + 1} day`}
              value={r.day || 'MON'}
              onChange={(e) => update(i, { day: e.target.value })}
            >
              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <input
              className="field"
              type="time"
              aria-label={`Row ${i + 1} time`}
              value={r.time || ''}
              onChange={(e) => update(i, { time: e.target.value })}
            />
            <input className="field" aria-label={`Row ${i + 1} event`} placeholder="Event" value={r.title || ''} onChange={(e) => update(i, { title: e.target.value })} />
            <input className="field" aria-label={`Row ${i + 1} venue`} placeholder="Venue" value={r.venue || ''} onChange={(e) => update(i, { venue: e.target.value })} />
            <button
              type="button"
              className="text-action"
              disabled={rows.length <= field.min}
              aria-label={`Remove row ${i + 1}`}
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            >
              ×
            </button>
          </div>
        ))}
        {rows.length < field.max && (
          <button type="button" className="wire-button" onClick={() => onChange([...rows, { ...WEEKLY_ROW_TEMPLATE }])}>
            + Add row
          </button>
        )}
      </div>
    );
  }
  return (
    <input
      id={id}
      className="field"
      type={
        field.type === 'date'
          ? 'date'
          : field.type === 'time'
            ? 'time'
            : field.type === 'url'
              ? 'url'
              : field.type === 'tel'
                ? 'tel'
                : 'text'
      }
      value={value || ''}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function AnnouncementForm({ initialData, displays = [], onSuccess, onCancel, onPreview }) {
  const isEditing = Boolean(initialData?.id);
  const currentUser = useMemo(() => readCurrentUser(), []);
  const isLeadAdmin = currentUser?.role === 'lead_admin';
  const assignedColleges = useMemo(() => {
    if (isLeadAdmin) return [];
    const raw = Array.isArray(currentUser?.allowed_colleges) && currentUser.allowed_colleges.length > 0
      ? currentUser.allowed_colleges
      : (currentUser?.college ? [currentUser.college] : []);
    return raw.filter((c) => c && c !== 'ALL' && c !== 'Campus-Wide');
  }, [isLeadAdmin, currentUser]);
  // Campus-Wide displays are targetable by non-lead admins only when explicitly granted.
  const hasCampusWideScope = useMemo(
    () => Array.isArray(currentUser?.allowed_colleges)
      && currentUser.allowed_colleges.some((c) => ['ALL', 'CAMPUS-WIDE'].includes(String(c || '').trim().toUpperCase())),
    [currentUser]
  );
  const visibleDisplays = useMemo(() => {
    if (isLeadAdmin) return displays;
    return displays.filter((d) => {
      const dept = d.department || d.college || 'Campus-Wide';
      if (['ALL', 'CAMPUS-WIDE'].includes(String(dept).trim().toUpperCase())) return hasCampusWideScope;
      return assignedColleges.includes(dept);
    });
  }, [displays, isLeadAdmin, hasCampusWideScope, assignedColleges]);
  const isCollegeLocked = !isLeadAdmin && assignedColleges.length <= 1;
  const { getOptions: getCollegeOptions, formatLabel } = useColleges();

  const [step, setStep] = useState(isEditing ? 'editor' : 'gallery');
  const [wizardStep, setWizardStep] = useState(1);

  const [templateId, setTemplateId] = useState(
    getTemplate(initialData?.template_id || DEFAULT_TEMPLATE_ID).id
  );
  const [templateData, setTemplateData] = useState(() => {
    const parsed = parseTemplateData(initialData?.template_data);
    const defaults = defaultTemplateData(initialData?.template_id || DEFAULT_TEMPLATE_ID, parsed);
    return parsed?.theme ? { ...defaults, theme: parsed.theme } : defaults;
  });
  const [schedule, setSchedule] = useState(() => scheduleFromAnnouncement(initialData));
  const [selectedDisplays, setSelectedDisplays] = useState(() =>
    (initialData?.assigned_displays || []).map((d) => (typeof d === 'object' ? d.id : d))
  );
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [title, setTitle] = useState(initialData?.title || '');
  const [body, setBody] = useState(initialData?.body || '');
  const [targetCollege, setTargetCollege] = useState(() => {
    if (!isLeadAdmin) {
      if (initialData?.target_college && assignedColleges.includes(initialData.target_college)) {
        return initialData.target_college;
      }
      return assignedColleges[0] || '';
    }
    if (initialData?.target_college && !['Campus-Wide', 'ALL'].includes(initialData.target_college)) {
      return initialData.target_college;
    }
    return 'Campus-Wide';
  });
  const [customCollege, setCustomCollege] = useState('');

  // Each photo is either existing ({ rawUrl }) or newly picked ({ file }).
  const [photos, setPhotos] = useState(() => initialPhotos(initialData));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const blobUrlsRef = useRef([]);

  const template = getTemplate(templateId);
  const isImageOnly = template.id === 'image_only';

  const collegeChoices = useMemo(() => {
    if (!isLeadAdmin) {
      return assignedColleges.map((c) => ({ value: c, label: formatLabel(c) }));
    }
    return getCollegeOptions({
      includeCampusWide: true,
      includeCustom: true,
      extraValues: [targetCollege, initialData?.target_college],
    });
  }, [isLeadAdmin, assignedColleges, getCollegeOptions, formatLabel, targetCollege, initialData?.target_college]);

  const resolvedTargetCollege = !isLeadAdmin
    ? (assignedColleges.includes(targetCollege) ? targetCollege : (assignedColleges[0] || ''))
    : targetCollege === 'Custom'
      ? customCollege.trim() || 'Campus-Wide'
      : targetCollege;

  const canPublishAndShareFb =
    schedule.publishMode === 'now' &&
    (isLeadAdmin ? resolvedTargetCollege === 'Campus-Wide' : resolvedTargetCollege !== 'Campus-Wide');

  const currentTheme = templateData?.theme || { bg_color: '', text_color: '', accent_color: '' };
  const updateTheme = (patch) => {
    setTemplateData((prev) => ({
      ...prev,
      theme: { ...(prev?.theme || {}), ...patch },
    }));
  };

  const snapshot = useMemo(
    () =>
      JSON.stringify([
        templateId, templateData, schedule, selectedDisplays, title, body,
        targetCollege, customCollege, photos.map((p) => p.rawUrl || p.name),
      ]),
    [templateId, templateData, schedule, selectedDisplays, title, body, targetCollege, customCollege, photos]
  );
  const [initialSnapshot] = useState(snapshot);
  const isDirty = snapshot !== initialSnapshot;

  const handleLeave = () => {
    if (isDirty && !submitting) setConfirmDiscard(true);
    else onCancel?.();
  };

  const toggleDisplay = (id) =>
    setSelectedDisplays((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  useEffect(
    () => () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  const chooseTemplate = (id) => {
    setTemplateId(id);
    setTemplateData((prev) => {
      const next = defaultTemplateData(id, prev);
      return prev?.theme ? { ...next, theme: prev.theme } : next;
    });
    if (id === 'emergency_banner') setSchedule((s) => ({ ...s, priority: 'emergency' }));
    else if (templateId === 'emergency_banner') setSchedule((s) => ({ ...s, priority: 'normal' }));
    setWizardStep(1);
    setStep('editor');
  };

  const addPhotos = (files) => {
    if (!files) return;
    const added = Array.from(files).map((file) => {
      const url = URL.createObjectURL(file);
      blobUrlsRef.current.push(url);
      return { name: file.name, url, file };
    });
    setPhotos((current) => [...current, ...added].slice(0, MAX_PHOTOS));
  };

  const removePhoto = (photoUrl) => {
    if (photoUrl.startsWith('blob:')) URL.revokeObjectURL(photoUrl);
    setPhotos((current) => current.filter((photo) => photo.url !== photoUrl));
  };

  const previewAnnouncement = {
    id: initialData?.id,
    title: title || (isImageOnly ? 'Graphic Poster' : 'CAMPUS ANNOUNCEMENT'),
    body: isImageOnly ? '' : body,
    template_id: templateId,
    template_data: templateData,
    target_college: resolvedTargetCollege,
    playback_duration: schedule.playbackDuration,
    image_urls: photos.map((p) => p.url),
  };

  const handleSubmit = async (e, openFb = false) => {
    if (e) e.preventDefault();
    if (isImageOnly && photos.length === 0 && !title.trim()) {
      setError('Upload at least one poster image or enter a title.');
      setWizardStep(1);
      return;
    }
    if (!isImageOnly && !title.trim()) {
      setError('Announcement title is required.');
      setWizardStep(1);
      return;
    }
    const scheduleError = validateSchedule(schedule);
    if (scheduleError) {
      setError(scheduleError);
      setWizardStep(3);
      return;
    }

    if (!isLeadAdmin && !resolvedTargetCollege) {
      setError('No college scope assigned to your account. Contact a Lead Admin.');
      setWizardStep(2);
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const resolvedTitle = title.trim() || (isImageOnly ? 'Graphic Poster' : 'Campus Notice');
      const payload = new FormData();
      payload.append('title', resolvedTitle);
      payload.append('body', isImageOnly ? '' : body.trim());
      payload.append('target_college', resolvedTargetCollege === 'Campus-Wide' ? 'ALL' : resolvedTargetCollege);
      payload.append('template_id', templateId);
      payload.append('template_data', JSON.stringify(templateData));
      Object.entries(scheduleToPayload(schedule)).forEach(([k, v]) => payload.append(k, v));
      const visibleIds = new Set(visibleDisplays.map((d) => d.id));
      payload.append('display_ids', JSON.stringify(isLeadAdmin ? selectedDisplays : selectedDisplays.filter((id) => visibleIds.has(id))));

      photos.forEach((p) => {
        if (p.file) payload.append('images', p.file);
      });

      let savedRes;
      if (isEditing) {
        const retained = photos.filter((p) => p.rawUrl && !p.file).map((p) => p.rawUrl);
        payload.append('retained_image_urls', JSON.stringify(retained));
        savedRes = await api.put(`/announcements/${initialData.id}`, payload);
      } else {
        savedRes = await api.post('/announcements', payload);
      }
      const savedAnn = savedRes?.announcement || null;
      onSuccess(savedAnn, Boolean(openFb));
    } catch (err) {
      setError(err.message || 'Failed to save announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'gallery') {
    return <TemplateGallery selectedId={templateId} onSelect={chooseTemplate} onCancel={onCancel} />;
  }

  const submitLabel = submitting
    ? 'Saving...'
    : schedule.publishMode === 'draft'
      ? 'Save Draft'
      : schedule.publishMode === 'schedule'
        ? 'Schedule Broadcast'
        : 'Publish Announcement';

  return (
    <div>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONTROL ROOM / CONTENT</div>
          <h2>{isEditing ? 'Edit Content' : 'Create Content'}</h2>
        </div>
        <div className="page-actions">
          <button type="button" className="wire-button" onClick={() => setStep('gallery')}>
            Change Template ({template.name})
          </button>
          <button type="button" className="wire-button" onClick={handleLeave}>
            Back to Content
          </button>
        </div>
      </div>

      {error && (
        <div className="pairing-error" role="alert" style={{ marginBottom: '14px' }}>
          {error}
        </div>
      )}

      <div className="editor-split">
        <div className="editor-pane" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {/* Interactive 3-Step Wizard Header (FIX 8.9) */}
          <div className="wizard-steps-bar" role="tablist" aria-label="Announcement creation steps">
            {[
              { n: 1, label: isImageOnly ? 'Poster & Media' : 'Content & Design' },
              { n: 2, label: 'Audience & Displays' },
              { n: 3, label: 'Schedule & Publish' },
            ].map((s) => (
              <button
                key={s.n}
                type="button"
                role="tab"
                aria-selected={wizardStep === s.n}
                className={`wizard-step-tab ${wizardStep === s.n ? 'active' : wizardStep > s.n ? 'done' : ''}`}
                onClick={() => setWizardStep(s.n)}
              >
                <span>{s.n}</span> {s.label}
              </button>
            ))}
          </div>

          {wizardStep === 1 && (
            <div className="sketch-box form-section">
              <div className="form-step-head">
                <span className="step-pill">STEP 1</span>
                <div>
                  <strong>Content &amp; Media</strong>
                  <small>Template: {template.name}</small>
                </div>
              </div>

              <label htmlFor="ann-title" style={{ marginTop: 12 }}>
                {isImageOnly ? 'POSTER TITLE (OPTIONAL)' : 'TITLE'}
              </label>
              <input
                id="ann-title"
                className="field"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isImageOnly ? 'e.g. University Week Poster (auto-named if blank)' : 'Announcement title'}
              />

              {!isImageOnly && (
                <div style={{ marginTop: 14 }}>
                  <label htmlFor="ann-body">CONTENT / BODY</label>
                  <textarea
                    id="ann-body"
                    className="body-field"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write the announcement message…"
                  />
                </div>
              )}

              {template.fields.length > 0 && (
                <div className="template-fields" style={{ marginTop: 14 }}>
                  <label>{template.name.toUpperCase()} DETAILS</label>
                  {template.fields.map((f) => (
                    <div key={f.key} style={{ marginTop: 8 }}>
                      <span className="field-caption">{f.label}</span>
                      <FieldInput
                        field={f}
                        value={templateData[f.key]}
                        onChange={(v) => setTemplateData((prev) => ({ ...prev, [f.key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              )}

              {template.maxImages > 0 && (
                <div style={{ marginTop: 14 }}>
                  <label>{isImageOnly ? 'POSTER IMAGE(S)' : 'PHOTOS'}</label>
                  <label className="image-drop">
                    <span>Drop {isImageOnly ? 'poster image(s)' : 'photos'} here or click to browse</span>
                    <small>
                      PNG or JPG • Up to {MAX_PHOTOS} photos
                      {template.maxImages === 1
                        ? ' • this template shows the first photo'
                        : ' • first 4 are shown, extras appear as +N'}
                    </small>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      aria-label="Select photos"
                      onChange={(e) => {
                        addPhotos(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {photos.length > 0 && (
                    <div className="photo-preview-strip">
                      {photos.map((photo) => (
                        <figure key={photo.url}>
                          <img src={photo.url} alt={photo.name} />
                          <button type="button" onClick={() => removePhoto(photo.url)} aria-label={`Remove ${photo.name}`}>
                            ×
                          </button>
                        </figure>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!isImageOnly && (
                <div className="theme-picker-section" style={{ marginTop: 14 }}>
                  <div className="scheduler-row-head" style={{ marginBottom: 8 }}>
                    <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Palette size={14} /> APPEARANCE &amp; COLORS
                    </label>
                    {(currentTheme.bg_color || currentTheme.text_color || currentTheme.accent_color) && (
                      <button
                        type="button"
                        className="text-action"
                        onClick={() => updateTheme({ bg_color: '', text_color: '', accent_color: '' })}
                      >
                        Reset default
                      </button>
                    )}
                  </div>

                  <div className="theme-preset-strip">
                    {THEME_PRESETS.map((p) => {
                      const active =
                        (currentTheme.bg_color || '') === p.bg_color &&
                        (currentTheme.text_color || '') === p.text_color &&
                        (currentTheme.accent_color || '') === p.accent_color;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`theme-preset-chip ${active ? 'active' : ''}`}
                          onClick={() => updateTheme({ bg_color: p.bg_color, text_color: p.text_color, accent_color: p.accent_color })}
                        >
                          <span
                            className="theme-swatch-dot"
                            style={{ background: p.bg_color || '#f4f1e8', borderColor: p.accent_color || '#101827' }}
                          />
                          {p.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="color-pickers-row">
                    <label className="color-picker-item">
                      <span>Background</span>
                      <input
                        type="color"
                        aria-label="Background color"
                        value={currentTheme.bg_color || '#f7f6f1'}
                        onChange={(e) => updateTheme({ bg_color: e.target.value })}
                      />
                    </label>
                    <label className="color-picker-item">
                      <span>Font Color</span>
                      <input
                        type="color"
                        aria-label="Font color"
                        value={currentTheme.text_color || '#101827'}
                        onChange={(e) => updateTheme({ text_color: e.target.value })}
                      />
                    </label>
                    <label className="color-picker-item">
                      <span>Accent Color</span>
                      <input
                        type="color"
                        aria-label="Accent color"
                        value={currentTheme.accent_color || '#3158de'}
                        onChange={(e) => updateTheme({ accent_color: e.target.value })}
                      />
                    </label>
                  </div>
                </div>
              )}

              <div className="wizard-nav-footer">
                <button type="button" className="wire-button" onClick={handleLeave}>
                  Cancel
                </button>
                <button type="button" className="wire-button dark" onClick={() => setWizardStep(2)}>
                  Next: Audience &amp; Displays <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="sketch-box form-section">
              <div className="form-step-head" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="step-pill">STEP 2</span>
                  <div>
                    <strong>Target Displays</strong>
                    <small>Choose which display screens will air this announcement.</small>
                  </div>
                </div>
                <span className="orientation-badge">
                  {!resolvedTargetCollege
                    ? 'No scope assigned'
                    : resolvedTargetCollege === 'Campus-Wide'
                      ? 'Campus-Wide'
                      : formatLabel(resolvedTargetCollege)}
                </span>
              </div>

              {!isLeadAdmin && !resolvedTargetCollege && (
                <div className="pairing-error" role="alert" style={{ marginTop: 12 }}>
                  No college scope assigned — contact a Lead Admin before publishing.
                </div>
              )}

              {visibleDisplays.length > 0 ? (
                <div style={{ marginTop: 14 }}>
                  <label>TARGET DISPLAYS (OPTIONAL — CAN ALSO BE ASSIGNED LATER)</label>
                  <div className="display-checklist">
                    {visibleDisplays.map((d) => {
                      const isChecked = selectedDisplays.includes(d.id);
                      return (
                        <label key={d.id} className={`display-check-item ${isChecked ? 'checked' : ''}`}>
                          <input type="checkbox" checked={isChecked} onChange={() => toggleDisplay(d.id)} />
                          <div>
                            <strong>{d.name}</strong>
                            <small>
                              {d.location || 'Campus'} • {formatLabel(d.department || d.college || 'Campus-Wide')}
                            </small>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="empty-inline-note" style={{ marginTop: 14 }}>
                  No paired displays found for this scope yet — you can assign displays later.
                </div>
              )}

              <div className="wizard-nav-footer">
                <button type="button" className="wire-button" onClick={() => setWizardStep(1)}>
                  <ChevronLeft size={14} /> Previous
                </button>
                <button type="button" className="wire-button dark" onClick={() => setWizardStep(3)}>
                  Next: Schedule &amp; Publish <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <>
              <div className="sketch-box form-section">
                <BroadcastScheduler value={schedule} onChange={setSchedule} />
              </div>

              <div className="sketch-box form-section">
                <div className="form-step-head">
                  <span className="step-pill">FINISH</span>
                  <div>
                    <strong>Review &amp; Publish</strong>
                    <small>Confirm your audience, target displays, and broadcast schedule.</small>
                  </div>
                </div>

                <div className="publish-summary-strip" style={{ marginTop: 14 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 0',
                      borderTop: '1px solid #e6e2d7',
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Audience</span>
                    <strong style={{ color: 'var(--ink)', textAlign: 'right' }}>
                      {!resolvedTargetCollege
                        ? 'Unassigned'
                        : resolvedTargetCollege === 'Campus-Wide'
                          ? 'Campus-Wide (All Units)'
                          : formatLabel(resolvedTargetCollege)}
                    </strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 0',
                      borderTop: '1px solid #e6e2d7',
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Displays</span>
                    <strong style={{ color: 'var(--ink)', textAlign: 'right' }}>
                      {selectedDisplays.length === 0
                        ? 'Unassigned (assign later)'
                        : `${selectedDisplays.length} display${selectedDisplays.length === 1 ? '' : 's'} selected`}
                    </strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 0',
                      borderTop: '1px solid #e6e2d7',
                      borderBottom: '1px solid #e6e2d7',
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Schedule</span>
                    <strong style={{ color: 'var(--ink)', textAlign: 'right' }}>
                      {schedule.publishMode === 'draft'
                        ? 'Save as Draft'
                        : schedule.publishMode === 'schedule'
                          ? `Scheduled (${schedule.startDate || 'TBD'})`
                          : 'Publish Immediately'}
                      {` • ${schedule.playbackDuration || 15}s`}
                      {schedule.noEnd ? ' • No expiry' : schedule.endDate ? ` • Ends ${schedule.endDate}` : ''}
                    </strong>
                  </div>
                </div>

                <div className="wizard-nav-footer">
                  <button type="button" className="wire-button" onClick={() => setWizardStep(2)}>
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <div className="wizard-nav-right">
                    {canPublishAndShareFb && (
                      <button
                        type="button"
                        className="wire-button"
                        disabled={submitting}
                        onClick={(e) => handleSubmit(e, true)}
                      >
                        <Facebook size={14} /> Publish &amp; Share to FB
                      </button>
                    )}
                    <button
                      type="button"
                      className="wire-button dark"
                      disabled={submitting}
                      onClick={(e) => handleSubmit(e, false)}
                    >
                      {submitLabel}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div
          className="preview-pane-sticky"
          style={{ position: 'sticky', top: 16, alignSelf: 'start', minWidth: 0 }}
        >
          <div className="sketch-box form-section">
            <LivePreviewPane announcement={previewAnnouncement} />
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmDiscard}
        title="Discard unsaved changes?"
        description="You have changes that have not been saved. Leaving now will discard them."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        danger
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          onCancel?.();
        }}
      />
    </div>
  );
}
