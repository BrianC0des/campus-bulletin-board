# Campus Bulletin Board Digital Signage System

A centralized web-based digital signage platform where campus administrators create and schedule notices, announcements, and schedules for physical display boards across campus buildings (Library, Main Hall, Engineering, Student Center, Cafeteria).

---

## 🏛️ System Architecture

```
[ Physical Display Browser (/display) ]
              │ (Opaque Display Credential Cookie)
              ▼
[ Express.js REST API ] ──(Service Role Token)──▶ [ Supabase PostgreSQL ]
              ▲                                              │
              │ (Supabase Access Token)                      ▼
[ Administrator Dashboard (React + Vite) ]          [ Cloudflare R2 (Images) ]
```

### Core Security & Architectural Principles
- **No Direct Database Access from Frontend**: React and physical browser displays never talk directly to Supabase PostgreSQL. All public client access is denied via RLS and explicit revocations.
- **Strict Role Separation**: Displays authenticate via high-entropy opaque credentials stored in secure HTTP-only cookies; administrators authenticate via Supabase Auth and active profile status verification.
- **Calculated Content Status**: Statuses (`scheduled`, `active`, `expired`) are evaluated dynamically using PostgreSQL timestamp intervals rather than mutable database state columns.
- **Dual-Key Display Pairing**: Single-use 10-minute pairing codes use HMAC lookup tokens and encrypted payloads. Session reuse and replacements are protected by transaction-level advisory locks (`pg_advisory_xact_lock`).
- **Hardened SECURITY DEFINER Functions**: All stored procedures explicitly specify `SET search_path = pg_catalog, public`, have `REVOKE ALL FROM PUBLIC, anon, authenticated`, and are executable only by `service_role`.

---

## 📁 Repository Structure

```
.
├── docs/
│   └── campus-bulletin-board-er.drawio     # Draw.io Crow's Foot ER Diagram (v1.1)
├── src/
│   └── models/
│       └── database.js                     # JavaScript database models, JSDoc types & mappers
├── supabase/
│   ├── config.toml                         # Supabase CLI configuration
│   ├── migrations/
│   │   └── 20261003000000_init_schema.sql  # DDL, indexes, triggers & locked-down procedures
│   └── seed.sql                            # Development seed data with Auth user handling
└── README.md
```

---

## 🗄️ Database Entities & Invariants

| Table | Purpose | Key Constraints & Invariants |
| :--- | :--- | :--- |
| `administrator_profiles` | Administrator identities & status | 1:1 with `auth.users`, composite names (`first_name`, optional `middle_name`, `last_name`), `account_status IN ('active', 'disabled')` |
| `announcements` | Notice titles, bodies, R2 keys, schedules | `ends_at > starts_at`, non-blank fields, image consistency (`key` and `mime` both null or both set) |
| `displays` | Logical campus bulletin board locations | `registered` / `unregistered` lifecycle invariants (`unregistered_at IS NULL` when registered) |
| `announcement_displays` | Many-to-many board assignments | Relational schema allows `0..N` for cascading safety; `save_announcement_with_displays()` strictly requires `>= 1` registered display |
| `pairing_sessions` | Temporary pairing sessions | 10-min TTL, HMAC lookup, encrypted code, advisory-locked atomic creation & reuse |
| `display_credentials` | Opaque display authentication hashes | Partial unique index enforces **at most one** active credential per display; pairing/re-registration guarantees exactly one active credential for registered displays |

---

## 🚀 Getting Started

### Prerequisites
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase 2.119.0+`) or PostgreSQL 15+
- Node.js 20+ / Bun / pnpm

### Local Development with Supabase
```bash
# Start local Supabase stack
supabase start

# Reset database & apply hardened migrations + seed data
supabase db reset
```

### Active Display Content Retrieval Query
```sql
SELECT 
  a.id,
  a.title,
  a.body,
  a.image_object_key,
  a.image_mime_type,
  a.image_version,
  a.starts_at,
  a.ends_at
FROM public.announcements a
JOIN public.announcement_displays ad ON ad.announcement_id = a.id
JOIN public.displays d ON d.id = ad.display_id
WHERE ad.display_id = $1
  AND d.registration_status = 'registered'
  AND a.starts_at <= now()
  AND a.ends_at > now()
ORDER BY 
  a.starts_at DESC, 
  a.created_at DESC, 
  a.id ASC
LIMIT $2; -- Configured via DISPLAY_MAX_ITEMS in Express
```

### Viewing the ER Diagram in Draw.io
Open [`docs/campus-bulletin-board-er.drawio`](docs/campus-bulletin-board-er.drawio) in [Draw.io / diagrams.net](https://app.diagrams.net/) or in the local Draw.io container.
