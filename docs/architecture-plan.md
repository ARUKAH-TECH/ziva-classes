# ZIVA Online & Special Classes Management System (SCMS) — Architecture & First Deliverable

## Context

ZIVA Online & Special Classes needs a production-grade, role-based web platform (admin/teacher/parent/optional-student portals) covering academics, attendance, fees, and official terminal reports, built on Next.js + Supabase, using an already-supplied Postgres schema and RLS policy set as source of truth, and the official ZIVA logo for all branding. The request explicitly calls for a **First Deliverable** (architecture/design docs) before any application code is written. This plan is that deliverable, plus my review of the supplied schema/RLS/logo (workflow Steps 1–5) and the resulting recommended amendments.

Project folder: `C:\Users\ROAR OR DIE TV\Documents\ziva-classes\`
Already saved this session:
- `database/schema.sql` — supplied schema, saved verbatim
- `database/rls_policies.sql` — supplied RLS, saved verbatim
- `public/images/ziva-logo-original.jpg` — official logo, saved verbatim (272×278px JPEG — fine for UI, soft if blown up large on print; flagged to user, no fix applied since regenerating/upscaling would risk altering the asset)

No application code exists yet. This is a greenfield build.

---

## 1. Findings From Reviewing the Supplied Schema & RLS (Steps 1–5)

These are **not applied yet** — they're proposed amendments for approval, per the rule "if a database modification is necessary, explain why before making the change."

### 1a. Critical: cross-tenant RLS gap in admin policies
Every `..._admin_manage` policy (teacher_assignments, class_subjects, terms, assessments, scores, attendance, fee_structures, student_charges, payments, payment_allocations, student_needs, interventions, terminal_reports, terminal_report_subjects, sessions, schedules, enrollments, student_subjects, locations, announcements) is written as:
```sql
USING (public.is_admin())
```
with **no organization match**. For a single-org deployment this is harmless today, but the schema is explicitly multi-tenant-shaped (`organization_id` everywhere), and requirement §38 says "Database-level security MUST enforce access." As written, if ZIVA ever onboards a second organization on the same Supabase project, any admin from Org A could read/write Org B's teacher assignments, scores, payments, etc. **Recommendation:** patch these policies to also verify org match (directly where the table has `organization_id`, otherwise via a join to the owning class/student/teacher record), in a new `003_rls_org_scoping_fix.sql` — original file untouched.

### 1b. Missing: configurable grading system (required by §22, confirmed with you)
No table represents grade bands anywhere — `scores.grade` and `terminal_report_subjects.grade` are freeform `VARCHAR(10)`. Per your choice, add **one grading scale per academic level** (Primary/JHS/SHS get independently configurable bands, matching BECE/WASSCE-style conventions):
```sql
grading_scales (id, organization_id, academic_level_id, name, is_active, created_at)
grade_bands (id, grading_scale_id, min_score, max_score, grade_label, grade_point, remark, display_order)
```
Grade computation (score → label) becomes a lookup against the active scale for the student's level at report-generation time — never hard-coded.

### 1c. Missing: organization-level configurable settings (required by §5, §23, §13, §9)
`organizations` has no home for: social handles, ranking-enabled-by-default, "can parents edit location/photo," currency symbol, etc. Add:
```sql
ALTER TABLE organizations ADD COLUMN social_media JSONB DEFAULT '{}'::jsonb;
ALTER TABLE organizations ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
-- settings keys: parent_can_edit_location, parent_can_edit_photo, ranking_enabled_default, currency_symbol, ...
```
JSONB avoids a migration every time the org needs a new toggle — matches "do not hard-code."

### 1d. Missing: parent edit → approval queue (required by §9, §13, confirmed with you)
No mechanism exists for parent-submitted location/photo changes. RLS as supplied gives parents **view-only** access to `student_profiles`/`student_locations` — no INSERT/UPDATE path at all. Per your choice (pending-approval queue), add:
```sql
parent_change_requests (
  id, student_id, parent_id,
  request_type request_change_type NOT NULL,  -- 'PHOTO' | 'LOCATION'
  payload JSONB NOT NULL,                     -- new photo storage path OR new location fields
  status request_status NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```
Parent RLS: INSERT/SELECT own requests only. Admin RLS: SELECT/UPDATE all requests in their org. Approval writes the real `student_locations` row or storage object and logs to `audit_logs`.

### 1e. Ambiguous: photo/profile "url" columns imply public URLs
`student_profiles.passport_photo_url`, `users.profile_photo_url` are named `*_url`, but §9/§38 require protected, non-public access via signed URLs from Supabase Storage. Storing a raw public URL contradicts that. **Recommendation:** rename to `passport_photo_path` / `profile_photo_path` (store the storage object path; the app resolves a short-lived signed URL at render time). `organizations.logo_url` stays as-is — the org logo is intentionally public.

### 1f. Missing: parent-visibility flag on educational support data (required by §26)
`student_needs`/`interventions` have no way to mark a note internal-only vs parent-facing, but §26 explicitly forbids exposing private administrative notes to parents. Add `visible_to_parent BOOLEAN NOT NULL DEFAULT TRUE` to both tables; parent-facing RLS/queries filter on it.

### 1g. Missing: terminal report immutability mechanism (required by §30)
`terminal_reports` has `version`/`status`/timestamps but nothing actually **freezes** the rendered content. Add:
```sql
ALTER TABLE terminal_reports ADD COLUMN snapshot_data JSONB;
ALTER TABLE terminal_reports ADD COLUMN sessions_expected INTEGER;
ALTER TABLE terminal_reports ADD COLUMN sessions_present INTEGER;
ALTER TABLE terminal_reports ADD COLUMN sessions_absent INTEGER;
ALTER TABLE terminal_reports ADD COLUMN sessions_late INTEGER;
ALTER TABLE terminal_reports ADD COLUMN sessions_excused INTEGER;
ALTER TABLE terminal_reports ADD COLUMN attendance_percentage NUMERIC(5,2);
```
`snapshot_data` captures the fully-rendered report payload (subjects, grades, comments, attendance counts, student/class/photo reference, performance summary) **once, at publish time**. DRAFT reports compute live; PUBLISHED reports render from the frozen snapshot only. Re-generating after publish creates a new `version` row (old one flips to `ARCHIVED`) rather than mutating the published one.

### 1h. Deferred (not MVP)
`user_role` stays an ENUM (5 fixed roles is fine). §7's "Admin: management access according to **assigned permissions**" implies finer-grained admin sub-permissions than the enum supports — no detail was given on what those sub-permissions are, so I'm deferring granular admin ACLs to a should-have phase rather than over-building now. Flagging so it isn't forgotten.

All of the above will live in `database/002_amendments.sql` and `database/003_rls_org_scoping_fix.sql` (new files, original two untouched) as the first implementation step, pending your approval.

---

## 2. ZIVA Design System

### Color tokens — sampled directly from the supplied logo file, not guessed
| Token | Hex | Source | Usage |
|---|---|---|---|
| `navy-900` | `#0A1F44` | darkest logo blue cluster | Sidebar, header, primary headings, structural elements |
| `royal-600` | `#0B5FA5` | mid logo blue cluster | Primary buttons, active nav, links, key interactive controls |
| `sky-400` | `#2B93D1` | lightest logo blue cluster | Info states, chart series, secondary highlights, selected states |
| `gold-500` | `#B8873C` | sampled gold star/ribbon pixels, deepened slightly for text contrast | Stat highlights, report accents, dividers, premium/featured badges — **never** a status-fill color |
| `gold-100` | `#F1E4C8` | tint of gold-500 | Subtle gold background washes (e.g. "featured" card tint) |
| `white` | `#FFFFFF` | — | Primary background |
| `surface` | `#F7F8FA` | — | Page background behind cards |
| `gray-100` | `#EEF1F4` | — | Cards, table stripes, form backgrounds |
| `gray-300` | `#DCE1E8` | — | Borders, dividers |
| `text-primary` | `#101828` | — | Body text |
| `text-secondary` | `#5B6472` | — | Metadata, captions |
| `success` | `#16A34A` | — | Paid, present, completed |
| `warning` | `#F59E0B` | — | Pending, late — **intentionally more orange than gold-500** so status badges never get mistaken for the brand accent |
| `error` | `#DC2626` | — | Failed, absent, critical |

### Typography
- Headings: Poppins (via `next/font/google`) — weights 600/700 only, H1 32/40, H2 24/32, H3 18/26.
- Body: Inter (via `next/font/google`) — 400/500/600, body 14–16px/22–24 leading, small 12–13px, metadata 11–12px uppercase-tracked.
- No decorative fonts anywhere in interface chrome.

### Component surface language
Radius: 8px default, 12px on top-level cards only (not "excessively rounded"). Borders: 1px `gray-300`, shadows kept to a single soft `0 1px 2px` on cards — no stacked/heavy shadows. Icon set: Lucide (clean, consistent stroke, matches "professional icons" requirement).

### Logo usage rule
Original file used as-is everywhere (login, headers, sidebars, PDFs). Only transformation permitted: uniform scaling with locked aspect ratio and adequate clear-space padding — never stretched, recolored, rotated, or cropped.

---

## 3. System Architecture

**Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS (tokens above as Tailwind theme extension) + shadcn/ui-style primitives (Radix under the hood) for accessible base components, TanStack Table for data grids, React Hook Form + Zod for forms/validation, Recharts for dashboard charts, date-fns.

**Backend:** Supabase — Postgres (supplied schema + amendments), Supabase Auth (email/password to start; role stored in `users.role`), Supabase Storage (private `student-photos` bucket, signed URLs only), Postgres RPC functions / Supabase Edge Functions for privileged operations that must bypass a plain client RLS check in a controlled way: publishing a terminal report (freezes snapshot), approving a parent change request, generating a PDF.

**PDF generation:** server-side HTML→PDF (Puppeteer via an Edge Function or Node route) rendering the *same* print-styled React report component used for on-screen preview — guarantees the preview and the downloaded PDF are pixel-identical, avoiding a second "looks different when printed" implementation.

**Routing/authorization shape:**
```
/app
  /(auth)/login, /register
  /(admin)/dashboard, students, parents, teachers, classes, subjects,
            timetable, attendance, assessments, results, terminal-reports,
            fees, support, communication, reports, settings
  /(teacher)/dashboard, my-classes, my-students, my-subjects, timetable,
             attendance, assessments, results, support, messages, profile
  /(parent)/dashboard, children, attendance, performance, fees, timetable,
            feedback, terminal-reports, notifications, profile
  /(student)/dashboard, subjects, timetable, attendance, results,
             assignments, terminal-reports, feedback, notifications, profile
/components/ui        (Button, Card, Table, Modal, Tabs, Badge, Toast, ...)
/components/domain     (StudentCard, AttendanceRow, PaymentCard, TerminalReportPreview, PhotoUpload, ...)
/lib/supabase          (browser + server clients)
/lib/permissions       (UI-side role gates mirroring RLS — never the source of truth, just UX)
/lib/reports           (grading lookup, aggregation, snapshot builder)
middleware.ts          (session check + role-based route redirect)
```
`middleware.ts` reads the Supabase session, resolves role from `users`, and redirects to the correct portal root — this is a UX convenience only; every data access is still enforced at the RLS layer per §38.

**Mobile-readiness:** because Supabase is the entire backend (Auth/DB/Storage), a future native app talks to the exact same Postgres schema/RLS/Storage — no parallel API to build later.

---

## 4. Database → UI Mapping (by module)

| Module | Primary tables | Key screens |
|---|---|---|
| Students | `student_profiles`, `student_enrollments`, `student_subjects`, `parent_students` | Student list, Student profile (tabs per §8) |
| Locations | `student_locations`, `parent_change_requests` | Location tab (current + history timeline), parent request queue |
| Home Service | `class_sessions` (session_type=HOME_SERVICE), `student_location_snapshot` | Home-service session list, session detail |
| Timetable | `class_schedules`, `class_subjects`, `teacher_assignments` | Admin/Teacher/Parent timetable views |
| Attendance | `class_sessions`, `attendance` | Take-attendance screen (photo beside name), attendance overview |
| Assessments/Results | `assessments`, `scores`, `grading_scales`, `grade_bands` | Assessment builder, score entry, performance dashboard |
| Fees/Payments | `fee_structures`, `student_charges`, `payments`, `payment_allocations` | Fee statement, payment entry + allocation UI, financial dashboard |
| Educational Support | `student_needs`, `interventions` (+ `visible_to_parent`) | Teacher support log, parent-facing summary |
| Terminal Reports | `terminal_reports`, `terminal_report_subjects` (+ snapshot fields) | Report generator, preview, publish flow, parent/student report view, PDF export |
| Communication | `announcements`, `messages`, `notifications` | Announcement composer, inbox, notification bell |
| Photos | Supabase Storage `student-photos` bucket + `student_profiles.passport_photo_path` | Upload widget, avatar everywhere per §9 |

---

## 5. Role/Permission Matrix (summary)

| Area | Super Admin | Admin | Teacher | Parent | Student (optional) |
|---|---|---|---|---|---|
| Org settings | Full | Full | — | — | — |
| Students | Full CRUD | Full CRUD | View assigned only | View own children only | View self only |
| Photos | Upload/replace/remove | Upload/replace/remove | View assigned only | Submit change request (queue) | View self only |
| Attendance | Full | Full | Mark for own sessions | View own children | View self |
| Scores/Assessments | Full | Full | Enter for own subjects | View own children | View self |
| Fees/Payments | Full | Full | None | View own children's charges/payments | View self (if permitted) |
| Terminal Reports | Create/publish/unpublish | Create/publish/unpublish | Enter subject results+comments only | View published only | View published only |
| Location | Full edit | Full edit | View assigned students | Submit change request (queue) | View self |

Enforced at the database layer (RLS + amendments above); UI-layer checks in `lib/permissions` are convenience only, never the security boundary — per §38.

---

## 6. Key Workflows

**Student photo:** authorized staff upload → Storage `student-photos/{student_id}/{filename}` → `student_profiles.passport_photo_path` updated → app resolves signed URL (short TTL) wherever a photo renders (list, profile, attendance, terminal report). Parent-submitted photo changes go through `parent_change_requests` (status PENDING → admin approves → applied + audit-logged).

**Location history:** new location = INSERT new row with `is_current = true`; previous current row gets `is_current = false`, `effective_to = now()`. Never UPDATE/overwrite in place — history is preserved by design (matches supplied schema already).

**Home service:** `class_sessions.student_location_snapshot` is populated **at session-creation time** from the student's then-current `student_locations` row (copied as text, not a live FK) — later location changes never retroactively alter past sessions.

**Attendance:** always tied to a `class_sessions` row. Attendance % is **computed** (present / expected sessions in range) via a view/RPC at read time — never stored as a manually-entered number, per §18.

**Payments:** a `payments` row is allocated across one or more `student_charges` via `payment_allocations`; charge balance = `amount_due − Σ(allocations)`. Methods restricted to `MTN_MOBILE_MONEY` / `CASH` at the enum level — GCB cannot appear because it isn't a valid enum value.

**Terminal report data flow:** Generate (DRAFT, computed live from enrollments/scores/attendance/grading_scales) → Preview → Publish (writes `snapshot_data` + attendance counts, flips status to PUBLISHED, sets `published_by`/`published_at`) → any later re-generation creates a new `version`, archives the old one. Parents/students only ever see `status = PUBLISHED`, rendered from the frozen snapshot.

**Terminal report layout (print/PDF, A4):** Logo + org name/motto/EST. 2023 header → student photo + identity block → per-subject academic table → performance summary (avg, grade, strongest subject, areas for improvement, optional position if `ranking_enabled`) → attendance block → teacher comments → parent-facing educational support summary (only `visible_to_parent = true` items) → simple fee status badge (no transaction detail) → administrative section (admin comment, authorized-by, date, signature area). Blue/white/gold, clean tabular layout — explicitly not a "certificate" style.

---

## 7. Responsive Strategy

- **Desktop/laptop:** persistent sidebar + header + content, full data tables.
- **Tablet:** sidebar collapses to icon rail, expandable on tap.
- **Mobile:** top app bar + slide-in drawer; parent portal additionally gets a bottom tab bar (Dashboard/Children/Fees/Reports/Profile) since §40 singles out the parent portal for extra mobile care; tables become stacked cards or horizontally-scrollable with a sticky first column; terminal report preview renders as a scrollable A4-simulated view with pinch-zoom before PDF download/print.

---

## 8. MVP Implementation Plan (phased)

0. **(This deliverable)** — architecture + schema amendments, pending your approval.
1. Project scaffold (Next.js + Tailwind + design tokens), Supabase project wiring, schema+amendments applied, auth + role-based routing.
2. Org settings, academic structure (years/terms/levels/classes/subjects/class_subjects), teacher assignments — admin CRUD.
3. Student management incl. photo upload/signed URLs, location history, parent-child linking, parent portal read views.
4. Timetable + session-based attendance (with photo-beside-name UX).
5. Assessments, scores, grading scales, results/performance dashboards.
6. Fees, charges, payments, allocations, financial dashboard.
7. Terminal report engine — generation, preview, publish/versioning, PDF export. (Core module, per §20.)
8. Communication, educational needs/interventions, parent change-request approval queue.
9. Full reports suite, accessibility pass, responsive QA, RLS security test pass, seed data, UAT.

---

## 9. Verification Approach

- **This deliverable:** you review the schema amendments (§1) and design tokens (§2) below before I touch any code.
- **Phase 1+:** RLS correctness verified by role-switch testing (log in as each role, confirm exact allowed/denied access — especially the cross-tenant fix); Playwright for responsive/e2e flows; manual print/PDF QA of the terminal report against a real A4 printer; Lighthouse/axe pass for accessibility (§41).
