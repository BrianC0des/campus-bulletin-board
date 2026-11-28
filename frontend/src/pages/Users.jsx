import React, { useState, useEffect, useMemo, useId } from 'react';
import { AlertCircle, Users as UsersIcon, Upload, UserX, UserCheck, Building2, Check, X, Shield, Plus, Trash2 } from 'lucide-react';
import CustomSelect from '../components/common/CustomSelect.jsx';
import Pagination from '../components/common/Pagination.jsx';
import ConfirmModal from '../components/common/ConfirmModal.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useColleges } from '../utils/colleges.js';
import api from '../services/api.js';

const DISABLE_REASONS = [
  'Term ended / Rotation complete',
  'Transferred to another college or department',
  'On leave / Temporary suspension',
  'Security / Policy concern',
  'Other',
];

const DEFAULT_USERS = [
  { id: 1, full_name: 'Admin User 1', email: 'admin1@campus.edu', role: 'lead_admin', department: 'Campus-Wide', is_active: true },
  { id: 2, full_name: 'Admin User 2', email: 'admin2@campus.edu', role: 'college_admin', department: 'CCS', is_active: true },
  { id: 3, full_name: 'Admin User 3', email: 'admin3@campus.edu', role: 'college_admin', department: 'COE', is_active: false },
];

const IMPORT_HEADERS = ['full_name', 'email', 'password', 'role', 'college', 'department', 'position'];

