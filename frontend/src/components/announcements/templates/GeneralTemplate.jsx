import React from 'react';
import { TemplateFrame, PhotoGrid, getImages, bigTitle, bodyText } from './shared.jsx';

export default function GeneralTemplate({ announcement = {}, orientation = 'landscape', ...frame }) {
  const images = getImages(announcement);
  const portrait = orientation === 'portrait';
  const theme = announcement?.template_data?.theme;
  const label = announcement.target_college && announcement.target_college !== 'Campus-Wide' && announcement.target_college !== 'ALL'
    ? `${announcement.target_college} NOTICE`
    : 'CAMPUS NOTICE';
  return (
    <TemplateFrame orientation={orientation} theme={theme} {...frame}>
      <div
        className="bulletin-main tpl-general"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: portrait ? 'column' : 'row',
          gap: 48,
          padding: 64,
          minHeight: 0,
          ...(theme?.bg_color ? { background: theme.bg_color } : {}),
          ...(theme?.text_color ? { color: theme.text_color } : {}),
        }}
      >
        <div className="bulletin-copy" style={{ flex: 1, minWidth: 0 }}>
          <div
            className="tiny-label"
            style={{
              fontSize: 26,
              marginBottom: 20,
              ...(theme?.accent_color ? { background: theme.accent_color, color: '#101827' } : {}),
            }}
          >
            {label}
          </div>
          <h1 style={{ ...bigTitle(orientation), ...(theme?.text_color ? { color: theme.text_color } : {}) }}>
            {announcement.title || 'Campus Notice'}
          </h1>
          {announcement.body && (
            <p
              className="bulletin-description"
              style={{ ...bodyText(orientation), ...(theme?.text_color ? { color: theme.text_color, opacity: 0.88 } : {}) }}
            >
              {announcement.body}
            </p>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>
          {images.length > 0 ? (
            <PhotoGrid images={images} alt={announcement.title || 'Announcement'} />
          ) : (
            <div
              className="bulletin-image"
              style={{ flex: 1, ...(theme?.accent_color ? { background: theme.accent_color } : {}) }}
            >
              <strong>NOTICE</strong>
              <span className="code-mark">PASKIL</span>
            </div>
          )}
        </div>
      </div>
    </TemplateFrame>
  );
}
