import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { getImageUrl } from '../utils/imageUrl.js';
import '../styles/displays.css';

export default function LiveScreen() {
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [pairingCode, setPairingCode] = useState('--------');
  const [isPaired, setIsPaired] = useState(false);
  const [displayId, setDisplayId] = useState(null);
  const [slides, setSlides] = useState([]);
  const [rotationSeconds, setRotationSeconds] = useState(10);

  // Fetch real-time active slide playlist
  const fetchActiveContent = async (activeDisplayId) => {
    try {
      const idToUse = activeDisplayId !== undefined ? activeDisplayId : displayId;
      const url = idToUse
        ? `/displays/active-content?display_id=${encodeURIComponent(idToUse)}`
        : '/displays/active-content';
      const res = await api.get(url);
      if (res?.announcements) {
        setSlides(res.announcements);
        if (res.rotationSeconds) setRotationSeconds(res.rotationSeconds);
      }
    } catch (err) {
      console.error('Failed to fetch active slides:', err);
    }
  };

  // Poll pairing status using the stored code
  const checkPairingStatus = async (code) => {
    try {
      const data = await api.get(`/pairing/status?code=${encodeURIComponent(code)}`);
      if (data?.isPaired) {
        setIsPaired(true);
        if (data.displayId) setDisplayId(data.displayId);
        fetchActiveContent(data.displayId);
      } else {
        setIsPaired(false);
        setDisplayId(null);
        setSlides([]);
      }
    } catch (err) {
      console.error('Failed to check pairing status:', err);
    }
  };

  useEffect(() => {
    // Reuse existing code from localStorage so refreshing keeps same code
    let code = localStorage.getItem('live_pairing_code');

    const initCode = async () => {
      if (!code) {
        try {
          const data = await api.post('/pairing/code');
          if (data?.pairingCode) {
            code = data.pairingCode;
            localStorage.setItem('live_pairing_code', code);
          }
        } catch {
          code = '7K4P-92QM';
        }
      }
      setPairingCode(code);

      // Check immediately if already paired
      await checkPairingStatus(code);
    };

    initCode();

    // Poll pairing status and active content every 5s for fast reactivity
    const pairPoll = setInterval(async () => {
      const storedCode = localStorage.getItem('live_pairing_code');
      if (storedCode) await checkPairingStatus(storedCode);
    }, 5000);

    const contentPoll = setInterval(() => {
      fetchActiveContent();
    }, 5000);

    return () => {
      clearInterval(pairPoll);
      clearInterval(contentPoll);
    };
  }, [displayId]);

  // Manila Clock Timer
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);

    return () => clearInterval(clockTimer);
  }, []);

  // Slide Rotation Timer
  useEffect(() => {
    if (slides.length <= 1) {
      setCurrentIndex(0);
      return;
    }

    const slideTimer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, rotationSeconds * 1000);

    return () => clearInterval(slideTimer);
  }, [slides.length, rotationSeconds]);

  // Safely clamp currentIndex if slides change or an announcement expires
  useEffect(() => {
    if (currentIndex >= slides.length) {
      setCurrentIndex(0);
    }
  }, [slides.length, currentIndex]);

  const currentSlide = slides[currentIndex] || slides[0];

  // Helper to test if title is just an ugly generated filename
  const isRawFilename = (t) => {
    if (!t) return true;
    return (
      /^screenshot[-_0-9]+/i.test(t) ||
      /^img[-_0-9]+/i.test(t) ||
      t.toLowerCase().endsWith('.png') ||
      t.toLowerCase().endsWith('.jpg') ||
      t.toLowerCase().endsWith('.jpeg') ||
      t === 'Graphic Poster'
    );
  };

  const hasBody = Boolean(currentSlide?.body && currentSlide.body.trim());
  const hasImage = Boolean(currentSlide?.image_url);
  const displayTitle = isRawFilename(currentSlide?.title) ? '' : currentSlide?.title;

  const authorName = currentSlide?.author_name || 'WMSU Administrator';
  const authorDept = currentSlide?.author_department || 'College of Computer Studies';
  const authorInitials = authorName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'WA';

  // State 1: Not yet paired — show pairing code
  if (!isPaired) {
    return (
      <main className="tv-fullscreen-screen">
        <header className="tv-standby-header">
          <h1>CAMPUS DIGITAL SIGNAGE</h1>
          <span className="tv-live-badge">[ UNPAIRED ]</span>
        </header>

        <section className="tv-standby-content">
          <p className="tv-instructions">PAIRING CODE</p>

          <div className="pairing-code-box">
            {pairingCode}
          </div>

          <p className="tv-instructions">
            Open Admin Dashboard &gt; Displays &gt; Pair New Display to connect this screen.
          </p>
        </section>

        <footer className="tv-clock">
          <span className="tv-footer-clock">{currentTime}</span>
          <div className="tv-footer-indicator">[ STANDBY ]</div>
        </footer>
      </main>
    );
  }

  // State 2: Paired but no announcements yet (or all announcements expired)
  if (!slides || slides.length === 0 || !currentSlide) {
    return (
      <main className="tv-fullscreen-screen">
        <header className="tv-standby-header">
          <h1>CAMPUS DIGITAL SIGNAGE</h1>
          <span className="tv-live-badge">[ CONNECTED ]</span>
        </header>

        <section className="tv-standby-content">
          <div className="pairing-code-box" style={{ fontSize: '1.25rem', padding: '16px 28px', letterSpacing: '2px' }}>
            DISPLAY CONNECTED
          </div>
          <p className="tv-instructions">
            Waiting for active published announcements to broadcast.
          </p>
        </section>

        <footer className="tv-clock">
          <span className="tv-footer-clock">{currentTime}</span>
          <div className="tv-footer-indicator">[ IDLE ]</div>
        </footer>
      </main>
    );
  }

  return (
    <main className="tv-fullscreen-screen tv-live-mode">
      <section key={currentIndex} className="tv-slide-viewport">
        {/* Case A: Poster Only - Fills 100% of the screen leaving only the small footer */}
        {hasImage && !hasBody && (
          <div className="tv-poster-hero">
            <img
              src={getImageUrl(currentSlide.image_url)}
              alt={displayTitle || 'Campus announcement'}
            />
            {displayTitle && (
              <div className="tv-poster-hero-caption">
                {displayTitle}
              </div>
            )}
          </div>
        )}

        {/* Case B: Poster + Body Text (Facebook Post Layout - Underneath, Not Side by Side) */}
        {hasImage && hasBody && (
          <div className="tv-fb-wrapper">
            <article className="tv-fb-card">
              <header className="tv-fb-header">
                <div className="tv-fb-avatar">{authorInitials}</div>
                <div className="tv-fb-meta">
                  <div className="tv-fb-author">
                    <span className="tv-fb-name">{authorName}</span>
                    <span className="tv-fb-badge">✓</span>
                  </div>
                  <div className="tv-fb-sub">
                    <span>{authorDept}</span>
                    <span className="tv-fb-dot">•</span>
                    <span>Active Broadcast</span>
                    <span className="tv-fb-dot">•</span>
                    <span className="tv-fb-globe">🌐</span>
                  </div>
                </div>
              </header>

              <div className="tv-fb-content">
                {displayTitle && <h2 className="tv-fb-title">{displayTitle}</h2>}
                <p className="tv-fb-body">{currentSlide.body}</p>
              </div>

              <div className="tv-fb-media">
                <img
                  src={getImageUrl(currentSlide.image_url)}
                  alt={displayTitle || 'Announcement image'}
                />
              </div>

              <footer className="tv-fb-actions">
                <div className="tv-fb-action-btn">
                  <span>👍</span> <span>Like</span>
                </div>
                <div className="tv-fb-action-btn">
                  <span>💬</span> <span>Comment</span>
                </div>
                <div className="tv-fb-action-btn">
                  <span>↗️</span> <span>Share</span>
                </div>
              </footer>
            </article>
          </div>
        )}

        {/* Case C: Text Only Notice (Facebook Text Post) */}
        {!hasImage && (
          <div className="tv-fb-wrapper">
            <article className="tv-fb-card tv-fb-text-only">
              <header className="tv-fb-header">
                <div className="tv-fb-avatar">{authorInitials}</div>
                <div className="tv-fb-meta">
                  <div className="tv-fb-author">
                    <span className="tv-fb-name">{authorName}</span>
                    <span className="tv-fb-badge">✓</span>
                  </div>
                  <div className="tv-fb-sub">
                    <span>{authorDept}</span>
                    <span className="tv-fb-dot">•</span>
                    <span>Official Announcement</span>
                    <span className="tv-fb-dot">•</span>
                    <span className="tv-fb-globe">🌐</span>
                  </div>
                </div>
              </header>

              <div className="tv-fb-content tv-fb-content-large">
                {displayTitle && <h2 className="tv-fb-title">{displayTitle}</h2>}
                {hasBody && <p className="tv-fb-body">{currentSlide.body}</p>}
              </div>

              <footer className="tv-fb-actions">
                <div className="tv-fb-action-btn">
                  <span>👍</span> <span>Like</span>
                </div>
                <div className="tv-fb-action-btn">
                  <span>💬</span> <span>Comment</span>
                </div>
                <div className="tv-fb-action-btn">
                  <span>↗️</span> <span>Share</span>
                </div>
              </footer>
            </article>
          </div>
        )}
      </section>

      <footer className="tv-clock">
        <span className="tv-footer-clock">{currentTime}</span>
        <span className="tv-footer-branding">CAMPUS DIGITAL SIGNAGE</span>
        <div className="tv-footer-indicator">
          <span>SLIDE {currentIndex + 1} OF {slides.length}</span>
          <span>•</span>
          <span>PHILIPPINE STANDARD TIME</span>
        </div>
      </footer>
    </main>
  );
}
