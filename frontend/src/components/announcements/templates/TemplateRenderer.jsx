import React, { useEffect, useRef, useState } from 'react';
import GeneralTemplate from './GeneralTemplate.jsx';
import ImageOnlyTemplate from './ImageOnlyTemplate.jsx';
import EventTemplate from './EventTemplate.jsx';
import EmergencyTemplate from './EmergencyTemplate.jsx';
import DeadlineTemplate from './DeadlineTemplate.jsx';
import AchievementTemplate from './AchievementTemplate.jsx';
import WeeklyEventsTemplate from './WeeklyEventsTemplate.jsx';
import { STAGE_SIZE } from './shared.jsx';

export function normalizeOrientation(value) {
  return value === 'portrait' || value === '9:16' ? 'portrait' : 'landscape';
}

/**
 * Pure switch over announcement.template_id. Renders safe JSX only (no raw HTML).
 * The template fills its parent; wrap in <ScaledStage> for a fixed 1920x1080 canvas.
 */
export default function TemplateRenderer({
  announcement = {},
  orientation = 'landscape',
  displayName,
  currentTime,
  itemLabel,
}) {
  const props = {
    announcement,
    orientation: normalizeOrientation(orientation),
    displayName,
    currentTime,
    itemLabel,
  };
  switch (announcement?.template_id) {
    case 'image_only':
      return <ImageOnlyTemplate {...props} />;
    case 'event_spotlight':
      return <EventTemplate {...props} />;
    case 'emergency_banner':
      return <EmergencyTemplate {...props} />;
    case 'deadline_callout':
      return <DeadlineTemplate {...props} />;
    case 'achievement_spotlight':
      return <AchievementTemplate {...props} />;
    case 'weekly_digest':
      return <WeeklyEventsTemplate {...props} />;
    case 'general_split':
    default:
      return <GeneralTemplate {...props} />;
  }
}

/**
 * Scales a high-resolution stage (base 1920x1080 or 1080x1920) to fit its container:
 * - fit="width": scales by width only (aspect-ratio wrapper clips cleanly)
 * - fit="contain": fits both dimensions inside a sized container
 * - fit="cover-viewport": adapts stage width/height to match the live display's
 *   actual aspect ratio so templates fill 100% of any monitor or TV with no black bars (FIX 3.8).
 */
export function ScaledStage({ orientation = 'landscape', fit = 'width', children, className = '' }) {
  const wrapRef = useRef(null);
  const [box, setBox] = useState({ scale: 0.3, stageW: STAGE_SIZE.landscape.width, stageH: STAGE_SIZE.landscape.height });
  const o = normalizeOrientation(orientation);
  const base = STAGE_SIZE[o];

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0) return;

      if (fit === 'cover-viewport' && h > 0) {
        if (o === 'portrait') {
          const scale = w / 1080;
          const stageW = 1080;
          const stageH = h / scale;
          setBox({ scale, stageW, stageH });
        } else {
          const scale = h / 1080;
          const stageW = w / scale;
          const stageH = 1080;
          setBox({ scale, stageW, stageH });
        }
        return;
      }

      const byWidth = w / base.width;
      const next = fit === 'contain' && h > 0 ? Math.min(byWidth, h / base.height) : byWidth;
      if (next > 0) setBox({ scale: next, stageW: base.width, stageH: base.height });
    };
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [base.width, base.height, fit]);

  const { scale, stageW, stageH } = box;

  if (fit === 'cover-viewport') {
    return (
      <div
        ref={wrapRef}
        className={`tpl-stage-wrap ${className}`}
        style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
      >
        <div
          className="tpl-stage"
          style={{
            width: stageW,
            height: stageH,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  const outerStyle =
    fit === 'contain'
      ? { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }
      : { width: '100%', position: 'relative', aspectRatio: `${stageW} / ${stageH}`, overflow: 'hidden' };

  return (
    <div ref={wrapRef} className={`tpl-stage-wrap ${className}`} style={outerStyle}>
      {fit === 'contain' ? (
        <div style={{ width: stageW * scale, height: stageH * scale, position: 'relative', overflow: 'hidden', flex: '0 0 auto' }}>
          <div style={{ width: stageW, height: stageH, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
            {children}
          </div>
        </div>
      ) : (
        <div
          className="tpl-stage"
          style={{
            width: stageW,
            height: stageH,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
