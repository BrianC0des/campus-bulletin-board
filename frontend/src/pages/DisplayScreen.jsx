import React, { useState, useEffect } from 'react';
import '../styles/displays.css';

export default function DisplayScreen() {
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' })
  );

  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="tv-fullscreen-screen">
      <header className="tv-standby-header">
        <h1>CAMPUS DIGITAL SIGNAGE</h1>
      </header>
      <footer className="tv-clock">{currentTime}</footer>
    </main>
  );
}
