import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
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

  // State 1: Not yet paired — show pairing code
  if (!isPaired) {
    return (
      <main className="tv-fullscreen-screen">
        <header className="tv-standby-header">
          <h1>🏛️ CAMPUS DIGITAL SIGNAGE</h1>
        </header>

        <section className="tv-standby-content">
          <p className="tv-instructions">Pairing Code:</p>

          <div className="pairing-code-box">
            {pairingCode}
          </div>

          <p className="tv-instructions">
            To link this display, open Admin Dashboard
            {' > '}Displays{' > '}Pair New Display
          </p>
        </section>

        <footer className="tv-clock">
          {currentTime} • Standby Mode
        </footer>
      </main>
    );
  }

  // State 2: Paired but no announcements yet (or all announcements expired)
  if (!slides || slides.length === 0 || !currentSlide) {
    return (
      <main className="tv-fullscreen-screen">
        <header className="tv-standby-header">
          <h1>🏛️ CAMPUS DIGITAL SIGNAGE</h1>
        </header>

        <section className="tv-standby-content">
          <div className="pairing-code-box" style={{ fontSize: '1.2rem', padding: '1.5rem 2rem' }}>
            ✅ Display Connected
          </div>
          <p className="tv-instructions" style={{ marginTop: '1rem' }}>
            This screen is paired and ready. Waiting for published announcements...
          </p>
        </section>

        <footer className="tv-clock">
          {currentTime} • Connected — No Active Content
        </footer>
      </main>
    );
  }

  return (
    <main className="tv-fullscreen-screen">
      <header className="tv-standby-header">
        <h1>🏛️ CAMPUS DIGITAL SIGNAGE</h1>
      </header>

      <section key={currentIndex} className="tv-slide-card">
        {currentSlide.image_url && (
          <img
            className="tv-slide-image"
            src={currentSlide.image_url}
            alt={currentSlide.title || 'Campus announcement'}
          />
        )}

        {currentSlide.title && (
          <h2 className="tv-slide-title">
            {currentSlide.title}
          </h2>
        )}

        {currentSlide.body && (
          <p className="tv-slide-body">
            {currentSlide.body}
          </p>
        )}

        <p className="tv-slide-counter">
          Slide {currentIndex + 1} of {slides.length}
        </p>
      </section>

      <footer className="tv-clock">
        {currentTime} • Live Broadcast
      </footer>
    </main>
  );
}
