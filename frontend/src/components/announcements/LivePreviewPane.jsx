import React, { useState } from 'react';
import TemplateRenderer, { ScaledStage } from './templates/TemplateRenderer.jsx';
import { getTemplate, countWords } from './templates/templateRegistry.js';

export default function LivePreviewPane({ announcement }) {
  const [orientation, setOrientation] = useState('landscape');
  const template = getTemplate(announcement?.template_id);
  const words = countWords(announcement?.body);
  const overLimit = template.wordLimit > 0 && words > template.wordLimit;
  const isPortrait = orientation === 'portrait';

  const scopeLabel = !announcement?.target_college || announcement.target_college === 'ALL'
    ? 'Campus-Wide'
    : announcement.target_college;
  const durationLabel = announcement?.playback_duration ? `${announcement.playback_duration}s` : null;

  return (
    <div className="live-preview-pane">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <label style={{ margin: 0, fontWeight: 700, letterSpacing: '0.06em' }}>
            LIVE DISPLAY PREVIEW
          </label>
          <span className="orientation-badge">
            {scopeLabel}{durationLabel ? ` • ${durationLabel}` : ''}
          </span>
        </div>

        <div
          role="group"
          aria-label="Preview orientation"
          style={{
            display: 'inline-flex',
            border: '1px solid #d5d0c3',
            borderRadius: 8,
            overflow: 'hidden',
            background: '#faf8f2',
          }}
        >
          <button
            type="button"
            aria-pressed={!isPortrait}
            onClick={() => setOrientation('landscape')}
            style={{
              border: 0,
              padding: '5px 10px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: !isPortrait ? '#101827' : 'transparent',
              color: !isPortrait ? '#ffffff' : 'var(--ink)',
            }}
          >
            Landscape 16:9
          </button>
          <button
            type="button"
            aria-pressed={isPortrait}
            onClick={() => setOrientation('portrait')}
            style={{
              border: 0,
              borderLeft: '1px solid #d5d0c3',
              padding: '5px 10px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: isPortrait ? '#101827' : 'transparent',
              color: isPortrait ? '#ffffff' : 'var(--ink)',
            }}
          >
            Portrait 9:16
          </button>
        </div>
      </div>

      <div
        className="tv-bezel"
        style={{
          background: '#14171c',
          border: '1px solid #262b34',
          borderRadius: 14,
          padding: isPortrait ? '12px 10px 14px' : '11px 11px 14px',
          maxWidth: isPortrait ? 270 : '100%',
          margin: '0 auto',
          boxShadow: '0 16px 32px -14px rgba(16, 24, 39, 0.38), 0 4px 10px rgba(16, 24, 39, 0.16)',
        }}
      >
        <div
          style={{
            width: '100%',
            aspectRatio: isPortrait ? '9 / 16' : '16 / 9',
            overflow: 'hidden',
            borderRadius: 6,
            background: '#090b0e',
          }}
        >
          <ScaledStage orientation={orientation} fit="contain">
            <TemplateRenderer
              announcement={announcement}
              orientation={orientation}
              displayName="PREVIEW"
              itemLabel="01 / 01"
            />
          </ScaledStage>
        </div>
        <div
          aria-hidden="true"
          style={{
            width: 14,
            height: 3,
            borderRadius: 99,
            background: '#22c55e',
            opacity: 0.75,
            margin: '8px auto 0',
          }}
        />
      </div>

      <div
        className="tv-stand"
        aria-hidden="true"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <div style={{ width: isPortrait ? 34 : 52, height: 10, background: '#1e232b' }} />
        <div
          style={{
            width: isPortrait ? 96 : 136,
            height: 6,
            borderRadius: '0 0 6px 6px',
            background: '#14171c',
            boxShadow: '0 6px 12px rgba(16, 24, 39, 0.2)',
          }}
        />
      </div>

      {template.wordLimit > 0 && (
        <div
          className={`word-count ${overLimit ? 'over' : ''}`}
          role={overLimit ? 'alert' : 'status'}
          style={{ marginTop: 10, fontSize: 13, color: overLimit ? '#8d271a' : 'var(--muted)' }}
        >
          {words} / ~{template.wordLimit} words
          {overLimit && ' — long text may be too small to read from a distance. Consider shortening.'}
        </div>
      )}
    </div>
  );
}
