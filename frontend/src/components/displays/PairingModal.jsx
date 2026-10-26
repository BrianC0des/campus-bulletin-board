import React, { useState } from 'react';

export default function PairingModal({ isOpen, onClose, onPairSuccess }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  function clearForm() {
    setCode('');
    setName('');
    setLocation('');
    setError('');
  }

  function handleCancel() {
    clearForm();
    onClose();
  }

  function handleCodeChange(e) {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length > 8) val = val.slice(0, 8);
    if (val.length > 4) {
      val = val.slice(0, 4) + '-' + val.slice(4);
    }
    setCode(val);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!code.trim() || !name.trim() || !location.trim()) {
      setError('All fields are required.');
      return;
    }

    try {
      if (onPairSuccess) {
        await onPairSuccess({
          code: code.trim(),
          name: name.trim(),
          location: location.trim(),
        });
      }
      clearForm();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to pair display');
    }
  }

  return (
    <div className="modalBackdrop">
      <div className="modalContent">
        <div className="modalHeader">
          <div>
            <p className="labelSmall">Administrator Side</p>
            <h2>Pair a Display</h2>
          </div>
          <button type="button" className="modalClose" onClick={handleCancel}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <p className="errorText">{error}</p>}

          <div className="modalField">
            <label className="labelSmall" htmlFor="pairCode">Pairing Code</label>
            <input
              id="pairCode"
              className="pairing-code-input"
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder="ABCD-1234"
              required
            />
          </div>

          <div className="modalField">
            <label className="labelSmall" htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Library Display Screen"
              required
            />
          </div>

          <div className="modalField">
            <label className="labelSmall" htmlFor="displayLocation">Location</label>
            <input
              id="displayLocation"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. 1st Floor Lobby"
              required
            />
          </div>

          <div className="modalActions">
            <button type="button" className="btn btnOutline" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btnDark">
              Connect / Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
