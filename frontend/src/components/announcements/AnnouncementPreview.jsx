import React from 'react';
import TemplateRenderer, { ScaledStage } from './templates/TemplateRenderer.jsx';

export default function AnnouncementPreview({
  announcement,
  title,
  body,
  imageUrl,
  images,
  onClose,
}) {
  // Back-compat: callers may still pass loose title/body/images props.
  const activeImages = images?.length ? images : imageUrl ? [imageUrl] : [];
  const resolved = announcement || {
    title: title || 'CAMPUS ANNOUNCEMENT',
    body: body || '',
    image_urls: activeImages,
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONTROL ROOM / CONTENT</div>
          <h2>Content Preview</h2>
        </div>
        <button type="button" className="wire-button" onClick={onClose}>
          Back
        </button>
      </div>

      <div
        className="screen-frame screen-frame-large"
        style={{
          width: 'min(100%, calc((100vh - 220px) * 16 / 9))',
          minWidth: 320,
          margin: '0 auto',
          overflow: 'hidden',
        }}
      >
        <ScaledStage orientation="landscape" fit="contain">
          <TemplateRenderer
            announcement={resolved}
            orientation="landscape"
            displayName="PREVIEW"
            itemLabel="01 / 01"
          />
        </ScaledStage>
      </div>

      <div className="preview-bottom">
        <button type="button" className="wire-button" onClick={onClose}>
          Back
        </button>
        <span>Full-screen responsive display preview</span>
        <button type="button" className="wire-button dark" onClick={onClose}>
          Done previewing
        </button>
      </div>
    </div>
  );
}