function parseCsvText(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      pushField();
    } else if (char === '\n') {
      pushRow();
    } else if (char === '\r') {
      // ignore; paired \n (if present) closes the row
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Users() {
  const addUserTitleId = useId();
  const importTitleId = useId();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiOffline, setApiOffline] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newMiddleName, setNewMiddleName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('admin');
  const [newCollege, setNewCollege] = useState('');
  const [userError, setUserError] = useState('');
  const [submittingUser, setSubmittingUser] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [collegeFilter, setCollegeFilter] = useState('All');
  const [userPage, setUserPage] = useState(1);
  const { colleges, addCollege, removeCollege, getOptions: getCollegeOptions, formatLabel } = useColleges();
  const [activeTab, setActiveTab] = useState('users');
  const [newColCode, setNewColCode] = useState('');
  const [newColName, setNewColName] = useState('');
  const [newColCategory, setNewColCategory] = useState('Academic Colleges');
  const [colError, setColError] = useState('');
  const [savingCol, setSavingCol] = useState(false);

  const [editScopeTarget, setEditScopeTarget] = useState(null);
  const [editScopeCollege, setEditScopeCollege] = useState('');
  const [scopeError, setScopeError] = useState('');
  const [savingScopes, setSavingScopes] = useState(false);

  const [accountStatusTarget, setAccountStatusTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [removeCollegeTarget, setRemoveCollegeTarget] = useState(null);
  const [disableReasonOption, setDisableReasonOption] = useState(DISABLE_REASONS[0]);
  const [disableReasonCustom, setDisableReasonCustom] = useState('');
  const [alertModal, setAlertModal] = useState(null);
  const [showImportCsv, setShowImportCsv] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importRows, setImportRows] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importError, setImportError] = useState('');
  const [submittingImport, setSubmittingImport] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.get('/users');
      if (data?.users) {
        setUsers(data.users);
        setApiOffline(false);
      } else {
        setUsers(DEFAULT_USERS);
        setApiOffline(true);
      }
    } catch {
      setUsers(DEFAULT_USERS);
      setApiOffline(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!showAddUser) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowAddUser(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showAddUser]);

  useEffect(() => {
    if (!showImportCsv) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowImportCsv(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showImportCsv]);

  const collegeOptions = useMemo(
    () =>
      getCollegeOptions({
        includeAllFilter: true,
        includeCampusWide: true,
        extraValues: users.map((u) => u.college || u.department),
      }).map((opt) =>
        opt.value === 'All'
          ? { ...opt, label: 'All Colleges & Departments', shortLabel: 'All Colleges & Departments' }
          : opt
      ),
    [users, getCollegeOptions]
  );

  const adminCollegeOptions = useMemo(
    () => [
      { value: '', label: 'Select college / department', shortLabel: 'Select college / department' },
      ...getCollegeOptions({
        includeAllFilter: false,
        includeCampusWide: false,
      }),
    ],
    [getCollegeOptions]
  );

  const getNormalizedStatus = (u) => String(u?.status || '').toLowerCase();
  const isUserPending = (u) => getNormalizedStatus(u) === 'pending';
  const isUserActive = (u) =>
    !isUserPending(u) && u?.is_active !== false && getNormalizedStatus(u) !== 'disabled';

  const getSingleAdminCollege = (u) => {
    const raw =
      (Array.isArray(u?.allowed_colleges) && u.allowed_colleges[0]) ||
      u?.college ||
      u?.requested_college ||
      u?.department ||
      '';
    const trimmed = String(raw || '').trim();
    const upper = trimmed.toUpperCase();
    if (!trimmed || upper === 'ALL' || upper === 'CAMPUS-WIDE' || upper === 'UNASSIGNED') {
      return '';
    }
    return trimmed;
  };

  const visibleUsers = users.filter((u) => {
    const name = u.full_name || u.name || '';
    const matchesSearch = `${name} ${u.email || ''}`.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole =
      roleFilter === 'All' ||
      u.role === roleFilter ||
      (roleFilter === 'admin' && u.role === 'college_admin');
    const isPending = isUserPending(u);
    const isActive = isUserActive(u);
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && isActive) ||
      (statusFilter === 'Pending' && isPending) ||
      (statusFilter === 'Disabled' && !isActive && !isPending);
    const userColleges = Array.isArray(u.allowed_colleges) && u.allowed_colleges.length > 0
      ? u.allowed_colleges
      : [u.college || u.department || (u.role === 'lead_admin' ? 'Campus-Wide' : 'CCS')];
    const normalizedUserColleges = userColleges.map((c) =>
      c === 'ALL' || c === 'Campus-Wide' ? 'Campus-Wide' : String(c).toUpperCase()
    );
    const matchesCollege =
      collegeFilter === 'All' ||
      (collegeFilter === 'Campus-Wide'
        ? u.role === 'lead_admin' || normalizedUserColleges.includes('Campus-Wide')
        : normalizedUserColleges.includes(String(collegeFilter).toUpperCase()));
    return matchesSearch && matchesRole && matchesStatus && matchesCollege;
  });

  const hasActiveFilters =
    userSearch.trim() !== '' ||
    roleFilter !== 'All' ||
    statusFilter !== 'All' ||
    collegeFilter !== 'All';

  const clearFilters = () => {
    setUserSearch('');
    setRoleFilter('All');
    setStatusFilter('All');
    setCollegeFilter('All');
    setUserPage(1);
  };

  const userPageSize = 5;
  const safeUserPage = Math.min(
    userPage,
    Math.max(1, Math.ceil(visibleUsers.length / userPageSize))
  );
  const pagedUsers = visibleUsers.slice(
    (safeUserPage - 1) * userPageSize,
    safeUserPage * userPageSize
  );

  const activeCount = users.filter(isUserActive).length;
  const pendingCount = users.filter(isUserPending).length;
  const activeLeadAdminCount = users.filter(
    (u) => u.role === 'lead_admin' && isUserActive(u)
  ).length;

  const handleApprovePending = async (u) => {
    const isLead = u.role === 'lead_admin';
    const assignedCollege = getSingleAdminCollege(u);
    if (!isLead && !assignedCollege) {
      setScopeError('');
      setEditScopeCollege('');
      setEditScopeTarget({ ...u, _approveOnSave: true });
      return;
    }
    try {
      setActionError('');
      if (!isLead && assignedCollege) {
        await api.patch(`/users/${u.id}/scopes`, { allowed_colleges: [assignedCollege] });
      }
      await api.patch(`/users/${u.id}/status`, { status: 'active' });
      await fetchUsers();
      setAlertModal({ title: 'Administrator approved', description: `${u.full_name || u.email} can now sign in.` });
    } catch (err) {
      setActionError(err.message || 'Could not approve administrator.');
    }
  };

  const handleRejectPending = async (u) => {
    if (!u) return;
    try {
      setActionError('');
      await api.delete(`/users/${u.id}`);
      setRejectTarget(null);
      await fetchUsers();
    } catch (err) {
      setRejectTarget(null);
      setActionError(err.message || 'Could not reject request.');
    }
  };

  const handleConfirmRemoveCollege = async () => {
    if (!removeCollegeTarget) return;
    try {
      setColError('');
      await removeCollege(removeCollegeTarget.id || removeCollegeTarget.code);
      setRemoveCollegeTarget(null);
    } catch (err) {
      setRemoveCollegeTarget(null);
      setColError(err.message || 'Could not remove college.');
    }
  };

  const handleSaveScopes = async () => {
    if (!editScopeTarget) return;
    if (!editScopeCollege) {
      setScopeError('Please select a college or department.');
      return;
    }
    try {
      setSavingScopes(true);
      setScopeError('');
      await api.patch(`/users/${editScopeTarget.id}/scopes`, { allowed_colleges: [editScopeCollege] });
      if (editScopeTarget._approveOnSave) {
        await api.patch(`/users/${editScopeTarget.id}/status`, { status: 'active' });
        setAlertModal({
          title: 'Administrator approved',
          description: `${editScopeTarget.full_name || editScopeTarget.email} has been assigned to ${editScopeCollege} and can now sign in.`,
        });
      }
      await fetchUsers();
      setEditScopeTarget(null);
    } catch (err) {
      setScopeError(err.message || 'Could not update college assignment.');
    } finally {
      setSavingScopes(false);
    }
  };

  const handleAddCollege = async (e) => {
    e.preventDefault();
    if (!newColCode.trim() || !newColName.trim()) {
      setColError('Short code and full name are required.');
      return;
    }
    try {
      setSavingCol(true);
      setColError('');
      await addCollege({ code: newColCode, name: newColName, category: newColCategory });
      setNewColCode('');
      setNewColName('');
    } catch (err) {
      setColError(err.message || 'Could not add college.');
    } finally {
      setSavingCol(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newFirstName.trim() || !newLastName.trim() || !newEmail.trim()) {
      setUserError('First name, last name, and email are required.');
      return;
    }
    if (newPassword.trim().length < 6) {
      setUserError('Temporary password must be at least 6 characters.');
      return;
    }
    if (newRole !== 'lead_admin' && !newCollege) {
      setUserError('Please select a college or department for this College Admin.');
      return;
    }

    const fullName = [newFirstName, newMiddleName, newLastName]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' ');

    try {
      setSubmittingUser(true);
      setUserError('');
      await api.post('/users', {
        full_name: fullName,
        email: newEmail.trim(),
        password: newPassword.trim(),
        role: newRole,
        college: newRole === 'lead_admin' ? 'ALL' : newCollege,
        allowed_colleges: newRole === 'lead_admin' ? [] : [newCollege],
        department: newRole === 'lead_admin' ? 'Campus-Wide' : newCollege,
      });
      await fetchUsers();
      setNewFirstName('');
      setNewMiddleName('');
      setNewLastName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('admin');
      setNewCollege('');
      setShowAddUser(false);
      setAlertModal({
        title: 'Administrator created',
        description: `${fullName} has been added to the control room directory.`,
      });
    } catch (err) {
      setUserError(err.message || 'Failed to create administrator account.');
    } finally {
      setSubmittingUser(false);
    }
  };

  const confirmToggleStatus = async () => {
    if (!accountStatusTarget) return;
    const target = accountStatusTarget;
    const isCurrentlyActive = isUserActive(target);
    if (isCurrentlyActive && target.role === 'lead_admin' && activeLeadAdminCount <= 1) {
      setAccountStatusTarget(null);
      setActionError('Cannot disable the last active Lead Campus Admin.');
      return;
    }
    const resolvedReason = isCurrentlyActive
      ? (disableReasonOption === 'Other'
          ? disableReasonCustom.trim() || 'Other'
          : disableReasonCustom.trim()
            ? `${disableReasonOption} — ${disableReasonCustom.trim()}`
            : disableReasonOption)
      : null;

    try {
      setActionError('');
      await api.patch(`/users/${target.id}`, {
        is_active: !isCurrentlyActive,
        disabled_reason: resolvedReason,
      });
      setUsers((current) =>
        current.map((u) =>
          u.id === target.id
            ? {
                ...u,
                is_active: !isCurrentlyActive,
                status: !isCurrentlyActive ? 'active' : 'disabled',
                disabled_reason: resolvedReason,
              }
            : u
        )
      );
      setAccountStatusTarget(null);
      setDisableReasonOption(DISABLE_REASONS[0]);
      setDisableReasonCustom('');
    } catch (err) {
      setAccountStatusTarget(null);
      setActionError(err.message || `Failed to update status for ${target.full_name || target.email}.`);
    }
  };

  const handleExportCsv = () => {
    // #19: Blob-based download with full RFC-4180 quote escaping on every
    // field (not just name), instead of an encodeURI(data:) href.
    const headers = ['Name', 'Email', 'Role', 'College', 'Status'];
    const rows = users.map((u) => {
      const name = u.full_name || u.name || '';
      const role = u.role === 'lead_admin' ? 'Lead Campus Admin' : 'College Admin';
      const status = isUserPending(u) ? 'Pending' : (isUserActive(u) ? 'Active' : 'Disabled');
      const assignedList = Array.isArray(u.allowed_colleges) && u.allowed_colleges.length > 0
        ? u.allowed_colleges
        : (u.college ? [u.college] : (u.department ? [u.department] : []));
      const collegeLabel =
        u.role === 'lead_admin' || assignedList.some((c) => c === 'ALL' || c === 'Campus-Wide')
          ? 'Campus-Wide'
          : (assignedList.length > 0 ? assignedList.join(', ') : 'Unassigned');
      return [name, u.email || '', role, collegeLabel, status].map(csvEscape);
    });
    const csvContent = [headers.map(csvEscape).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    downloadCsv('paskil-users.csv', csvContent);
  };

  const downloadImportTemplate = () => {
    const sampleRow = [
      'Juan Dela Cruz',
      'juan.delacruz@wmsu.edu.ph',
      'TempPass123',
      'college_admin',
      'CCS',
      'CCS',
      'Program Admin',
    ].map(csvEscape);
    const csvContent = [IMPORT_HEADERS.join(','), sampleRow.join(',')].join('\r\n');
    downloadCsv('paskil-users-import-template.csv', csvContent);
  };

  const handleImportFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportError('');
    setImportRows([]);
    setImportErrors([]);
    try {
      const text = await file.text();
      const rows = parseCsvText(text);
      if (rows.length === 0) {
        setImportError('The CSV file is empty.');
        return;
      }
      const headers = rows[0].map((h) => h.trim().toLowerCase());
      const dataRows = rows.slice(1);
      const parsed = [];
      const errors = [];
      dataRows.forEach((r, idx) => {
        const record = {};
        headers.forEach((h, colIdx) => {
          record[h] = (r[colIdx] ?? '').trim();
        });
        const lineNumber = idx + 2; // header is line 1, rows are 1-indexed after it
        if (!record.full_name) errors.push(`Row ${lineNumber}: full_name is required.`);
        if (!record.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
          errors.push(`Row ${lineNumber}: a valid email is required.`);
        }
        if (!record.password || record.password.length < 6) {
          errors.push(`Row ${lineNumber}: password must be at least 6 characters.`);
        }
        if (record.role && !['lead_admin', 'college_admin', 'admin'].includes(record.role)) {
          errors.push(`Row ${lineNumber}: role must be lead_admin, college_admin, or admin.`);
        }
        parsed.push(record);
      });
      setImportRows(parsed);
      setImportErrors(errors);
    } catch (err) {
      setImportError(err.message || 'Failed to read the CSV file.');
    }
  };

  const handleSubmitImport = async () => {
    if (importRows.length === 0) {
      setImportError('Choose a CSV file with at least one administrator row.');
      return;
    }
    if (importErrors.length > 0) {
      setImportError('Fix the validation errors before importing.');
      return;
    }
    try {
      setSubmittingImport(true);
      setImportError('');
      const result = await api.post('/users/import', { administrators: importRows });
      await fetchUsers();
      setShowImportCsv(false);
      setImportRows([]);
      setImportErrors([]);
      setImportFileName('');
      const createdCount = result?.created ?? result?.imported ?? importRows.length;
      const skippedCount = result?.skipped ?? 0;
      setAlertModal({
        title: 'Import complete',
        description: `${createdCount} administrator account(s) imported${skippedCount ? `, ${skippedCount} skipped (already registered)` : ''}.`,
      });
    } catch (err) {
      setImportError(err.message || 'Failed to import administrators.');
    } finally {
      setSubmittingImport(false);
    }
  };

  return (
    <div>
      {apiOffline && (
        <div className="offline-banner" role="status">
          <AlertCircle size={15} />
          <span>Backend unreachable — showing cached administrator directory.</span>
        </div>
      )}

      {actionError && (
        <div className="pairing-error" role="alert" style={{ marginBottom: '12px' }}>
          {actionError}
        </div>
      )}

      <div className="page-heading">
        <div>
          <div className="eyebrow">CONTROL ROOM / USERS &amp; COLLEGES</div>
          <h2>User &amp; College Management</h2>
        </div>
        {activeTab === 'users' && (
          <div className="page-actions">
            <button type="button" className="wire-button" onClick={handleExportCsv}>
              <svg className="button-icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 15.5h12" />
              </svg>
              Export Users CSV
            </button>
            <button
              type="button"
              className="wire-button"
              onClick={() => {
                setImportError('');
                setImportRows([]);
                setImportErrors([]);
                setImportFileName('');
                setShowImportCsv(true);
              }}
            >
              <svg className="button-icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 13V4m0 0-3.5 3.5M10 4l3.5 3.5M4 15.5h12" />
              </svg>
              Import CSV
            </button>
            <button
              type="button"
              className="wire-button dark"
              onClick={() => {
                setUserError('');
                setShowAddUser(true);
              }}
            >
              Add administrator <span>+</span>
            </button>
          </div>
        )}
      </div>

      <div className="users-tabs-bar" role="tablist" aria-label="User and college management sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'users'}
          className={`wizard-step-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <UsersIcon size={15} /> Administrators ({users.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'colleges'}
          className={`wizard-step-tab ${activeTab === 'colleges' ? 'active' : ''}`}
          onClick={() => setActiveTab('colleges')}
        >
          <Building2 size={15} /> Colleges &amp; Departments ({colleges.length})
        </button>
      </div>

      {activeTab === 'colleges' ? (
        <div className="sketch-box form-section" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 6px', fontFamily: 'Space Grotesk, sans-serif' }}>Campus Colleges &amp; Offices</h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)' }}>
            Configure the colleges, departments, and offices for your institution. Lead Campus Administrators manage this directory.
          </p>

          <form onSubmit={handleAddCollege} className="manage-college-form">
            <div className="manage-college-grid">
              <label>
                <span className="field-caption">SHORT CODE</span>
                <input
                  className="field"
                  value={newColCode}
                  onChange={(e) => setNewColCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CAIS"
                  maxLength={30}
                />
              </label>
              <label>
                <span className="field-caption">FULL NAME</span>
                <input
                  className="field"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="e.g. College of Asian & Islamic Studies"
                  maxLength={150}
                />
              </label>
              <label>
                <span className="field-caption">GROUP</span>
                <select className="field" value={newColCategory} onChange={(e) => setNewColCategory(e.target.value)}>
                  <option value="Academic Colleges">Academic Colleges</option>
                  <option value="Administrative Offices">Administrative Offices</option>
                  <option value="Campus Units">Campus Units</option>
                </select>
              </label>
            </div>
            {colError && <div className="pairing-error" role="alert" style={{ marginTop: 10 }}>{colError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button type="submit" className="wire-button dark" disabled={savingCol}>
                <Plus size={14} /> {savingCol ? 'Adding...' : 'Add College / Office'}
              </button>
            </div>
          </form>

          <div className="college-directory-list" style={{ maxHeight: 420 }}>
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
                    onClick={() => setRemoveCollegeTarget(c)}
                  >
                    <Trash2 size={14} />
                    <span className="btn-label">Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {pendingCount > 0 && (
            <div className="pending-banner" role="status">
              <span>
                <strong>{pendingCount} pending sign-up request{pendingCount === 1 ? '' : 's'}</strong> awaiting Lead Admin approval.
              </span>
              <button
                type="button"
                className="wire-button"
                onClick={() => {
                  setStatusFilter('Pending');
                  setUserPage(1);
                }}
              >
                Review Pending
              </button>
            </div>
          )}

      <div className="sketch-box user-count-card">
        <div>
          <span>Total users / administrators</span>
          <strong>{users.length}</strong>
        </div>
        <small>{activeCount} active accounts</small>
      </div>

      <div className="sketch-box toolbar">
        <input
          className="toolbar-search"
          aria-label="Search administrators by name or email"
          value={userSearch}
          onChange={(e) => {
            setUserSearch(e.target.value);
            setUserPage(1);
          }}
          placeholder="Search name or email"
        />
        <CustomSelect
          className="toolbar-filter"
          value={roleFilter}
          onChange={(val) => {
            setRoleFilter(val);
            setUserPage(1);
          }}
          ariaLabel="Filter by role"
          options={[
            { value: 'All', label: 'All roles' },
            { value: 'lead_admin', label: 'Lead Campus Admin' },
            { value: 'admin', label: 'College Admin' },
          ]}
        />
        <CustomSelect
          className="toolbar-filter"
          value={collegeFilter}
          onChange={(val) => {
            setCollegeFilter(val);
            setUserPage(1);
          }}
          ariaLabel="Filter by college"
          options={collegeOptions}
        />
        <CustomSelect
          className="toolbar-filter"
          value={statusFilter}
          onChange={(val) => {
            setStatusFilter(val);
            setUserPage(1);
          }}
          ariaLabel="Filter by account status"
          options={[
            { value: 'All', label: 'All statuses' },
            { value: 'Active', label: 'Active' },
            { value: 'Pending', label: 'Pending Approval' },
            { value: 'Disabled', label: 'Disabled' },
          ]}
        />
      </div>

      <div className="list-view-toolbar user-view-toolbar">
        <span>Administrator directory ({visibleUsers.length})</span>
      </div>

      <div className="sketch-box user-table table-layout">
        <div className="user-head">
          <span>USER</span>
          <span>CONTACT</span>
          <span>ROLE</span>
          <span>STATUS</span>
          <span>ACTIONS</span>
        </div>

        {loading ? (
          <div className="empty-row">Loading administrators...</div>
        ) : pagedUsers.length === 0 ? (
          <EmptyState
            icon={<UsersIcon size={26} />}
            title={hasActiveFilters ? 'No administrators match your filters' : 'No administrators found'}
            description={
              hasActiveFilters
                ? 'Try clearing your search, role, college, or status filters.'
                : 'Add an administrator account or import multiple accounts from a CSV file.'
            }
            actionLabel={hasActiveFilters ? 'Clear filters' : 'Add administrator +'}
            onAction={
              hasActiveFilters
                ? clearFilters
                : () => {
                    setUserError('');
                    setShowAddUser(true);
                  }
            }
          />
        ) : (
          pagedUsers.map((u) => {
            const name = u.full_name || u.name || 'Admin';
            const initials = name
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            const isPending = isUserPending(u);
            const isActive = isUserActive(u);
            const isLastLeadAdmin = u.role === 'lead_admin' && isActive && activeLeadAdminCount <= 1;
            const roleLabel = u.role === 'lead_admin' ? 'Lead Campus Admin' : 'College Admin';
            const assignedCollege = getSingleAdminCollege(u);
            const requestedCollege = u.college || u.requested_college || (Array.isArray(u.allowed_colleges) && u.allowed_colleges[0]) || 'Unassigned';
            const pendingMeta = [u.department, u.position].filter(Boolean).join(' • ');

            return (
              <div className="user-row" key={u.id || u.email}>
                <div className="user-avatar">{initials}</div>
                <strong>{name}</strong>
                <span>{u.email}</span>
                <span>
                  {roleLabel}
                  {isPending ? (
                    <div className="pending-request-meta">
                      <span
                        className="orientation-badge college-scope-pill"
                        title={formatLabel(requestedCollege)}
                      >
                        Requested: {requestedCollege === 'ALL' ? 'Campus-Wide' : requestedCollege}
                      </span>
                      {pendingMeta && (
                        <small className="role-college" title={pendingMeta}>
                          {pendingMeta}
                        </small>
                      )}
                    </div>
                  ) : u.role === 'lead_admin' ? (
                    <small className="role-college">Campus-Wide</small>
                  ) : (
                    <span className="role-college-pills">
                      <span
                        className="orientation-badge college-scope-pill"
                        title={assignedCollege ? formatLabel(assignedCollege) : 'Unassigned'}
                      >
                        {assignedCollege ? assignedCollege.toUpperCase() : 'Unassigned'}
                      </span>
                    </span>
                  )}
                </span>
                <span>
                  <span className={`content-status ${isPending ? 'scheduled' : isActive ? 'active' : 'expired'}`}>
                    {isPending ? 'Pending' : isActive ? 'Active' : 'Disabled'}
                  </span>
                  {!isActive && !isPending && u.disabled_reason && (
                    <small className="disabled-reason-note" title={u.disabled_reason}>
                      {u.disabled_reason}
                    </small>
                  )}
                </span>
                <span className="row-actions">
                  {isPending ? (
                    <>
                      <button
                        type="button"
                        className="icon-action-btn fb-posted-btn"
                        title="Approve account"
                        onClick={() => handleApprovePending(u)}
                      >
                        <Check size={15} />
                        <span className="btn-label">Approve</span>
                      </button>
                      <button
                        type="button"
                        className="icon-action-btn danger"
                        title="Reject request"
                        onClick={() => setRejectTarget(u)}
                      >
                        <X size={15} />
                        <span className="btn-label">Reject</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {u.role !== 'lead_admin' && (
                        <button
                          type="button"
                          className="icon-action-btn"
                          title="Assign college or department"
                          onClick={() => {
                            setScopeError('');
                            setEditScopeCollege(assignedCollege);
                            setEditScopeTarget(u);
                          }}
                        >
                          <Shield size={15} />
                          <span className="btn-label">College</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className={`icon-action-btn ${isActive ? 'danger' : ''}`}
                        disabled={isLastLeadAdmin}
                        title={
                          isLastLeadAdmin
                            ? 'Cannot disable the last active Lead Campus Admin'
                            : isActive
                              ? 'Disable account'
                              : 'Enable account'
                        }
                        aria-label={`${isActive ? 'Disable' : 'Enable'} account for ${name}`}
                        onClick={() => {
                          setDisableReasonOption(DISABLE_REASONS[0]);
                          setDisableReasonCustom('');
                          setAccountStatusTarget(u);
                        }}
                      >
                        {isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                        <span className="btn-label">{isActive ? 'Disable' : 'Enable'}</span>
                      </button>
                    </>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>

      <Pagination
        currentPage={safeUserPage}
        totalItems={visibleUsers.length}
        pageSize={userPageSize}
        onPageChange={setUserPage}
      />
        </>
      )}

      {showAddUser && (
        <div className="user-modal-wash" onClick={() => setShowAddUser(false)}>
          <form
            className="sketch-box add-user-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={addUserTitleId}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAddUser}
          >
            <div className="modal-head">
              <div>
                <div className="eyebrow">ADMINISTRATOR ACCOUNT</div>
                <h2 id={addUserTitleId}>Add User</h2>
              </div>
              <button
                type="button"
                className="text-action"
                onClick={() => setShowAddUser(false)}
              >
                Close
              </button>
            </div>

            <div className="registration-fields">
              <div className="composite-name-fields">
                <label>
                  FIRST NAME
                  <input
                    className="field"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </label>
                <label>
                  MIDDLE NAME
                  <input
                    className="field"
                    value={newMiddleName}
                    onChange={(e) => setNewMiddleName(e.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <label>
                  LAST NAME
                  <input
                    className="field"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </label>
              </div>
              <label>
                EMAIL
                <input
                  className="field"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@wmsu.edu.ph"
                />
              </label>
              <label>
                TEMPORARY PASSWORD
                <input
                  className="field"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </label>
              <label>
                ROLE
                <CustomSelect
                  className="field"
                  value={newRole}
                  onChange={setNewRole}
                  ariaLabel="Select administrator role"
                  options={[
                    { value: 'lead_admin', label: 'Lead Campus Admin' },
                    { value: 'admin', label: 'College Admin' },
                  ]}
                />
              </label>
              {newRole !== 'lead_admin' && (
                <label>
                  COLLEGE / DEPARTMENT
                  <CustomSelect
                    className="field"
                    value={newCollege}
                    onChange={setNewCollege}
                    ariaLabel="Select college or department"
                    options={adminCollegeOptions}
                  />
                </label>
              )}
            </div>

            {userError && (
              <div className="pairing-error" role="alert">
                {userError}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="wire-button"
                onClick={() => setShowAddUser(false)}
              >
                Cancel
              </button>
              <button type="submit" className="wire-button dark" disabled={submittingUser}>
                {submittingUser ? 'Creating...' : 'Create administrator'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showImportCsv && (
        <div className="user-modal-wash" onClick={() => setShowImportCsv(false)}>
          <div
            className="sketch-box add-user-modal import-csv-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={importTitleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <div className="eyebrow">ADMINISTRATOR ACCOUNTS</div>
                <h2 id={importTitleId}>Import CSV</h2>
              </div>
              <button type="button" className="text-action" onClick={() => setShowImportCsv(false)}>
                Close
              </button>
            </div>

            <div className="registration-fields import-csv-fields">
              <p className="import-csv-hint">
                Columns expected: full_name, email, password, role, college, department, position.
              </p>
              <button type="button" className="wire-button" onClick={downloadImportTemplate}>
                Download sample template
              </button>

              <label className="import-csv-dropzone">
                <input
                  type="file"
                  className="sr-only-file-input"
                  accept=".csv,text/csv"
                  onChange={handleImportFileSelected}
                />
                <div className="import-csv-dropzone-inner">
                  <Upload size={18} />
                  <div>
                    <strong>{importFileName || 'Select a .csv file'}</strong>
                    <small>{importFileName ? 'Click to choose a different file' : 'UTF-8 CSV up to 500 administrators'}</small>
                  </div>
                  <span className="wire-button" aria-hidden="true">Choose file</span>
                </div>
              </label>

              {importError && (
                <div className="pairing-error" role="alert">
                  {importError}
                </div>
              )}

              {importRows.length > 0 && (
                <div className="import-csv-preview">
                  <strong>{importRows.length} row(s) detected</strong>
                  {importErrors.length > 0 && (
                    <ul className="import-csv-errors">
                      {importErrors.slice(0, 8).map((msg) => (
                        <li key={msg}>{msg}</li>
                      ))}
                      {importErrors.length > 8 && <li>...and {importErrors.length - 8} more.</li>}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="wire-button" onClick={() => setShowImportCsv(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="wire-button dark"
                disabled={submittingImport || importRows.length === 0 || importErrors.length > 0}
                onClick={handleSubmitImport}
              >
                {submittingImport
                  ? 'Importing...'
                  : `Import ${importRows.length || ''} administrator${importRows.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {accountStatusTarget && (() => {
        const targetIsActive = isUserActive(accountStatusTarget);
        return (
          <div className="user-modal-wash" onClick={() => setAccountStatusTarget(null)}>
            <div
              className="sketch-box confirm-modal"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="eyebrow">CONFIRMATION</div>
              <h3>
                {targetIsActive ? 'Disable administrator?' : 'Enable administrator?'}
              </h3>
              <p>
                {accountStatusTarget.full_name || accountStatusTarget.email} will{' '}
                {targetIsActive
                  ? 'lose access to the control room.'
                  : 'regain access to the control room.'}
              </p>

              {targetIsActive && (
                <div className="disable-reason-box">
                  <span className="field-caption">REASON FOR DISABLING</span>
                  <div className="disable-reason-options">
                    {DISABLE_REASONS.map((reason) => (
                      <label
                        key={reason}
                        className={`disable-reason-item ${disableReasonOption === reason ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="disableReason"
                          value={reason}
                          checked={disableReasonOption === reason}
                          onChange={() => setDisableReasonOption(reason)}
                        />
                        <span>{reason}</span>
                      </label>
                    ))}
                  </div>
                  <textarea
                    className="field disable-reason-textarea"
                    rows={2}
                    value={disableReasonCustom}
                    onChange={(e) => setDisableReasonCustom(e.target.value)}
                    placeholder={
                      disableReasonOption === 'Other'
                        ? 'Please specify the reason...'
                        : 'Optional additional details...'
                    }
                  />
                </div>
              )}

              <div className="confirm-actions">
                <button type="button" className="wire-button" onClick={() => setAccountStatusTarget(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={`wire-button ${targetIsActive ? 'danger-solid' : 'dark'}`}
                  onClick={confirmToggleStatus}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {editScopeTarget && (
        <div className="user-modal-wash" onClick={() => setEditScopeTarget(null)}>
          <div className="sketch-box confirm-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="eyebrow">{editScopeTarget._approveOnSave ? 'APPROVE & ASSIGN COLLEGE' : 'COLLEGE ASSIGNMENT'}</div>
            <h3>Assigned College: {editScopeTarget.full_name || editScopeTarget.email}</h3>
            <p>
              Select the college or department this administrator manages.
            </p>
            <label style={{ display: 'block', marginBottom: 16 }}>
              <span className="field-caption">COLLEGE / DEPARTMENT</span>
              <CustomSelect
                className="field"
                value={editScopeCollege}
                onChange={(val) => {
                  setEditScopeCollege(val);
                  if (val) setScopeError('');
                }}
                ariaLabel="Select assigned college or department"
                options={adminCollegeOptions}
              />
            </label>
            {scopeError && (
              <div className="pairing-error" role="alert" style={{ marginBottom: 12 }}>
                {scopeError}
              </div>
            )}
            <div className="confirm-actions">
              <button type="button" className="wire-button" onClick={() => setEditScopeTarget(null)}>
                Cancel
              </button>
              <button type="button" className="wire-button dark" disabled={savingScopes} onClick={handleSaveScopes}>
                {savingScopes ? 'Saving...' : editScopeTarget._approveOnSave ? 'Approve & Assign' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(rejectTarget)}
        eyebrow="REJECT REQUEST"
        title={`Reject and remove ${rejectTarget?.full_name || rejectTarget?.email || 'request'}?`}
        description="This pending administrator sign-up request will be permanently deleted."
        confirmLabel="Reject & Delete"
        danger
        onCancel={() => setRejectTarget(null)}
        onConfirm={() => handleRejectPending(rejectTarget)}
      />

      <ConfirmModal
        open={Boolean(removeCollegeTarget)}
        eyebrow="REMOVE COLLEGE"
        title={`Remove ${removeCollegeTarget?.code || 'college'} from directory?`}
        description={`"${removeCollegeTarget?.name || removeCollegeTarget?.code}" will be removed from the campus colleges and offices directory.`}
        confirmLabel="Remove College"
        danger
        onCancel={() => setRemoveCollegeTarget(null)}
        onConfirm={handleConfirmRemoveCollege}
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
