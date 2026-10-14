import React, { useState, useEffect } from 'react';
import { MOCK_ANNOUNCEMENTS } from '../mocks/mockData.js';
import '../styles/displays.css';

export default function DisplayScreen() {
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' })
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slides] = useState(() => MOCK_ANNOUNCEMENTS.filter((a) => a.publish_status === 'published' && a.status === 'active'));

  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    const slideTimer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 10000);
    return () => clearInterval(slideTimer);
  }, [slides.length]);

  return (
    <main className="tv-fullscreen-screen">
      <header className="tv-standby-header"><h1>CAMPUS DIGITAL SIGNAGE</h1></header>
      <footer className="tv-clock">{currentTime}</footer>
    </main>
  );
}
