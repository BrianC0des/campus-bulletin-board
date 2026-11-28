import React from 'react';
import PaskilLogo from '../../common/PaskilLogo.jsx';
import { getImageUrl } from '../../../utils/imageUrl.js';

export const STAGE_SIZE = {
  landscape: { width: 1920, height: 1080 },
  portrait: { width: 1080, height: 1920 },
};

export const MAX_VISIBLE_IMAGES = 4;

export function resolveSrc(src) {
  if (!src) return '';
  return src.startsWith('blob:') ? src : getImageUrl(src);
}

export function getImages(announcement) {
  if (Array.isArray(announcement?.image_urls) && announcement.image_urls.length) {
    return announcement.image_urls.filter(Boolean);
  }
  return announcement?.image_url ? [announcement.image_url] : [];
}

export function formatDate(value) {
  if (!value) return '';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatTime12h(value) {
  if (!value) return '';
  const match = /^([01]?\d|2[0-3]):([0-5]\d)/.exec(String(value).trim());
  if (!match) return String(value);
  const h = Number(match[1]);
  const m = match[2];
  return `${((h + 11) % 12) + 1}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function formatTimeRange(start, end) {
  if (!start) return '';
  const s = formatTime12h(start);
  if (!end) return s;
  return `${s} – ${formatTime12h(end)}`;
}

/** Photo grid with a +N badge on the 4th tile when more than 4 photos exist (#18). */
export function PhotoGrid({ images = [], alt = 'Announcement', max = MAX_VISIBLE_IMAGES }) {
  const visible = images.slice(0, max);
  const extra = images.length - max;
  if (visible.length === 0) return null;
  return (
    <div
      className={`bulletin-photo-grid tpl-photo-grid count-${visible.length}`}
      aria-label="Announcement photo collage"
    >
      {visible.map((src, i) => (
        <div className={`photo-tile photo-${i + 1}`} key={`${src}-${i}`} style={{ overflow: 'hidden', position: 'relative' }}>
          <img
            src={resolveSrc(src)}
            alt={`${alt} photo ${i + 1}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          {i === visible.length - 1 && extra > 0 && (
            <span className="photo-more-overlay" style={{ fontSize: 56 }} aria-label={`${extra} more photos`}>
              +{extra}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/** Common header / footer chrome around template content. */
export function TemplateFrame({
  tone = 'default',
  theme,
  displayName = 'CAMPUS DISPLAY',
  currentTime,
  itemLabel = '01 / 01',
  orientation = 'landscape',
  children,
}) {
  const time =
    currentTime ??
    new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' });
  const isEmergency = tone === 'emergency';
  const customBg = theme?.bg_color || undefined;
  const customText = theme?.text_color || undefined;
  const customAccent = theme?.accent_color || undefined;

  return (
    <div
      className={`bulletin-layout full tpl tpl-${tone} tpl-${orientation}`}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...(customBg ? { background: customBg } : {}),
        ...(customText ? { color: customText } : {}),
      }}
    >
      <div
        className="bulletin-header tpl-header"
        style={{
          fontSize: 28,
          padding: '20px 48px',
          ...(isEmergency ? { background: '#7a0a16', color: '#fff' } : {}),
        }}
      >
        <PaskilLogo tagline={false} className="display-brand" />
        <span style={customAccent ? { color: customAccent } : undefined}>
          {String(displayName).toUpperCase()} • {time}
        </span>
      </div>
      <div className="tpl-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      <div
        className="bulletin-footer tpl-footer"
        style={{
          fontSize: 22,
          padding: '16px 48px',
          ...(isEmergency ? { background: '#7a0a16', color: '#fff' } : {}),
          ...(customText ? { color: customText, borderColor: 'rgba(128,128,128,0.28)' } : {}),
        }}
      >
        <span>WMSU Campus Bulletin Network</span>
        <span>{itemLabel}</span>
      </div>
    </div>
  );
}

export const bigTitle = (orientation) => ({
  fontSize: orientation === 'portrait' ? 84 : 96,
  lineHeight: 1.05,
  margin: 0,
  letterSpacing: '-0.03em',
  fontFamily: '"Space Grotesk", sans-serif',
  overflowWrap: 'anywhere',
});

export const bodyText = (orientation) => ({
  fontSize: orientation === 'portrait' ? 40 : 38,
  lineHeight: 1.35,
  margin: '24px 0 0',
  overflowWrap: 'anywhere',
});
