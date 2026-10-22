import { useState } from 'react';
import '../../styles/announcements.css';

function AnnouncementForm() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (startsAt && endsAt && endsAt <= startsAt) {
      setError('End date must be later than start date.');
      return;
    }

    setError('');
    console.log({ title, message, startsAt, endsAt });
  };

  return (
    <form className="af-form" onSubmit={handleSubmit}>
      <h2 className="af-heading">Create / Edit Content</h2>

      <div className="af-layout">
        {/* LEFT COLUMN */}
        <div className="af-main">
          <fieldset className="af-box">
            <legend>Title Area</legend>
            <input
              className="af-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="[ TITLE ]"
              required
            />
          </fieldset>

          <fieldset className="af-box">
            <legend>Content / Body Area</legend>
            <textarea
              className="af-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="[ CONTENT ]"
              rows={8}
              required
            />
          </fieldset>
        </div>

        {/* RIGHT COLUMN */}
        <div className="af-side">
          <fieldset className="af-box">
            <legend>Schedule - Campus Time Zone</legend>

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

          {error && <p className="af-error">{error}</p>}

          <button className="af-button" type="submit">Save</button>
        </div>
      </div>
    </form>
  );
}

export default AnnouncementForm;