import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

const STORAGE_KEY = 'paskil_colleges_cache';
const EVENT_NAME = 'paskil:colleges-updated';

export const DEFAULT_COLLEGES = [
  { code: 'CCS', name: 'College of Computing Studies', category: 'Academic Colleges' },
  { code: 'COE', name: 'College of Engineering', category: 'Academic Colleges' },
  { code: 'CN', name: 'College of Nursing', category: 'Academic Colleges' },
  { code: 'CLA', name: 'College of Liberal Arts', category: 'Academic Colleges' },
  { code: 'CTE', name: 'College of Teacher Education', category: 'Academic Colleges' },
  { code: 'CBA', name: 'College of Business & Accountancy', category: 'Academic Colleges' },
  { code: 'CA', name: 'College of Agriculture', category: 'Academic Colleges' },
  { code: 'CS', name: 'College of Science & Mathematics', category: 'Academic Colleges' },
  { code: 'CCJE', name: 'College of Criminal Justice Education', category: 'Academic Colleges' },
  { code: 'CSWCD', name: 'College of Social Work & Community Development', category: 'Academic Colleges' },
  { code: 'OSA', name: 'Office of Student Affairs', category: 'Administrative Offices' },
  { code: 'REGISTRAR', name: 'University Registrar', category: 'Administrative Offices' },
  { code: 'LIBRARY', name: 'Main Campus Library', category: 'Administrative Offices' },
];

export const COLLEGE_CATALOG = [
  { value: 'Campus-Wide', code: 'ALL', label: 'Campus-Wide — All Colleges & Offices', short: 'Campus-Wide', group: 'University-Wide' },
  ...DEFAULT_COLLEGES.map((c) => ({
    value: c.code,
    code: c.code,
    label: `${c.code} — ${c.name}`,
    short: c.code,
    group: c.category,
  })),
];

function readCachedColleges() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_COLLEGES;
  } catch {
    return DEFAULT_COLLEGES;
  }
}

function writeCachedColleges(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore storage errors
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: list }));
}

export function formatCollegeLabel(codeOrName, list = readCachedColleges()) {
  if (!codeOrName || codeOrName === 'ALL' || codeOrName === 'Campus-Wide') {
    return 'Campus-Wide';
  }
  const upper = String(codeOrName).trim().toUpperCase();
  const found = list.find((c) => c.code.toUpperCase() === upper);
  return found ? `${found.code} — ${found.name}` : String(codeOrName).trim();
}

export function getCollegeOptions({
  includeAllFilter = false,
  includeCampusWide = true,
  includeCustom = false,
  extraValues = [],
  colleges = readCachedColleges(),
} = {}) {
  const options = [];
  const seen = new Set();

  if (includeAllFilter) {
    options.push({ value: 'All', label: 'All Colleges & Offices', shortLabel: 'All Colleges' });
    seen.add('ALL_FILTER');
  }

  if (includeCampusWide) {
    options.push({ value: 'Campus-Wide', label: 'Campus-Wide (All Units)', shortLabel: 'Campus-Wide' });
    seen.add('ALL');
    seen.add('CAMPUS-WIDE');
  }

  colleges.forEach((c) => {
    const code = String(c.code || '').trim().toUpperCase();
    if (!code || seen.has(code)) return;
    seen.add(code);
    options.push({ value: c.code, label: `${c.code} — ${c.name}`, shortLabel: `${c.code} · ${c.name}` });
  });

  extraValues.forEach((val) => {
    if (!val) return;
    const trimmed = String(val).trim();
    const upper = trimmed.toUpperCase();
    if (!trimmed || upper === 'ALL' || upper === 'CAMPUS-WIDE' || upper === 'CUSTOM' || seen.has(upper)) return;
    seen.add(upper);
    options.push({ value: trimmed, label: trimmed, shortLabel: trimmed });
  });

  if (includeCustom) {
    options.push({ value: 'Custom', label: 'Custom College / Office...', shortLabel: 'Custom Scope...' });
  }

  return options;
}

export function useColleges() {
  const [colleges, setColleges] = useState(() => readCachedColleges());

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/colleges');
      if (Array.isArray(res?.colleges) && res.colleges.length > 0) {
        writeCachedColleges(res.colleges);
        setColleges(res.colleges);
      }
    } catch {
      // keep cached fallback when offline
    }
  }, []);

  useEffect(() => {
    refresh();
    const onUpdated = (e) => {
      if (Array.isArray(e.detail)) setColleges(e.detail);
      else setColleges(readCachedColleges());
    };
    window.addEventListener(EVENT_NAME, onUpdated);
    return () => window.removeEventListener(EVENT_NAME, onUpdated);
  }, [refresh]);

  const addCollege = async ({ code, name, category = 'Academic Colleges' }) => {
    const cleanCode = String(code || '').trim().toUpperCase().replace(/\s+/g, '-');
    const cleanName = String(name || '').trim();
    const res = await api.post('/colleges', { code: cleanCode, name: cleanName, category });
    const created = res?.college || { id: cleanCode, code: cleanCode, name: cleanName, category };
    const next = [...colleges.filter((c) => c.code.toUpperCase() !== cleanCode), created];
    writeCachedColleges(next);
    setColleges(next);
    return created;
  };

  const removeCollege = async (idOrCode) => {
    const target = colleges.find((c) => c.id === idOrCode || c.code === idOrCode);
    if (target?.id && String(target.id).includes('-')) {
      await api.delete(`/colleges/${target.id}`);
    }
    const next = colleges.filter((c) => c.id !== idOrCode && c.code !== idOrCode);
    writeCachedColleges(next);
    setColleges(next);
  };

  const formatLabel = useCallback((val) => formatCollegeLabel(val, colleges), [colleges]);
  const getOptions = useCallback((opts = {}) => getCollegeOptions({ ...opts, colleges }), [colleges]);

  return {
    colleges,
    refresh,
    addCollege,
    removeCollege,
    formatLabel,
    getOptions,
  };
}
