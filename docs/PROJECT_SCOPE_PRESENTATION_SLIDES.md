# 🎓 Campus Bulletin Board — Mock Defense Slide Deck & Scope Alignment
**BSCS 2B — College of Computer Studies (CCS)**  
**Mock Defense Date:** October 27, 2026 | 9:00 AM – 5:00 PM  
**Project:** Centralized Web-Based Digital Signage Platform  

---

## 📑 Slide Outline Overview

* **Slide 1:** Title, Team Roster & System Overview
* **Slide 2:** Problem Statement & Project Objectives
* **Slide 3:** High-Level System Architecture (Three-Tier Physical + Web)
* **Slide 4:** Scope Compliance Matrix — Part 1: Admin & Security (Items 1–2)
* **Slide 5:** Scope Compliance Matrix — Part 2: Content Management & Scheduling (Items 3–5)
* **Slide 6:** Scope Compliance Matrix — Part 3: Display Fleet & Device Pairing (Items 6–7)
* **Slide 7:** Scope Compliance Matrix — Part 4: Administration & Lifecycle (Items 8–10)
* **Slide 8:** Scope Compliance Matrix — Part 5: Technical Stack & Invariants (Items 11–13)
* **Slide 9:** Live Defense Demonstration Walkthrough Workflow
* **Slide 10:** Panel Q&A Defensible Technical Answers

---

### 🖥️ Slide 1: Title & Team Credentials
* **Slide Title:** Campus Bulletin Board: Centralized Digital Signage System
* **Subtitle:** Web-Based Notice Broadcast & Automated Display Management Platform
* **Institution:** Western Mindanao State University — College of Computer Studies (BSCS 2B)
* **Team Roles:**
  * **Bryan Saavedra (Lead):** System Architecture, PostgreSQL DDL & Express API
  * **Mae:** Admin Dashboard Metrics & Displays Fleet Overview
  * **Jay Jasper:** Physical TV Display Screen (`/display`) & 10s Carousel Loop
  * **Alkaizer:** Announcement Creation Form & Date Validation Engine
  * **Kelvin:** Display Screen Pairing Modal, Registration Flow & Pairing Routes
  * **Jared:** Feed Announcement Cards, 16:9 TV Preview Component & Search Filter Tabs

---

### 🎯 Slide 2: Problem Statement & Core Objectives
* **The Problem:** Traditional cork campus bulletin boards suffer from delayed updates, paper waste, physical clutter, and unauthorized notice tampering across distant buildings (Library, Main Hall, CCS, Student Center).
* **The Solution:** A centralized digital signage network where authorized campus administrators compose, schedule, and assign notices to physical TV displays across campus from a single web dashboard.
* **Core Value Pillars:**
  1. **Instant Campus-Wide Broadcasting:** Update screens in real time without physically walking to campus buildings.
  2. **Automated Content Lifecycle:** Zero stale notices; notices activate and expire automatically without manual intervention.
  3. **Location-Targeted Communication:** Send department-specific alerts to CCS kiosks or campus-wide advisories to all screens.

---

### 🏛️ Slide 3: Three-Tier System Architecture
* **Visual Diagram:**
  ```text
  [ Physical TV Display (/display) ]
                │ (Display Pairing Code & Heartbeat)
                ▼
  [ Express.js REST API Server ] ──(pg.Pool Connection)──▶ [ Raw PostgreSQL (Port 5432) ]
                ▲                                                        │
                │ (Admin Session)                                        ▼
  [ React 18 Admin Dashboard (Vite) ]                         [ Local Static /uploads ]
  ```
* **Key Architecture Principles:**
  * **Zero-BaaS Relational Engine:** 100% native PostgreSQL 14+ DDL with relational integrity (`ON DELETE RESTRICT` for creators, `ON DELETE CASCADE` for assignments).
  * **Lightweight Device Flow:** Physical screens behave as passive viewers requiring zero human keyboard logins—paired using an 8-character code.

---

### 📋 Slide 4: Scope Compliance — Admin & Security (Items 1–2)

| # | Professor's Specified Scope Item | Implementation Layer | Architectural Proof |
| :-: | :--- | :--- | :--- |
| **1** | **Administrator Accounts** | `administrator_profiles` table | Primary key UUID, unique institutional email, hashed credentials, and role privileges (`superadmin` / `admin`). |
| **2** | **User Authentication & Authorization** | `src/context/AuthContext.jsx` & `/login` | Restricted admin portal. Public sign-up is disabled to preserve institutional security; sessions persist via secure tokens. |

* **Speaking Point:** *"We enforce strict role separation: students never create accounts; only campus administrators onboarded by the Lead Admin can log into the management console."*

---

### 📋 Slide 5: Scope Compliance — Content & Scheduling (Items 3–5)

