import React, { useState } from 'react';

export default function PairingModal({ isOpen, onClose, onPairSuccess }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  if (!isOpen) return null;

  return (
    <div className="modalBackdrop">
      <div className="modalContent">
        <h2>Pair a Display</h2>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABCD-1234" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display Name" />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
