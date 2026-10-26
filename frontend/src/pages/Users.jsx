import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import '../styles/displays.css';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add Admin modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [role, setRole] = useState('admin');
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/users');
      setAdmins(response.administrators || []);
    } catch (err) {
      setError(err.message || 'Failed to load administrators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleToggleStatus = async (admin) => {
    const newStatus = admin.status === 'active' ? 'disabled' : 'active';
    const actionWord = newStatus === 'disabled' ? 'disable' : 'enable';

    if (!window.confirm(`Are you sure you want to ${actionWord} ${admin.full_name}'s account?`)) {
      return;
    }

    try {
      const response = await api.patch(`/users/${admin.id}/status`, { status: newStatus });
      if (response?.administrator) {
        setAdmins((prev) =>
          prev.map((a) => (a.id === admin.id ? response.administrator : a))
        );
      }
    } catch (err) {
      alert(err.message || `Failed to ${actionWord} administrator`);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setModalError('All fields are required.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError('');
      const response = await api.post('/users', {
        full_name: fullName.trim(),
        email: email.trim(),
        password: password.trim(),
        department: department.trim() || undefined,
        position: position.trim() || undefined,
        role,
      });

      if (response?.administrator) {
        setAdmins((prev) => [...prev, response.administrator]);
        setIsAddModalOpen(false);
        setFullName('');
        setEmail('');
        setPassword('');
        setDepartment('');
        setPosition('');
        setRole('admin');
      }
    } catch (err) {
      setModalError(err.message || 'Failed to create administrator');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-sub">Lead Administrator Control Panel</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setIsAddModalOpen(true)}
        >
          + Add Administrator
        </button>
      </div>

      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <p className="empty-text">Loading campus administrators...</p>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Department / College</th>
                <th>Position</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th className="admin-actions">Action</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => {
                const isSelf = admin.id === currentUser?.id;
                return (
                  <tr key={admin.id}>
                    <td className="admin-name">
                      {admin.full_name} {isSelf && <span style={{ color: '#888', fontWeight: 'normal' }}>(You)</span>}
                    </td>
                    <td style={{ fontSize: '13px', color: admin.department ? '#111' : '#888' }}>
                      {admin.department || '—'}
                    </td>
                    <td style={{ fontSize: '13px', color: admin.position ? '#111' : '#888' }}>
                      {admin.position || '—'}
                    </td>
                    <td className="admin-email">{admin.email}</td>
                    <td>
                      <span className="badge">
                        {admin.role === 'lead_admin' ? 'Lead Admin' : 'Admin'}
                      </span>
                    </td>
                    <td className="admin-status">
                      <span style={{ color: admin.status === 'active' ? '#2e7d32' : '#c62828' }}>
                        [ {admin.status?.toUpperCase() || 'ACTIVE'} ]
                      </span>
                    </td>
                    <td className="admin-actions">
                      {isSelf ? (
                        <span style={{ fontSize: 11, color: '#888' }}>Current Session</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary btn-toggle-status"
                          onClick={() => handleToggleStatus(admin)}
                        >
                          {admin.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Administrator Modal */}
      {isAddModalOpen && (
        <div className="modalBackdrop">
          <div className="modalContent">
            <div className="modalHeader">
              <div>
                <p className="labelSmall">Lead Administrator Action</p>
                <h2>Add Administrator</h2>
              </div>
              <button
                type="button"
                className="modalClose"
                onClick={() => setIsAddModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdmin}>
              {modalError && <p className="errorText">{modalError}</p>}

              <div className="modalField">
                <label className="labelSmall" htmlFor="newAdminName">Full Name</label>
                <input
                  id="newAdminName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Juan dela Cruz"
                  required
                />
              </div>

              <div className="modalField">
                <label className="labelSmall" htmlFor="newAdminEmail">Institutional Email</label>
                <input
                  id="newAdminEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. juan@wmsu.edu.ph"
                  required
                />
              </div>

              <div className="modalField">
                <label className="labelSmall" htmlFor="newAdminDept">Department / College (Optional)</label>
                <input
                  id="newAdminDept"
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. College of Computing Studies"
                />
              </div>

              <div className="modalField">
                <label className="labelSmall" htmlFor="newAdminPos">Position / Designation (Optional)</label>
                <input
                  id="newAdminPos"
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g. Faculty Adviser / Department Head"
                />
              </div>

              <div className="modalField">
                <label className="labelSmall" htmlFor="newAdminPassword">Temporary Password</label>
                <input
                  id="newAdminPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="modalField">
                <label className="labelSmall" htmlFor="newAdminRole">System Role</label>
                <select
                  id="newAdminRole"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #000' }}
                >
                  <option value="admin">Administrator (Standard)</option>
                  <option value="lead_admin">Lead Administrator</option>
                </select>
              </div>

              <div className="modalActions">
                <button
                  type="button"
                  className="btn btnOutline"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btnDark"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
