import React from 'react';

export default function Login() {
  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '420px' }}>
        <h2 className="page-title" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Administrator Login</h2>
        {/* TODO: Email & Password form calling supabase.auth.signInWithPassword */}
      </div>
    </div>
  );
}
