import { useState } from 'react';
import '../../styles/announcements.css';

export default function AnnouncementForm({ onSave, onCancel }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) onSave({ title, body: message });
  };

  return (
    <form className="af-form" onSubmit={handleSubmit}>
      <h2>Create Announcement</h2>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" required />
      <button type="submit">Save</button>
    </form>
  );
}
