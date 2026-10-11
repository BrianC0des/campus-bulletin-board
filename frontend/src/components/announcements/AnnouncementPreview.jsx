import React from 'react';

export default function AnnouncementPreview({ title, body, imageUrl }) {
  return (
    <div className="tv-preview-container">
      {imageUrl && <img className="tv-preview-image" src={imageUrl} alt="preview" />}
      {title && <h2 className="tv-title">{title}</h2>}
      {body && <p className="tv-body">{body}</p>}
      {!title && !body && !imageUrl && <p className="tv-placeholder">Enter details to preview...</p>}
    </div>
  );
}
