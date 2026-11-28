import React, { useEffect, useState } from 'react';
import TemplateRenderer, { ScaledStage } from './templates/TemplateRenderer.jsx';
import { TEMPLATE_CATEGORIES, templatesByCategory } from './templates/templateRegistry.js';

const SAMPLE = {
  general_split: { title: 'Library Extended Hours', body: 'The main library stays open until 10 PM during finals week.' },
  image_only: {
    title: 'University Week Poster',
    template_data: { caption_overlay: 'University Week • Nov 24–28' },
  },
  event_spotlight: {
    title: 'Foundation Day Fair',
    body: 'Join booths, food and live performances.',
    template_data: { event_date: '2026-12-01', event_time: '09:00', event_end_time: '17:00', venue: 'University Gym', cta_text: 'Free entry' },
  },
  emergency_banner: {
    title: 'Typhoon Signal No. 2',
    body: 'Classes are suspended.',
    template_data: { alert_level: 'EMERGENCY ALERT', instructions: 'Stay indoors.' },
  },
  deadline_callout: {
    title: 'Enrollment Closes Soon',
    template_data: { deadline_date: '2026-12-15', action_label: 'Finalize enrollment', submit_to: "Registrar's Office" },
  },
  achievement_spotlight: {
    title: 'Board Exam Topnotcher',
    template_data: { recipient: 'Juan Dela Cruz', award: 'Top 3', affiliation: 'College of Engineering' },
  },
  weekly_digest: {
    title: 'Weekly Events',
    template_data: {
      week_label: 'Week of Nov 24',
      rows: [
        { day: 'MON', time: '9 AM', title: 'Flag Ceremony', venue: 'Oval' },
        { day: 'WED', time: '1 PM', title: 'Job Fair', venue: 'Gym' },
        { day: 'FRI', time: '3 PM', title: 'Intramurals', venue: 'Field' },
      ],
    },
  },
};

function Thumb({ template, orientation }) {
  const announcement = { template_id: template.id, ...SAMPLE[template.id] };
  return (
    <div className="template-thumb" aria-hidden="true" style={{ pointerEvents: 'none' }}>
      <ScaledStage orientation={orientation}>
        <TemplateRenderer announcement={announcement} orientation={orientation} displayName="PASKIL" currentTime="09:00" />
      </ScaledStage>
    </div>
  );
}

export default function TemplateGallery({ selectedId, onSelect, onCancel }) {
  const [category, setCategory] = useState('all');
  const [previewId, setPreviewId] = useState(null);
  const templates = templatesByCategory(category);
  const previewTemplate = templates.concat(templatesByCategory('all')).find((t) => t.id === previewId);

  useEffect(() => {
    if (!previewId) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setPreviewId(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [previewId]);

  return (
    <div className="template-gallery">
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONTROL ROOM / CONTENT</div>
          <h2>Choose a Template</h2>
        </div>
        {onCancel && (
          <button type="button" className="wire-button" onClick={onCancel}>
            Back to Content
          </button>
        )}
      </div>

      <div className="template-filter-pills" role="tablist" aria-label="Template categories" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {TEMPLATE_CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            role="tab"
            aria-selected={category === c.value}
            className={`wire-button filter-pill ${category === c.value ? 'dark active' : ''}`}
            onClick={() => setCategory(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div
        className="template-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}
      >
        {templates.map((t) => (
          <div
            key={t.id}
            className={`sketch-box template-card ${selectedId === t.id ? 'selected' : ''}`}
            style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}
          >
            <Thumb template={t} orientation="landscape" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <strong>{t.name}</strong>
            </div>
            <small className="field-caption">{t.description}</small>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="wire-button"
                onClick={() => setPreviewId(t.id)}
              >
                Preview
              </button>
              <button type="button" className="wire-button dark" onClick={() => onSelect(t.id)}>
                Use Template
              </button>
            </div>
          </div>
        ))}
      </div>

      {previewTemplate && (
        <div className="user-modal-wash" onClick={() => setPreviewId(null)}>
          <div
            className="sketch-box template-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${previewTemplate.name} preview`}
            style={{ width: 'min(960px, 94vw)', padding: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <div className="eyebrow">TEMPLATE PREVIEW</div>
                <h2>{previewTemplate.name}</h2>
              </div>
              <button type="button" className="text-action" onClick={() => setPreviewId(null)}>
                Close
              </button>
            </div>
            <div
              className="screen-frame"
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '62vh',
                aspectRatio: '16 / 9',
                margin: '0 auto',
                overflow: 'hidden',
              }}
            >
              <ScaledStage orientation="landscape" fit="contain">
                <TemplateRenderer
                  announcement={{ template_id: previewTemplate.id, ...SAMPLE[previewTemplate.id] }}
                  orientation="landscape"
                  displayName="PASKIL"
                  currentTime="09:00"
                />
              </ScaledStage>
            </div>
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                type="button"
                className="wire-button dark"
                onClick={() => {
                  onSelect(previewTemplate.id);
                  setPreviewId(null);
                }}
              >
                Use Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
