import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Monitor, Unplug, PlusCircle, Megaphone, Tv } from 'lucide-react';
import PairingModal from '../components/displays/PairingModal.jsx';
import CustomSelect from '../components/common/CustomSelect.jsx';
import Pagination from '../components/common/Pagination.jsx';
import ConfirmModal from '../components/common/ConfirmModal.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { MOCK_DISPLAYS } from '../mocks/mockData.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useColleges } from '../utils/colleges.js';
import api from '../services/api.js';

export default function Displays() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLeadAdmin = user?.role === 'lead_admin';
  const hasCampusWideScope = useMemo(
    () =>
      isLeadAdmin ||
      (Array.isArray(user?.allowed_colleges) &&
        user.allowed_colleges.some((c) =>
          ['ALL', 'CAMPUS-WIDE'].includes(String(c || '').trim().toUpperCase())
        )),
    [isLeadAdmin, user]
  );
  const [displays, setDisplays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiOffline, setApiOffline] = useState(false);
  const [actionError, setActionError] = useState('');
  const [displaySearch, setDisplaySearch] = useState('');
  const [registrationFilter, setRegistrationFilter] = useState('All');
  const [collegeFilter, setCollegeFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [displayPage, setDisplayPage] = useState(1);
  const { getOptions: getCollegeOptions, formatLabel } = useColleges();
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [removeDisplayTarget, setRemoveDisplayTarget] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  const fetchDisplays = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.get('/displays');
      if (data?.displays) {
        setDisplays(data.displays);
        setApiOffline(false);
      } else {
        setDisplays(MOCK_DISPLAYS);
        setApiOffline(true);
      }
    } catch {
      setDisplays(MOCK_DISPLAYS);
      setApiOffline(true);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisplays();
    const timer = setInterval(() => fetchDisplays({ silent: true }), 10000);
    return () => clearInterval(timer);
  }, []);

  const collegeOptions = useMemo(
    () =>
      getCollegeOptions({
        includeAllFilter: true,
        includeCampusWide: true,
        extraValues: displays.map((d) => d.department || d.college),
      }).map((opt) =>
        opt.value === 'All'
          ? { ...opt, label: 'All Colleges & Departments', shortLabel: 'All Colleges & Departments' }
          : opt
      ),
    [displays, getCollegeOptions]
  );

  const confirmRemoveDisplay = async () => {
    if (!removeDisplayTarget) return;
    const target = removeDisplayTarget;
    try {
      setActionError('');
      await api.delete(`/displays/${target.id}`);
      setDisplays((items) =>
        items.map((item) =>
          item.id === target.id ? { ...item, is_paired: false } : item
        )
      );
      setRemoveDisplayTarget(null);
      setAlertModal({
        title: 'Display removed',
        description: `${target.name} has been unregistered from the network.`,
      });
    } catch (err) {
      setRemoveDisplayTarget(null);
      setActionError(err.message || `Failed to remove ${target.name}.`);
    }
  };

  const locationOptions = useMemo(() => {
    const seen = new Map();
    for (const d of displays) {
      const loc = String(d.location || '').trim();
      if (!loc) continue;
      const key = loc.toLowerCase();
      if (!seen.has(key)) seen.set(key, loc);
    }
    return [
      { value: 'All', label: 'All locations', shortLabel: 'All locations' },
      ...[...seen.values()]
        .sort((a, b) => a.localeCompare(b))
        .map((loc) => ({ value: loc, label: loc })),
    ];
  }, [displays]);

  const visibleDisplays = displays.filter((display) => {
    const dept = display.department || display.college || 'Campus-Wide';
    const matchesSearch = `${display.name || ''} ${display.location || ''} ${dept}`
      .toLowerCase()
      .includes(displaySearch.toLowerCase());
    const status = !display.is_paired
      ? 'Pending Pairing'
      : display.is_online
        ? 'Online'
        : 'Offline';
    const matchesStatus = registrationFilter === 'All' || status === registrationFilter;
    const matchesCollege =
      collegeFilter === 'All' || dept.toLowerCase() === collegeFilter.toLowerCase();
    const matchesLocation =
      locationFilter === 'All' ||
      String(display.location || '').trim().toLowerCase() === locationFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesCollege && matchesLocation;
  });

  const hasActiveFilters =
    displaySearch.trim() !== '' ||
    registrationFilter !== 'All' ||
    collegeFilter !== 'All' ||
    locationFilter !== 'All';

  const clearFilters = () => {
    setDisplaySearch('');
    setRegistrationFilter('All');
    setCollegeFilter('All');
    setLocationFilter('All');
    setDisplayPage(1);
  };

  const displayPageSize = 5;
  const safeDisplayPage = Math.min(
    displayPage,
    Math.max(1, Math.ceil(visibleDisplays.length / displayPageSize))
  );
  const pagedDisplays = visibleDisplays.slice(
    (safeDisplayPage - 1) * displayPageSize,
    safeDisplayPage * displayPageSize
  );

  return (
    <div>
      {apiOffline && (
        <div className="offline-banner" role="status">
          <AlertCircle size={15} />
          <span>Backend unreachable — showing cached display list.</span>
        </div>
      )}

      {actionError && (
        <div className="pairing-error" role="alert" style={{ marginBottom: '12px' }}>
          {actionError}
        </div>
      )}

      <div className="page-heading">
        <div>
          <div className="eyebrow">CONTROL ROOM / DISPLAYS</div>
          <h2>Display Management</h2>
        </div>
        <button
          type="button"
          className="wire-button dark"
          onClick={() => setShowPairingModal(true)}
        >
          Register display <span>+</span>
        </button>
      </div>

      <div className="sketch-box toolbar">
        <input
          className="toolbar-search"
          aria-label="Search displays by name, location, or department"
          value={displaySearch}
          onChange={(e) => {
            setDisplaySearch(e.target.value);
            setDisplayPage(1);
          }}
          placeholder="Search name, location, or department"
        />
        {isLeadAdmin && (
          <CustomSelect
            className="toolbar-filter"
            value={collegeFilter}
            onChange={(val) => {
              setCollegeFilter(val);
              setDisplayPage(1);
            }}
            ariaLabel="Filter by college department"
            options={collegeOptions}
          />
        )}
        <CustomSelect
          className="toolbar-filter"
          value={locationFilter}
          onChange={(val) => {
            setLocationFilter(val);
            setDisplayPage(1);
          }}
          ariaLabel="Filter by location"
          options={locationOptions}
        />
        <CustomSelect
          className="toolbar-filter"
          value={registrationFilter}
          onChange={(val) => {
            setRegistrationFilter(val);
            setDisplayPage(1);
          }}
          ariaLabel="Filter by connection status"
          options={[
            { value: 'All', label: 'All statuses' },
            { value: 'Online', label: 'Online' },
            { value: 'Offline', label: 'Offline' },
            { value: 'Pending Pairing', label: 'Pending Pairing' },
          ]}
        />
      </div>

      <div className="list-view-toolbar display-view-toolbar">
        <span>{visibleDisplays.length} registered and pending displays</span>
      </div>

      <div className="sketch-box display-table table-layout">
        <div className="display-list-head table-head">
          <span>DISPLAY NAME</span>
          <span>LOCATION</span>
          <span>STATUS &amp; CONNECTION</span>
          <span>ACTIONS</span>
        </div>

        {loading ? (
          <div className="empty-row">Loading displays...</div>
        ) : pagedDisplays.length === 0 ? (
          <EmptyState
            icon={<Monitor size={26} />}
            title={hasActiveFilters ? 'No displays match your filters' : 'No campus displays registered'}
            description={
              hasActiveFilters
                ? 'Try clearing your search or college/status filters.'
                : 'Open /live on a campus TV or monitor and register it with its pairing code.'
            }
            actionLabel={hasActiveFilters ? 'Clear filters' : 'Register display +'}
            onAction={hasActiveFilters ? clearFilters : () => setShowPairingModal(true)}
          />
        ) : (
          pagedDisplays.map((display) => {
            const dept = display.department || display.college || 'Campus-Wide';
            const isCampusWideDisplay = ['ALL', 'CAMPUS-WIDE'].includes(String(dept).trim().toUpperCase());
            const isReadOnly = isCampusWideDisplay && !hasCampusWideScope;
            const isOnline = Boolean(display.is_paired && display.is_online);
            const lastSeenText = display.last_seen_at
              ? `Last seen ${new Date(display.last_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Auto-reconnects when powered on';
            return (
              <div className="display-row" key={display.id || display.name}>
                <div className="monitor-shape">
                  <span />
                </div>
                <div>
                  <strong>{display.name}</strong>
                  <small className="role-college">{formatLabel(dept)}</small>
                </div>
                <span>{display.location}</span>
                <span className="display-status">
                  {!display.is_paired ? (
                    <span className="fleet-badge offline">Pending Pairing</span>
                  ) : isOnline ? (
                    <>
                      <span className="fleet-badge online">● Online</span>
                      <small>Broadcasting live</small>
                    </>
                  ) : (
                    <>
                      <span className="fleet-badge standby">○ Offline</span>
                      <small title={lastSeenText}>{lastSeenText}</small>
                    </>
                  )}
                </span>

                <span className="row-actions" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {display.id != null && (
                    <>
                      {!isReadOnly && (
                        <button
                          type="button"
                          className="icon-action-btn"
                          title="Create announcement for this display"
                          aria-label={`Create announcement for ${display.name}`}
                          onClick={() =>
                            navigate(`/announcements?newForDisplay=${encodeURIComponent(display.id)}`)
                          }
                        >
                          <Megaphone size={15} />
                          <span className="btn-label">Announce</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="icon-action-btn"
                        title="Open live screen preview"
                        aria-label={`Open live screen preview for ${display.name}`}
                        onClick={() =>
                          window.open(
                            `/live?display_id=${encodeURIComponent(display.id)}`,
                            '_blank',
                            'noopener'
                          )
                        }
                      >
                        <Tv size={15} />
                        <span className="btn-label">Preview</span>
                      </button>
                    </>
                  )}
                  {isReadOnly ? (
                    <span
                      className="fleet-badge standby"
                      title="Only Lead Admins or Campus-Wide admins can modify Campus-Wide displays"
                    >
                      Read-only
                    </span>
                  ) : display.is_paired ? (
                    <button
                      type="button"
                      className="icon-action-btn danger"
                      title="Remove display"
                      aria-label={`Remove display ${display.name}`}
                      onClick={() => setRemoveDisplayTarget(display)}
                    >
                      <Unplug size={15} />
                      <span className="btn-label">Remove</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="icon-action-btn"
                      title="Register display"
                      aria-label={`Register display ${display.name}`}
                      onClick={() => setShowPairingModal(true)}
                    >
                      <PlusCircle size={15} />
                      <span className="btn-label">Register</span>
                    </button>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>

      <Pagination
        currentPage={safeDisplayPage}
        totalItems={visibleDisplays.length}
        pageSize={displayPageSize}
        onPageChange={setDisplayPage}
      />

      {showPairingModal && (
        <PairingModal
          onClose={() => setShowPairingModal(false)}
          onPaired={() => {
            setShowPairingModal(false);
            fetchDisplays({ silent: true });
          }}
        />
      )}

      <ConfirmModal
        open={Boolean(removeDisplayTarget)}
        title="Remove display registration?"
        description={`${removeDisplayTarget?.name || ''} will stop receiving announcements until it is paired again.`}
        confirmLabel="Remove display"
        danger
        onCancel={() => setRemoveDisplayTarget(null)}
        onConfirm={confirmRemoveDisplay}
      />

      <ConfirmModal
        open={Boolean(alertModal)}
        eyebrow="STATUS"
        title={alertModal?.title || ''}
        description={alertModal?.description || ''}
        confirmLabel="OK"
        isAlert
        onConfirm={() => setAlertModal(null)}
      />
    </div>
  );
}
