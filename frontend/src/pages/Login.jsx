import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('admin@wmsu.edu.ph');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    login({
      id: 'admin-001',
      email: email.trim(),
      fullName: 'Campus Administrator',
      role: 'administrator',
    });
    navigate('/dashboard');
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Campus Bulletin Board</h1>
        <p className="subtitle">Administrator Sign In</p>

        {error && <p style={{ color: '#b3261e', fontSize: '13px', marginBottom: '14px' }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="loginEmail">Email</label>
            <input
              id="loginEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@wmsu.edu.ph"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="loginPassword">Password</label>
            <input
              id="loginPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btnDark"
            style={{ width: '100%', marginTop: '8px', padding: '12px' }}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
