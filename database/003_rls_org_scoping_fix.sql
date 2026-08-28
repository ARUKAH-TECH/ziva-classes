-- ============================================================
-- ZIVA ONLINE & SPECIAL CLASSES
-- 003 — RLS CROSS-TENANT SCOPING FIX
-- ============================================================
-- Every "*_admin_manage" policy in database/rls_policies.sql was written
-- as `USING (public.is_admin())` with no organization match. Harmless
-- today with a single organization, but a real cross-tenant hole the
-- moment a second organization exists on the same project: any admin
-- could read/write another org's data. This file drops and re-creates
-- each affected policy with an explicit organization match, following
-- the same join-subquery style already used elsewhere in the supplied
-- RLS. Run after database/schema.sql, database/rls_policies.sql, and
-- database/002_amendments.sql.
-- ============================================================

-- ---- class_schedules (already has organization_id directly) ----
DROP POLICY IF EXISTS schedules_admin_manage ON class_schedules;
CREATE POLICY schedules_admin_manage
ON class_schedules
FOR ALL
USING (public.is_admin() AND organization_id = public.current_organization_id())
WITH CHECK (public.is_admin() AND organization_id = public.current_organization_id());

-- ---- fee_structures (already has organization_id directly) ----
DROP POLICY IF EXISTS fee_structures_admin_manage ON fee_structures;
CREATE POLICY fee_structures_admin_manage
ON fee_structures
FOR ALL
USING (public.is_admin() AND organization_id = public.current_organization_id())
WITH CHECK (public.is_admin() AND organization_id = public.current_organization_id());

-- ---- class_subjects (via classes.organization_id) ----
DROP POLICY IF EXISTS class_subjects_admin_manage ON class_subjects;
CREATE POLICY class_subjects_admin_manage
ON class_subjects
FOR ALL
USING (
    public.is_admin()
    AND class_id IN (SELECT id FROM classes WHERE organization_id = public.current_organization_id())
)
WITH CHECK (
    public.is_admin()
    AND class_id IN (SELECT id FROM classes WHERE organization_id = public.current_organization_id())
);

-- ---- terms (via academic_years.organization_id) ----
DROP POLICY IF EXISTS terms_admin_manage ON terms;
CREATE POLICY terms_admin_manage
ON terms
FOR ALL
USING (
    public.is_admin()
    AND academic_year_id IN (
        SELECT id FROM academic_years WHERE organization_id = public.current_organization_id()
    )
)
WITH CHECK (
    public.is_admin()
    AND academic_year_id IN (
        SELECT id FROM academic_years WHERE organization_id = public.current_organization_id()
    )
);

-- ---- teacher_assignments (via teacher_profiles.organization_id) ----
DROP POLICY IF EXISTS teacher_assignments_admin_manage ON teacher_assignments;
CREATE POLICY teacher_assignments_admin_manage
ON teacher_assignments
FOR ALL
USING (
    public.is_admin()
    AND teacher_id IN (
        SELECT id FROM teacher_profiles WHERE organization_id = public.current_organization_id()
    )
)
WITH CHECK (
    public.is_admin()
    AND teacher_id IN (
        SELECT id FROM teacher_profiles WHERE organization_id = public.current_organization_id()
    )
);

-- ---- parent_students (via parent_profiles.organization_id) ----
DROP POLICY IF EXISTS parent_students_admin_manage ON parent_students;
CREATE POLICY parent_students_admin_manage
ON parent_students
FOR ALL
USING (
    public.is_admin()
    AND parent_id IN (
        SELECT id FROM parent_profiles WHERE organization_id = public.current_organization_id()
    )
)
WITH CHECK (
    public.is_admin()
    AND parent_id IN (
        SELECT id FROM parent_profiles WHERE organization_id = public.current_organization_id()
    )
);

-- ---- student_enrollments (via classes.organization_id) ----
DROP POLICY IF EXISTS enrollments_admin_manage ON student_enrollments;
CREATE POLICY enrollments_admin_manage
ON student_enrollments
FOR ALL
USING (
    public.is_admin()
    AND class_id IN (SELECT id FROM classes WHERE organization_id = public.current_organization_id())
)
WITH CHECK (
    public.is_admin()
    AND class_id IN (SELECT id FROM classes WHERE organization_id = public.current_organization_id())
);

