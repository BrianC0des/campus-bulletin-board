import React, { useState, useEffect, useId, useRef, useMemo } from 'react';
import CustomSelect from '../common/CustomSelect.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useColleges } from '../../utils/colleges.js';
import api from '../../services/api.js';

export default function PairingModal({ onClose, onPaired }) {
  const titleId = useId();
  const { user } = useAuth();
  const { getOptions: getCollegeOptions } = useColleges();

  const isLeadAdmin = user?.role === 'lead_admin';
  const assignedColleges = useMemo(() => {
    if (isLeadAdmin) return [];
    const raw = Array.isArray(user?.allowed_colleges) && user.allowed_colleges.length > 0
      ? user.allowed_colleges
      : (user?.college ? [user.college] : []);
    return raw.filter((c) => c && !['ALL', 'CAMPUS-WIDE'].includes(String(c).trim().toUpperCase()));
  }, [isLeadAdmin, user]);

  const hasCampusWideScope = useMemo(
    () =>
      isLeadAdmin ||
      (Array.isArray(user?.allowed_colleges) &&
        user.allowed_colleges.some((c) =>
          ['ALL', 'CAMPUS-WIDE'].includes(String(c || '').trim().toUpperCase())
        )),
    [isLeadAdmin, user]
  );

  const departmentOptions = useMemo(() => {
    if (isLeadAdmin) {
      return getCollegeOptions({ includeCampusWide: true, includeCustom: true });
    }
    const allOpts = getCollegeOptions({
      includeCampusWide: hasCampusWideScope,
      includeCustom: false,
      extraValues: assignedColleges,
    });
    const allowedSet = new Set(assignedColleges.map((c) => String(c).trim().toUpperCase()));
    return allOpts.filter(
      (opt) =>
        (hasCampusWideScope && opt.value === 'Campus-Wide') ||
        allowedSet.has(String(opt.value).trim().toUpperCase())
    );
  }, [isLeadAdmin, hasCampusWideScope, assignedColleges, getCollegeOptions]);

  const isDepartmentLocked = !isLeadAdmin && departmentOptions.length <= 1;

  const [pairingCode, setPairingCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [department, setDepartment] = useState(() => departmentOptions[0]?.value || 'Campus-Wide');
  const [customDepartment, setCustomDepartment] = useState('');
  const [paired, setPaired] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    dialogRef.current?.querySelector('input')?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Let an open CustomSelect handle its own Escape first.
        if (e.target instanceof Element && e.target.closest('.custom-select-menu')) return;
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!dialogRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  const connectDisplay = async (e) => {
    e.preventDefault();
    if (isDepartmentLocked && departmentOptions.length === 0) {
      setError('No college scope assigned — contact a Lead Admin.');
      return;
    }
    if (department === 'Custom' && !customDepartment.trim()) {
      setError('Please enter a custom college or department name.');
      return;
    }
    const resolvedDepartment =
      department === 'Custom' ? customDepartment.trim() : department;

    if (!pairingCode.trim() || !name.trim() || !location.trim()) {
      setError('Please enter pairing code, display name, and location.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await api.post('/pairing/pair', {
        code: pairingCode.trim().toUpperCase(),
        name: name.trim(),
        location: location.trim(),
        department: resolvedDepartment,
      });
      setPaired(true);
      setTimeout(() => {
        onPaired({
          name: name.trim(),
          location: location.trim(),
          department: resolvedDepartment,
          pairing_code: pairingCode.trim().toUpperCase(),
        });
      }, 900);
    } catch (err) {
      setError(err.message || 'Pairing code not found or expired. Check the display and try again.');
      setPaired(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-wash" onClick={onClose}>
      <form
        ref={dialogRef}
        className="sketch-box registration-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onSubmit={connectDisplay}
      >
        <div className="modal-head">
          <div>
            <div className="eyebrow">
              ADMINISTRATOR SIDE
              {isDepartmentLocked && departmentOptions.length === 1 ? ` • ${departmentOptions[0].label}` : ''}
            </div>
            <h2 id={titleId}>Pair a Display</h2>
          </div>
          <button type="button" className="text-action" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="registration-fields">
          <label>
            PAIRING CODE
            <input
              className="field"
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value)}
              placeholder="7K4P-92QM"
            />
          </label>
          <label>
            DISPLAY NAME
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Library Bulletin Board"
            />
          </label>
          <label>
            LOCATION
            <input
              className="field"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Library"
            />
          </label>
          {isDepartmentLocked && departmentOptions.length === 0 && (
            <div className="pairing-error" role="alert">
              No college scope assigned — contact a Lead Admin before pairing a display.
            </div>
          )}
          {!isDepartmentLocked && (
            <label>
              COLLEGE / DEPARTMENT
              <CustomSelect
                className="field"
                value={department}
                onChange={setDepartment}
                ariaLabel="Select college or department"
                options={departmentOptions}
              />
            </label>
          )}
          {!isDepartmentLocked && department === 'Custom' && (
            <label>
              CUSTOM COLLEGE / DEPARTMENT
              <input
                className="field"
                value={customDepartment}
                onChange={(e) => setCustomDepartment(e.target.value)}
                placeholder="e.g. CAIS, Architecture, Science"
              />
            </label>
          )}
        </div>

        {error && (
          <div className="pairing-error" role="alert">
            {error}
          </div>
        )}

        {paired && (
          <div className="pairing-success" role="status">
            <strong>
              <svg className="button-icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="m4 10.5 3.5 3.5L16 5.5" />
              </svg>
              DISPLAY CONNECTED
            </strong>
            <span>{name}</span>
            <span>{location}</span>
            <span>{department === 'Custom' ? customDepartment : department}</span>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="wire-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="wire-button dark" disabled={submitting || paired}>
            {submitting ? 'Connecting...' : paired ? 'Connected' : 'Connect display'}
          </button>
        </div>
      </form>
    </div>
  );
}
