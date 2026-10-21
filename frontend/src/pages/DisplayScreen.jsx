
import React, { useState, useEffect } from 'react';
import { MOCK_ANNOUNCEMENTS } from '../mocks/mockData.js';
import '../styles/displays.css';

export default function DisplayScreen() {
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [pairingCode, setPairingCode] = useState('--------');

  const [slides] = useState(() =>
    MOCK_ANNOUNCEMENTS.filter(
      (announcement) =>
        announcement.publish_status === 'published' &&
        announcement.status === 'active'
    )
  );

  // fetch a real pairing code from the backend on mount
  useEffect(() => {
    fetch('/api/pairing/code', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data.pairingCode) setPairingCode(data.pairingCode);
      })
      .catch(() => {
        // if backend is not running, keep the placeholder
        setPairingCode('7K4P-92QM');
      });
  }, []);

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);

    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;

    const slideTimer = setInterval(() => {
      setCurrentIndex(
        (previousIndex) => (previousIndex + 1) % slides.length
      );
    }, 10000);

    return () => clearInterval(slideTimer);
  }, [slides.length]);

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
          {currentTime} • Offline
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
        {currentTime} • Offline
      </footer>
    </main>
  );
}
