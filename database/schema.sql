-- ============================================================
-- ZIVA ONLINE & SPECIAL CLASSES MANAGEMENT SYSTEM
-- PHASE 6 — POSTGRESQL DATABASE SCHEMA
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. ORGANIZATIONS
-- ============================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    motto VARCHAR(255),
    established_year INTEGER,
    logo_url TEXT,
    phone VARCHAR(50),
    email VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. ROLES
-- ============================================================

CREATE TYPE user_role AS ENUM (
    'SUPER_ADMIN',
    'ADMIN',
    'TEACHER',
    'PARENT',
    'STUDENT'
);

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(150),
    profile_photo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. TEACHERS
-- ============================================================

CREATE TABLE teacher_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_number VARCHAR(50) UNIQUE,
    qualification TEXT,
    specialization TEXT,
    employment_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. PARENTS
-- ============================================================

CREATE TABLE parent_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    occupation VARCHAR(150),
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. ACADEMIC YEARS
-- ============================================================

CREATE TABLE academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (organization_id, name)
);

-- ============================================================
-- 6. TERMS
-- ============================================================

CREATE TABLE terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (academic_year_id, name)
);

-- ============================================================
-- 7. ACADEMIC LEVELS
-- ============================================================

CREATE TABLE academic_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    level_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (organization_id, name)
);

-- ============================================================
-- 8. CLASSES
-- ============================================================

CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    academic_level_id UUID NOT NULL REFERENCES academic_levels(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. SUBJECTS
-- ============================================================

CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(30),
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (organization_id, name)
);

-- ============================================================
-- 10. CLASS SUBJECTS
-- ============================================================

CREATE TABLE class_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (class_id, subject_id)
);

-- ============================================================
-- 11. TEACHER ASSIGNMENTS
-- ============================================================

CREATE TABLE teacher_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
    class_subject_id UUID NOT NULL REFERENCES class_subjects(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (teacher_id, class_subject_id, academic_year_id)
);

-- ============================================================
-- 12. STUDENTS
-- ============================================================

CREATE TABLE student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    student_number VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100),

    date_of_birth DATE,
    gender VARCHAR(30),

    passport_photo_url TEXT,

    phone VARCHAR(50),
    email VARCHAR(150),

    status VARCHAR(30) DEFAULT 'ACTIVE',

    enrollment_source VARCHAR(30)
        CHECK (enrollment_source IN ('IN_PERSON', 'SOCIAL_MEDIA')),

    optional_user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (organization_id, student_number)
);

-- ============================================================
-- 13. PARENT-STUDENT RELATIONSHIP
-- ============================================================

CREATE TABLE parent_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES parent_profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    relationship VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (parent_id, student_id)
);

-- ============================================================
-- 14. STUDENT ENROLLMENTS
-- ============================================================

CREATE TABLE student_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(30) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (student_id, class_id, academic_year_id, term_id)
);

-- ============================================================
-- 15. STUDENT SUBJECTS
-- ============================================================

CREATE TABLE student_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    class_subject_id UUID NOT NULL REFERENCES class_subjects(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (student_id, class_subject_id, academic_year_id)
);

-- ============================================================
-- 16. STUDENT LOCATIONS
-- ============================================================

CREATE TABLE student_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,

    address TEXT,
    area VARCHAR(150),
    city VARCHAR(150),
    region VARCHAR(150),
    landmark TEXT,

    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),

    is_current BOOLEAN DEFAULT TRUE,

    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_to TIMESTAMPTZ,

    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 17. CLASS SCHEDULES
-- ============================================================

CREATE TYPE session_type AS ENUM (
    'CENTER',
    'HOME_SERVICE',
    'ONLINE'
);

CREATE TABLE class_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    class_subject_id UUID NOT NULL REFERENCES class_subjects(id) ON DELETE CASCADE,

    teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,

    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),

    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    session_type session_type NOT NULL DEFAULT 'CENTER',

    location TEXT,

    recurring BOOLEAN DEFAULT TRUE,

    active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18. CLASS SESSIONS
-- ============================================================

CREATE TABLE class_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    schedule_id UUID REFERENCES class_schedules(id) ON DELETE SET NULL,

    class_subject_id UUID NOT NULL REFERENCES class_subjects(id) ON DELETE CASCADE,

    teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,

    session_date DATE NOT NULL,

    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    session_type session_type NOT NULL,

    location TEXT,

    student_location_snapshot TEXT,

    status VARCHAR(30) DEFAULT 'SCHEDULED',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 19. ATTENDANCE
-- ============================================================

CREATE TYPE attendance_status AS ENUM (
    'PRESENT',
    'ABSENT',
    'LATE',
    'EXCUSED'
);

CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,

    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,

    status attendance_status NOT NULL,

    remarks TEXT,

    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,

    recorded_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (session_id, student_id)
);

-- ============================================================
-- 20. ASSESSMENTS
-- ============================================================

CREATE TYPE assessment_type AS ENUM (
    'ASSIGNMENT',
    'QUIZ',
    'TEST',
    'EXAMINATION',
    'PROJECT'
);

CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    class_subject_id UUID NOT NULL REFERENCES class_subjects(id) ON DELETE CASCADE,

    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,

    teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,

    name VARCHAR(150) NOT NULL,

    assessment_type assessment_type NOT NULL,

    assessment_date DATE,

    maximum_score DECIMAL(10,2) NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 21. SCORES
-- ============================================================

