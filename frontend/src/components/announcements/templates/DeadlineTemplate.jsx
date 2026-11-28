import React from 'react';
import { TemplateFrame, formatDate, bigTitle, bodyText } from './shared.jsx';

function countdownLabel(date, time) {
  if (!date) return '';
  const due = new Date(`${String(date).slice(0, 10)}T${time || '23:59'}:00+08:00`);
  if (Number.isNaN(due.getTime())) return '';
  const ms = due.getTime() - Date.now();
  if (ms <= 0) return 'DEADLINE PASSED';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days >= 1) return `${days} DAY${days === 1 ? '' : 'S'} LEFT`;
  return `${hours} HOUR${hours === 1 ? '' : 'S'} LEFT`;
}

export default function DeadlineTemplate({ announcement = {}, orientation = 'landscape', ...frame }) {
  const data = announcement.template_data || {};
  const theme = data.theme;
  const portrait = orientation === 'portrait';
  const countdown = countdownLabel(data.deadline_date, data.deadline_time);
  return (
    <TemplateFrame orientation={orientation} theme={theme} {...frame}>
      <div
        className="tpl-deadline"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: portrait ? 'column' : 'row',
          minHeight: 0,
          ...(theme?.bg_color ? { background: theme.bg_color } : {}),
          ...(theme?.text_color ? { color: theme.text_color } : {}),
        }}
      >
        <div style={{ flex: 1.2, padding: 64, minWidth: 0 }}>
          <div className="tiny-label" style={{ fontSize: 26, marginBottom: 20 }}>DEADLINE REMINDER</div>
          <h1 style={bigTitle(orientation)}>{announcement.title || 'Deadline'}</h1>
          {data.action_label && (
            <p style={{ ...bodyText(orientation), fontWeight: 700 }}>{data.action_label}</p>
          )}
          {announcement.body && <p style={bodyText(orientation)}>{announcement.body}</p>}
          {data.submit_to && (
            <p style={{ ...bodyText(orientation), opacity: 0.75 }}>Submit to: {data.submit_to}</p>
          )}
        </div>
        <div
          className="tpl-due-card"
          style={{
            flex: 1,
            background: 'var(--coral)',
            color: 'var(--ink)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            padding: 48,
            gap: 12,
          }}
        >
          <div style={{ fontSize: 30, letterSpacing: '.18em', fontWeight: 700 }}>DUE</div>
          <div style={{ fontSize: portrait ? 84 : 92, fontWeight: 800, lineHeight: 1.05, fontFamily: '"Space Grotesk", sans-serif' }}>
            {formatDate(data.deadline_date) || 'TBA'}
          </div>
          {data.deadline_time && <div style={{ fontSize: 44, fontWeight: 600 }}>{data.deadline_time}</div>}
          {countdown && (
            <div
              className="tpl-countdown"
              style={{ marginTop: 24, background: 'var(--ink)', color: 'var(--lime)', fontSize: 40, fontWeight: 800, padding: '14px 32px' }}
            >
              {countdown}
            </div>
          )}
        </div>
      </div>
    </TemplateFrame>
  );
}
