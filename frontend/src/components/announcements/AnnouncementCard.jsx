import React from 'react';

export default function AnnouncementCard({ announcement }) {
  if (!announcement) return null;

  const { title, body, status, starts_at, ends_at, image_url, assigned_displays } = announcement;

  return (
    <div className="announcement-card">
      {image_url && (
        <div className="announcement-card-image">
          <img src={image_url} alt={title} />
        </div>
      )}

      <div className="announcement-card-top">
        <h3 className="announcement-card-title">{title}</h3>
        <span className="announcement-card-status">[ {status} ]</span>
      </div>

      <p className="announcement-card-body">{body}</p>

      <div className="announcement-card-meta">
        <div>Schedule: {new Date(starts_at).toLocaleDateString()} - {new Date(ends_at).toLocaleDateString()}</div>
        {assigned_displays && assigned_displays.length > 0 && (
          <div className="announcement-displays-tag">
            Displays: {assigned_displays.map((d) => d.name).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}
