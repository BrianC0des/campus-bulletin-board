import React from 'react';

export default function AnnouncementCard({ announcement }) {
  if (!announcement) return null;

  const { title, body, status, starts_at, ends_at, image_url, assigned_displays } = announcement;

  return (
    <div style={{ border: '1px solid #000', padding: '16px', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      {image_url && (
        <div style={{ height: '140px', overflow: 'hidden', borderBottom: '1px solid #000', marginBottom: '12px' }}>
          <img
            src={image_url}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '15px', margin: 0, fontWeight: 'bold' }}>{title}</h3>
        <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
          [ {status} ]
        </span>
      </div>

      <p style={{ fontSize: '13px', color: '#333', flex: 1, margin: '8px 0 12px 0' }}>
        {body}
      </p>

      <div style={{ fontSize: '11px', color: '#666', borderTop: '1px solid #eee', paddingTop: '8px' }}>
        <div>Schedule: {new Date(starts_at).toLocaleDateString()} - {new Date(ends_at).toLocaleDateString()}</div>
        {assigned_displays && assigned_displays.length > 0 && (
          <div style={{ marginTop: '4px' }}>
            Displays: {assigned_displays.map((d) => d.name).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}
