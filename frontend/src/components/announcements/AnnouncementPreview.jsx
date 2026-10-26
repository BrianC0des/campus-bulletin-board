export default function AnnouncementPreview({
  title,
  body,
  imageUrl,
  onClose,
}) {
  const hasContent = Boolean(
    title?.trim() || body?.trim() || imageUrl
  );

  return (
    <div className="modal-backdrop">
      <section
        className="tv-preview-container"
        role="dialog"
        aria-modal="true"
        aria-label="Announcement preview"
      >
        <div className="tv-preview-toolbar">
          <h2>Campus TV Preview</h2>

          <button
            type="button"
            className="tv-close-btn"
            onClick={onClose}
          >
            ✕ Close Preview
          </button>
        </div>

        <div className="tv-preview-screen">
          {!hasContent ? (
            <div className="tv-placeholder">
              <p>Type in the form to see live TV preview...</p>
            </div>
          ) : (
            <div className="tv-preview-content">
              {imageUrl && (
                <div className="tv-preview-image-box">
                  <img
                    src={imageUrl}
                    alt={title || 'Announcement'}
                  />
                </div>
              )}

              <div className="tv-preview-text">
                <span className="tv-preview-tag">
                  General Announcement
                </span>

                <h2 className="tv-preview-title">
                  {title?.trim() || 'Untitled Announcement'}
                </h2>

                {body?.trim() && (
                  <p className="tv-preview-body">{body}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
