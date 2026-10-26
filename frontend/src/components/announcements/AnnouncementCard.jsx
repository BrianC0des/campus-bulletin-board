export default function AnnouncementCard({ announcement, onEdit, onDelete, onPreview }) {
  if (!announcement) return null;

  const { id, title, body, image_url, status, starts_at, ends_at, author_name, author_department, assigned_displays } = announcement;

  function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const author = author_name
    ? (author_department ? `${author_name} (${author_department})` : author_name)
    : null;

  return (
    <div className="announcement-card">
      {/* Top row: title + status badge */}
      <div className="announcement-card-top">
        <div>
          <h3 className="announcement-card-title">{title || 'Untitled'}</h3>
          {author && <p style={{ fontSize: '11px', color: '#666', margin: '2px 0 0' }}>By {author}</p>}
        </div>
        <span className="announcement-card-status">[ {status?.toUpperCase() || 'DRAFT'} ]</span>
      </div>

      {/* Image thumbnail */}
      {image_url && (
        <div className="announcement-card-image">
          <img src={image_url} alt={title || 'Announcement'} />
        </div>
      )}

      {/* Body text */}
      <p className="announcement-card-body">
        {body?.trim() || '(Graphic poster notice)'}
      </p>

      {/* Schedule & display assignment */}
      <div className="announcement-card-meta">
        <div>Start: {formatDate(starts_at)} — End: {formatDate(ends_at)}</div>
        {assigned_displays?.length > 0 && (
          <div>Screens: {assigned_displays.map((d) => (typeof d === 'string' ? d : d.name)).join(', ')}</div>
        )}
      </div>

      {/* Actions */}
      <div className="announcement-card-actions">
        {onPreview && (
          <button type="button" className="btn btn-secondary" onClick={() => onPreview(announcement)}>
            Preview
          </button>
        )}
        {onEdit && (
          <button type="button" className="btn btn-secondary" onClick={() => onEdit(announcement)}>
            Edit
          </button>
        )}
        {onDelete && (
          <button type="button" className="btn btn-secondary" style={{ color: '#c62828' }} onClick={() => onDelete(id)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
