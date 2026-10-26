import React, { useState, useEffect } from 'react';
import DisplayCard from '../components/displays/DisplayCard.jsx';
import PairingModal from '../components/displays/PairingModal.jsx';
import api from '../services/api.js';

export default function Displays() {
  const [displays, setDisplays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);

  const fetchDisplays = async () => {
    try {
      setLoading(true);
      const res = await api.get('/displays');
      setDisplays(res?.displays || []);
    } catch (err) {
      console.error('Failed to load displays:', err);
      setDisplays([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisplays();
  }, []);

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
    try {
      await api.post('/pairing/pair', { code, name, location });
      await fetchDisplays();
    } catch (err) {
      alert(err.message || 'Failed to pair display');
    }
  };

  const handleUnregister = async (id) => {
    if (!window.confirm('Unpair this display screen?')) return;
    try {
      await api.post(`/displays/${id}/unregister`);
      await fetchDisplays();
    } catch (err) {
      alert(err.message || 'Failed to unpair display');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Displays</h1>
          <p className="page-sub">Campus TV Screens & Digital Signage Fleet</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsPairModalOpen(true)}>
          + Pair New Display
        </button>
      </div>

      <div className="filter-row">
        <input
          type="text"
          className="search-input"
          placeholder="Search displays by name or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className={`btn btn-secondary ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`btn btn-secondary ${filter === 'registered' ? 'active' : ''}`}
          onClick={() => setFilter('registered')}
        >
          Paired
        </button>
        <button
          className={`btn btn-secondary ${filter === 'unregistered' ? 'active' : ''}`}
          onClick={() => setFilter('unregistered')}
        >
          Unpaired
        </button>
      </div>

      <div className="displays-section">
        {loading ? (
          <p className="empty-text">Loading campus screens...</p>
        ) : filteredDisplays.length === 0 ? (
          <p className="empty-text">No display screens registered.</p>
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
