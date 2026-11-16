import React, { useState, useEffect } from 'react';
import { MOCK_ANNOUNCEMENTS } from '../mocks/mockData.js';
import '../styles/displays.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

  const [slides, setSlides] = useState(() =>
    MOCK_ANNOUNCEMENTS.filter(
      (announcement) =>
        announcement.publish_status === 'published' &&
        announcement.status === 'active'
    )
  );

  const pairingCode = '7K4P - 92QM';
  const displayId = 'disp-001';

  // Clock interval (1 second)
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US'));
    }, 1000);

    return () => clearInterval(clockTimer);
  }, []);

  // Poll active content / listen for rotation changes
  useEffect(() => {
    const fetchActiveContent = async () => {
      try {
        const res = await fetch(`${API_BASE}/displays/active-content?display_id=${displayId}`);
        if (res.ok) {
          const data = await res.json();
          const sec = data.rotation_seconds || data.rotationSeconds;
          if (sec && Number(sec) >= 3) {
            setRotationSeconds(Number(sec));
          }
          if (data.announcements && Array.isArray(data.announcements) && data.announcements.length > 0) {
            setSlides(data.announcements);
          }
        }
      } catch (err) {
        // Silently fallback if backend is offline
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

  if (slides.length === 0) {
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
          {currentTime} • Rotation: {rotationSeconds}s
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
        {currentTime} • Rotation: {rotationSeconds}s
      </footer>
    </main>
  );
}