| # | Professor's Specified Scope Item | Implementation Layer | Architectural Proof |
| :-: | :--- | :--- | :--- |
| **3** | **Digital Content CRUD (Text, Images)** | `announcements` & `/uploads` | Supports rich text, Canva banner posters, and soft-delete protocol (`deleted_at`) to preserve institutional audit trails. |
| **4** | **Content Scheduling (Start & End Times)** | `chk_schedule_order` & Date Pickers | `ends_at > starts_at` check constraint enforced at both the UI form level and the PostgreSQL database engine level. |
| **5** | **Display Assignment (Targeted Screens)** | `announcement_displays` Junction Table | Many-to-many relationship allowing single notices to broadcast to specific screens or university-wide. |

* **Speaking Point:** *"Our schedule validation operates with defense-in-depth: React rejects invalid ranges instantly, and PostgreSQL enforces `ends_at > starts_at` at the schema level."*

---

### 📋 Slide 6: Scope Compliance — Fleet Management & Preview (Items 6–7)

| # | Professor's Specified Scope Item | Implementation Layer | Architectural Proof |
| :-: | :--- | :--- | :--- |
| **6** | **Display Registration & Fleet Management** | `PairingModal.jsx` & `/display` | RFC 8628-inspired pairing flow. Displays display an 8-character pairing code; administrators register them in 2 clicks. |
| **7** | **Content Preview Before Publishing** | `AnnouncementPreview.jsx` | Dedicated 16:9 simulated display view providing administrators visual confirmation of notice formatting before publishing. |

* **Speaking Point:** *"Physical screens pair exactly like Smart TVs on YouTube—no keyboards or local credentials are needed on the wall-mounted screen."*

---

### 📋 Slide 7: Scope Compliance — Dashboard & Lifecycle (Items 8–10)

| # | Professor's Specified Scope Item | Implementation Layer | Architectural Proof |
| :-: | :--- | :--- | :--- |
| **8** | **Search & Filtering of Posted Content** | `Announcements.jsx` | Real-time text search across notice titles/bodies plus instant tab filtering (`All`, `Active`, `Scheduled`, `Expired`). |
| **9** | **Dashboard for Administrators** | `Dashboard.jsx` | Executive overview cards showing Active Notices, Connected Screens, Upcoming Schedules, and Expired Counts. |
| **10** | **Dynamic Status Management** | PostgreSQL View `v_announcements` | Evaluated on-the-fly using current timestamp (`starts_at` & `ends_at`). Eliminates stale database states without cron jobs. |

* **Speaking Point:** *"Announcement status is a computed property rather than a static database column, guaranteeing zero out-of-sync states."*

---

### 📋 Slide 8: Scope Compliance — Stack & Relational DB (Items 11–13)

| # | Professor's Specified Scope Item | Implementation Layer | Architectural Proof |
| :-: | :--- | :--- | :--- |
| **11** | **Responsive React Interface** | React 18 + Vite + Modular CSS | Sub-second client builds, responsive desktop and kiosk views, and clean separation of styles. |
| **12** | **Express.js REST API** | Node ESM Express (`backend/src/server.js`) | Structured REST routing architecture with dedicated controllers for Auth, Announcements, and Displays. |
| **13** | **Relational PostgreSQL Database** | PostgreSQL 14+ (`campus_bulletin`) | 4 normalized relational tables, composite primary keys, check constraints, foreign keys, and optimized reverse indexes. |

---

### 🎬 Slide 9: Live Defense Demo Sequence (3-Minute Walkthrough)
1. **Administrator Login (`/login`):** Demonstrate authentication with institutional credentials and access to the dashboard.
2. **Dashboard Overview (`/dashboard`):** Showcase the 4 live metric stat cards and screen fleet connectivity list.
3. **Announcement Creation & Validation (`/announcements`):** Click `+ New Announcement`, trigger the end-date validation check, and save a notice.
4. **Live Search & Filter:** Filter announcements by status tabs and type a keyword in the search bar.
5. **Physical TV Display (`/display`):** Open the fullscreen TV display route to showcase the 10-second auto-slide rotation carousel and live clock.
6. **Screen Fleet Pairing (`/displays`):** Open `PairingModal.jsx` and demonstrate pairing an 8-character device code.

---

### 🛡️ Slide 10: Oral Defense Fast-Answers Cheat Sheet

* **Q: Why is notice status not a column in your table?**
  * *Answer:* *"Status depends on the current time. If we stored it in a column, notices would become stale unless a background cron job ran every second. Computing it dynamically via `v_announcements` guarantees real-time accuracy with zero overhead."*
* **Q: Why store image URLs instead of database BLOBs?**
  * *Answer:* *"Multer saves image assets directly to the web server's static directory. Storing only the path string in PostgreSQL keeps rows lightweight and database backups lightning fast, while Express streams the static images directly."*
* **Q: Why do we have an index on `display_id` in `announcement_displays`?**
  * *Answer:* *"The composite primary key `(announcement_id, display_id)` only optimizes lookups by announcement. Physical screens query in reverse: 'Give me all announcements assigned to Display X'. The index `idx_announcement_displays_display` makes that screen heartbeat query instantaneous."*
