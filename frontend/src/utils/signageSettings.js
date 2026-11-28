import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'paskil_signage_settings';
const EVENT_NAME = 'paskil:signage-settings-updated';

export const DEFAULT_SIGNAGE_SETTINGS = {
  institutionHeader: 'WMSU PASKIL',
  defaultSlideDuration: 15,
  defaultExpiryDays: 0,
  pollIntervalSeconds: 15,
  fbHeaderPrefix: '📢 [WMSU CAMPUS ANNOUNCEMENT]',
  emergencyPreemption: true,
  autoFbSignature: true,
  autoOpenFbPost: true,
};

export function readSignageSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SIGNAGE_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SIGNAGE_SETTINGS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return { ...DEFAULT_SIGNAGE_SETTINGS };
  }
}

export function writeSignageSettings(patch) {
  const next = { ...readSignageSettings(), ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
  return next;
}

export function resetSignageSettings() {
  const next = { ...DEFAULT_SIGNAGE_SETTINGS };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
  return next;
}

export function useSignageSettings() {
  const [settings, setSettings] = useState(() => readSignageSettings());

  useEffect(() => {
    const onUpdated = (e) => {
      if (e.detail && typeof e.detail === 'object') setSettings(e.detail);
      else setSettings(readSignageSettings());
    };
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setSettings(readSignageSettings());
    };
    window.addEventListener(EVENT_NAME, onUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, onUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const updateSettings = useCallback((patch) => {
    const next = writeSignageSettings(patch);
    setSettings(next);
    return next;
  }, []);

  const reset = useCallback(() => {
    const next = resetSignageSettings();
    setSettings(next);
    return next;
  }, []);

  return { settings, updateSettings, resetSettings: reset };
}
