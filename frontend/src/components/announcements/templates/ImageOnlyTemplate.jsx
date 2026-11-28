import React from 'react';
import { PhotoGrid, getImages, resolveSrc } from './shared.jsx';

/**
 * Full-bleed poster / image-only template (FIX 5.3).
 * Renders uploaded poster(s) edge-to-edge with zero intrusive overlays or watermarks.
 */
export default function ImageOnlyTemplate({ announcement = {}, orientation = 'landscape' }) {
  const images = getImages(announcement);
  const theme = announcement?.template_data?.theme;
  const firstSrc = images[0] ? resolveSrc(images[0]) : '';
  const bg = theme?.bg_color || '#101827';
  const accent = theme?.accent_color || 'var(--lime, #c9f23a)';

  return (
    <div
      className={`tpl tpl-image-only tpl-${orientation}`}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {images.length === 0 ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
            background: theme?.bg_color || 'linear-gradient(135deg, #101827 0%, #1c2738 100%)',
            color: theme?.text_color || '#fff',
            padding: 80,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              padding: '8px 20px',
              borderRadius: 999,
              background: accent,
              color: '#101827',
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: '0.1em',
            }}
          >
            POSTER / IMAGE ONLY
          </div>
          <div style={{ fontSize: 56, fontWeight: 700, fontFamily: '"Space Grotesk", sans-serif' }}>
            {announcement.title || 'Upload a graphic poster'}
          </div>
          <div style={{ fontSize: 28, opacity: 0.72 }}>
            Your uploaded image fills the display screen cleanly edge-to-edge.
          </div>
        </div>
      ) : images.length === 1 ? (
        <>
          <img
            src={firstSrc}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(36px) brightness(0.45)',
              transform: 'scale(1.12)',
            }}
          />
          <img
            src={firstSrc}
            alt={announcement.title || 'Graphic poster'}
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        </>
      ) : (
        <div style={{ width: '100%', height: '100%', padding: 24, display: 'flex' }}>
          <PhotoGrid images={images} alt={announcement.title || 'Graphic poster'} />
        </div>
      )}
    </div>
  );
}
