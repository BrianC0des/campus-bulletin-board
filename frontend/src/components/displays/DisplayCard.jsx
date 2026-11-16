import React, { useState } from 'react';

const PRESET_SECONDS = [5, 10, 15, 30];
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DisplayCard({ display, onUnregister, onUpdateRotation }) {
  if (!display) return null;

  const { id, name, location, is_paired, paired_at, pairing_code } = display;

  const currentRotation = display.rotation_seconds || 10;
  const [customSeconds, setCustomSeconds] = useState(currentRotation);

  const saveRotation = async (seconds) => {
    // 1. Notify parent component state
    if (onUpdateRotation) onUpdateRotation(id, seconds);

    // 2. Persist to localStorage for multi-tab live sync
    try {
      localStorage.setItem('display_rotation_seconds', String(seconds));
      localStorage.setItem(`display_rotation_${id}`, String(seconds));
    } catch (e) {}

    // 3. Call backend PATCH /api/displays/${id}/rotation
    try {
      await fetch(`${API_BASE}/displays/${id}/rotation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotation_seconds: seconds }),
      });
    } catch (e) {
      // Backend may be offline in dev/mock mode
    }
  };

  const handlePresetClick = (seconds) => {
    setCustomSeconds(seconds);
    saveRotation(seconds);
  };

  const handleCustomSave = () => {
    const value = Math.min(300, Math.max(3, Number(customSeconds) || 10));
    setCustomSeconds(value);
    saveRotation(value);
  };

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
        <div>Code: <strong>{pairing_code}</strong></div>
        <div>Paired: {paired_at ? new Date(paired_at).toLocaleDateString() : 'Pending pairing...'}</div>
      </div>

      {/* ⏱️ Slide Rotation Speed Control */}
      <div className="rotation-control">
        <p className="rotation-control-label">⏱️ Slide Rotation Speed (Seconds):</p>
        <div className="rotation-presets">
          {PRESET_SECONDS.map((sec) => (
            <button
              key={sec}
              type="button"
              className={`rotation-preset-btn${currentRotation === sec ? ' rotation-preset-active' : ''}`}
              onClick={() => handlePresetClick(sec)}
            >
              {currentRotation === sec ? `● ${sec}s` : `${sec}s`}
            </button>
          ))}
          <div className="rotation-custom">
            <span>Custom:</span>
            <input
              type="number"
              min="3"
              max="300"
              value={customSeconds}
              onChange={(e) => setCustomSeconds(e.target.value)}
              className="rotation-custom-input"
            />
            <span className="rotation-custom-unit">sec</span>
            <button
              type="button"
              className="btn btn-secondary rotation-save-btn"
              onClick={handleCustomSave}
            >
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="display-fleet-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => window.open('/live', '_blank')}
        >
          Open /live Screen ↗
        </button>
        {onUnregister && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onUnregister(id)}
          >
            Unpair Screen
          </button>
        )}
      </div>
    </div>
  );
}
