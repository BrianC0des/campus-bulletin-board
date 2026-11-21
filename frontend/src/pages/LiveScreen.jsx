import React, { useState, useEffect, useRef } from 'react';
import { MOCK_ANNOUNCEMENTS } from '../mocks/mockData.js';
import '../styles/displays.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const DEVICE_TOKEN_KEY = 'cbb_device_token';

// ============================================================================
// TEMPORARY FRONTEND-ONLY MULTI-IMAGE TEST DATA
// Context: The PostgreSQL database schema and backend REST API currently only provide
// a single 'image_url' column. To visibly demonstrate the three-image layout on the live
// display without altering mockData.js or backend/database schemas, we supply these
// three real campus announcement images when an announcement does not provide image_urls.
// ============================================================================
const TEMPORARY_FRONTEND_MULTI_IMAGES = [
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
  'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800&q=80',
];

/**
 * Generates and persists a unique browser token in localStorage.
 * Uses crypto.randomUUID() when available with an RFC4122 v4 UUID fallback.
 */
function getOrCreateDeviceToken() {
  try {
    let token = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (!token) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        token = crypto.randomUUID();
      } else {
        token = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
          const rand = (Math.random() * 16) | 0;
          const val = char === 'x' ? rand : (rand & 0x3) | 0x8;
          return val.toString(16);
        });
      }
      localStorage.setItem(DEVICE_TOKEN_KEY, token);
    }
    return token;
  } catch (err) {
    console.warn('[LiveScreen] LocalStorage access restricted for device token:', err);
    return 'fallback-token-' + Date.now();
  }
}

/**
 * Safe visual fallback handler for broken or unreachable image URLs.
 * Hides broken image element and inserts a clean placeholder label without altering layout.
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
 * Normalizes multi-image data from slide:
 * - Prioritizes slide.image_urls (array, JSON string, or comma-delimited string)
 * - Seamlessly falls back to legacy slide.image_url
 */
function normalizeSlideImages(slide) {
  if (!slide) return [];
  const urls = slide.image_urls;

  if (Array.isArray(urls)) {
    const filtered = urls.filter((url) => typeof url === 'string' && url.trim().length > 0);
    if (filtered.length > 0) return filtered;
  }

  if (typeof urls === 'string' && urls.trim()) {
    try {
      const parsed = JSON.parse(urls);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((url) => typeof url === 'string' && url.trim().length > 0);
        if (filtered.length > 0) return filtered;
      }
    } catch {
      const split = urls
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean);
      if (split.length > 0) return split;
    }
  }

  if (slide.image_url && typeof slide.image_url === 'string' && slide.image_url.trim()) {
    return [slide.image_url.trim()];
  }

  return [];
}

/**
 * Standardized Responsive Multi-Image Display Component for Live TV Display:
 * - 1 image: Fills available image area cleanly with objectFit: contain (preserves aspect ratio, no stretching/cropping)
 * - 2 images: Side-by-side in 2 equal columns (1fr 1fr)
 * - 3 images: Two equal-width columns (1 large image on the left and 2 equally sized stacked images on the right)
 * - 4+ images: Balanced 2x2 grid showing first 4 images with a +N badge overlay on the 4th item
 */