-- ---- student_subjects (via class_subjects -> classes.organization_id) ----
DROP POLICY IF EXISTS student_subjects_admin_manage ON student_subjects;
CREATE POLICY student_subjects_admin_manage
ON student_subjects
FOR ALL
USING (
    public.is_admin()
    AND class_subject_id IN (
        SELECT cs.id FROM class_subjects cs
        JOIN classes c ON c.id = cs.class_id
        WHERE c.organization_id = public.current_organization_id()
    )
)
WITH CHECK (
    public.is_admin()
    AND class_subject_id IN (
        SELECT cs.id FROM class_subjects cs
        JOIN classes c ON c.id = cs.class_id
        WHERE c.organization_id = public.current_organization_id()
    )
);

-- ---- student_locations (via student_profiles.organization_id) ----
DROP POLICY IF EXISTS locations_admin_manage ON student_locations;
CREATE POLICY locations_admin_manage
ON student_locations
FOR ALL
USING (
    public.is_admin()
    AND student_id IN (
        SELECT id FROM student_profiles WHERE organization_id = public.current_organization_id()
    )
)
WITH CHECK (
    public.is_admin()
    AND student_id IN (
        SELECT id FROM student_profiles WHERE organization_id = public.current_organization_id()
    )
);

-- ---- class_sessions (via class_subjects -> classes.organization_id) ----
DROP POLICY IF EXISTS sessions_admin_manage ON class_sessions;
CREATE POLICY sessions_admin_manage
ON class_sessions
FOR ALL
USING (
    public.is_admin()
    AND class_subject_id IN (
        SELECT cs.id FROM class_subjects cs
        JOIN classes c ON c.id = cs.class_id
        WHERE c.organization_id = public.current_organization_id()
    )
)
WITH CHECK (
    public.is_admin()
    AND class_subject_id IN (
        SELECT cs.id FROM class_subjects cs
        JOIN classes c ON c.id = cs.class_id
        WHERE c.organization_id = public.current_organization_id()
    )
);

-- ---- attendance (via class_sessions -> class_subjects -> classes) ----
DROP POLICY IF EXISTS attendance_admin_manage ON attendance;
CREATE POLICY attendance_admin_manage
ON attendance
FOR ALL
USING (
    public.is_admin()
    AND session_id IN (
        SELECT s.id FROM class_sessions s
        JOIN class_subjects cs ON cs.id = s.class_subject_id
        JOIN classes c ON c.id = cs.class_id
        WHERE c.organization_id = public.current_organization_id()
    )
)
WITH CHECK (
    public.is_admin()
    AND session_id IN (
        SELECT s.id FROM class_sessions s
        JOIN class_subjects cs ON cs.id = s.class_subject_id
        JOIN classes c ON c.id = cs.class_id
        WHERE c.organization_id = public.current_organization_id()
    )
);

-- ---- assessments (via class_subjects -> classes.organization_id) ----
DROP POLICY IF EXISTS assessments_admin_manage ON assessments;
CREATE POLICY assessments_admin_manage
ON assessments
FOR ALL
USING (
    public.is_admin()
    AND class_subject_id IN (
        SELECT cs.id FROM class_subjects cs
        JOIN classes c ON c.id = cs.class_id
        WHERE c.organization_id = public.current_organization_id()
    )
)
WITH CHECK (
    public.is_admin()
    AND class_subject_id IN (
        SELECT cs.id FROM class_subjects cs
        JOIN classes c ON c.id = cs.class_id
        WHERE c.organization_id = public.current_organization_id()
    )
);

-- ---- scores (via assessments -> class_subjects -> classes) ----
DROP POLICY IF EXISTS scores_admin_manage ON scores;
CREATE POLICY scores_admin_manage
ON scores
FOR ALL
USING (
    public.is_admin()
    AND assessment_id IN (
        SELECT a.id FROM assessments a
        JOIN class_subjects cs ON cs.id = a.class_subject_id
        JOIN classes c ON c.id = cs.class_id
        WHERE c.organization_id = public.current_organization_id()
    )
)
WITH CHECK (
    public.is_admin()
    AND assessment_id IN (
        SELECT a.id FROM assessments a
        JOIN class_subjects cs ON cs.id = a.class_subject_id
        JOIN classes c ON c.id = cs.class_id
        WHERE c.organization_id = public.current_organization_id()
    )
);

-- ---- student_charges (via student_profiles.organization_id) ----
DROP POLICY IF EXISTS student_charges_admin_manage ON student_charges;
CREATE POLICY student_charges_admin_manage
ON student_charges
FOR ALL
USING (
    public.is_admin()
    AND student_id IN (
        SELECT id FROM student_profiles WHERE organization_id = public.current_organization_id()
    )
)
WITH CHECK (
    public.is_admin()
    AND student_id IN (
        SELECT id FROM student_profiles WHERE organization_id = public.current_organization_id()
    )
);

