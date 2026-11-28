import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api.js';
import TemplateRenderer, { ScaledStage } from '../components/announcements/templates/TemplateRenderer.jsx';
import { useSignageSettings } from '../utils/signageSettings.js';

const PAIRING_POLL_MS = 5000;
const MIN_SLIDE_MS = 3000;

const manilaTime = () =>
  new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit' });

const idSignature = (list) => list.map((s) => s.id ?? s.title).join('|');

const isSlideInWindow = (slide, nowMs = Date.now()) => {
  if (!slide || slide.status === 'expired') return false;
  if (slide.starts_at) {
    const startMs = new Date(slide.starts_at).getTime();
    if (!Number.isNaN(startMs) && startMs > nowMs) return false;
  }
  if (slide.ends_at) {
    const endMs = new Date(slide.ends_at).getTime();
    if (!Number.isNaN(endMs) && endMs <= nowMs) return false;
  }
  return true;
};

export default function LiveScreen() {
  const { settings: signageSettings } = useSignageSettings();
  const [currentTime, setCurrentTime] = useState(manilaTime());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pairingCode, setPairingCode] = useState('--------');
  const [isPaired, setIsPaired] = useState(false);
  const [displayName, setDisplayName] = useState('CAMPUS DISPLAY');
  const [layoutMode, setLayoutMode] = useState('carousel');
  const [slides, setSlides] = useState([]);
  const [rotationSeconds, setRotationSeconds] = useState(null);
  const [overrideActive, setOverrideActive] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  // Refs let interval callbacks read the latest values without re-subscribing.
  const displayIdRef = useRef(null);
  const slidesRef = useRef([]);
  const indexRef = useRef(0);
  const pairedRef = useRef(false);

  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  const applyContent = useCallback((res) => {
    if (!res) return;
    if (Array.isArray(res.announcements)) {
      const next = res.announcements;
      const prev = slidesRef.current;
      if (idSignature(prev) !== idSignature(next)) {
        const currentId = prev[indexRef.current]?.id || prev[indexRef.current]?.announcement_id;
        const keep = currentId !== undefined
          ? next.findIndex((s) => (s.id || s.announcement_id) === currentId)
          : -1;
        setCurrentIndex(keep >= 0 ? keep : 0);
      }
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        slidesRef.current = next;
        setSlides(next);
      }
      try {
        localStorage.setItem('paskil_cached_slides', JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
    }
    setRotationSeconds(res.rotationSeconds > 0 ? res.rotationSeconds : null);
    if (res.displayName) setDisplayName(res.displayName);
    if (res.layoutMode) setLayoutMode(res.layoutMode);
    setOverrideActive(Boolean(res.overrideActive));
  }, []);

  const fetchActiveContent = useCallback(
    async (activeDisplayId) => {
      try {
        const idToUse = activeDisplayId !== undefined ? activeDisplayId : displayIdRef.current;
        const url = idToUse
          ? `/displays/active-content?display_id=${encodeURIComponent(idToUse)}`
          : '/displays/active-content';
        applyContent(await api.get(url));
        setConnectionError(false);
      } catch {
        setConnectionError(true);
        if (slidesRef.current.length === 0) {
          try {
            const cached = JSON.parse(localStorage.getItem('paskil_cached_slides') || '[]');
            const validCached = Array.isArray(cached) ? cached.filter((s) => isSlideInWindow(s)) : [];
            if (validCached.length > 0) {
              slidesRef.current = validCached;
              setSlides(validCached);
            }
          } catch {
            // ignore
          }
        }
      }
    },
    [applyContent]
  );

  const requestNewPairingCode = useCallback(async () => {
    try {
      const fresh = await api.post('/pairing/code');
      if (fresh?.pairingCode) {
        localStorage.setItem('live_pairing_code', fresh.pairingCode);
        setPairingCode(fresh.pairingCode);
        setConnectionError(false);
        return fresh.pairingCode;
      }
    } catch {
      setConnectionError(true);
    }
    return null;
  }, []);

  const checkPairingStatus = useCallback(
    async (code) => {
      try {
        const data = await api.get(`/pairing/status?code=${encodeURIComponent(code)}`);
        setConnectionError(false);
        if (data?.found === false) {
          pairedRef.current = false;
          displayIdRef.current = null;
          slidesRef.current = [];
          setIsPaired(false);
          setSlides([]);
          setOverrideActive(false);
          localStorage.removeItem('live_pairing_code');
          await requestNewPairingCode();
          return;
        }
        if (data?.isPaired) {
          const wasPaired = pairedRef.current;
          pairedRef.current = true;
          setIsPaired(true);
          if (data.displayId) {
            displayIdRef.current = data.displayId;
          }
          if (data.displayName) setDisplayName(data.displayName);
          if (!wasPaired) await fetchActiveContent(data.displayId);
        } else {
          pairedRef.current = false;
          displayIdRef.current = null;
          slidesRef.current = [];
          setIsPaired(false);
          setSlides([]);
          setOverrideActive(false);
        }
      } catch {
        setConnectionError(true);
      }
    },
    [fetchActiveContent, requestNewPairingCode]
  );

  useEffect(() => {
    let cancelled = false;
    let code = localStorage.getItem('live_pairing_code');

    const initCode = async () => {
      if (!code) {
        try {
          const data = await api.post('/pairing/code');
          if (data?.pairingCode) {
            code = data.pairingCode;
            localStorage.setItem('live_pairing_code', code);
            setConnectionError(false);
          }
        } catch {
          setConnectionError(true);
          code = 'OFFLINE';
        }
      }
      if (cancelled) return;
      setPairingCode(code);
      if (code && code !== 'OFFLINE') await checkPairingStatus(code);
    };
    initCode();

    const pairPoll = setInterval(() => {
      const storedCode = localStorage.getItem('live_pairing_code');
      if (storedCode) {
        checkPairingStatus(storedCode);
      } else {
        code = null;
        initCode();
      }
    }, PAIRING_POLL_MS);

    const contentPollMs = Math.max(5, signageSettings.pollIntervalSeconds || 15) * 1000;
    const contentPoll = setInterval(() => {
      if (pairedRef.current) fetchActiveContent();
    }, contentPollMs);

    const clockInterval = setInterval(() => setCurrentTime(manilaTime()), 1000);

    const notifyOffline = () => {
      if (!displayIdRef.current) return;
      const payload = JSON.stringify({ display_id: displayIdRef.current, status: 'offline' });
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`${baseUrl}/displays/heartbeat`, new Blob([payload], { type: 'application/json' }));
      }
    };
    window.addEventListener('pagehide', notifyOffline);

    return () => {
      cancelled = true;
      clearInterval(pairPoll);
      clearInterval(contentPoll);
      clearInterval(clockInterval);
      window.removeEventListener('pagehide', notifyOffline);
    };
  }, [checkPairingStatus, fetchActiveContent, signageSettings.pollIntervalSeconds]);

  const safeIndex = slides.length ? currentIndex % slides.length : 0;
  const currentSlide = slides[safeIndex];
  const effectiveOverride = overrideActive && signageSettings.emergencyPreemption;

  const groupSize = effectiveOverride
    ? 1
    : layoutMode === 'grid_4' && slides.length >= 2
      ? Math.min(4, slides.length)
      : layoutMode === 'split_2' && slides.length >= 2
        ? 2
        : 1;

  // Per-slide (or per-group) rotation timer.
  useEffect(() => {
    if (slides.length <= groupSize || !currentSlide) return undefined;
    const seconds = currentSlide.playback_duration || rotationSeconds || signageSettings.defaultSlideDuration || 15;
    const timer = setTimeout(
      () => setCurrentIndex((prev) => (prev + groupSize) % slides.length),
      Math.max(MIN_SLIDE_MS, seconds * 1000)
    );
    return () => clearTimeout(timer);
  }, [safeIndex, slides.length, groupSize, currentSlide?.announcement_id, currentSlide?.playback_duration, rotationSeconds, signageSettings.defaultSlideDuration]);

  if (!isPaired) {
    return (
      <div className="public-page" style={{ width: '100vw', height: '100vh', padding: 0, justifyContent: 'center' }}>
        <div className="public-screen unregistered-screen" style={{ width: 'min(980px, 92vw)', height: 'min(580px, 85vh)' }}>
          <div className="pairing-display-header">PASKIL / UNREGISTERED DISPLAY</div>
          <div className="pairing-display-body">
            <div className="pairing-state">NEW DISPLAY DETECTION</div>
            <div className="pairing-label">PAIRING CODE</div>
            <strong style={{ letterSpacing: '0.12em', fontFamily: 'monospace' }}>{pairingCode}</strong>
            <p>
              Open the <span style={{ color: '#fff', fontWeight: 700 }}>PASKIL Administrator Portal</span> on your computer.<br />
              Navigate to <span style={{ color: 'var(--lime)', fontWeight: 700 }}>Displays → + Register display</span> and enter this code.
            </p>
            <div className="pairing-expiry">
              {connectionError
                ? 'Cannot reach PASKIL server — retrying automatically...'
                : 'Code bound exclusively to this physical screen. Refreshes on network change.'}
            </div>
            <div className="waiting-line">{currentTime} • WAITING FOR REGISTRATION CONFIRMATION...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!slides || slides.length === 0) {
    return (
      <div className="public-page" style={{ width: '100vw', height: '100vh', padding: 0, justifyContent: 'center', position: 'relative' }}>
        <div className="public-screen state-screen" style={{ width: 'min(980px, 92vw)', height: 'min(580px, 85vh)' }}>
          <div className="pairing-display-header">PASKIL / {displayName.toUpperCase()}</div>
          <div className="state-message">
            <strong style={{ fontSize: '28px' }}>
              {connectionError ? 'CONNECTION LOST' : 'NO ANNOUNCEMENTS SCHEDULED'}
            </strong>
            <span style={{ color: '#b8c0cc' }}>
              {connectionError
                ? 'Cannot reach PASKIL server — retrying automatically...'
                : 'All broadcasts are up to date'}
            </span>
            {signageSettings.showClockAndTimezone && (
              <div style={{ color: '#9ca5b3', marginTop: '20px' }}>{currentTime} • Philippine Standard Time</div>
            )}
          </div>
        </div>
        {connectionError && (
          <div
            role="status"
            style={{
              position: 'absolute',
              bottom: 14,
              right: 16,
              zIndex: 20,
              padding: '7px 14px',
              borderRadius: 999,
              background: 'rgba(16, 24, 39, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#f8fafc',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Offline • Auto-reconnecting...
          </div>
        )}
      </div>
    );
  }

  const visibleSlides = Array.from({ length: groupSize }, (_, i) => slides[(safeIndex + i) % slides.length]);

  return (
    <div
      className="public-page live-fullscreen"
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        background: '#101827',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        className={`public-screen live-screen-stage live-layout-${groupSize > 1 ? layoutMode : 'carousel'}`}
        style={{
          width: '100vw',
          maxWidth: '100vw',
          height: '100vh',
          maxHeight: '100vh',
          border: 0,
          borderRadius: 0,
          margin: 0,
          padding: 0,
          display: 'grid',
          gridTemplateColumns: groupSize >= 2 ? 'repeat(2, minmax(0, 1fr))' : '1fr',
          gridTemplateRows: groupSize >= 3 ? 'repeat(2, minmax(0, 1fr))' : '1fr',
          gap: groupSize > 1 ? 6 : 0,
          background: '#101827',
        }}
      >
        {visibleSlides.map((slide, idx) => {
          const slideNum = ((safeIndex + idx) % slides.length) + 1;
          const itemLabel = `${String(slideNum).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
          return (
            <div key={`${slide.id || slide.announcement_id}-${idx}`} style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}>
              <ScaledStage orientation="landscape" fit="cover-viewport">
                <TemplateRenderer
                  announcement={slide}
                  orientation="landscape"
                  displayName={displayName}
                  currentTime={currentTime}
                  itemLabel={itemLabel}
                />
              </ScaledStage>
            </div>
          );
        })}
      </div>

      {connectionError && (
        <div
          role="status"
          style={{
            position: 'absolute',
            bottom: 14,
            right: 16,
            zIndex: 20,
            padding: '7px 14px',
            borderRadius: 999,
            background: 'rgba(16, 24, 39, 0.88)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#f8fafc',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Offline • Playing cached slides — Auto-reconnecting...
        </div>
      )}
    </div>
  );
}
