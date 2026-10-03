import React from 'react';

/**
 * Physical Screen View (/display):
 * - If unregistered: displays 8-character pairing code (e.g. 7K4P-92QM)
 * - If registered: polls /api/displays/active-content and rotates up to 6 notices
 * - If no active content: shows campus fallback screen
 */
export default function DisplayScreen() {
  return (
    <div className="fullscreen-tv">
      {/* TODO: State handling for Pairing Code vs Announcement Carousel */}
      <h1 style={{ fontSize: '2.5rem', fontFamily: 'monospace', letterSpacing: '2px' }}>
        Digital Signage Screen
      </h1>
    </div>
  );
}
