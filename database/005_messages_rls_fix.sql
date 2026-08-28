-- ============================================================
-- ZIVA ONLINE & SPECIAL CLASSES
-- 005 — COMMUNICATION RLS FIXES
-- ============================================================
-- Two gaps found while building Phase 8 (Communication):
-- ============================================================

-- ---- 1. Mark-as-read on messages ----
-- database/rls_policies.sql only defined SELECT (messages_sender_receiver)
-- and INSERT (messages_send) policies for `messages` — no UPDATE policy
-- exists at all. The Communication module needs a receiver to mark an
-- incoming message as read (read_at), which without this policy silently
-- no-ops under RLS (the UPDATE matches zero rows, no error is raised, so
-- it looks like it "worked" while nothing actually persisted).

CREATE POLICY messages_receiver_mark_read
ON messages
FOR UPDATE
USING (receiver_id = auth.uid())
WITH CHECK (receiver_id = auth.uid());

-- ---- 2. Teacher visibility into parent_students ----
-- The supplied RLS has no teacher-facing policy on parent_students at
-- all (only parent's-own-rows and admin FOR ALL). Two features need a
-- teacher to resolve "which parent(s) belong to this student":
--   a) messaging a parent from the compose picker (this file's actual
--      trigger for noticing the gap)
--   b) notifying parents when a teacher marks an absence / uploads a
--      score — that path was instead routed through the service-role
--      client in src/lib/notifications.ts, since it's a system-side-effect
--      lookup rather than a user directly browsing parent data. This
--      policy covers the *interactive* case (b) is not relying on).
-- Scoped the same way students_teacher_view already scopes student
-- visibility — via the teacher's real teacher_assignments, not an open
-- grant.

CREATE POLICY parent_students_teacher_view
ON parent_students
FOR SELECT
USING (
    student_id IN (
        SELECT se.student_id
        FROM student_enrollments se
        JOIN teacher_assignments ta
            ON ta.class_subject_id IN (
                SELECT cs.id FROM class_subjects cs WHERE cs.class_id = se.class_id
            )
        WHERE ta.teacher_id IN (
            SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
        )
    )
);

-- ---- 3. Teacher visibility into parent_profiles ----
-- Policy 2 grants the teacher visibility into the parent_students junction
-- row, but listMessageableContacts() also nests parent_profiles(users(...))
-- from that row to get the parent's actual name. parent_profiles itself
-- only had parents_admin_manage (admin) and parents_self_select (the
-- parent's own row) — no teacher policy — so that nested join would still
-- come back empty even with policy 2 in place. Same scoping approach.

CREATE POLICY parent_profiles_teacher_view
ON parent_profiles
FOR SELECT
USING (
    id IN (
        SELECT ps.parent_id
        FROM parent_students ps
        JOIN student_enrollments se ON se.student_id = ps.student_id
        JOIN teacher_assignments ta
            ON ta.class_subject_id IN (
                SELECT cs.id FROM class_subjects cs WHERE cs.class_id = se.class_id
            )
        WHERE ta.teacher_id IN (
            SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
        )
    )
);

-- ---- 4. visible_to_parent not enforced at the RLS layer ----
-- database/002_amendments.sql added student_needs.visible_to_parent and
-- interventions.visible_to_parent specifically so internal-only notes are
-- never shown to parents (§26). The application code (listVisibleNeedsForChild)
-- filters on it correctly, but the *original* needs_parent_view /
-- interventions_parent_view RLS policies never check the flag at all — a
-- parent's session could SELECT every need for their child, internal notes
-- included, if any other query path forgot the application-side filter.
-- Per §38 ("database-level security MUST enforce access"), the flag needs
-- to be enforced here, not just trusted to the application layer.

DROP POLICY IF EXISTS needs_parent_view ON student_needs;
CREATE POLICY needs_parent_view
ON student_needs
FOR SELECT
USING (
    visible_to_parent = true
    AND student_id IN (
        SELECT student_id
        FROM parent_students
        WHERE parent_id IN (
            SELECT id FROM parent_profiles WHERE user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS interventions_parent_view ON interventions;
CREATE POLICY interventions_parent_view
ON interventions
FOR SELECT
USING (
    visible_to_parent = true
    AND student_need_id IN (
        SELECT id FROM student_needs
        WHERE visible_to_parent = true
        AND student_id IN (
            SELECT student_id
            FROM parent_students
            WHERE parent_id IN (
                SELECT id FROM parent_profiles WHERE user_id = auth.uid()
            )
        )
    )
);

-- ============================================================
-- END 005
-- ============================================================
