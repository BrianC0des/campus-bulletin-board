import React, { useState, useEffect } from 'react';
import { getImageUrl } from '../../utils/imageUrl.js';

function buildDefaultCaption(announcement) {
  if (!announcement) return '';

  const rawCollege = announcement.target_college;
  const collegeTag =
    rawCollege && rawCollege !== 'ALL'
      ? rawCollege.toUpperCase()
      : announcement.author_department
      ? announcement.author_department.toUpperCase()
      : 'CAMPUS-WIDE';

  const title = announcement.title || 'Campus Bulletin Announcement';
  const body = announcement.body?.trim() || '';
  const authorName = announcement.author_name || 'Campus Administrator';
  const authorRole =
    announcement.author_position ||
    announcement.author_department ||
    'WMSU Administration';

  const lines = [`📢 [${collegeTag}] ${title}`];
  if (body) {
    lines.push('', body);
  }
  lines.push(
    '',
    `Posted by: ${authorName} (${authorRole})`,
    '#WMSU #CampusBulletinBoard #DigitalSignage'
  );

  return lines.join('\n');
}

export default function FacebookShareModal({
  announcement,
  onClose,
  onConfirmShare,
}) {
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (announcement) {
      setCaption(buildDefaultCaption(announcement));
      setError('');
    }
  }, [announcement]);

  if (!announcement) return null;

  const images =
    Array.isArray(announcement.image_urls) && announcement.image_urls.length > 0
      ? announcement.image_urls
      : announcement.image_url
      ? [announcement.image_url]
      : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!caption.trim()) {
      setError('Caption cannot be empty.');
      return;
    }

    try {
      setPosting(true);
      setError('');
      await onConfirmShare(announcement.id, { caption: caption.trim() });
    } catch (err) {
      setError(err.message || 'Failed to publish to Facebook Page.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="assign-modal-box fb-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="assign-modal-header">
          <div>
            <p className="assign-modal-eyebrow">SOCIAL MEDIA CROSS-POSTING</p>
            <h3 className="assign-modal-title">
              📘 Confirm &amp; Edit Before Posting to Facebook
            </h3>
            <p className="assign-modal-subtitle">
              Review the formatted caption and attached media before publishing to the official Facebook Page.
            </p>
          </div>
          <button
            type="button"
            className="assign-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <p className="af-error" style={{ marginBottom: '12px' }}>{error}</p>}

          <div className="fb-caption-group">
            <label htmlFor="fbCaptionInput" className="duration-presets-label">
              Facebook Post Caption (Editable):
            </label>
            <textarea
              id="fbCaptionInput"
              className="fb-caption-textarea"
              rows={7}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your Facebook post caption..."
            />
          </div>

          {images.length > 0 && (
            <div className="fb-media-preview">
              <span className="duration-presets-label">
                Attached Media ({images.length} {images.length === 1 ? 'Photo' : 'Photos'}):
              </span>
              <div className="fb-media-grid">
                {images.map((imgUrl, idx) => (
                  <div key={idx} className="fb-media-thumb">
                    <img
                      src={getImageUrl(imgUrl)}
                      alt={`Attached preview ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="assign-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary fb-confirm-btn"
              disabled={posting}
            >
              {posting ? 'Posting to Facebook...' : '📘 Confirm & Post to Facebook Page'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
