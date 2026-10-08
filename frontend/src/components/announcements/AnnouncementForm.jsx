import { useState } from 'react';
import '../../styles/announcements.css';

export default function AnnouncementForm({ onSave, onCancel }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) onSave({ title, body: message, starts_at: startsAt, ends_at: endsAt });
  };

  return (
    <form className="af-form" onSubmit={handleSubmit}>
      <h2 className="af-heading">Create / Edit Announcement</h2>
      <div className="af-layout">
        <div className="af-main">
          <fieldset className="af-box">
            <legend>Title Area</legend>
            <input className="af-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
          </fieldset>
          <fieldset className="af-box">
            <legend>Content / Body Area</legend>
            <textarea className="af-input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" rows={8} required />
          </fieldset>
        </div>
        <div className="af-side">
          <fieldset className="af-box">
            <legend>Schedule (Campus Time Zone)</legend>
            <label className="af-label" htmlFor="startsAt">Start date / time</label>
            <input className="af-input" id="startsAt" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
            <label className="af-label" htmlFor="endsAt">End date / time</label>
            <input className="af-input" id="endsAt" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
          </fieldset>
        </div>
      </div>
    </form>
  );
}
