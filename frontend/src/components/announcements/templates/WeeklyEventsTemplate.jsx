import React from 'react';
import { TemplateFrame, bigTitle, formatTime12h } from './shared.jsx';

export default function WeeklyEventsTemplate({ announcement = {}, orientation = 'landscape', ...frame }) {
  const data = announcement.template_data || {};
  const theme = data.theme;
  const portrait = orientation === 'portrait';
  const rows = (Array.isArray(data.rows) ? data.rows : [])
    .filter((r) => r && (r.day || r.time || r.title || r.venue))
    .slice(0, 5);
  return (
    <TemplateFrame orientation={orientation} theme={theme} {...frame}>
      <div
        className="tpl-weekly"
        style={{
          flex: 1,
          padding: 56,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          minHeight: 0,
          ...(theme?.bg_color ? { background: theme.bg_color } : {}),
          ...(theme?.text_color ? { color: theme.text_color } : {}),
        }}
      >
        <div>
          <div className="tiny-label" style={{ fontSize: 26, marginBottom: 12 }}>
            {data.week_label || 'THIS WEEK ON CAMPUS'}
          </div>
          <h1 style={{ ...bigTitle(orientation), fontSize: portrait ? 76 : 84 }}>
            {announcement.title || 'Weekly Events'}
          </h1>
        </div>
        <div className="tpl-schedule" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          {rows.length === 0 && <div style={{ fontSize: 38, opacity: 0.6 }}>No events listed yet.</div>}
          {rows.map((r, i) => (
            <div
              className="tpl-schedule-row"
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: portrait ? 'column' : 'row',
                alignItems: portrait ? 'flex-start' : 'center',
                justifyContent: portrait ? 'center' : 'flex-start',
                gap: portrait ? 4 : 32,
                padding: '0 28px',
                background: i % 2 ? 'var(--white)' : '#e9e7dc',
                borderLeft: '12px solid var(--lime)',
                minHeight: 0,
              }}
            >
              <strong style={{ fontSize: 44, minWidth: portrait ? 0 : 220 }}>{r.day}</strong>
              <span style={{ fontSize: 36, minWidth: portrait ? 0 : 220, opacity: 0.8 }}>{formatTime12h(r.time)}</span>
              <span style={{ fontSize: 42, fontWeight: 700, flex: 1, overflowWrap: 'anywhere' }}>{r.title}</span>
              <span style={{ fontSize: 34, opacity: 0.7 }}>{r.venue}</span>
            </div>
          ))}
        </div>
      </div>
    </TemplateFrame>
  );
}
