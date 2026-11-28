import React from 'react';
import { List, LayoutGrid } from 'lucide-react';

export default function LayoutToggle({ value, onChange }) {
  return (
    <div className="layout-toggle" aria-label="Choose list layout">
      <button
        type="button"
        className={value === 'table' ? 'active' : ''}
        aria-pressed={value === 'table'}
        onClick={() => onChange('table')}
      >
        <List size={13} style={{ marginRight: 4 }} />
        Table
      </button>
      <button
        type="button"
        className={value === 'cards' ? 'active' : ''}
        aria-pressed={value === 'cards'}
        onClick={() => onChange('cards')}
      >
        <LayoutGrid size={13} style={{ marginRight: 4 }} />
        Cards
      </button>
    </div>
  );
}
