-- ============================================================
-- ZIVA ONLINE & SPECIAL CLASSES
-- PHASE 7 — SUPABASE RLS / SECURITY
-- ============================================================

-- ============================================================
-- 1. ENABLE RLS
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_report_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT role
    FROM public.users
    WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT organization_id
    FROM public.users
    WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
        AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
        AND role = 'SUPER_ADMIN'
    )
$$;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
        AND role = 'TEACHER'
    )
$$;

CREATE OR REPLACE FUNCTION public.is_parent()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
        AND role = 'PARENT'
    )
$$;

CREATE OR REPLACE FUNCTION public.is_student()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
        AND role = 'STUDENT'
    )
$$;

-- ============================================================
-- 3. ORGANIZATION POLICIES
-- ============================================================

CREATE POLICY organization_select
ON organizations
FOR SELECT
USING (
    id = public.current_organization_id()
);

CREATE POLICY organization_admin_all
ON organizations
FOR ALL
USING (
    public.is_admin()
    AND id = public.current_organization_id()
)
WITH CHECK (
    public.is_admin()
    AND id = public.current_organization_id()
);

-- ============================================================
-- 4. USERS
-- ============================================================

CREATE POLICY users_select
ON users
FOR SELECT
USING (
    organization_id = public.current_organization_id()
);

CREATE POLICY users_admin_manage
ON users
FOR ALL
USING (
    public.is_admin()
    AND organization_id = public.current_organization_id()
)
WITH CHECK (
    public.is_admin()
    AND organization_id = public.current_organization_id()
);

CREATE POLICY users_self_update
ON users
FOR UPDATE
USING (
    id = auth.uid()
)
WITH CHECK (
    id = auth.uid()
);

-- ============================================================
-- 5. TEACHERS
-- ============================================================

CREATE POLICY teachers_admin_manage
ON teacher_profiles
FOR ALL
USING (
    public.is_admin()
    AND organization_id = public.current_organization_id()
)
WITH CHECK (
    public.is_admin()
    AND organization_id = public.current_organization_id()
);

CREATE POLICY teachers_self_select
ON teacher_profiles
FOR SELECT
USING (
    user_id = auth.uid()
);

-- ============================================================
-- 6. PARENTS
-- ============================================================

CREATE POLICY parents_admin_manage
ON parent_profiles
FOR ALL
USING (
    public.is_admin()
    AND organization_id = public.current_organization_id()
)
WITH CHECK (
    public.is_admin()
    AND organization_id = public.current_organization_id()
);

CREATE POLICY parents_self_select
ON parent_profiles
FOR SELECT
USING (
    user_id = auth.uid()
);

-- ============================================================
-- 7. ACADEMIC YEARS / TERMS / LEVELS
-- ============================================================

CREATE POLICY academic_years_org_access
ON academic_years
FOR SELECT
USING (
    organization_id = public.current_organization_id()
);

CREATE POLICY academic_years_admin_manage
ON academic_years
FOR ALL
USING (
    public.is_admin()
    AND organization_id = public.current_organization_id()
)
WITH CHECK (
    public.is_admin()
    AND organization_id = public.current_organization_id()
);

CREATE POLICY terms_org_access
ON terms
FOR SELECT
USING (
    academic_year_id IN (
        SELECT id
        FROM academic_years
        WHERE organization_id = public.current_organization_id()
    )
);

CREATE POLICY terms_admin_manage
ON terms
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY academic_levels_org_access
ON academic_levels
FOR SELECT
USING (
    organization_id = public.current_organization_id()
);

CREATE POLICY academic_levels_admin_manage
ON academic_levels
FOR ALL
USING (
    public.is_admin()
    AND organization_id = public.current_organization_id()
);

-- ============================================================
-- 8. CLASSES
-- ============================================================

CREATE POLICY classes_org_access
ON classes
FOR SELECT
USING (
    organization_id = public.current_organization_id()
);

CREATE POLICY classes_admin_manage
ON classes
FOR ALL
USING (
    public.is_admin()
    AND organization_id = public.current_organization_id()
)
WITH CHECK (
    public.is_admin()
    AND organization_id = public.current_organization_id()
);

-- ============================================================
-- 9. SUBJECTS
-- ============================================================

