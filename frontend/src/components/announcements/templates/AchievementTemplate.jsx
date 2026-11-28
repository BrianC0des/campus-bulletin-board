import React from 'react';
import { TemplateFrame, getImages, resolveSrc, bigTitle, bodyText } from './shared.jsx';

export default function AchievementTemplate({ announcement = {}, orientation = 'landscape', ...frame }) {
  const data = announcement.template_data || {};
  const theme = data.theme;
  const photo = getImages(announcement)[0];
  const portrait = orientation === 'portrait';
  return (
    <TemplateFrame orientation={orientation} theme={theme} {...frame}>
      <div
        className="tpl-achievement"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: portrait ? 'column' : 'row',
          alignItems: 'stretch',
          gap: 48,
          padding: 64,
          minHeight: 0,
          ...(theme?.bg_color ? { background: theme.bg_color } : {}),
          ...(theme?.text_color ? { color: theme.text_color } : {}),
        }}
      >
        <div
          className="tpl-recipient-photo"
          style={{
            flex: 1,
            minHeight: 0,
            background: 'var(--ink-soft)',
            border: '10px solid var(--lime)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--lime)',
            fontSize: 120,
          }}
        >
          {photo ? (
            <img
              src={resolveSrc(photo)}
              alt={data.recipient || 'Recipient'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span aria-hidden="true">★</span>
          )}
        </div>
        <div style={{ flex: 1.2, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="tiny-label" style={{ fontSize: 26, marginBottom: 16 }}>CONGRATULATIONS</div>
          <h1 style={{ ...bigTitle(orientation), fontSize: portrait ? 96 : 110 }}>
            {data.recipient || announcement.title || 'Our Achiever'}
          </h1>
          {data.award && (
            <div
              className="tpl-award"
              style={{
                marginTop: 28,
                alignSelf: 'flex-start',
                background: 'var(--lime)',
                color: 'var(--ink)',
                fontSize: 46,
                fontWeight: 800,
                padding: '12px 28px',
              }}
            >
              {data.award}
            </div>
          )}
          {data.affiliation && <p style={{ ...bodyText(orientation), fontWeight: 700 }}>{data.affiliation}</p>}
          {announcement.body && <p style={bodyText(orientation)}>{announcement.body}</p>}
        </div>
      </div>
    </TemplateFrame>
  );
}
