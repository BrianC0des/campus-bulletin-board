
export default function AnnouncementCard({
  announcement,
  onEdit,
  onDelete,
  onPreview,
}) {
  const {
    id,
    title,
    body,
    image_url,
    status,
    starts_at,
    ends_at,
    author_email,
    created_by,
  } = announcement;

  function formatDate(dateString) {
    if (!dateString) return 'No date';

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return 'Invalid date';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const statuses = ['active', 'scheduled', 'expired'];
  const statusValue = status?.toLowerCase();

  const normalizedStatus = statuses.includes(statusValue)
    ? statusValue
    : 'unknown';

  const author = author_email || created_by;

  return (
    <article className="announcement-feed-card">
      <div className="card-header-row">
        <div className="card-heading">
          <h2 className="card-title">
            {title || 'Untitled Announcement'}
          </h2>

          {author && (
            <p className="card-author">By {author}</p>
          )}
        </div>

        <span className={`badge badge-${normalizedStatus}`}>
          {normalizedStatus.toUpperCase()}
        </span>
      </div>

      <div className="card-content-row">
        {image_url ? (
          <img
            src={image_url}
            alt={title || 'Announcement thumbnail'}
            className="card-thumbnail"
          />
        ) : (
          <div className="card-thumbnail card-no-image">
            No Image
          </div>
        )}

        <div className="card-details">
          <p className="card-body-text">
            {body?.trim() || '(Graphic Poster Notice)'}
          </p>

          <div className="card-schedule-info">
            <span>Start: {formatDate(starts_at)}</span>
            <span>End: {formatDate(ends_at)}</span>
          </div>
        </div>
      </div>

      <div className="card-actions-row">
        <button
          type="button"
          onClick={() => onPreview?.(announcement)}
        >
          Preview
        </button>

        <button
          type="button"
          className="card-edit-btn"
          onClick={() => onEdit?.(announcement)}
        >
          Edit
        </button>

        <button
          type="button"
          className="card-delete-btn"
          onClick={() => onDelete?.(id)}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
