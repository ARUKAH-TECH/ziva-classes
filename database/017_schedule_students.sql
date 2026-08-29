-- Replaces the manual "student count" number on class_schedules with a real
-- link to the actual students meeting in that slot, so an admin can name who
-- meets where instead of guessing a headcount.

CREATE TABLE class_schedule_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_schedule_id UUID NOT NULL REFERENCES class_schedules(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (class_schedule_id, student_id)
);

ALTER TABLE class_schedule_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY class_schedule_students_admin_manage
ON class_schedule_students
FOR ALL
USING (
    public.is_admin()
);

CREATE POLICY class_schedule_students_teacher_view
ON class_schedule_students
FOR SELECT
USING (
    class_schedule_id IN (
        SELECT id
        FROM class_schedules
        WHERE teacher_id IN (
            SELECT id
            FROM teacher_profiles
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY class_schedule_students_parent_view
ON class_schedule_students
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

CREATE POLICY class_schedule_students_student_view
ON class_schedule_students
FOR SELECT
USING (
    student_id IN (
        SELECT id
        FROM student_profiles
        WHERE optional_user_id = auth.uid()
    )
);
