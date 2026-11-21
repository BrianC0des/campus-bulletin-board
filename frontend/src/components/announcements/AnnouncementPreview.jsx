import React, { useState, useEffect } from 'react';
import '../../styles/displays.css';

/**
 * Normalizes multi-image data from various property formats:
 * - Prioritizes image_urls / imageUrls (array, JSON string, or comma-delimited string)
 * - Seamlessly falls back to legacy image_url / imageUrl
 */
function normalizeImages(props) {
  if (!props) return [];
  const rawUrls = props.image_urls || props.imageUrls;

  if (Array.isArray(rawUrls)) {
    const filtered = rawUrls.filter((url) => typeof url === 'string' && url.trim().length > 0);
    if (filtered.length > 0) return filtered;
  }

  if (typeof rawUrls === 'string' && rawUrls.trim()) {
    try {
      const parsed = JSON.parse(rawUrls);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((url) => typeof url === 'string' && url.trim().length > 0);
        if (filtered.length > 0) return filtered;
      }
    } catch {
      const split = rawUrls
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean);
      if (split.length > 0) return split;
    }
  }

  const single = props.image_url || props.imageUrl;
  if (typeof single === 'string' && single.trim()) {
    return [single.trim()];
  }

  return [];
}

/**
 * Safe visual fallback handler for broken or unreachable image URLs in preview.
 * Hides broken image and inserts a clean placeholder label without altering layout.
 */
function handleImageError(e) {
  e.currentTarget.style.display = 'none';
  const parent = e.currentTarget.parentElement;
  if (parent && !parent.querySelector('.img-fallback-label')) {
    const label = document.createElement('span');
    label.className = 'img-fallback-label';
    label.innerText = '📷 Image unavailable';
    label.style.fontSize = '12px';
    label.style.color = '#666666';
    label.style.fontFamily = 'monospace';
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.justifyContent = 'center';
    label.style.width = '100%';
    label.style.height = '100%';
    parent.appendChild(label);
  }
}

/**
 * Standardized Responsive Multi-Image Display Component for Announcement Preview:
 * - 1 image: Fills available image area cleanly with objectFit: contain (preserves aspect ratio, no stretching/cropping)
 * - 2 images: Side-by-side in 2 equal columns (1fr 1fr)
 * - 3 images: Two equal-width columns (1 large image on the left and 2 equally sized stacked images on the right)
 * - 4+ images: Balanced 2x2 grid showing first 4 images with a +N badge overlay on the 4th item
 */
