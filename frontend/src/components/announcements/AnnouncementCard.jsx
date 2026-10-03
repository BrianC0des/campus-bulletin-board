import React from 'react';

export default function AnnouncementCard({ announcement }) {
  if (!announcement) return null;
  const { title, body, status } = announcement;
  return (
    <div className="announcement-card">
      <div className="announcement-card-top">
        <h3 className="announcement-card-title">{title}</h3>
        <span className="announcement-card-status">[ {status} ]</span>
      </div>
      <p className="announcement-card-body">{body}</p>
    </div>
  );
}
