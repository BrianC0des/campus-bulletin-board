// Shared college / department scoping helpers used by pairing, displays and announcements.
//
// Canonical forms:
//   - Campus-wide scope is the token 'ALL' everywhere in this module. 'Campus-Wide' (any casing) and a blank
//     value are treated as the same thing.
//   - College codes are compared case-insensitively (stored upper-cased).
//   - Lead admins are unscoped (allowedColleges() returns null).
//   - Admins with no assigned scope get [] (never a placeholder code such as 'NONE'), so they can never match
//     a college that happens to be called 'NONE'.

export const CAMPUS_WIDE_DEPARTMENT = 'Campus-Wide';

// Codes that must never be creatable as real colleges because they collide with scope tokens.
export const RESERVED_COLLEGE_CODES = ['ALL', 'NONE', 'CAMPUS-WIDE'];

export const isCampusWideValue = (value) =>
  ['ALL', 'CAMPUS-WIDE'].includes(String(value ?? '').trim().toUpperCase());

// 'ALL' for blank / 'ALL' / 'Campus-Wide'; otherwise the trimmed, upper-cased college code.
export function normalizeCollege(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed || isCampusWideValue(trimmed)) return 'ALL';
  return trimmed.toUpperCase();
}

// Value stored in displays.department: 'Campus-Wide' or an upper-cased college code.
export function normalizeDepartment(value) {
  const normalized = normalizeCollege(value);
  return normalized === 'ALL' ? CAMPUS_WIDE_DEPARTMENT : normalized;
}

// null  -> unrestricted (lead admin)
// []    -> no scope at all
// [...] -> upper-cased college codes; 'ALL' is included only when allowed_colleges explicitly lists
//          'ALL' / 'Campus-Wide'. A bare user.college of 'ALL' never grants campus-wide scope.
export function allowedColleges(user) {
  if (!user) return [];
  if (user.role === 'lead_admin') return null;

  const assigned = Array.isArray(user.allowed_colleges) ? user.allowed_colleges : [];
  const raw = assigned.length > 0 ? assigned : (user.college ? [user.college] : []);

  const list = [];
  for (const entry of raw) {
    if (!entry || isCampusWideValue(entry)) continue;
    const code = normalizeCollege(entry);
    if (!list.includes(code)) list.push(code);
  }
  if (assigned.some(isCampusWideValue)) list.push('ALL');
  return list;
}

export function canAccessCollege(user, targetCollege) {
  const allowed = allowedColleges(user);
  return !allowed || allowed.includes(normalizeCollege(targetCollege));
}

// Values to compare against UPPER(<college column>) in SQL (`= ANY($n)`): 'ALL' also covers the legacy
// 'Campus-Wide' spelling. Returns null for unrestricted users.
export function scopeSqlValues(user) {
  const allowed = allowedColleges(user);
  if (!allowed) return null;
  return allowed.includes('ALL') ? [...allowed, 'CAMPUS-WIDE'] : allowed;
}
