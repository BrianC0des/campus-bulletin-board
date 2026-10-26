import React from 'react';

export default function AnnouncementPreview({ title, body, imageUrl, image_url, onClose }) {
  const activeImage = imageUrl || image_url;
  const hasContent = Boolean(title?.trim() || body?.trim() || activeImage);

  const currentTime = new Date().toLocaleTimeString('en-PH', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="preview-modal-bar">
          <span>Campus Signage Preview</span>
          {onClose && (
            <button type="button" className="btn btn-sm btn-secondary" onClick={onClose}>
              Close
            </button>
          )}
        </div>

        <div className="preview-modal-body">
          {!hasContent ? (
            <p className="empty-text">Type in the form to see live preview...</p>
          ) : (
            <>
              {activeImage && (
                <div className="preview-image-wrap">
                  <img src={activeImage} alt="Announcement preview" />
                </div>
              )}
              {title?.trim() && <h2 className="preview-title">{title}</h2>}
              {body?.trim() && <p className="preview-body">{body}</p>}
            </>
          )}
        </div>

        <div className="preview-modal-footer">
          <span>{currentTime} • Philippine Standard Time</span>
          <span>1080p Digital Signage</span>
        </div>
      </div>
    </div>
  );
}
