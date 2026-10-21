import React from 'react';

export default function DisplayCard({ display, onUnregister }) {
  if (!display) return null;

  const { id, name, location, is_paired, paired_at, pairing_code } = display;

  return (
    <div style={{ border: '1px solid #000', padding: '16px', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>
            {name || 'Unassigned Screen'}
          </h3>
          <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>
            {location || 'No location set'}
          </p>
        </div>
        <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>
          [ {is_paired ? 'PAIRED' : 'UNPAIRED'} ]
        </span>
      </div>

      <div style={{ margin: '14px 0', fontSize: '12px', color: '#444' }}>
        <div>Code: <strong style={{ fontFamily: 'monospace' }}>{pairing_code}</strong></div>
        <div>Paired: {paired_at ? new Date(paired_at).toLocaleDateString() : 'Pending pairing...'}</div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #eee' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => window.open('/display', '_blank')}
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
