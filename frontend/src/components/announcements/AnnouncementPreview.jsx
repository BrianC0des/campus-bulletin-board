import React from 'react';

/**
 * Renders an unsaved announcement in a full-screen or modal preview
 * simulating how it will appear on physical screens
 */
export default function AnnouncementPreview({ title, body, imageUrl, onClose }) {
  return (
    <div className="modal-backdrop">
      <div className="tv-preview-container">
        {/* TODO: Modal frame simulating 16:9 / 1080p display */}
      </div>
    </div>
  );
}
