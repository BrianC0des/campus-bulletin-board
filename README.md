# Campus Bulletin Board Digital Signage System

A centralized web-based digital signage platform where campus administrators create and schedule notices, announcements, and schedules for physical display boards across campus buildings (Library, Main Hall, Engineering, Student Center, Cafeteria).

---

## 🏛️ System Architecture

```text
[ Physical Display Browser (/display) ]
              │ (Display Authentication Token)
              ▼
[ Express.js REST API ] ──(Connection Pool / pg.Pool)──▶ [ Raw PostgreSQL (Port 5432) ]
              ▲                                                       │
              │ (JWT Access Token)                                    ▼
[ Administrator Dashboard (React + Vite) ]                  [ Local Static /uploads ]
```

### Core Security & Architectural Principles
- **Raw PostgreSQL (Zero-BaaS)**: Standard DDL schema without managed BaaS wrappers. All table structures, constraints, and views run directly on PostgreSQL 14+.
- **Strict Role Separation**: Physical TV displays authenticate via claim tokens; administrators authenticate via email/password verified against `bcrypt` password hashes with signed JWT session tokens.
- **Dynamic Content Lifecycle**: Statuses (`scheduled`, `active`, `expired`) are computed dynamically on query via database view `v_announcements` using UTC timestamps.
- **Local Media Storage**: Announcement banner images are handled locally via `multer` disk storage and served statically via Express `/uploads`.
- **Soft Deletion Protocol**: Notices are marked with `deleted_at = CURRENT_TIMESTAMP` to preserve institutional audit trails while instantly removing them from live displays.

---

## 📁 Repository Structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                   # PostgreSQL pg.Pool configuration
│   │   ├── middleware/
│   │   │   ├── auth.js                 # JWT & Display auth middleware
│   │   │   └── upload.js               # Multer local image storage
│   │   ├── routes/                     # REST endpoints
│   │   └── server.js                   # Express application entrypoint
│   ├── uploads/                        # Local uploaded image banners
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/                 # Reusable UI components
│   │   ├── mocks/
│   │   │   └── mockData.js             # Shared API contract & mock dataset
│   │   ├── pages/                      # Page views (Dashboard, Displays, etc.)
│   │   └── App.jsx
│   └── package.json
├── database/
│   └── schema.sql                      # Authoritative PostgreSQL DDL (v1.4)
├── docs/
│   └── campus-bulletin-board-er.drawio # Crow's Foot ER Diagram (v1.4)
└── README.md
```

---

## 🗄️ Database Entities & Invariants

| Table | Purpose | Key Constraints & Invariants |
| :--- | :--- | :--- |
| `administrator_profiles` | Staff credentials & roles | `id UUID PRIMARY KEY`, `email UNIQUE`, `password_hash VARCHAR(255) NOT NULL` |
| `announcements` | Notice titles, bodies, images, schedule | `ends_at > starts_at`, `publish_status IN ('draft', 'published', 'archived')`, `deleted_at` soft delete |
| `displays` | Physical TV screens & kiosks | `pairing_code VARCHAR(10) UNIQUE`, `is_paired BOOLEAN`, `last_seen_at` heartbeat |
| `announcement_displays` | Many-to-many screen assignments | Composite Primary Key `(announcement_id, display_id)`, `ON DELETE CASCADE` |

---

## 🚀 Getting Started

### 1. Database Setup
Ensure PostgreSQL is running locally, then initialize the database:
```bash
createdb campus_bulletin
psql -d campus_bulletin -f database/schema.sql
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

### Viewing the ER Diagram
Open [`docs/campus-bulletin-board-er.drawio`](docs/campus-bulletin-board-er.drawio) in [Draw.io / diagrams.net](https://app.diagrams.net/).
