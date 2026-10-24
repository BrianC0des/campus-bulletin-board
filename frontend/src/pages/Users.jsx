import React, { useState } from 'react';

const INITIAL_ADMINS = [
  { id: 'admin-001', name: 'Bryan Saavedra', email: 'admin@wmsu.edu.ph', role: 'Lead Admin', status: 'active' },
  { id: 'admin-002', name: 'Mae Eram', email: 'mae@wmsu.edu.ph', role: 'Admin', status: 'active' },
  { id: 'admin-003', name: 'Jay Jasper Manogura', email: 'jayjasper@wmsu.edu.ph', role: 'Admin', status: 'active' },
  { id: 'admin-004', name: 'Kelvin', email: 'kelvin@wmsu.edu.ph', role: 'Admin', status: 'active' },
];

export default function Users() {
  const [admins, setAdmins] = useState(INITIAL_ADMINS);

  const toggleStatus = (id) => {
    setAdmins(
      admins.map((u) =>
        u.id === id ? { ...u, status: u.status === 'active' ? 'disabled' : 'active' } : u
      )
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th className="admin-actions">Action</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id}>
                <td className="admin-name">{admin.name}</td>
                <td className="admin-email">{admin.email}</td>
                <td>{admin.role}</td>
                <td className="admin-status">[ {admin.status.toUpperCase()} ]</td>
                <td className="admin-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-toggle-status"
                    onClick={() => toggleStatus(admin.id)}
                  >
                    {admin.status === 'active' ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
