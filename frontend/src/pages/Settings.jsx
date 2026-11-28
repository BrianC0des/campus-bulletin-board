import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Facebook, CheckCircle2, AlertCircle, Shield, Monitor, Unplug, RotateCcw, Pencil, Check, HelpCircle, Upload, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useColleges } from '../utils/colleges.js';
import { getImageUrl } from '../utils/imageUrl.js';
import { useSignageSettings } from '../utils/signageSettings.js';
import ConfirmModal from '../components/common/ConfirmModal.jsx';
import api from '../services/api.js';

const SLIDE_PRESETS = [10, 15, 20, 30];
const EXPIRY_PRESETS = [
  { value: 0, label: '0 (Indefinite)' },
  { value: 7, label: '7d' },
  { value: 14, label: '14d' },
  { value: 30, label: '30d' },
];

export default function Settings() {
  const { user, login } = useAuth();
  const { colleges, formatLabel, reload: reloadColleges } = useColleges();
  const { settings, updateSettings, resetSettings } = useSignageSettings();
  const isLeadAdmin = user?.role === 'lead_admin';
  const logoInputRef = useRef(null);
  const [savingLogo, setSavingLogo] = useState(false);

  const primaryCollegeCode = useMemo(() => {
    if (isLeadAdmin) return null;
    const raw = Array.isArray(user?.allowed_colleges) && user.allowed_colleges.length > 0
      ? user.allowed_colleges[0]
      : user?.college;
    if (!raw || raw === 'ALL' || raw === 'Campus-Wide') return null;
    return String(raw).trim().toUpperCase();
  }, [isLeadAdmin, user]);

  const activeCollegeRecord = useMemo(
    () => (primaryCollegeCode ? colleges.find((c) => String(c.code).toUpperCase() === primaryCollegeCode) : null),
    [colleges, primaryCollegeCode]
  );

  const fbScopeChoices = useMemo(() => {
    if (isLeadAdmin) {
      return [{ value: 'ALL', label: 'Campus-Wide (Official Page)' }];
    }
    return primaryCollegeCode ? [{ value: primaryCollegeCode, label: formatLabel(primaryCollegeCode) }] : [];
  }, [isLeadAdmin, primaryCollegeCode, formatLabel]);

  const [fbCollege, setFbCollege] = useState(() => (isLeadAdmin ? 'ALL' : (fbScopeChoices[0]?.value || '')));
  useEffect(() => {
    if (!fbScopeChoices.some((o) => o.value === fbCollege)) {
      setFbCollege(fbScopeChoices[0]?.value || '');
    }
  }, [fbScopeChoices, fbCollege]);

  // Profile display name editor
  const [editingName, setEditingName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState(user?.full_name || '');
  const [savingName, setSavingName] = useState(false);
  const [profileSavedMsg, setProfileSavedMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  // Broadcast network draft state
  const [draftSettings, setDraftSettings] = useState(settings);
  const [networkSavedMsg, setNetworkSavedMsg] = useState('');

  // Facebook integration state
  const [fbStatus, setFbStatus] = useState(null);
  const [showFbForm, setShowFbForm] = useState(false);
  const [showFbGuide, setShowFbGuide] = useState(false);
  const [confirmDisconnectFb, setConfirmDisconnectFb] = useState(false);
  const [pageId, setPageId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [savingFb, setSavingFb] = useState(false);
  const [fbError, setFbError] = useState('');
  const [fbSuccess, setFbSuccess] = useState('');

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  useEffect(() => {
    setDisplayNameInput(user?.full_name || '');
  }, [user?.full_name]);

  useEffect(() => {
    if (!fbCollege) {
      setFbStatus({ connected: false, mode: 'demo' });
      return;
    }
    let cancelled = false;
    api.get(`/announcements/facebook/status?college=${encodeURIComponent(fbCollege)}`)
      .then((res) => {
        if (cancelled) return;
        setFbStatus(res);
        setPageId(res?.pageId || '');
        setShowFbGuide(!res?.connected);
      })
      .catch(() => {
        if (cancelled) return;
        setFbStatus({ connected: false, mode: 'demo' });
        setPageId('');
        setShowFbGuide(true);
      });
    return () => {
      cancelled = true;
    };
  }, [fbCollege]);

  const handleSaveDisplayName = async (e) => {
    e.preventDefault();
    const trimmed = displayNameInput.trim();
    if (!trimmed) {
      setProfileError('Display name cannot be empty.');
      return;
    }
    try {
      setSavingName(true);
      setProfileError('');
      setProfileSavedMsg('');
      const res = await api.put('/auth/profile', { full_name: trimmed });
      const updatedUser = res?.user
        ? { ...(user || {}), ...res.user }
        : { ...(user || {}), full_name: trimmed };
      if (typeof login === 'function') login(updatedUser);
      setEditingName(false);
      setProfileSavedMsg('Display signature name updated.');
      setTimeout(() => setProfileSavedMsg(''), 3500);
    } catch (err) {
      setProfileError(err.message || 'Could not update display name.');
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveNetworkDefaults = (e) => {
    e.preventDefault();
    const sanitized = {
      ...draftSettings,
      defaultSlideDuration: Math.min(300, Math.max(3, Number(draftSettings.defaultSlideDuration) || 15)),
      defaultExpiryDays: Math.min(365, Math.max(0, Number(draftSettings.defaultExpiryDays) || 0)),
    };
    updateSettings(sanitized);
    setDraftSettings(sanitized);
    setNetworkSavedMsg('Broadcast network defaults saved.');
    setTimeout(() => setNetworkSavedMsg(''), 3500);
  };

  const handleResetNetworkDefaults = () => {
    const next = resetSettings();
    setDraftSettings(next);
    setNetworkSavedMsg('Restored default broadcast network settings.');
    setTimeout(() => setNetworkSavedMsg(''), 3500);
  };

  const handleConnectFb = async (e) => {
    e.preventDefault();
    if (!pageId.trim() || !accessToken.trim()) {
      setFbError('Both Facebook Page ID and Page Access Token are required.');
      return;
    }
    try {
      setSavingFb(true);
      setFbError('');
      setFbSuccess('');
      const res = await api.post('/announcements/facebook/config', {
        college: fbCollege,
        page_id: pageId.trim(),
        access_token: accessToken.trim(),
      });
      setFbStatus(res);
      setAccessToken('');
      setShowFbForm(false);
      setFbSuccess(`Connected ${formatLabel(fbCollege)} to "${res.pageName}" (${res.pageId}).`);
    } catch (err) {
      setFbError(err.message || 'Could not verify Facebook Page credentials.');
    } finally {
      setSavingFb(false);
    }
  };

  const handleDisconnectFb = async () => {
    try {
      setSavingFb(true);
      setFbError('');
      setFbSuccess('');
      const res = await api.delete(`/announcements/facebook/config?college=${encodeURIComponent(fbCollege)}`);
      setFbStatus(res);
      setPageId('');
      setAccessToken('');
      setShowFbForm(false);
      setConfirmDisconnectFb(false);
      setFbSuccess(`Disconnected ${formatLabel(fbCollege)} Facebook Page. Switched to Local Demo Mode.`);
    } catch (err) {
      setFbError(err.message || 'Could not disconnect Facebook Page.');
    } finally {
      setSavingFb(false);
    }
  };

  const handleUploadCollegeLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !primaryCollegeCode) return;
    try {
      setSavingLogo(true);
      setProfileError('');
      const form = new FormData();
      form.append('image', file);
      await api.post(`/colleges/${encodeURIComponent(primaryCollegeCode)}/logo`, form);
      await reloadColleges?.();
      setProfileSavedMsg(`${primaryCollegeCode} logo updated.`);
      setTimeout(() => setProfileSavedMsg(''), 3500);
    } catch (err) {
      setProfileError(err.message || 'Could not upload college logo.');
    } finally {
      setSavingLogo(false);
    }
  };

  const handleRemoveCollegeLogo = async () => {
    if (!primaryCollegeCode) return;
    try {
      setSavingLogo(true);
      setProfileError('');
      await api.delete(`/colleges/${encodeURIComponent(primaryCollegeCode)}/logo`);
      await reloadColleges?.();
      setProfileSavedMsg(`${primaryCollegeCode} logo removed.`);
      setTimeout(() => setProfileSavedMsg(''), 3500);
    } catch (err) {
      setProfileError(err.message || 'Could not remove college logo.');
    } finally {
      setSavingLogo(false);
    }
  };

  const assignedScopes = Array.isArray(user?.allowed_colleges) && user.allowed_colleges.length > 0
    ? user.allowed_colleges.map((c) => formatLabel(c)).join(', ')
    : (user?.college ? formatLabel(user.college) : 'No college scope assigned');

  return (
    <div>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONTROL ROOM / SETTINGS</div>
          <h2>System &amp; Integration Settings</h2>
          <p className="page-description">
            Manage your administrator profile, broadcast network defaults, and Facebook Page integration.
          </p>
        </div>
      </div>

      <div className="settings-stack">
        {/* 1. Profile & Scoping Card */}
        <div className="sketch-box form-section settings-card">
          <div className="settings-card-head">
            <div className="settings-icon-badge" aria-hidden="true" style={{ overflow: 'hidden', padding: activeCollegeRecord?.logo_url ? 0 : undefined }}>
              {activeCollegeRecord?.logo_url ? (
                <img
                  src={getImageUrl(activeCollegeRecord.logo_url)}
                  alt={`${primaryCollegeCode} logo`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Shield size={18} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <span className="eyebrow">YOUR ACCOUNT</span>
              <h3>Profile &amp; Scoping</h3>
            </div>
            <span className="content-status active">
              {isLeadAdmin ? 'Lead Admin' : 'Campus Admin'}
            </span>
          </div>

          <div className="settings-kv-list">
            <div className="settings-kv-row">
              <span>Full Name / Signature</span>
              {editingName ? (
                <form onSubmit={handleSaveDisplayName} className="profile-inline-edit">
                  <input
                    className="field"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    aria-label="Edit display name"
                    disabled={savingName}
                  />
                  <button type="submit" className="wire-button dark" disabled={savingName}>
                    <Check size={14} /> {savingName ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="wire-button"
                    disabled={savingName}
                    onClick={() => {
                      setEditingName(false);
                      setProfileError('');
                      setDisplayNameInput(user?.full_name || '');
                    }}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <strong>{user?.full_name || 'Administrator'}</strong>
                  <button
                    type="button"
                    className="text-action"
                    onClick={() => {
                      setProfileError('');
                      setEditingName(true);
                    }}
                    title="Edit display name"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                </div>
              )}
            </div>
            <div className="settings-kv-row">
              <span>Institutional Email</span>
              <strong>{user?.email || '—'}</strong>
            </div>
            <div className="settings-kv-row">
              <span>Role</span>
              <strong>{isLeadAdmin ? 'Lead Campus Administrator' : 'Campus / College Administrator'}</strong>
            </div>
            <div className="settings-kv-row">
              <span>Assigned Scope</span>
              <strong>{isLeadAdmin ? 'Campus-Wide & All Colleges' : assignedScopes}</strong>
            </div>
            {primaryCollegeCode && (
              <div className="settings-kv-row">
                <span>College / Department Logo</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleUploadCollegeLogo}
                  />
                  <button
                    type="button"
                    className="wire-button"
                    disabled={savingLogo}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload size={13} /> {savingLogo ? 'Uploading...' : (activeCollegeRecord?.logo_url ? 'Change Logo' : 'Upload Logo')}
                  </button>
                  {activeCollegeRecord?.logo_url && (
                    <button
                      type="button"
                      className="wire-button danger-outline"
                      disabled={savingLogo}
                      onClick={handleRemoveCollegeLogo}
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {profileError && (
            <div className="pairing-error" role="alert" style={{ marginTop: 12 }}>
              {profileError}
            </div>
          )}

          {profileSavedMsg && (
            <div className="fb-success-toast" role="status" style={{ marginTop: 12 }}>
              <CheckCircle2 size={16} />
              <strong>{profileSavedMsg}</strong>
            </div>
          )}
        </div>

        {/* 2. Broadcast Network / Signage Defaults Card */}
        <form onSubmit={handleSaveNetworkDefaults} className="sketch-box form-section settings-card">
          <div className="settings-card-head">
            <div className="settings-icon-badge" aria-hidden="true">
              <Monitor size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <span className="eyebrow">BROADCAST NETWORK</span>
              <h3>Signage &amp; Broadcast Defaults</h3>
            </div>
            <span className="orientation-badge">Asia/Manila (PST • UTC+8)</span>
          </div>

          <p className="settings-hint">
            Set your default slide playback duration and broadcast expiration window for new announcements.
          </p>

          <div className="settings-controls-grid" style={{ marginBottom: 0 }}>
            <div className="settings-control-field">
              <label className="field-caption" htmlFor="set-slide-dur">
                DEFAULT SLIDE DURATION (3–300 SECONDS)
              </label>
              <input
                id="set-slide-dur"
                className="field"
                type="number"
                min={3}
                max={300}
                value={draftSettings.defaultSlideDuration}
                onChange={(e) => setDraftSettings((s) => ({ ...s, defaultSlideDuration: e.target.value }))}
              />
              <div className="duration-chips" style={{ marginTop: 6 }}>
                {SLIDE_PRESETS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    className={Number(draftSettings.defaultSlideDuration) === sec ? 'active' : ''}
                    onClick={() => setDraftSettings((s) => ({ ...s, defaultSlideDuration: sec }))}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-control-field">
              <label className="field-caption" htmlFor="set-expiry-days">
                DEFAULT BROADCAST EXPIRATION (DAYS • 0 = INDEFINITE)
              </label>
              <input
                id="set-expiry-days"
                className="field"
                type="number"
                min={0}
                max={365}
                value={draftSettings.defaultExpiryDays}
                onChange={(e) => setDraftSettings((s) => ({ ...s, defaultExpiryDays: e.target.value }))}
              />
              <div className="duration-chips" style={{ marginTop: 6 }}>
                {EXPIRY_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className={Number(draftSettings.defaultExpiryDays) === p.value ? 'active' : ''}
                    onClick={() => setDraftSettings((s) => ({ ...s, defaultExpiryDays: p.value }))}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {networkSavedMsg && (
            <div className="fb-success-toast" role="status" style={{ marginTop: 12 }}>
              <CheckCircle2 size={16} />
              <strong>{networkSavedMsg}</strong>
            </div>
          )}

          <div className="settings-actions">
            <button type="button" className="wire-button" onClick={handleResetNetworkDefaults}>
              <RotateCcw size={14} /> Reset Defaults
            </button>
            <button type="submit" className="wire-button dark">
              Save Defaults
            </button>
          </div>
        </form>

        {/* 3. Facebook Integration Card (Button-triggered Developer Form + Disconnect/Remove) */}
        <div className="sketch-box form-section settings-card">
          <div className="settings-card-head">
            <div className="fb-page-avatar" aria-hidden="true">
              <Facebook size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <span className="eyebrow">SOCIAL INTEGRATION</span>
              <h3>Facebook Page (Graph API)</h3>
            </div>
            <span className={`content-status ${fbStatus?.connected ? 'active' : 'scheduled'}`}>
              {fbStatus?.connected ? `Connected: ${fbStatus.pageName}` : 'Demo Mode'}
            </span>
          </div>

          <p className="settings-hint">
            {fbStatus?.connected
              ? `Announcements for ${formatLabel(fbCollege)} will post directly to "${fbStatus.pageName}" (Page ID: ${fbStatus.pageId}).`
              : 'Connect a Meta Facebook Page for this department so admins can publish announcements directly from PASKIL.'}
          </p>

          {showFbGuide && (
            <div className="fb-setup-guide">
              <strong>Step-by-Step Guide: How to Connect Your Facebook Page</strong>
              <ol>
                <li>
                  Open{' '}
                  <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer">
                    Meta for Developers → My Apps
                  </a>
                  , click <strong>Create App</strong>, and select the{' '}
                  <strong>Manage everything on your Page</strong> use case (under <em>Content management</em>).
                </li>
                <li>
                  Open{' '}
                  <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer">
                    Meta Graph API Explorer
                  </a>
                  , choose your App, and add these 3 permissions: <code>pages_show_list</code>,{' '}
                  <code>pages_read_engagement</code>, and <code>pages_manage_posts</code>.
                </li>
                <li>
                  In the <strong>User or Page</strong> dropdown, select <strong>Get Page Access Token</strong>, choose
                  your Facebook Page, click <strong>Generate Access Token</strong>, and copy the token (<code>EAAG...</code>).
                </li>
                <li>
                  Find your numeric <strong>Page ID</strong>: open{' '}
                  <a href="https://www.facebook.com/pages/?category=your_pages" target="_blank" rel="noreferrer">
                    Your Facebook Pages
                  </a>{' '}
                  and open your Page — if the URL is <code>facebook.com/profile.php?id=123456...</code>, the number
                  after <code>?id=</code> is your Page ID (or run <code>me?fields=id,name</code> in Graph API Explorer).
                </li>
                <li>
                  Optional: Paste your token in the{' '}
                  <a href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank" rel="noreferrer">
                    Meta Access Token Debugger
                  </a>{' '}
                  and click <strong>Extend Access Token</strong> so it does not expire quickly.
                </li>
              </ol>
            </div>
          )}

          {fbError && !showFbForm && (
            <div className="pairing-error" role="alert" style={{ marginBottom: 12 }}>
              <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              {fbError}
            </div>
          )}
          {fbSuccess && (
            <div className="fb-success-toast" role="status" style={{ marginBottom: 12 }}>
              <CheckCircle2 size={16} />
              <strong>{fbSuccess}</strong>
            </div>
          )}

          {!showFbForm ? (
            <div className="settings-actions" style={{ justifyContent: 'flex-start', marginTop: 0, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="wire-button dark"
                onClick={() => {
                  setFbError('');
                  setShowFbForm(true);
                }}
              >
                <Facebook size={14} />{' '}
                {fbStatus?.connected ? 'Configure / Change Page' : 'Connect to Facebook'}
              </button>
              <button
                type="button"
                className="wire-button"
                onClick={() => setShowFbGuide((v) => !v)}
              >
                <HelpCircle size={14} /> {showFbGuide ? 'Hide Setup Guide' : 'How to Connect (Step-by-Step)'}
              </button>
              {fbStatus?.connected && (
                <button
                  type="button"
                  className="wire-button danger-outline"
                  disabled={savingFb}
                  onClick={() => setConfirmDisconnectFb(true)}
                >
                  <Unplug size={14} /> Disconnect &amp; Remove Page
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleConnectFb} className="fb-dev-config-box" style={{ marginBottom: 0 }}>
              <strong>Connect Facebook Page (Developer Mode)</strong>
              <p>
                Paste your Meta Page ID and Page Access Token (<code>pages_manage_posts</code>,{' '}
                <code>pages_read_engagement</code>) from Meta Graph API Explorer.
              </p>
              <div className="scheduler-two-col">
                <label>
                  <span className="field-caption">FACEBOOK PAGE ID</span>
                  <input
                    className="field"
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    placeholder="e.g. 1029384756"
                  />
                </label>
                <label>
                  <span className="field-caption">PAGE ACCESS TOKEN</span>
                  <input
                    className="field"
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder={fbStatus?.connected ? '•••••••••••••••• (enter new token to update)' : 'EAAG...'}
                  />
                </label>
              </div>

              {fbError && (
                <div className="pairing-error" role="alert" style={{ marginTop: 10 }}>
                  <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  {fbError}
                </div>
              )}

              <div className="settings-actions">
                <button
                  type="button"
                  className="wire-button"
                  onClick={() => {
                    setShowFbForm(false);
                    setFbError('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="wire-button dark" disabled={savingFb}>
                  <Facebook size={14} /> {savingFb ? 'Verifying...' : 'Verify & Connect Page'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmDisconnectFb}
        title={`Disconnect ${formatLabel(fbCollege || 'ALL')} Facebook Page?`}
        description="PASKIL will switch this department back to Local Demo Mode until a Page is reconnected."
        confirmLabel="Disconnect Page"
        danger
        onCancel={() => setConfirmDisconnectFb(false)}
        onConfirm={handleDisconnectFb}
      />
    </div>
  );
}
