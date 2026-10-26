import { useState, useEffect } from 'react';
import { MOCK_DISPLAYS } from '../../mocks/mockData.js';
import api from '../../services/api.js';
import '../../styles/announcements.css';

export default function AnnouncementForm({ initialData, onSave, onCancel, onPreview }) {
  const isEditing = Boolean(initialData && initialData.id);

  const [availableDisplays, setAvailableDisplays] = useState([]);
  const [title, setTitle] = useState(initialData?.title || '');
  const [body, setBody] = useState(initialData?.body || initialData?.message || '');
  const [startsAt, setStartsAt] = useState(() => {
    if (!initialData?.starts_at) return '';
    try {
      return new Date(initialData.starts_at).toISOString().slice(0, 16);
    } catch {
      return '';
    }
  });
  const [endsAt, setEndsAt] = useState(() => {
    if (!initialData?.ends_at) return '';
    try {
      return new Date(initialData.ends_at).toISOString().slice(0, 16);
    } catch {
      return '';
    }
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(initialData?.image_url || null);
  const [selectedDisplays, setSelectedDisplays] = useState(() => {
    if (!initialData?.assigned_displays) return [];
    return initialData.assigned_displays.map((d) => (typeof d === 'string' ? d : d.id));
  });
  const [error, setError] = useState('');

  // Notify preview modal on demand
  const handlePreview = () => {
    if (onPreview) {
      onPreview({ title, body, imageUrl: imagePreviewUrl });
    }
  };

  useEffect(() => {
    api.get('/displays')
      .then((res) => {
        if (res?.displays) {
          setAvailableDisplays(res.displays.filter((d) => d.is_paired));
        }
      })
      .catch((err) => {
        console.error('Failed to load screens:', err);
      });
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
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
        id: initialData?.id,
        title: title.trim(),
        body: body.trim(),
        message: body.trim(),
        starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
        image_url: imagePreviewUrl || null,
        imageFile,
        display_ids: selectedDisplays,
        status,
        publish_status: 'published',
      });
    }
  };

  return (
    <form className="af-form" onSubmit={handleSubmit}>
      <h2 className="af-heading">
        {isEditing ? 'Edit Announcement' : 'Create New Announcement'}
      </h2>

      <div className="af-layout">
        {/* LEFT COLUMN */}
        <div className="af-main">
          <fieldset className="af-box">
            <legend>Notice Title</legend>
            <input
              className="af-input"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
              }}
              placeholder="e.g. Midterm Examination Schedule & Guidelines"
              required
            />
          </fieldset>

          <fieldset className="af-box">
            <legend>Notice Content & Instructions</legend>
            <textarea
              className="af-input"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
              }}
              placeholder="Enter announcement details, instructions, or venue..."
              rows={8}
              required
            />
          </fieldset>

          <fieldset className="af-box">
            <legend>Graphic Poster / Banner Image (optional)</legend>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageChange}
            />
            {imagePreviewUrl && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={imagePreviewUrl}
                  alt="preview"
                  style={{ width: '100%', maxHeight: 160, objectFit: 'contain', background: '#f5f5f5', borderRadius: 4 }}
                />
              </div>
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
            />

            <label className="af-label" htmlFor="endsAt" style={{ marginTop: '12px' }}>
              End date / time
            </label>
            <input
              className="af-input"
              id="endsAt"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </fieldset>

          <fieldset className="af-box">
            <legend>Assign to Display Screens</legend>
            {availableDisplays.map((display) => (
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
              {isEditing ? 'Update Notice' : 'Save Notice'}
            </button>
            <button
              type="button"
              className="af-button-cancel"
              onClick={handlePreview}
            >
              Preview
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
