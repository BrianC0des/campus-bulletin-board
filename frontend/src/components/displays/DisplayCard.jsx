import React from 'react';

export default function DisplayCard({ display, onUnregister }) {
  if (!display) return null;

  const { id, name, location, is_paired, paired_at, pairing_code } = display;

  return (
    <div className="display-fleet-card">
      <div className="display-fleet-top">
        <div>
          <h3 className="display-fleet-name">
            {name || 'Unassigned Screen'}
          </h3>
          <p className="display-fleet-location">
            {location || 'No location set'}
          </p>
        </div>
        <span className="display-fleet-status">
          [ {is_paired ? 'PAIRED' : 'UNPAIRED'} ]
        </span>
      </div>

      <div className="display-fleet-info">
        <div>Location: <strong>{location || '—'}</strong></div>
        <div>Since: {paired_at ? new Date(paired_at).toLocaleDateString() : '—'}</div>
      </div>

      <div className="display-fleet-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => window.open('/live', '_blank')}
        >
          View Screen
        </button>
        {onUnregister && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onUnregister(id)}
          >
            Unpair
          </button>
        )}
      </div>
    </div>
  );
}
