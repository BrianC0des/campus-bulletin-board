import { useState } from 'react';
import { MOCK_DISPLAYS } from '../../mocks/mockData.js';
import '../../styles/announcements.css';

export default function AnnouncementForm({ onSave, onCancel, onPreviewChange }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [selectedDisplays, setSelectedDisplays] = useState([]);
  const [error, setError] = useState('');

  const updatePreview = (newTitle, newMessage, imgUrl) => {
    if (onPreviewChange) onPreviewChange(newTitle, newMessage, imgUrl ?? imagePreviewUrl);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
    updatePreview(title, message, url);
  };

  const handleDisplayToggle = (id) => {
    setSelectedDisplays((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setError('End date must be later than start date.');
      return;
    }

    setError('');

    // Determine initial status based on schedule
    const now = new Date();
    let status = 'active';
    if (startsAt && new Date(startsAt) > now) {
      status = 'scheduled';
    } else if (endsAt && new Date(endsAt) < now) {
      status = 'expired';
    }

    if (onSave) {
      onSave({
        title: title.trim(),
        body: message.trim(),
        starts_at: startsAt || new Date().toISOString(),
        ends_at: endsAt || new Date(Date.now() + 7 * 86400000).toISOString(),
        image_url: imagePreviewUrl || null,
        display_ids: selectedDisplays,
        status,
        publish_status: 'published',
      });
    }
  };

  return (
    <form className="af-form" onSubmit={handleSubmit}>
      <h2 className="af-heading">Create / Edit Announcement</h2>

      <div className="af-layout">
        {/* LEFT COLUMN */}
        <div className="af-main">
          <fieldset className="af-box">
            <legend>Title Area</legend>
            <input
              className="af-input"
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); updatePreview(e.target.value, message, null); }}
              placeholder="e.g. Midterm Examination Schedule"
              required
            />
          </fieldset>

          <fieldset className="af-box">
            <legend>Content / Body Area</legend>
            <textarea
              className="af-input"
              value={message}
              onChange={(e) => { setMessage(e.target.value); updatePreview(title, e.target.value, null); }}
              placeholder="Enter announcement details, instructions, or venue..."
              rows={8}
              required
            />
          </fieldset>

          <fieldset className="af-box">
            <legend>Banner Image (optional)</legend>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageChange}
            />
            {imagePreviewUrl && (
              <img
                src={imagePreviewUrl}
                alt="preview"
                style={{ marginTop: 8, width: '100%', maxHeight: 140, objectFit: 'cover' }}
              />
            )}
          </fieldset>
        </div>

        {/* RIGHT COLUMN */}
        <div className="af-side">
          <fieldset className="af-box">
            <legend>Schedule (Campus Time Zone)</legend>

            <label className="af-label" htmlFor="startsAt">
              Start date / time
            </label>
            <input
              className="af-input"
              id="startsAt"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />

            <label className="af-label" htmlFor="endsAt">
              End date / time
            </label>
            <input
              className="af-input"
              id="endsAt"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </fieldset>

          <fieldset className="af-box">
            <legend>Assign to Displays</legend>
            {MOCK_DISPLAYS.map((display) => (
              <label key={display.id} className="af-display-check">
                <input
                  type="checkbox"
                  checked={selectedDisplays.includes(display.id)}
                  onChange={() => handleDisplayToggle(display.id)}
                />
                {display.name}
              </label>
            ))}
          </fieldset>

          {error && <p className="af-error">{error}</p>}

          <div className="af-actions">
            <button className="af-button" type="submit">
              Save Notice
            </button>
            {onCancel && (
              <button
                type="button"
                className="af-button-cancel"
                onClick={onCancel}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
