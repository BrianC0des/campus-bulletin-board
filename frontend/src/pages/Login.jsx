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
  const [showForgotModal, setShowForgotModal] = useState(false);

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
            <div className="login-field-header">
              <label htmlFor="loginPassword">Password</label>
              <a
                href="#forgot-password"
                className="forgot-password-link"
                onClick={(e) => {
                  e.preventDefault();
                  setShowForgotModal(true);
                }}
              >
                Forgot password?
              </a>
            </div>
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

      {showForgotModal && (
        <div
          className="modalBackdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowForgotModal(false)}
        >
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <p className="labelSmall">Security & Account Recovery</p>
                <h2>Password Reset Policy</h2>
              </div>
              <button
                type="button"
                className="modalClose"
                onClick={() => setShowForgotModal(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#222', marginBottom: '20px' }}>
              <p style={{ marginBottom: '12px' }}>
                For physical security and broadcast integrity across campus digital displays, administrator accounts are centrally provisioned and managed by the university.
              </p>
              <div
                style={{
                  background: '#f9f9f9',
                  border: '1px solid #000000',
                  padding: '12px 14px',
                  marginBottom: '14px',
                }}
              >
                <p style={{ margin: 0, fontWeight: 'bold', color: '#000' }}>
                  Management Information Systems (MIS) Office
                </p>
                <p style={{ margin: '4px 0 0', color: '#444' }}>
                  Email: <span style={{ fontWeight: '600' }}>mis@wmsu.edu.ph</span>
                </p>
                <p style={{ margin: '2px 0 0', color: '#444' }}>
                  Location: WMSU Computer Center Building, 2nd Floor
                </p>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                Please coordinate with your department ICT coordinator or visit the MIS Office with your faculty/staff identification to have your credentials re-issued.
              </p>
            </div>

            <div className="modalActions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btnDark"
                onClick={() => setShowForgotModal(false)}
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
