import React, { useState } from 'react';

/**
 * Modal for entering the 8-character pairing code shown on /display
 * and naming the campus location
 */
export default function PairingModal({ isOpen, onClose, onPairSuccess }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3 className="card-title" style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
          Pair New Display
        </h3>
        {/* TODO: Code input (e.g. 7K4P-92QM), Name input, Location input */}
      </div>
    </div>
  );
}
