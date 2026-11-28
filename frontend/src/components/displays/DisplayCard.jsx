import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function DisplayCard({ display, onUnregister, onUpdateRotation }) {
  if (!display) return null;

  const [rotationSpeed, setRotationSpeed] = useState(display.rotation_seconds || 10);

  const handleSpeedChange = (speed) => {
    setRotationSpeed(speed);
    if (onUpdateRotation) {
      onUpdateRotation(display.id, speed);
    }
  };

  return (
    <div className="sketch-box" style={{ padding: '20px', borderRadius: '12px', background: 'var(--white, #fffdf8)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div
            style={{
              width: '38px',
              height: '30px',
              border: '2px solid var(--ink, #101827)',
              borderRadius: '4px',
              display: 'grid',
              placeItems: 'center',
              fontSize: '10px',
              fontWeight: 'bold',
            }}
          >
            TV
          </div>
          <div>
            <strong style={{ fontSize: '15px' }}>{display.name}</strong>
            <small style={{ display: 'block', color: '#666', fontSize: '11px' }}>
              📍 {display.location || 'Unassigned Location'}
            </small>
          </div>
        </div>

        <span
          style={{
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '10px',
            fontWeight: 'bold',
            background: display.is_paired ? 'var(--lime, #c9f23a)' : '#e2e8f0',
            color: 'var(--ink, #101827)',
          }}
        >
          {display.is_paired ? '🟢 ONLINE' : '⚪ UNPAIRED'}
        </span>
      </div>

      {/* Rotation Speed Controls */}
      <div style={{ margin: '14px 0', padding: '10px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#555', marginBottom: '6px' }}>
          SLIDE ROTATION SPEED
        </label>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {[5, 10, 15, 30].map((s) => (
            <button
              key={s}
              type="button"
              className={rotationSpeed === s ? 'wire-button dark' : 'wire-button'}
              style={{ minHeight: '30px', padding: '4px 10px', fontSize: '10px' }}
              onClick={() => handleSpeedChange(s)}
            >
              {s}s
            </button>
          ))}
          <span style={{ fontSize: '11px', color: '#888', marginLeft: 'auto' }}>
            Current: {rotationSpeed}s
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
        <Link
          to={`/live?display_id=${display.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="wire-button"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          Open Live ↗
        </Link>
        {onUnregister && (
          <button
            type="button"
            className="wire-button"
            style={{ color: 'var(--coral, #ff6b57)' }}
            onClick={() => onUnregister(display.id)}
          >
            Unpair
          </button>
        )}
      </div>
    </div>
  );
}