-- ---- payments (via student_profiles.organization_id) ----
DROP POLICY IF EXISTS payments_admin_manage ON payments;
CREATE POLICY payments_admin_manage
ON payments
FOR ALL
USING (
    public.is_admin()
    AND student_id IN (
        SELECT id FROM student_profiles WHERE organization_id = public.current_organization_id()
    )
)
WITH CHECK (
    public.is_admin()
    AND student_id IN (
        SELECT id FROM student_profiles WHERE organization_id = public.current_organization_id()
    )
);

-- ---- payment_allocations (via student_charges -> student_profiles) ----
DROP POLICY IF EXISTS payment_allocations_admin_manage ON payment_allocations;
CREATE POLICY payment_allocations_admin_manage
ON payment_allocations
FOR ALL
USING (
    public.is_admin()
    AND student_charge_id IN (
        SELECT sc.id FROM student_charges sc
        JOIN student_profiles sp ON sp.id = sc.student_id
        WHERE sp.organization_id = public.current_organization_id()
    )
)
WITH CHECK (
    public.is_admin()
    AND student_charge_id IN (
        SELECT sc.id FROM student_charges sc
        JOIN student_profiles sp ON sp.id = sc.student_id
        WHERE sp.organization_id = public.current_organization_id()
    )
);

-- ---- student_needs (via student_profiles.organization_id) ----
DROP POLICY IF EXISTS needs_admin_manage ON student_needs;
CREATE POLICY needs_admin_manage
ON student_needs
FOR ALL
USING (
    public.is_admin()
    AND student_id IN (
        SELECT id FROM student_profiles WHERE organization_id = public.current_organization_id()
    )
)
WITH CHECK (
    public.is_admin()
    AND student_id IN (
        SELECT id FROM student_profiles WHERE organization_id = public.current_organization_id()
    )
);

-- ---- interventions (via student_needs -> student_profiles) ----
DROP POLICY IF EXISTS interventions_admin_manage ON interventions;
CREATE POLICY interventions_admin_manage
ON interventions
FOR ALL
USING (
    public.is_admin()
    AND student_need_id IN (
        SELECT sn.id FROM student_needs sn
        JOIN student_profiles sp ON sp.id = sn.student_id
        WHERE sp.organization_id = public.current_organization_id()
    )
)
WITH CHECK (
    public.is_admin()
    AND student_need_id IN (
        SELECT sn.id FROM student_needs sn
        JOIN student_profiles sp ON sp.id = sn.student_id
        WHERE sp.organization_id = public.current_organization_id()
    )
);

-- ---- announcements (SELECT was already org-scoped; ALL/admin was not) ----
DROP POLICY IF EXISTS announcements_admin_manage ON announcements;
CREATE POLICY announcements_admin_manage
ON announcements
FOR ALL
USING (public.is_admin() AND organization_id = public.current_organization_id())
WITH CHECK (public.is_admin() AND organization_id = public.current_organization_id());

-- ---- terminal_reports (via student_profiles.organization_id) ----
DROP POLICY IF EXISTS terminal_reports_admin_manage ON terminal_reports;
CREATE POLICY terminal_reports_admin_manage
ON terminal_reports
FOR ALL
USING (
    public.is_admin()
    AND student_id IN (
        SELECT id FROM student_profiles WHERE organization_id = public.current_organization_id()
    )
)
WITH CHECK (
    public.is_admin()
    AND student_id IN (
        SELECT id FROM student_profiles WHERE organization_id = public.current_organization_id()
    )
);

-- ---- terminal_report_subjects (via terminal_reports -> student_profiles) ----
DROP POLICY IF EXISTS terminal_report_subjects_admin_manage ON terminal_report_subjects;
CREATE POLICY terminal_report_subjects_admin_manage
ON terminal_report_subjects
FOR ALL
USING (
    public.is_admin()
    AND terminal_report_id IN (
        SELECT tr.id FROM terminal_reports tr
        JOIN student_profiles sp ON sp.id = tr.student_id
        WHERE sp.organization_id = public.current_organization_id()
    )
)
WITH CHECK (
    public.is_admin()
    AND terminal_report_id IN (
        SELECT tr.id FROM terminal_reports tr
        JOIN student_profiles sp ON sp.id = tr.student_id
        WHERE sp.organization_id = public.current_organization_id()
    )
);

-- ============================================================
-- Not changed — already correctly org-scoped in the supplied file:
-- organization_admin_all, users_admin_manage, teachers_admin_manage,
-- parents_admin_manage, academic_years_admin_manage, classes_admin_manage,
-- subjects_admin_manage, students_admin_manage, academic_levels_admin_manage,
-- audit_logs_admin_view, audit_logs_system_insert.
-- ============================================================

-- ============================================================
-- END 003
-- ============================================================