CREATE POLICY subjects_org_access
ON subjects
FOR SELECT
USING (
    organization_id = public.current_organization_id()
);

CREATE POLICY subjects_admin_manage
ON subjects
FOR ALL
USING (
    public.is_admin()
    AND organization_id = public.current_organization_id()
)
WITH CHECK (
    public.is_admin()
    AND organization_id = public.current_organization_id()
);

-- ============================================================
-- 10. CLASS SUBJECTS
-- ============================================================

CREATE POLICY class_subjects_org_access
ON class_subjects
FOR SELECT
USING (
    class_id IN (
        SELECT id
        FROM classes
        WHERE organization_id = public.current_organization_id()
    )
);

CREATE POLICY class_subjects_admin_manage
ON class_subjects
FOR ALL
USING (
    public.is_admin()
);

-- ============================================================
-- 11. TEACHER ASSIGNMENTS
-- ============================================================

CREATE POLICY teacher_assignments_admin_manage
ON teacher_assignments
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY teacher_assignments_teacher_view
ON teacher_assignments
FOR SELECT
USING (
    teacher_id IN (
        SELECT id
        FROM teacher_profiles
        WHERE user_id = auth.uid()
    )
);

-- ============================================================
-- 12. STUDENTS
-- ============================================================

CREATE POLICY students_admin_manage
ON student_profiles
FOR ALL
USING (
    public.is_admin()
    AND organization_id = public.current_organization_id()
)
WITH CHECK (
    public.is_admin()
    AND organization_id = public.current_organization_id()
);

