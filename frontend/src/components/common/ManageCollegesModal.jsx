import React, { useState, useEffect, useId } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useColleges } from '../../utils/colleges.js';
import CustomSelect from './CustomSelect.jsx';

export default function ManageCollegesModal({ open, onClose, onAdded }) {
  const titleId = useId();
  const { colleges, addCollege, removeCollege } = useColleges();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Academic Colleges');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError('Both short code (e.g. CAIS) and full college/department name are required.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      const created = await addCollege({ code, name, category });
      setCode('');
      setName('');
      onAdded?.(created);
    } catch (err) {
      setError(err.message || 'Could not add college/department.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="user-modal-wash" onClick={onClose}>
      <div
        className="sketch-box assignment-modal assignment-modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <div className="eyebrow">CAMPUS DIRECTORY • COLLEGES &amp; OFFICES</div>
            <h2 id={titleId}>Manage Colleges &amp; Departments</h2>
          </div>
          <button type="button" className="text-action" onClick={onClose}>
            Close
          </button>
        </div>

        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--muted)' }}>
          Customize this list for your school or university. New colleges and offices immediately appear in
          Announcement scoping, Display registration, and Administrator accounts.
        </p>

        <form onSubmit={handleAdd} className="manage-college-form">
          <div className="manage-college-grid">
            <label>
              <span className="field-caption">SHORT CODE</span>
              <input
                className="field"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. CAIS"
                maxLength={30}
              />
            </label>
            <label>
              <span className="field-caption">FULL NAME</span>
              <input
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. College of Asian & Islamic Studies"
                maxLength={150}
              />
            </label>
            <div>
              <span className="field-caption">GROUP</span>
              <CustomSelect
                className="field"
                value={category}
                onChange={setCategory}
                ariaLabel="Select college or department group"
                options={[
                  { value: 'Academic Colleges', label: 'Academic Colleges' },
                  { value: 'Administrative Offices', label: 'Administrative Offices' },
                  { value: 'Campus Units', label: 'Campus Units' },
                ]}
              />
            </div>
          </div>
          {error && <div className="pairing-error" role="alert" style={{ marginTop: 10 }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="submit" className="wire-button dark" disabled={submitting}>
              <Plus size={14} /> {submitting ? 'Adding...' : 'Add College / Office'}
            </button>
          </div>
        </form>

        <div className="college-directory-list">
          {colleges.map((c) => (
            <div key={c.code} className="college-directory-row">
              <div>
                <strong>{c.code}</strong>
                <span>{c.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="orientation-badge">{c.category}</span>
                <button
                  type="button"
                  className="icon-action-btn danger"
                  aria-label={`Remove ${c.code}`}
                  title={`Remove ${c.code}`}
                  onClick={() => removeCollege(c.id || c.code)}
                >
                  <Trash2 size={14} />
                  <span className="btn-label">Remove</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
