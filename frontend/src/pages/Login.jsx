import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import PaskilLogo from '../components/common/PaskilLogo.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState(import.meta.env.DEV ? 'admin@wmsu.edu.ph' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'admin123' : '');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccessMsg('');
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password: password.trim(),
      });

      if (response?.user) {
        login(response.user);
        navigate('/dashboard');
      } else {
        setError('Login failed. Please verify your credentials.');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const combinedName = [firstName, middleName, lastName].map((s) => s.trim()).filter(Boolean).join(' ');
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError('First name, last name, institutional email, and password are required.');
      return;
    }
    if (password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      setSuccessMsg('');
      const res = await api.post('/auth/register', {
        full_name: combinedName,
        email: email.trim(),
        password: password.trim(),
        position: position.trim() || 'College Coordinator',
      });
      setSuccessMsg(
        res?.message || 'Account request submitted. A Lead Campus Administrator will review and approve your access.'
      );
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setPassword('');
      setPosition('');
    } catch (err) {
      setError(err.message || 'Could not submit registration request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page" style={{ minHeight: '100vh' }}>
      <div className="login-title">
        <PaskilLogo tagline={false} className="login-brand" />
        <h1>
          Make campus
          <br />
          <em>impossible to miss.</em>
        </h1>
        <p>One control room for every screen, story, and student moment.</p>
      </div>

      <form className="sketch-box login-box" onSubmit={mode === 'login' ? handleLogin : handleRegister}>
        <div className="login-box-heading">
          <span>{mode === 'login' ? 'SECURE ACCESS' : 'ADMIN REGISTRATION'}</span>
          <strong>{mode === 'login' ? '01' : '02'}</strong>
        </div>
        <h2>{mode === 'login' ? 'Welcome back' : 'Request access'}</h2>

        <div className="auth-mode-tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={mode === 'login' ? 'active' : ''}
            onClick={() => {
              setMode('login');
              setError('');
              setSuccessMsg('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => {
              setMode('signup');
              setError('');
              setSuccessMsg('');
              setEmail('');
              setPassword('');
            }}
          >
            Sign Up
          </button>
        </div>

        {mode === 'signup' && (
          <>
            <div className="composite-name-fields">
              <label>
                FIRST NAME
                <input
                  className="field"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Juan"
                  required
                />
              </label>
              <label>
                MIDDLE NAME
                <input
                  className="field"
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="Optional"
                />
              </label>
              <label>
                LAST NAME
                <input
                  className="field"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Dela Cruz"
                  required
                />
              </label>
            </div>

            <label>
              POSITION / ROLE TITLE
              <input
                className="field"
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g. College PIO / Staff"
              />
            </label>
          </>
        )}

        <label>
          CAMPUS EMAIL
          <input
            className="field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@wmsu.edu.ph"
            required
          />
        </label>

        <label>
          PASSWORD
          <input
            className="field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'Minimum 6 characters' : 'Enter your password'}
            required
          />
        </label>

        {successMsg && (
          <div className="pairing-success" role="status" style={{ gridTemplateColumns: '1fr', marginBottom: 12 }}>
            <strong>Request Submitted</strong>
            <span>{successMsg}</span>
          </div>
        )}

        <div
          className="error-placeholder"
          role={error ? 'alert' : undefined}
          style={error ? { color: '#b91c1c', borderColor: '#b91c1c', background: '#fef2f2' } : undefined}
        >
          {error || (mode === 'login' ? 'Authorized administrators only' : 'Lead Admin approval required before login')}
        </div>

        <button type="submit" className="wire-button dark" disabled={submitting}>
          {submitting
            ? mode === 'login' ? 'Entering control room...' : 'Submitting request...'
            : mode === 'login' ? 'Enter control room' : 'Submit sign up request'}{' '}
          <span>→</span>
        </button>
      </form>

      <span className="corner-note">CAMPUS DIGITAL SIGNAGE CONTROL ROOM</span>
    </div>
  );
}
