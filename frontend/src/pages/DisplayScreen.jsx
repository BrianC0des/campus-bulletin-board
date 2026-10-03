import React, { useState } from 'react';
import '../styles/displays.css';

export default function DisplayScreen() {
  const [announcements] = useState([]);

  return (
    <main className="tv-fullscreen-screen">
      <header className="tv-standby-header">
        <h1>CAMPUS DIGITAL SIGNAGE</h1>
      </header>
      <section className="tv-standby-content">
        <p className="tv-instructions">Physical TV display screen</p>
      </section>
    </main>
  );
}
