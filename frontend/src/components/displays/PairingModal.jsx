import React, { useState } from 'react';

export default function PairingModal({ isOpen, onClose, onPairSuccess }) {
  const [code, setCode] = useState('');
  if (!isOpen) return null;

  return (
    <div className="modalBackdrop">
      <div className="modalContent">
        <h2>Pair a Display</h2>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABCD-1234" />
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
