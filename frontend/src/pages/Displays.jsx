import React, { useState } from 'react';
import { MOCK_DISPLAYS } from '../mocks/mockData.js';
import DisplayCard from '../components/displays/DisplayCard.jsx';
import PairingModal from '../components/displays/PairingModal.jsx';

export default function Displays() {
  const [displays, setDisplays] = useState(MOCK_DISPLAYS);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);

  const filteredDisplays = displays.filter((disp) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      disp.name?.toLowerCase().includes(query) ||
      disp.location?.toLowerCase().includes(query);

    const matchesFilter =
      filter === 'all' ||
      (filter === 'registered' && disp.is_paired) ||
      (filter === 'unregistered' && !disp.is_paired);

    return matchesSearch && matchesFilter;
  });

  const handlePairSuccess = async ({ code, name, location }) => {
    const newDisplay = {
      id: `disp-00${displays.length + 1}`,
      name,
      location,
      is_paired: true,
      paired_at: new Date().toISOString(),
      pairing_code: code,
    };
    setDisplays([newDisplay, ...displays]);
  };

  const handleUnregister = (id) => {
    if (window.confirm('Unpair this display screen?')) {
      setDisplays(
        displays.map((d) => (d.id === id ? { ...d, is_paired: false } : d))
      );
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Display Management</h1>
        <button className="btn btn-primary" onClick={() => setIsPairModalOpen(true)}>
          + Pair New Display
        </button>
      </div>

      <div className="searchInput">
        <input
          type="text"
          placeholder="Search displays..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="filter-container">
          <select
            className="display-filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">ALL</option>
            <option value="registered">REGISTERED</option>
            <option value="unregistered">UNREGISTERED</option>
          </select>
        </div>
      </div>

      <div className="displays-section">
        {filteredDisplays.length === 0 ? (
          <p className="empty-text">No displays found.</p>
        ) : (
          <div className="displays-grid">
            {filteredDisplays.map((display) => (
              <DisplayCard
                key={display.id}
                display={display}
                onUnregister={handleUnregister}
              />
            ))}
          </div>
        )}
      </div>

      <PairingModal
        isOpen={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
        onPairSuccess={handlePairSuccess}
      />
    </div>
  );
}