function MultiImageGrid({ images, altTitle = 'Announcement image' }) {
  if (!images || images.length === 0) return null;

  // 1 image: fills available image area cleanly without distortion or clipping
  if (images.length === 1) {
    return (
      <div
        className="preview-multi-grid-1"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '160px',
          overflow: 'hidden',
          border: '1px solid #000000',
          background: '#f8f8f8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}
      >
        <img
          src={images[0]}
          alt={`${altTitle} 1`}
          onError={handleImageError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
            display: 'block',
            margin: '0 auto',
          }}
        />
      </div>
    );
  }

  // 2 images: side-by-side in 2 equal columns
  if (images.length === 2) {
    return (
      <div
        className="preview-multi-grid-2"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '12px',
          width: '100%',
          height: '100%',
          minHeight: '160px',
          boxSizing: 'border-box',
        }}
      >
        {images.slice(0, 2).map((url, idx) => (
          <div
            key={idx}
            style={{
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              border: '1px solid #000000',
              background: '#f8f8f8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            <img
              src={url}
              alt={`${altTitle} ${idx + 1}`}
              onError={handleImageError}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                display: 'block',
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  // 3 images: two equal-width columns (1 large image on the left and 2 equally sized stacked images on the right)
  if (images.length === 3) {
    return (
      <div
        className="preview-multi-grid-3"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '12px',
          width: '100%',
          height: '100%',
          minHeight: '160px',
          boxSizing: 'border-box',
        }}
      >
        {/* Large prominent left image (fills left 50% column) */}
        <div
          style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            border: '1px solid #000000',
            background: '#f8f8f8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          <img
            src={images[0]}
            alt={`${altTitle} 1 (large)`}
            onError={handleImageError}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
            }}
          />
        </div>

        {/* Two equally sized stacked right images (fills right 50% column with 2 equal rows) */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
            gap: '12px',
            height: '100%',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {images.slice(1, 3).map((url, idx) => (
            <div
              key={idx}
              style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                border: '1px solid #000000',
                background: '#f8f8f8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              <img
                src={url}
                alt={`${altTitle} ${idx + 2}`}
                onError={handleImageError}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  display: 'block',
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4 or more images: balanced 2x2 grid showing the first 4 images with a +N overlay for additional images
  const displayed = images.slice(0, 4);
  const extraCount = images.length - 4;

  return (
    <div
      className="preview-multi-grid-4"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
        gap: '12px',
        width: '100%',
        height: '100%',
        minHeight: '160px',
        boxSizing: 'border-box',
      }}
    >
      {displayed.map((url, idx) => {
        const isFourthWithExtra = idx === 3 && extraCount > 0;
        return (
          <div
            key={idx}
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              border: '1px solid #000000',
              background: '#f8f8f8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            <img
              src={url}
              alt={`${altTitle} ${idx + 1}`}
              onError={handleImageError}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                display: 'block',
                filter: isFourthWithExtra ? 'brightness(0.35)' : 'none',
              }}
            />
            {isFourthWithExtra && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  color: '#ffffff',
                  fontFamily: 'monospace',
                  fontSize: 'clamp(1.4rem, 2.5vw, 2rem)',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  userSelect: 'none',
                }}
              >
                +{extraCount}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Renders an unsaved announcement in a full-screen modal preview
 * simulating how it will appear on a 16:9 physical campus display.
 */
export default function AnnouncementPreview({
  title,
  body,
  imageUrl,
  imageUrls,
  image_url,
  image_urls,
  category,
  author,
  poster,
  posted_by,
  created_by,
  created_at,
  displayName = 'Main Campus Display',
  rotationSeconds = 10,
  onClose,
}) {
  const images = normalizeImages({ imageUrl, imageUrls, image_url, image_urls });
  const hasContent = Boolean(title?.trim() || body?.trim() || images.length > 0);

  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString('en-US')
  );

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US'));
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const previewCategory = category || 'CAMPUS BULLETIN';
  const previewPoster = poster || author || posted_by || created_by || 'Campus Administration';
  const previewDate = created_at
    ? new Date(created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && typeof onClose === 'function') {
          onClose();
        }
      }}
    >
      <div
        className="tv-preview-modal-frame"
        role="dialog"
        aria-modal="true"
        aria-label="Campus Display Preview"
        style={{
          width: '100%',
          maxWidth: '1050px',
          aspectRatio: '16 / 9',
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          color: '#000000',
          fontFamily: 'monospace',
          border: '3px solid #000000',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* TV Header Bar with Close Button */}
        <header
          style={{
            flexShrink: 0,
            padding: '10px 18px',
            borderBottom: '2px solid #000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          <span style={{ fontWeight: 'bold', fontSize: 'clamp(0.85rem, 1.4vw, 1.1rem)' }}>
            🏛️ CAMPUS DIGITAL SIGNAGE [PREVIEW]
          </span>
          {typeof onClose === 'function' && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#000000',
                color: '#ffffff',
                border: '1px solid #000000',
                padding: '4px 12px',
                fontFamily: 'inherit',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ✕ Close
            </button>
          )}
        </header>

        {/* TV Preview Content Area */}
        <section
          style={{
            flex: 1,
            minHeight: 0,
            padding: '14px 20px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'stretch',
            boxSizing: 'border-box',
          }}
        >
          {!hasContent ? (
            <div style={{ textAlign: 'center', color: '#666666', padding: '30px 0', margin: 'auto' }}>
              <p style={{ fontSize: '1.2rem', margin: '0 0 8px' }}>📺 Live Preview Standby</p>
              <p style={{ fontSize: '0.9rem', margin: 0 }}>
                Enter title, description, or images in the announcement form to see how it looks on physical displays.
              </p>
            </div>
          ) : (
            <div
              className="tv-slide-preview-body"
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'stretch',
                overflow: 'hidden',
                width: '100%',
              }}
            >
              {/* 1. Category and Poster Information at the Top */}
              <div
                className="tv-announcement-meta"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: '8px',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      background: '#000000',
                      color: '#ffffff',
                      padding: '3px 8px',
                      fontSize: 'clamp(0.7rem, 0.95vw, 0.85rem)',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {previewCategory}
                  </span>
                  <span
                    style={{
                      fontSize: 'clamp(0.75rem, 1vw, 0.9rem)',
                      color: '#333333',
                      fontFamily: 'monospace',
                    }}
                  >
                    Posted by: <strong>{previewPoster}</strong>
                  </span>
                </div>
                {previewDate && (
                  <span
                    style={{
                      fontSize: 'clamp(0.7rem, 0.9vw, 0.85rem)',
                      color: '#666666',
                      fontFamily: 'monospace',
                    }}
                  >
                    {previewDate}
                  </span>
                )}
              </div>

              {/* 2. Announcement Title Directly Beneath It */}
              {title && (
                <h2
                  className="tv-slide-title"
                  style={{
                    margin: '0 0 6px',
                    fontSize: 'clamp(1.1rem, 1.9vw, 1.6rem)',
                    fontWeight: 'bold',
                    lineHeight: 1.25,
                    textAlign: 'left',
                    color: '#000000',
                    flexShrink: 0,
                  }}
                >
                  {title}
                </h2>
              )}

              {/* 3. Announcement Description Directly Beneath Title */}
              {body && (
                <p
                  className="tv-slide-body"
                  style={{
                    margin: '0 0 10px',
                    fontSize: 'clamp(0.8rem, 1.1vw, 0.95rem)',
                    lineHeight: 1.4,
                    textAlign: 'left',
                    color: '#222222',
                    flexShrink: 0,
                  }}
                >
                  {body}
                </p>
              )}

              {/* 4. Main Content Area Filling Available Space */}
              {images.length > 0 && (
                <div
                  className="tv-slide-media-area"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  <MultiImageGrid images={images} altTitle={title || 'Announcement'} />
                </div>
              )}
            </div>
          )}
        </section>

        {/* Fixed Consistently Aligned Footer at the Very Bottom */}
        <footer
          style={{
            flexShrink: 0,
            padding: '10px 20px',
            borderTop: '2px solid #000000',
            fontSize: 'clamp(0.75rem, 1.1vw, 0.9rem)',
            background: '#ffffff',
            color: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ flex: 1, textAlign: 'left', fontWeight: 'bold' }}>
            📺 {displayName} [PREVIEW]
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            Slide 1 of 1 • Rotation: {rotationSeconds}s
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            🕒 {currentTime}
          </div>
        </footer>
      </div>
    </div>
  );
}
