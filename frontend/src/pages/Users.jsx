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
      <div className="page-header" style={{ padding: '10px 0' }}>
        <h1 className="page-title">User Management</h1>
      </div>

      <div style={{ border: '1px solid #000', background: '#fff', marginTop: '10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #000', background: '#f5f5f5' }}>
              <th style={{ padding: '10px 14px' }}>Name</th>
              <th style={{ padding: '10px 14px' }}>Email</th>
              <th style={{ padding: '10px 14px' }}>Role</th>
              <th style={{ padding: '10px 14px' }}>Status</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>{admin.name}</td>
                <td style={{ padding: '10px 14px', color: '#555' }}>{admin.email}</td>
                <td style={{ padding: '10px 14px' }}>{admin.role}</td>
                <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>
                  [ {admin.status.toUpperCase()} ]
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '11px' }}
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
