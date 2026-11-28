import React from 'react';
import { TemplateFrame, PhotoGrid, getImages, formatDate, formatTimeRange, bigTitle, bodyText } from './shared.jsx';

function Anchor({ label, value, wide }) {
  return (
    <div className="tpl-anchor" style={{ flex: wide ? 1.4 : 1, minWidth: 0, padding: '20px 28px' }}>
      <div style={{ fontSize: 22, letterSpacing: '.14em', opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 40, fontWeight: 700, marginTop: 6, overflowWrap: 'anywhere' }}>{value || '—'}</div>
    </div>
  );
}

export default function EventTemplate({ announcement = {}, orientation = 'landscape', ...frame }) {
  const data = announcement.template_data || {};
  const theme = data.theme;
  const images = getImages(announcement);
  const portrait = orientation === 'portrait';
  return (
    <TemplateFrame orientation={orientation} theme={theme} {...frame}>
      <div
        className="tpl-event"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          ...(theme?.bg_color ? { background: theme.bg_color } : {}),
          ...(theme?.text_color ? { color: theme.text_color } : {}),
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: portrait ? 'column' : 'row',
            gap: 40,
            padding: 56,
            minHeight: 0,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="tiny-label"
              style={{
                fontSize: 26,
                marginBottom: 20,
                ...(theme?.accent_color ? { background: theme.accent_color, color: '#101827' } : {}),
              }}
            >
              EVENT SPOTLIGHT
            </div>
            <h1 style={{ ...bigTitle(orientation), ...(theme?.text_color ? { color: theme.text_color } : {}) }}>
              {announcement.title || 'Campus Event'}
            </h1>
            {announcement.body && <p style={bodyText(orientation)}>{announcement.body}</p>}
          </div>
          {images.length > 0 && (
            <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>
              <PhotoGrid images={images} alt={announcement.title || 'Event'} />
            </div>
          )}
        </div>
        <div
          className="tpl-anchor-strip"
          style={{
            display: 'flex',
            flexDirection: portrait ? 'column' : 'row',
            background: 'var(--ink)',
            color: '#fff',
          }}
        >
          <Anchor label="DATE" value={formatDate(data.event_date)} />
          <Anchor label="TIME" value={formatTimeRange(data.event_time, data.event_end_time)} />
          <Anchor label="VENUE" value={data.venue} wide />
        </div>
        {(data.cta_text || data.cta_link) && (
          <div
            className="tpl-cta"
            style={{
              background: 'var(--lime)',
              color: 'var(--ink)',
              padding: '20px 56px',
              fontSize: 34,
              fontWeight: 700,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 24,
            }}
          >
            <span>{data.cta_text}</span>
            <span style={{ fontFamily: 'monospace' }}>{data.cta_link}</span>
          </div>
        )}
      </div>
    </TemplateFrame>
  );
}