function SlideMediaGrid({ images, altTitle = 'Campus announcement' }) {
  if (!images || images.length === 0) return null;

  // 1 image: fills available image area cleanly without distortion or clipping
  if (images.length === 1) {
    return (
      <div
        className="tv-slide-images-single"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '180px',
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
          className="tv-slide-image"
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
        className="tv-slide-images-duo"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '12px',
          width: '100%',
          height: '100%',
          minHeight: '180px',
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
        className="tv-slide-images-trio"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '12px',
          width: '100%',
          height: '100%',
          minHeight: '180px',
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
      className="tv-slide-images-quad"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
        gap: '12px',
        width: '100%',
        height: '100%',
        minHeight: '180px',
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
                  fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
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

export default function LiveScreen() {
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString('en-US')
  );

  const [currentIndex, setCurrentIndex] = useState(0);

  // Initialize rotation seconds from localStorage or default to 10
  const [rotationSeconds, setRotationSeconds] = useState(() => {
    const saved = localStorage.getItem('display_rotation_seconds');
    return saved && Number(saved) >= 3 ? Number(saved) : 10;
  });

  // Initialize slides: enrich active mock slides with temporary frontend-only 3-image test data
  // if image_urls is not yet supplied by the backend or mock data.
  const [slides, setSlides] = useState(() => {
    const published = MOCK_ANNOUNCEMENTS.filter(
      (announcement) =>
        announcement.publish_status === 'published' &&
        announcement.status === 'active'
    );

    return published.map((slide, index) => {
      // Clearly labeled temporary test data for multi-image layout verification on live screen:
      if (index === 0 && (!slide.image_urls || slide.image_urls.length === 0)) {
        return {
          ...slide,
          image_urls: TEMPORARY_FRONTEND_MULTI_IMAGES,
        };
      }
      return slide;
    });
  });

  // Default fallback pairing code & display id and display name
  const [pairingCode, setPairingCode] = useState('7K4P - 92QM');
  const [displayName, setDisplayName] = useState('Main Library Kiosk');
  const displayId = 'disp-001';

  // Persisted unique device token
  const deviceTokenRef = useRef(getOrCreateDeviceToken());

  // Clock interval (1 second)
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US'));
    }, 1000);

    return () => clearInterval(clockTimer);
  }, []);

  // Request pairing code via POST /api/pairing/generate using device_token
  useEffect(() => {
    const requestPairingCode = async () => {
      const deviceToken = deviceTokenRef.current;
      try {
        const res = await fetch(`${API_BASE}/pairing/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_token: deviceToken }),
        });

        if (res.ok) {
          const data = await res.json();
          const generatedCode = data.pairingCode || data.pairing_code || data.code;
          if (generatedCode) {
            setPairingCode(generatedCode);
          }
        } else {
          console.warn(
            `[LiveScreen] POST /api/pairing/generate returned HTTP ${res.status}. Backend pairing generation endpoint is not yet supported; using fallback pairing code.`
          );
        }
      } catch (err) {
        console.warn(
          '[LiveScreen] POST /api/pairing/generate request failed; keeping fallback pairing code:',
          err.message
        );
      }
    };

    requestPairingCode();
  }, []);

  // Check pairing status via GET /api/pairing/status/:code?device_token=...
  // Automatically stops polling if endpoint returns HTTP 404.
  // Note: Never fakes pairing or claims device exclusivity when backend endpoint is missing.
  useEffect(() => {
    let statusInterval = null;
    let isStopped = false;

    const checkPairingStatus = async () => {
      if (isStopped) return;
      const deviceToken = deviceTokenRef.current;
      const cleanCode = pairingCode.replace(/\s+/g, '');
      try {
        const res = await fetch(
          `${API_BASE}/pairing/status/${encodeURIComponent(cleanCode)}?device_token=${encodeURIComponent(deviceToken)}`
        );

        if (res.status === 404) {
          isStopped = true;
          if (statusInterval) clearInterval(statusInterval);
          console.warn(
            `[LiveScreen] GET /api/pairing/status/${cleanCode} returned HTTP 404. Endpoint not supported by backend; stopping status polling and preserving fallback behavior.`
          );
          return;
        }

        if (res.ok) {
          const data = await res.json();
          if (data && data.is_paired && Array.isArray(data.announcements)) {
            setSlides(data.announcements);
          }
        } else {
          console.warn(
            `[LiveScreen] GET /api/pairing/status/${cleanCode} returned HTTP ${res.status}; preserving fallback behavior.`
          );
        }
      } catch (err) {
        console.warn(
          '[LiveScreen] GET /api/pairing/status error:',
          err.message
        );
      }
    };

    checkPairingStatus();
    statusInterval = setInterval(checkPairingStatus, 10000);

    return () => {
      if (statusInterval) clearInterval(statusInterval);
    };
  }, [pairingCode]);

  // Poll active content / listen for rotation changes
  useEffect(() => {
    const fetchActiveContent = async () => {
      try {
        const res = await fetch(`${API_BASE}/displays/active-content?display_id=${displayId}`);
        if (res.ok) {
          const data = await res.json();
          const fetchedName = data.display?.name || data.display_name || data.name;
          if (fetchedName) {
            setDisplayName(fetchedName);
          }
          const sec = data.rotation_seconds || data.rotationSeconds;
          if (sec && Number(sec) >= 3) {
            setRotationSeconds(Number(sec));
          }
          if (data.announcements && Array.isArray(data.announcements) && data.announcements.length > 0) {
            // Prioritize actual backend data directly, honoring backend image_urls and legacy image_url
            setSlides(data.announcements);
          }
        }
      } catch (err) {
        // Silently fallback if backend is offline
        console.warn('[LiveScreen] Active content polling fallback:', err.message);
      }

      // Sync from localStorage (enables live tab-to-tab rotation updates)
      const saved = localStorage.getItem('display_rotation_seconds');
      if (saved && Number(saved) >= 3) {
        setRotationSeconds((prev) => (prev !== Number(saved) ? Number(saved) : prev));
      }
    };

    fetchActiveContent();
    const pollInterval = setInterval(fetchActiveContent, 2000);

    // React immediately if rotation is updated in another tab
    const handleStorage = (e) => {
      if (e.key === 'display_rotation_seconds' && e.newValue) {
        const sec = Number(e.newValue);
        if (sec >= 3) {
          setRotationSeconds(sec);
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [displayId]);

  // Dynamic slide interval that reacts immediately when rotationSeconds changes
  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, rotationSeconds * 1000);

    return () => clearInterval(timer);
  }, [slides.length, rotationSeconds]);

  const currentSlide = slides[currentIndex];
  const slideImages = normalizeSlideImages(currentSlide);
  const slideCategory = currentSlide?.category || currentSlide?.department || 'CAMPUS BULLETIN';
  const slidePoster =
    currentSlide?.author ||
    currentSlide?.posted_by ||
    currentSlide?.created_by_name ||
    (currentSlide?.created_by ? `Admin (${currentSlide.created_by.slice(0, 8)})` : 'Campus Administration');
  const slideDate = currentSlide?.created_at
    ? new Date(currentSlide.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  if (slides.length === 0) {
    return (
      <main className="tv-fullscreen-screen" style={{ overflow: 'hidden' }}>
        <header className="tv-standby-header" style={{ flexShrink: 0 }}>
          <h1>🏛️ CAMPUS DIGITAL SIGNAGE</h1>
        </header>

        <section className="tv-standby-content" style={{ flex: 1, minHeight: 0 }}>
          <p className="tv-instructions">Pairing Code:</p>

          <div className="pairing-code-box">
            {pairingCode}
          </div>

          <p className="tv-instructions">
            To link this display, open Admin Dashboard
            {' > '}Displays{' > '}Pair New Display
          </p>
        </section>

        {/* Fixed Consistently Aligned Footer at the Very Bottom */}
        <footer
          className="tv-clock"
          style={{
            flexShrink: 0,
            boxSizing: 'border-box',
            width: '100%',
            padding: '12px 24px',
            margin: 0,
            borderTop: '2px solid #000000',
            background: '#ffffff',
            color: '#000000',
            fontFamily: 'monospace',
            fontSize: 'clamp(0.8rem, 1.2vw, 1rem)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ flex: 1, textAlign: 'left', fontWeight: 'bold' }}>
            📺 {displayName} [STANDBY]
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            No Active Content • Rotation: {rotationSeconds}s
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            🕒 {currentTime}
          </div>
        </footer>
      </main>
    );
  }

  return (
    <main className="tv-fullscreen-screen" style={{ overflow: 'hidden' }}>
      <header className="tv-standby-header" style={{ flexShrink: 0 }}>
        <h1>🏛️ CAMPUS DIGITAL SIGNAGE</h1>
      </header>

      <section
        key={currentIndex}
        className="tv-slide-card"
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          margin: '14px 0',
          padding: 'clamp(14px, 2vw, 22px)',
          overflow: 'hidden',
          boxSizing: 'border-box',
          border: '1px solid #000000',
          background: '#ffffff',
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
                padding: '3px 10px',
                fontSize: 'clamp(0.75rem, 1vw, 0.9rem)',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontFamily: 'monospace',
              }}
            >
              {slideCategory}
            </span>
            <span
              style={{
                fontSize: 'clamp(0.8rem, 1.1vw, 0.95rem)',
                color: '#333333',
                fontFamily: 'monospace',
              }}
            >
              Posted by: <strong>{slidePoster}</strong>
            </span>
          </div>
          {slideDate && (
            <span
              style={{
                fontSize: 'clamp(0.75rem, 1vw, 0.9rem)',
                color: '#666666',
                fontFamily: 'monospace',
              }}
            >
              {slideDate}
            </span>
          )}
        </div>

        {/* 2. Announcement Title Directly Beneath It */}
        {currentSlide?.title && (
          <h2
            className="tv-slide-title"
            style={{
              margin: '0 0 6px',
              fontSize: 'clamp(1.2rem, 2.2vw, 1.85rem)',
              fontWeight: 'bold',
              lineHeight: 1.25,
              textAlign: 'left',
              color: '#000000',
              flexShrink: 0,
            }}
          >
            {currentSlide.title}
          </h2>
        )}

        {/* 3. Announcement Description Directly Beneath Title */}
        {currentSlide?.body && (
          <p
            className="tv-slide-body"
            style={{
              margin: '0 0 12px',
              fontSize: 'clamp(0.85rem, 1.2vw, 1.05rem)',
              lineHeight: 1.4,
              textAlign: 'left',
              color: '#222222',
              flexShrink: 0,
            }}
          >
            {currentSlide.body}
          </p>
        )}

        {/* 4. Main Content Area Filling Available Space */}
        {slideImages.length > 0 && (
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
            <SlideMediaGrid
              images={slideImages}
              altTitle={currentSlide?.title || 'Campus announcement'}
            />
          </div>
        )}
      </section>

      {/* Fixed Consistently Aligned Footer at the Very Bottom */}
      <footer
        className="tv-clock"
        style={{
          flexShrink: 0,
          boxSizing: 'border-box',
          width: '100%',
          padding: '12px 24px',
          margin: 0,
          borderTop: '2px solid #000000',
          background: '#ffffff',
          color: '#000000',
          fontFamily: 'monospace',
          fontSize: 'clamp(0.8rem, 1.2vw, 1rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ flex: 1, textAlign: 'left', fontWeight: 'bold' }}>
          📺 {displayName}
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          Slide {currentIndex + 1} of {slides.length} • Rotation: {rotationSeconds}s
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          🕒 {currentTime}
        </div>
      </footer>
    </main>
  );
}
