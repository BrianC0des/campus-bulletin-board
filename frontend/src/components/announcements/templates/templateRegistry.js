/**
 * Template registry: metadata + template_data field schema for every PASKIL
 * announcement template. `id` matches announcements.template_id in the DB.
 *
 * Field types: text | textarea | date | time | url | list (schedule rows)
 */
export const RECOMMENDED_WORD_LIMIT = 40;

export const TEMPLATE_CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'poster', label: 'Image / Poster' },
  { value: 'event', label: 'Event' },
  { value: 'general', label: 'General' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'weekly', label: 'Weekly' },
];

export const DEFAULT_TEMPLATE_ID = 'general_split';

export const TEMPLATES = [
  {
    id: 'general_split',
    name: 'General Notice',
    category: 'general',
    description: 'Headline and message with an optional 0–4 photo grid.',
    orientations: ['16:9', '9:16'],
    wordLimit: RECOMMENDED_WORD_LIMIT,
    maxImages: 4,
    fields: [],
  },
  {
    id: 'image_only',
    name: 'Image / Poster Only',
    category: 'poster',
    description: 'Full-screen poster or photo collage with no overlays or watermarks.',
    orientations: ['16:9', '9:16'],
    wordLimit: 0,
    maxImages: 4,
    requiresTitle: false,
    fields: [],
  },
  {
    id: 'event_spotlight',
    name: 'Event Spotlight',
    category: 'event',
    description: 'Date, time and venue anchor strip with a call-to-action.',
    orientations: ['16:9', '9:16'],
    wordLimit: RECOMMENDED_WORD_LIMIT,
    maxImages: 4,
    fields: [
      { key: 'event_date', label: 'EVENT DATE', type: 'date' },
      { key: 'event_time', label: 'START TIME', type: 'time' },
      { key: 'event_end_time', label: 'END TIME (OPTIONAL)', type: 'time' },
      { key: 'venue', label: 'VENUE', type: 'text', placeholder: 'University Gymnasium' },
      { key: 'cta_text', label: 'CALL TO ACTION', type: 'text', placeholder: 'Register at bit.ly/wmsu-event' },
      { key: 'cta_link', label: 'REGISTRATION LINK', type: 'url', placeholder: 'https://…' },
    ],
  },
  {
    id: 'emergency_banner',
    name: 'Emergency Banner',
    category: 'emergency',
    description: 'Solid crimson warning layout for urgent campus alerts.',
    orientations: ['16:9', '9:16'],
    wordLimit: 30,
    maxImages: 0,
    fields: [
      { key: 'alert_level', label: 'ALERT LABEL', type: 'text', placeholder: 'EMERGENCY ALERT' },
      { key: 'instructions', label: 'INSTRUCTIONS', type: 'textarea', placeholder: 'What should people do?' },
      { key: 'contact', label: 'EMERGENCY CONTACT', type: 'tel', placeholder: 'Security: (062) 991-1771' },
    ],
  },
  {
    id: 'deadline_callout',
    name: 'Deadline Callout',
    category: 'deadline',
    description: 'Large due date with a live countdown.',
    orientations: ['16:9', '9:16'],
    wordLimit: RECOMMENDED_WORD_LIMIT,
    maxImages: 0,
    fields: [
      { key: 'deadline_date', label: 'DUE DATE', type: 'date' },
      { key: 'deadline_time', label: 'DUE TIME', type: 'time' },
      { key: 'action_label', label: 'WHAT IS DUE', type: 'text', placeholder: 'Submit clearance forms' },
      { key: 'submit_to', label: 'SUBMIT TO', type: 'text', placeholder: "Registrar's Office" },
    ],
  },
  {
    id: 'achievement_spotlight',
    name: 'Achievement Spotlight',
    category: 'achievement',
    description: 'Celebrates a recipient and their award with a photo.',
    orientations: ['16:9', '9:16'],
    wordLimit: RECOMMENDED_WORD_LIMIT,
    maxImages: 1,
    fields: [
      { key: 'recipient', label: 'RECIPIENT', type: 'text', placeholder: 'Juan Dela Cruz' },
      { key: 'award', label: 'AWARD / ACHIEVEMENT', type: 'text', placeholder: 'Dean’s Lister, 1st Place' },
      { key: 'affiliation', label: 'COLLEGE / PROGRAM', type: 'text', placeholder: 'BS Computer Science' },
    ],
  },
  {
    id: 'weekly_digest',
    name: 'Weekly Events',
    category: 'weekly',
    description: 'A 3–5 row schedule of the week’s events.',
    orientations: ['16:9', '9:16'],
    wordLimit: 0,
    maxImages: 0,
    fields: [
      { key: 'week_label', label: 'WEEK LABEL', type: 'text', placeholder: 'Week of Nov 24 – 28' },
      { key: 'rows', label: 'SCHEDULE ROWS (3–5)', type: 'list', min: 3, max: 5 },
    ],
  },
];

export const WEEKLY_ROW_TEMPLATE = { day: '', time: '', title: '', venue: '' };

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}

export function templatesByCategory(category) {
  return category === 'all' ? TEMPLATES : TEMPLATES.filter((t) => t.category === category);
}

/** Default template_data for a template, with any existing values preserved. */
export function defaultTemplateData(id, existing = {}) {
  const tpl = getTemplate(id);
  const data = {};
  tpl.fields.forEach((f) => {
    if (f.type === 'list') {
      const rows = Array.isArray(existing?.[f.key]) ? existing[f.key] : [];
      const padded = [...rows];
      while (padded.length < f.min) padded.push({ ...WEEKLY_ROW_TEMPLATE });
      data[f.key] = padded.slice(0, f.max);
    } else {
      data[f.key] = existing?.[f.key] ?? '';
    }
  });
  return data;
}

export function countWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}
