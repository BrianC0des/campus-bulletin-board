import React from 'react';

export default function PaskilLogo({ tagline = true, className = '' }) {
  return (
    <div className={`paskil-logo ${className}`} aria-label="PASKIL">
      <span className="paskil-tv-frame">
        <span className="paskil-name">PASKIL</span>
        <svg
          className="paskil-corner-accent"
          viewBox="0 0 18 22"
          aria-hidden="true"
        >
          <path d="M16 2v18H2" />
        </svg>
        <span className="paskil-tv-base" aria-hidden="true" />
      </span>
      {tagline && <small>Campus bulletin network</small>}
    </div>
  );
}
