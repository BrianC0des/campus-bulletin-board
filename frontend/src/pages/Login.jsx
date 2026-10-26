import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('admin@wmsu.edu.ph');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password: password.trim(),
      });

      if (response?.user) {
        login(response.user);
        navigate('/dashboard');
      } else {
        setError('Login failed. Please check credentials.');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Campus Bulletin Board</h1>
        <p className="subtitle">Administrator Sign In</p>

        {error && <p className="login-error">{error}</p>}

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
            className="btn btnDark login-btn"
            disabled={submitting}
          >
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