CREATE POLICY students_parent_view
ON student_profiles
FOR SELECT
USING (
    id IN (
        SELECT student_id
        FROM parent_students
        WHERE parent_id IN (
            SELECT id
            FROM parent_profiles
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY students_teacher_view
ON student_profiles
FOR SELECT
USING (
    id IN (
        SELECT se.student_id
        FROM student_enrollments se
        JOIN teacher_assignments ta
            ON ta.class_subject_id IN (
                SELECT cs.id
                FROM class_subjects cs
                WHERE cs.class_id = se.class_id
            )
        WHERE ta.teacher_id IN (
            SELECT id
            FROM teacher_profiles
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY students_self_view
ON student_profiles
FOR SELECT
USING (
    optional_user_id = auth.uid()
);

-- ============================================================
-- 13. PARENT-STUDENT RELATIONSHIP
-- ============================================================

CREATE POLICY parent_students_admin_manage
ON parent_students
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY parent_students_parent_view
ON parent_students
FOR SELECT
USING (
    parent_id IN (
        SELECT id
        FROM parent_profiles
        WHERE user_id = auth.uid()
    )
);

-- ============================================================
-- 14. ENROLLMENTS
-- ============================================================

CREATE POLICY enrollments_admin_manage
ON student_enrollments
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY enrollments_parent_view
ON student_enrollments
FOR SELECT
USING (
    student_id IN (
        SELECT student_id
        FROM parent_students
        WHERE parent_id IN (
            SELECT id
            FROM parent_profiles
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY enrollments_teacher_view
ON student_enrollments
FOR SELECT
USING (
    class_id IN (
        SELECT cs.class_id
        FROM class_subjects cs
        JOIN teacher_assignments ta
            ON ta.class_subject_id = cs.id
        WHERE ta.teacher_id IN (
            SELECT id
            FROM teacher_profiles
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY enrollments_student_view
ON student_enrollments
FOR SELECT
USING (
    student_id IN (
        SELECT id
        FROM student_profiles
        WHERE optional_user_id = auth.uid()
    )
);

-- ============================================================
-- 15. STUDENT SUBJECTS
-- ============================================================

CREATE POLICY student_subjects_admin_manage
ON student_subjects
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY student_subjects_parent_view
ON student_subjects
FOR SELECT
USING (
    student_id IN (
        SELECT student_id
        FROM parent_students
        WHERE parent_id IN (
            SELECT id
            FROM parent_profiles
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY student_subjects_teacher_view
ON student_subjects
FOR SELECT
USING (
    class_subject_id IN (
        SELECT class_subject_id
        FROM teacher_assignments
        WHERE teacher_id IN (
            SELECT id
            FROM teacher_profiles
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY student_subjects_student_view
ON student_subjects
FOR SELECT
USING (
    student_id IN (
        SELECT id
        FROM student_profiles
        WHERE optional_user_id = auth.uid()
    )
);

-- ============================================================
-- 16. LOCATIONS
-- ============================================================

CREATE POLICY locations_admin_manage
ON student_locations
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY locations_parent_view
ON student_locations
FOR SELECT
USING (
    student_id IN (
        SELECT student_id
        FROM parent_students
        WHERE parent_id IN (
            SELECT id
            FROM parent_profiles
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY locations_teacher_view
ON student_locations
FOR SELECT
USING (
    student_id IN (
        SELECT se.student_id
        FROM student_enrollments se
        JOIN teacher_assignments ta
            ON ta.class_subject_id IN (
                SELECT cs.id
                FROM class_subjects cs
                WHERE cs.class_id = se.class_id
            )
        WHERE ta.teacher_id IN (
            SELECT id
            FROM teacher_profiles
            WHERE user_id = auth.uid()
        )
    )
);

-- ============================================================
-- 17. SCHEDULES
-- ============================================================

CREATE POLICY schedules_admin_manage
ON class_schedules
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY schedules_teacher_view
ON class_schedules
FOR SELECT
USING (
    teacher_id IN (
        SELECT id
        FROM teacher_profiles
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY schedules_parent_view
ON class_schedules
FOR SELECT
USING (
    class_subject_id IN (
        SELECT ss.class_subject_id
        FROM student_subjects ss
        WHERE ss.student_id IN (
            SELECT student_id
            FROM parent_students
            WHERE parent_id IN (
                SELECT id
                FROM parent_profiles
                WHERE user_id = auth.uid()
            )
        )
    )
);

-- ============================================================
-- 18. CLASS SESSIONS
-- ============================================================

CREATE POLICY sessions_admin_manage
ON class_sessions
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY sessions_teacher_view
ON class_sessions
FOR SELECT
USING (
    teacher_id IN (
        SELECT id
        FROM teacher_profiles
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY sessions_parent_view
ON class_sessions
FOR SELECT
USING (
    class_subject_id IN (
        SELECT ss.class_subject_id
        FROM student_subjects ss
        WHERE ss.student_id IN (
            SELECT student_id
            FROM parent_students
            WHERE parent_id IN (
                SELECT id
                FROM parent_profiles
                WHERE user_id = auth.uid()
            )
        )
    )
);

-- ============================================================
-- 19. ATTENDANCE
-- ============================================================

CREATE POLICY attendance_admin_manage
ON attendance
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY attendance_teacher_manage
ON attendance
FOR ALL
USING (
    session_id IN (
        SELECT id
        FROM class_sessions
        WHERE teacher_id IN (
            SELECT id
            FROM teacher_profiles
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY attendance_parent_view
ON attendance
FOR SELECT
USING (
    student_id IN (
        SELECT student_id
        FROM parent_students
        WHERE parent_id IN (
            SELECT id
            FROM parent_profiles
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY attendance_student_view
ON attendance
FOR SELECT
USING (
    student_id IN (
        SELECT id
        FROM student_profiles
        WHERE optional_user_id = auth.uid()
    )
);

-- ============================================================
-- 20. ASSESSMENTS
-- ============================================================

CREATE POLICY assessments_admin_manage
ON assessments
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY assessments_teacher_manage
ON assessments
FOR ALL
USING (
    teacher_id IN (
        SELECT id
        FROM teacher_profiles
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY assessments_parent_view
ON assessments
FOR SELECT
USING (
    class_subject_id IN (
        SELECT ss.class_subject_id
        FROM student_subjects ss
        WHERE ss.student_id IN (
            SELECT student_id
            FROM parent_students
            WHERE parent_id IN (
                SELECT id
                FROM parent_profiles
                WHERE user_id = auth.uid()
            )
        )
    )
);

-- ============================================================
-- 21. SCORES
-- ============================================================

CREATE POLICY scores_admin_manage
ON scores
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY scores_teacher_manage
ON scores
FOR ALL
USING (
    assessment_id IN (
        SELECT id
        FROM assessments
        WHERE teacher_id IN (
            SELECT id
            FROM teacher_profiles
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY scores_parent_view
ON scores
FOR SELECT
USING (
    student_id IN (
        SELECT student_id
        FROM parent_students
        WHERE parent_id IN (
            SELECT id
            FROM parent_profiles
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY scores_student_view
ON scores
FOR SELECT
USING (
    student_id IN (
        SELECT id
        FROM student_profiles
        WHERE optional_user_id = auth.uid()
    )
);

-- ============================================================
-- 22. FEES
-- ============================================================

CREATE POLICY fee_structures_admin_manage
ON fee_structures
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY fee_structures_org_view
ON fee_structures
FOR SELECT
USING (
    organization_id = public.current_organization_id()
);

-- ============================================================
-- 23. STUDENT CHARGES
-- ============================================================

CREATE POLICY student_charges_admin_manage
ON student_charges
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY student_charges_parent_view
ON student_charges
FOR SELECT
USING (
    student_id IN (
        SELECT student_id
        FROM parent_students
        WHERE parent_id IN (
            SELECT id
            FROM parent_profiles
            WHERE user_id = auth.uid()
        )
    )
);

-- ============================================================
-- 24. PAYMENTS
-- ============================================================

CREATE POLICY payments_admin_manage
ON payments
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY payments_parent_view
ON payments
FOR SELECT
USING (
    student_id IN (
        SELECT student_id
        FROM parent_students
        WHERE parent_id IN (
            SELECT id
            FROM parent_profiles
            WHERE user_id = auth.uid()
        )
    )
);

-- ============================================================
-- 25. PAYMENT ALLOCATIONS
-- ============================================================

CREATE POLICY payment_allocations_admin_manage
ON payment_allocations
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY payment_allocations_parent_view
ON payment_allocations
FOR SELECT
USING (
    student_charge_id IN (
        SELECT id
        FROM student_charges
        WHERE student_id IN (
            SELECT student_id
            FROM parent_students
            WHERE parent_id IN (
                SELECT id
                FROM parent_profiles
                WHERE user_id = auth.uid()
            )
        )
    )
);

-- ============================================================
-- 26. EDUCATIONAL NEEDS
-- ============================================================

CREATE POLICY needs_admin_manage
ON student_needs
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY needs_teacher_manage
ON student_needs
FOR ALL
USING (
    student_id IN (
        SELECT se.student_id
        FROM student_enrollments se
        JOIN teacher_assignments ta
            ON ta.class_subject_id IN (
                SELECT cs.id
                FROM class_subjects cs
                WHERE cs.class_id = se.class_id
            )
        WHERE ta.teacher_id IN (
            SELECT id
            FROM teacher_profiles
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY needs_parent_view
ON student_needs
FOR SELECT
USING (
    student_id IN (
        SELECT student_id
        FROM parent_students
        WHERE parent_id IN (
            SELECT id
            FROM parent_profiles
            WHERE user_id = auth.uid()
        )
    )
);

-- ============================================================
-- 27. INTERVENTIONS
-- ============================================================

CREATE POLICY interventions_admin_manage
ON interventions
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY interventions_teacher_manage
ON interventions
FOR ALL
USING (
    assigned_teacher_id IN (
        SELECT id
        FROM teacher_profiles
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY interventions_parent_view
ON interventions
FOR SELECT
USING (
    student_need_id IN (
        SELECT id
        FROM student_needs
        WHERE student_id IN (
            SELECT student_id
            FROM parent_students
            WHERE parent_id IN (
                SELECT id
                FROM parent_profiles
                WHERE user_id = auth.uid()
            )
        )
    )
);

-- ============================================================
-- 28. ANNOUNCEMENTS
-- ============================================================

CREATE POLICY announcements_org_view
ON announcements
FOR SELECT
USING (
    organization_id = public.current_organization_id()
);

CREATE POLICY announcements_admin_manage
ON announcements
FOR ALL
USING (
    public.is_admin()
);

-- ============================================================
-- 29. MESSAGES
-- ============================================================

CREATE POLICY messages_sender_receiver
ON messages
FOR SELECT
USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
);

CREATE POLICY messages_send
ON messages
FOR INSERT
WITH CHECK (
    sender_id = auth.uid()
);

-- ============================================================
-- 30. NOTIFICATIONS
-- ============================================================

CREATE POLICY notifications_self
ON notifications
FOR SELECT
USING (
    user_id = auth.uid()
);

CREATE POLICY notifications_self_update
ON notifications
FOR UPDATE
USING (
    user_id = auth.uid()
)
WITH CHECK (
    user_id = auth.uid()
);

-- ============================================================
-- 31. TERMINAL REPORTS
-- ============================================================

CREATE POLICY terminal_reports_admin_manage
ON terminal_reports
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY terminal_reports_parent_view
ON terminal_reports
FOR SELECT
USING (
    status = 'PUBLISHED'
    AND student_id IN (
        SELECT student_id
        FROM parent_students
        WHERE parent_id IN (
            SELECT id
            FROM parent_profiles
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY terminal_reports_student_view
ON terminal_reports
FOR SELECT
USING (
    status = 'PUBLISHED'
    AND student_id IN (
        SELECT id
        FROM student_profiles
        WHERE optional_user_id = auth.uid()
    )
);

CREATE POLICY terminal_reports_teacher_view
ON terminal_reports
FOR SELECT
USING (
    status = 'PUBLISHED'
    AND student_id IN (
        SELECT se.student_id
        FROM student_enrollments se
        JOIN teacher_assignments ta
            ON ta.class_subject_id IN (
                SELECT cs.id
                FROM class_subjects cs
                WHERE cs.class_id = se.class_id
            )
        WHERE ta.teacher_id IN (
            SELECT id
            FROM teacher_profiles
            WHERE user_id = auth.uid()
        )
    )
);

-- ============================================================
-- 32. TERMINAL REPORT SUBJECTS
-- ============================================================

CREATE POLICY terminal_report_subjects_admin_manage
ON terminal_report_subjects
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY terminal_report_subjects_parent_view
ON terminal_report_subjects
FOR SELECT
USING (
    terminal_report_id IN (
        SELECT id
        FROM terminal_reports
        WHERE status = 'PUBLISHED'
        AND student_id IN (
            SELECT student_id
            FROM parent_students
            WHERE parent_id IN (
                SELECT id
                FROM parent_profiles
                WHERE user_id = auth.uid()
            )
        )
    )
);

CREATE POLICY terminal_report_subjects_student_view
ON terminal_report_subjects
FOR SELECT
USING (
    terminal_report_id IN (
        SELECT id
        FROM terminal_reports
        WHERE status = 'PUBLISHED'
        AND student_id IN (
            SELECT id
            FROM student_profiles
            WHERE optional_user_id = auth.uid()
        )
    )
);

-- ============================================================
-- 33. AUDIT LOGS
-- ============================================================

CREATE POLICY audit_logs_admin_view
ON audit_logs
FOR SELECT
USING (
    public.is_admin()
    AND organization_id = public.current_organization_id()
);

CREATE POLICY audit_logs_system_insert
ON audit_logs
FOR INSERT
WITH CHECK (
    organization_id = public.current_organization_id()
);

-- ============================================================
-- 34. STORAGE SECURITY
-- ============================================================

-- Create a Supabase Storage bucket named:
-- student-photos

-- The application should use private storage for student photos.
-- Do NOT make student photographs publicly accessible.

-- Storage policies should allow:
-- ADMIN/SUPER ADMIN:
-- upload, update and delete authorized photos.
--
-- TEACHER:
-- view photos of assigned students.
--
-- PARENT:
-- view only their children's photos.
--
-- STUDENT:
-- view only their own photo.

-- ============================================================
-- 35. SECURITY PRINCIPLES
-- ============================================================

-- IMPORTANT:
--
-- Frontend permissions are NOT sufficient.
--
-- RLS is the final database-level security layer.
--
-- Every query from the application must still respect:
--
-- SUPER ADMIN:
-- Full organization access.
--
-- ADMIN:
-- Authorized management access.
--
-- TEACHER:
-- Assigned classes, subjects and students only.
--
-- PARENT:
-- Own children only.
--
-- STUDENT:
-- Own records only.
--
-- Published terminal reports:
-- Parent/student access only to the appropriate learner.
--
-- Student photos:
-- Protected access only.
--
-- Financial records:
-- Administrative management only.
--
-- Historical student locations:
-- Must not be deleted simply because a new location is added.

-- ============================================================
-- END PHASE 7
-- ============================================================
