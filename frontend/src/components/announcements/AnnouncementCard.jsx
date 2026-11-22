import React from 'react';
import { getImageUrl } from '../../utils/imageUrl.js';

export default function AnnouncementCard({
  announcement,
  onEdit,
  onDelete,
  onPreview,
  onOpenAssign,
  onAssign,
  onOpenFacebook,
  onShareFacebook,
}) {
  if (!announcement) return null;

  const {
    id,
    title,
    body,
    image_url,
    image_urls,
    status,
    starts_at,
    ends_at,
    author_name,
    author_department,
    author_position,
    assigned_displays,
    display_ids,
    display_count,
    target_college,
    fb_post_url,
  } = announcement;

  function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Compute college scope label
  const resolvedCollege =
    target_college && target_college.toUpperCase() !== 'ALL'
      ? `${target_college.toUpperCase()} ONLY`
      : 'CAMPUS-WIDE';

  // Compute display assignment count
  const assignedList = Array.isArray(assigned_displays)
    ? assigned_displays
    : Array.isArray(display_ids)
    ? display_ids
    : [];
  const displayCount =
    typeof display_count === 'number' ? display_count : assignedList.length;

  // Normalize photos array (supports both image_urls array and single image_url)
  const photos =
    Array.isArray(image_urls) && image_urls.length > 0
      ? image_urls.filter(Boolean)
      : image_url
      ? [image_url]
      : [];

  const authorRole = author_position || author_department || 'Admin';
  const authorLine = author_name
    ? `${author_name} (${authorRole})`
    : 'Campus Administrator';

  const handleAssignClick = () => {
    const fn = onOpenAssign || onAssign;
    if (fn) fn(announcement);
  };

  const handleFacebookClick = () => {
    const fn = onOpenFacebook || onShareFacebook;
    if (fn) fn(announcement);
  };

  return (
    <div className="announcement-card">
      {/* Scope & Broadcast Assignment Badges Row */}
      <div className="announcement-card-badges-row">
        <span className="college-scope-badge">
          🏛️ [{resolvedCollege}]
        </span>
        <span
          className={`assignment-status-badge ${
            displayCount > 0 ? 'broadcasting' : 'unassigned'
          }`}
          title={
            displayCount === 0
              ? 'Unassigned (Not Broadcasting)'
              : `Broadcasting on ${displayCount} Display(s)`
          }
        >
          {displayCount === 0
            ? '[ ⚪ Unassigned (0 Displays) ]'
            : `[ 🟢 Broadcasting on ${displayCount} Display${
                displayCount === 1 ? '' : 's'
              } ]`}
        </span>
      </div>

      {/* Top row: title + lifecycle status badge */}
      <div className="announcement-card-top">
        <div>
          <h3 className="announcement-card-title">{title || 'Untitled Notice'}</h3>
        </div>
        <span className="announcement-card-status">
          [ {status?.toUpperCase() || 'ACTIVE'} ]
        </span>
      </div>

      {/* Body text */}
      <p className="announcement-card-body">
        {body?.trim() || '(Graphic poster notice)'}
      </p>

      {/* Multi-photo or single photo thumbnails */}
      {photos.length === 1 && (
        <div className="announcement-card-image">
          <img
            src={getImageUrl(photos[0])}
            alt={title || 'Announcement'}
          />
        </div>
      )}

      {photos.length > 1 && (
        <div className="announcement-card-multi-photos">
          {photos.map((photoUrl, idx) => (
            <div key={idx} className="announcement-card-thumb-item">
              <img
                src={getImageUrl(photoUrl)}
                alt={`${title || 'Announcement'} photo ${idx + 1}`}
              />
              <span className="announcement-photo-badge">
                📷 Photo {idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Author, schedule & assigned display names */}
      <div className="announcement-card-meta">
        <div className="announcement-card-author">
          By: <strong>{authorLine}</strong>
        </div>
        <div>
          Schedule: {formatDate(starts_at)} — {formatDate(ends_at)}
        </div>
        {Array.isArray(assigned_displays) && assigned_displays.length > 0 && (
          <div className="announcement-displays-tag">
            Screens:{' '}
            {assigned_displays
              .map((d) => (typeof d === 'string' ? d : d.name))
              .filter(Boolean)
              .join(', ')}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="announcement-card-actions">
        {onPreview && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onPreview(announcement)}
          >
            Preview
          </button>
        )}

        <button
          type="button"
          className="btn btn-secondary btn-assign-display"
          onClick={handleAssignClick}
        >
          📺 Assign Display
        </button>

        {fb_post_url ? (
          <a
            href={fb_post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-fb-link"
          >
            📘 View on FB ↗
          </a>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-fb-share"
            onClick={handleFacebookClick}
          >
            📘 Share to FB
          </button>
        )}

        {onEdit && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onEdit(announcement)}
          >
            Edit
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ color: '#c62828' }}
            onClick={() => onDelete(id)}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