CREATE TABLE scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,

    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,

    score DECIMAL(10,2) NOT NULL,

    grade VARCHAR(10),

    teacher_comment TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (assessment_id, student_id)
);

-- ============================================================
-- 22. FEE STRUCTURES
-- ============================================================

CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    class_subject_id UUID NOT NULL REFERENCES class_subjects(id) ON DELETE CASCADE,

    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,

    term_id UUID REFERENCES terms(id) ON DELETE SET NULL,

    amount DECIMAL(12,2) NOT NULL,

    description TEXT,

    active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 23. STUDENT CHARGES
-- ============================================================

CREATE TABLE student_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,

    fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,

    amount_due DECIMAL(12,2) NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 24. PAYMENTS
-- ============================================================

CREATE TYPE payment_method AS ENUM (
    'MTN_MOBILE_MONEY',
    'CASH'
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,

    amount DECIMAL(12,2) NOT NULL,

    payment_method payment_method NOT NULL,

    reference VARCHAR(100),

    payment_date TIMESTAMPTZ DEFAULT NOW(),

    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 25. PAYMENT ALLOCATIONS
-- ============================================================

CREATE TABLE payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,

    student_charge_id UUID NOT NULL REFERENCES student_charges(id) ON DELETE CASCADE,

    amount_allocated DECIMAL(12,2) NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (payment_id, student_charge_id)
);

-- ============================================================
-- 26. EDUCATIONAL NEEDS
-- ============================================================

CREATE TABLE student_needs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,

    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,

    need_description TEXT NOT NULL,

    priority VARCHAR(30) DEFAULT 'MEDIUM',

    recommended_support TEXT,

    identified_by UUID REFERENCES users(id) ON DELETE SET NULL,

    status VARCHAR(30) DEFAULT 'OPEN',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 27. INTERVENTIONS
-- ============================================================

CREATE TABLE interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_need_id UUID NOT NULL REFERENCES student_needs(id) ON DELETE CASCADE,

    assigned_teacher_id UUID REFERENCES teacher_profiles(id) ON DELETE SET NULL,

    intervention TEXT NOT NULL,

    review_date DATE,

    outcome TEXT,

    status VARCHAR(30) DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 28. ANNOUNCEMENTS
-- ============================================================

CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    title VARCHAR(200) NOT NULL,

    message TEXT NOT NULL,

    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 29. MESSAGES
-- ============================================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    subject VARCHAR(200),

    message TEXT NOT NULL,

    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 30. NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    title VARCHAR(200) NOT NULL,

    message TEXT NOT NULL,

    notification_type VARCHAR(50),

    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 31. TERMINAL REPORTS
-- ============================================================

CREATE TYPE report_status AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
);

CREATE TABLE terminal_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,

    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,

    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,

    version INTEGER NOT NULL DEFAULT 1,

    status report_status DEFAULT 'DRAFT',

    overall_average DECIMAL(6,2),

    overall_grade VARCHAR(10),

    position INTEGER,

    ranking_enabled BOOLEAN DEFAULT FALSE,

    teacher_comment TEXT,

    administrator_comment TEXT,

    fee_status VARCHAR(30),

    generated_by UUID REFERENCES users(id) ON DELETE SET NULL,

    published_by UUID REFERENCES users(id) ON DELETE SET NULL,

    generated_at TIMESTAMPTZ DEFAULT NOW(),

    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 32. TERMINAL REPORT SUBJECT RESULTS
-- ============================================================

CREATE TABLE terminal_report_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    terminal_report_id UUID NOT NULL REFERENCES terminal_reports(id) ON DELETE CASCADE,

    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,

    teacher_id UUID REFERENCES teacher_profiles(id) ON DELETE SET NULL,

    average_score DECIMAL(6,2),

    grade VARCHAR(10),

    teacher_comment TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (terminal_report_id, subject_id)
);

-- ============================================================
-- 33. AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,

    table_name VARCHAR(100),

    record_id UUID,

    old_data JSONB,

    new_data JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 34. INDEXES
-- ============================================================

CREATE INDEX idx_users_org
ON users(organization_id);

CREATE INDEX idx_students_org
ON student_profiles(organization_id);

CREATE INDEX idx_students_parent
ON parent_students(parent_id);

CREATE INDEX idx_student_enrollments_student
ON student_enrollments(student_id);

CREATE INDEX idx_student_subjects_student
ON student_subjects(student_id);

CREATE INDEX idx_teacher_assignments_teacher
ON teacher_assignments(teacher_id);

CREATE INDEX idx_attendance_student
ON attendance(student_id);

CREATE INDEX idx_attendance_session
ON attendance(session_id);

CREATE INDEX idx_assessments_subject
ON assessments(class_subject_id);

CREATE INDEX idx_scores_student
ON scores(student_id);

CREATE INDEX idx_student_charges_student
ON student_charges(student_id);

CREATE INDEX idx_payments_student
ON payments(student_id);

CREATE INDEX idx_payment_allocations_payment
ON payment_allocations(payment_id);

CREATE INDEX idx_locations_student
ON student_locations(student_id);

CREATE INDEX idx_terminal_reports_student
ON terminal_reports(student_id);

CREATE INDEX idx_notifications_user
ON notifications(user_id);

CREATE INDEX idx_audit_logs_org
ON audit_logs(organization_id);

-- ============================================================
-- 35. DEFAULT ACADEMIC LEVELS
-- ============================================================

-- These can be inserted for each organization.

-- Primary 1–6
-- JHS 1–3
-- SHS 1–3

-- ============================================================
-- END PHASE 6
-- ============================================================
