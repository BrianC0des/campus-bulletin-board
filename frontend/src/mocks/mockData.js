/**
 * ============================================================================
 * 🤝 CAMPUS BULLETIN BOARD — SHARED API CONTRACT & MOCK DATA
 * ============================================================================
 * 
 * WHY THIS FILE EXISTS:
 * When building a full-stack web application, frontend developers should NOT
 * be blocked waiting for backend APIs or database migrations to finish.
 * 
 * An "API Contract" is an agreement between frontend and backend on:
 *   1. What keys exist (e.g. `publish_status`, not `publishStatus`)
 *   2. What data types they have (string, number, ISO-8601 timestamp string)
 *   3. What values to expect ('draft' | 'published' | 'archived')
 * 
 * HOW TO USE THIS IN YOUR REACT COMPONENTS:
 * 
 *   // 1. Import what you need:
 *   import { MOCK_ANNOUNCEMENTS } from '../mocks/mockData';
 * 
 *   // 2. Put it in your React state:
 *   const [announcements, setAnnouncements] = useState(MOCK_ANNOUNCEMENTS);
 * 
 *   // 3. Build & style your component using real array methods (.filter, .map):
 *   const activeList = announcements.filter(a => a.status === 'active');
 * 
 * LATER WHEN THE REAL BACKEND IS READY:
 * You only replace the initial state with an API fetch! Your JSX and CSS stay 100% untouched:
 *   useEffect(() => {
 *     fetch('/api/announcements').then(res => res.json()).then(setAnnouncements);
 *   }, []);
 * ============================================================================
 */

/**
 * 📢 MOCK ANNOUNCEMENTS CONTRACT
 * Matches the PostgreSQL view `v_announcements` and Express API `GET /api/announcements`
 */
export const MOCK_ANNOUNCEMENTS = [
  {
    id: "ann-001",
    title: "Midterm Examination Week & Quiet Study Guidelines",
    body: "Quiet hours are enforced on all library floors starting Monday. Extended library hours: 7:00 AM to 11:00 PM.",
    publish_status: "published",
    status: "active", // Computed: starts_at <= NOW < ends_at
    starts_at: "2026-10-01T08:00:00.000Z",
    ends_at: "2026-10-15T23:59:59.000Z",
    image_url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&q=80",
    created_by: "admin-uuid-1",
    created_at: "2026-09-30T10:00:00.000Z",
    assigned_displays: [
      { id: "disp-001", name: "Main Library Kiosk" },
      { id: "disp-002", name: "Student Center TV" }
    ]
  },
  {
    id: "ann-002",
    title: "Annual Hackathon 2026: Innovate for Campus Life",
    body: "Form a team of 3-5 students! Cash prizes, industry mentors, and free pizza. Registration closes this Friday at 5:00 PM.",
    publish_status: "published",
    status: "scheduled", // Computed: starts_at > NOW
    starts_at: "2026-10-20T09:00:00.000Z",
    ends_at: "2026-10-25T18:00:00.000Z",
    image_url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80",
    created_by: "admin-uuid-1",
    created_at: "2026-10-02T14:30:00.000Z",
    assigned_displays: [
      { id: "disp-003", name: "CS Building 2nd Floor" }
    ]
  },
  {
    id: "ann-003",
    title: "Campus Wi-Fi Maintenance & Temporary Downtime Notice",
    body: "Network access across West Wing dormitories will be intermittently unavailable due to core router firmware upgrades.",
    publish_status: "published",
    status: "expired", // Computed: ends_at < NOW
    starts_at: "2026-09-15T00:00:00.000Z",
    ends_at: "2026-09-18T06:00:00.000Z",
    image_url: null, // Note: Test fallback UI when no image is uploaded!
    created_by: "admin-uuid-2",
    created_at: "2026-09-14T08:00:00.000Z",
    assigned_displays: [
      { id: "disp-001", name: "Main Library Kiosk" }
    ]
  },
  {
    id: "ann-004",
    title: "Draft: Upcoming Spring Semester Career & Internship Fair",
    body: "Meet over 40 tech and engineering recruiters on campus. Bring printed copies of your resume.",
    publish_status: "draft",
    status: "draft", // Drafts are not live
    starts_at: "2026-11-01T09:00:00.000Z",
    ends_at: "2026-11-02T17:00:00.000Z",
    image_url: null,
    created_by: "admin-uuid-1",
    created_at: "2026-10-03T11:00:00.000Z",
    assigned_displays: []
  },
  {
    id: "ann-005",
    title: "Blood Donation Drive: Give Blood, Save Lives",
    body: "Red Cross mobile clinic stationed outside the gymnasium. Walk-ins welcome all day. Free refreshments provided for all student donors.",
    publish_status: "published",
    status: "active",
    starts_at: "2026-10-03T07:00:00.000Z",
    ends_at: "2026-10-06T19:00:00.000Z",
    image_url: "https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800&q=80",
    created_by: "admin-uuid-2",
    created_at: "2026-10-01T16:00:00.000Z",
    assigned_displays: [
      { id: "disp-002", name: "Student Center TV" },
      { id: "disp-004", name: "Gymnasium Lobby" }
    ]
  },
  {
    id: "ann-006",
    title: "EXTREMELY LONG ANNOUNCEMENT TITLE DESIGNED SPECIFICALLY TO TEST CSS TRUNCATION AND RESPONSIVE WRAPPING ON MOBILE AND 1080P KIOSK SCREENS WITHOUT BREAKING THE CARD LAYOUT",
    body: "This is edge-case test data. If your card design breaks when text is long, you need CSS classes like `line-clamp-2` or `break-words`.",
    publish_status: "published",
    status: "active",
    starts_at: "2026-10-02T00:00:00.000Z",
    ends_at: "2026-10-10T23:59:59.000Z",
    image_url: null,
    created_by: "admin-uuid-1",
    created_at: "2026-10-02T09:00:00.000Z",
    assigned_displays: [
      { id: "disp-001", name: "Main Library Kiosk" }
    ]
  }
];

/**
 * 📺 MOCK DISPLAYS CONTRACT
 * Matches the PostgreSQL table `displays` and Express API `GET /api/displays`
 */
export const MOCK_DISPLAYS = [
  {
    id: "disp-001",
    name: "Main Library Kiosk",
    location: "Library 1st Floor - Main Entrance",
    is_paired: true,
    is_online: true,
    last_seen_at: "2026-10-04T00:05:00.000Z",
    active_announcements_count: 3
  },
  {
    id: "disp-002",
    name: "Student Center TV",
    location: "Student Activity Center Food Court",
    is_paired: true,
    is_online: true,
    last_seen_at: "2026-10-04T00:04:12.000Z",
    active_announcements_count: 2
  },
  {
    id: "disp-003",
    name: "CS Building 2nd Floor",
    location: "Computer Science Dept Lab Corridor",
    is_paired: true,
    is_online: false, // Simulates an offline screen
    last_seen_at: "2026-10-03T18:22:00.000Z",
    active_announcements_count: 0
  },
  {
    id: "disp-004",
    name: "Gymnasium Lobby Screen",
    location: "Athletics Complex Front Desk",
    is_paired: true,
    is_online: true,
    last_seen_at: "2026-10-04T00:06:30.000Z",
    active_announcements_count: 1
  }
];

/**
 * 📊 MOCK DASHBOARD METRICS CONTRACT
 * Matches the aggregated numbers returned on `GET /api/dashboard/stats`
 */
export const MOCK_METRICS = {
  totalAnnouncements: 14,
  activeAnnouncements: 5,
  scheduledAnnouncements: 3,
  onlineDisplays: 3,
  totalDisplays: 4
};

/**
 * 🔑 MOCK PAIRING CONTRACT
 * Matches the payload returned by `POST /api/displays/pair`
 */
export const MOCK_PAIRING_RESPONSES = {
  // Simulates entering a valid 8-character pairing code
  validCodeResponse: {
    success: true,
    message: "Display successfully paired to campus network",
    display: {
      id: "disp-new-999",
      name: "Engineering Hall TV",
      location: "East Wing Entrance",
      paired_at: "2026-10-04T00:08:00.000Z"
    }
  },
  // Simulates entering an expired or typo-filled code
  invalidCodeResponse: {
    success: false,
    message: "Invalid or expired pairing code. Please check the TV screen code."
  }
};
