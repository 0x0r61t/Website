/*
# Rynex Security Portal - Database Schema

## Overview
Creates the complete schema for the Rynex Security admin portal with role-based access
for administrators, employees, interns, and clients.

## New Tables

### 1. profiles
- Extends auth.users with role, name, and role-specific assignment fields.
- `id` (uuid, PK, FK to auth.users, CASCADE on delete)
- `full_name` (text, not null)
- `email` (text, not null) — denormalized from auth.users for display
- `role` (text, not null) — 'admin' | 'employee' | 'intern' | 'client'
- `supervisor_id` (uuid, nullable, FK to profiles) — for interns, points to their employee supervisor
- `account_manager_id` (uuid, nullable, FK to profiles) — for clients, points to their employee account manager
- `internship_type` (text, nullable) — 'Red Team' | 'Blue Team' for interns
- `department` (text, nullable) — VAPT, SOC, GRC, Security Audits, Training for employees
- `phone` (text, nullable)
- `status` (text, not null, default 'active') — 'active' | 'inactive' | 'suspended'
- `created_at` (timestamptz, default now())

### 2. tasks
- Tasks assigned by employees to interns or clients.
- `id` (uuid, PK)
- `title` (text, not null)
- `description` (text, nullable)
- `assigned_to` (uuid, not null, FK to profiles) — the intern or client
- `assigned_by` (uuid, not null, default auth.uid(), FK to profiles) — the employee
- `status` (text, not null, default 'pending') — 'pending' | 'in_progress' | 'submitted' | 'completed'
- `priority` (text, not null, default 'medium') — 'low' | 'medium' | 'high'
- `due_date` (date, nullable)
- `submission` (text, nullable) — intern's submission text
- `submitted_at` (timestamptz, nullable)
- `feedback` (text, nullable) — employee feedback when marking
- `created_at` (timestamptz, default now())

### 3. reports
- Reports: intern reports (created by interns) or client reports (uploaded by employees).
- `id` (uuid, PK)
- `title` (text, not null)
- `content` (text, not null)
- `report_type` (text, not null) — 'intern' | 'client'
- `author_id` (uuid, not null, default auth.uid(), FK to profiles)
- `subject_id` (uuid, not null, FK to profiles) — who the report is about/for
- `task_id` (uuid, nullable, FK to tasks) — optional link to a task
- `status` (text, not null, default 'pending') — 'pending' | 'reviewed' | 'approved'
- `feedback` (text, nullable) — employee feedback when marking intern report
- `created_at` (timestamptz, default now())

### 4. reviews
- Reviews: employee performance reviews for interns, or client reviews on reports.
- `id` (uuid, PK)
- `review_type` (text, not null) — 'intern_performance' | 'report'
- `reviewer_id` (uuid, not null, default auth.uid(), FK to profiles)
- `reviewee_id` (uuid, not null, FK to profiles) — intern for performance, employee for report
- `report_id` (uuid, nullable, FK to reports) — for client reviews on reports
- `rating` (int, not null, check 1-5)
- `comment` (text, nullable)
- `created_at` (timestamptz, default now())

## Security
- RLS enabled on all tables.
- SECURITY DEFINER helper functions for role checks (avoid RLS recursion).
- Trigger on auth.users to auto-create profiles on signup.
- Self-signup cannot assign 'admin' role (trigger enforces this).

## Important Notes
1. The handle_new_user trigger reads role from app_metadata first (admin-created users),
   then user_metadata (self-signup). Self-signup 'admin' role is downgraded to 'client'.
2. Profiles email is denormalized from auth.users for display since auth.users is not
   readable by frontend clients.
3. Supervisor/account_manager assignments are managed by admins via profile updates.
*/

-- ============================================================
-- PROFILES TABLE (created first, no dependencies)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'employee', 'intern', 'client')),
  supervisor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  account_manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  internship_type text CHECK (internship_type IS NULL OR internship_type IN ('Red Team', 'Blue Team')),
  department text,
  phone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_supervisor ON public.profiles(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_profiles_account_manager ON public.profiles(account_manager_id);

-- ============================================================
-- HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_role_check(p_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = p_role AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- PROFILES RLS
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT policies
DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "select_all_profiles_admin" ON public.profiles;
CREATE POLICY "select_all_profiles_admin" ON public.profiles FOR SELECT
  TO authenticated USING (public.current_role_check('admin'));

DROP POLICY IF EXISTS "select_supervised_interns" ON public.profiles;
CREATE POLICY "select_supervised_interns" ON public.profiles FOR SELECT
  TO authenticated USING (
    public.current_role_check('employee') AND supervisor_id = auth.uid()
  );

DROP POLICY IF EXISTS "select_managed_clients" ON public.profiles;
CREATE POLICY "select_managed_clients" ON public.profiles FOR SELECT
  TO authenticated USING (
    public.current_role_check('employee') AND account_manager_id = auth.uid()
  );

DROP POLICY IF EXISTS "select_own_supervisor" ON public.profiles;
CREATE POLICY "select_own_supervisor" ON public.profiles FOR SELECT
  TO authenticated USING (
    public.current_role_check('intern') AND id = (
      SELECT supervisor_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "select_own_account_manager" ON public.profiles;
CREATE POLICY "select_own_account_manager" ON public.profiles FOR SELECT
  TO authenticated USING (
    public.current_role_check('client') AND id = (
      SELECT account_manager_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- UPDATE policies
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_all_profiles_admin" ON public.profiles;
CREATE POLICY "update_all_profiles_admin" ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.current_role_check('admin'))
  WITH CHECK (public.current_role_check('admin'));

-- DELETE policy (admin only; edge function uses service role which bypasses RLS)
DROP POLICY IF EXISTS "delete_profiles_admin" ON public.profiles;
CREATE POLICY "delete_profiles_admin" ON public.profiles FOR DELETE
  TO authenticated USING (public.current_role_check('admin'));

-- ============================================================
-- TASKS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assigned_to uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'completed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date date,
  submission text,
  submitted_at timestamptz,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON public.tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- SELECT policies
DROP POLICY IF EXISTS "select_own_tasks" ON public.tasks;
CREATE POLICY "select_own_tasks" ON public.tasks FOR SELECT
  TO authenticated USING (
    assigned_to = auth.uid() OR assigned_by = auth.uid()
  );

DROP POLICY IF EXISTS "select_all_tasks_admin" ON public.tasks;
CREATE POLICY "select_all_tasks_admin" ON public.tasks FOR SELECT
  TO authenticated USING (public.current_role_check('admin'));

DROP POLICY IF EXISTS "select_tasks_for_supervised" ON public.tasks;
CREATE POLICY "select_tasks_for_supervised" ON public.tasks FOR SELECT
  TO authenticated USING (
    public.current_role_check('employee') AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = tasks.assigned_to
      AND (supervisor_id = auth.uid() OR account_manager_id = auth.uid())
    )
  );

-- INSERT policies
DROP POLICY IF EXISTS "insert_tasks_admin" ON public.tasks;
CREATE POLICY "insert_tasks_admin" ON public.tasks FOR INSERT
  TO authenticated WITH CHECK (public.current_role_check('admin'));

DROP POLICY IF EXISTS "insert_tasks_employee" ON public.tasks;
CREATE POLICY "insert_tasks_employee" ON public.tasks FOR INSERT
  TO authenticated WITH CHECK (
    public.current_role_check('employee')
    AND assigned_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = assigned_to
      AND (supervisor_id = auth.uid() OR account_manager_id = auth.uid())
    )
  );

-- UPDATE policies
DROP POLICY IF EXISTS "update_all_tasks_admin" ON public.tasks;
CREATE POLICY "update_all_tasks_admin" ON public.tasks FOR UPDATE
  TO authenticated
  USING (public.current_role_check('admin'))
  WITH CHECK (public.current_role_check('admin'));

DROP POLICY IF EXISTS "update_assigned_tasks" ON public.tasks;
CREATE POLICY "update_assigned_tasks" ON public.tasks FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid() OR assigned_by = auth.uid())
  WITH CHECK (assigned_to = auth.uid() OR assigned_by = auth.uid());

-- DELETE policies
DROP POLICY IF EXISTS "delete_all_tasks_admin" ON public.tasks;
CREATE POLICY "delete_all_tasks_admin" ON public.tasks FOR DELETE
  TO authenticated USING (public.current_role_check('admin'));

DROP POLICY IF EXISTS "delete_assigned_tasks_employee" ON public.tasks;
CREATE POLICY "delete_assigned_tasks_employee" ON public.tasks FOR DELETE
  TO authenticated USING (
    public.current_role_check('employee') AND assigned_by = auth.uid()
  );

-- ============================================================
-- REPORTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('intern', 'client')),
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved')),
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_author ON public.reports(author_id);
CREATE INDEX IF NOT EXISTS idx_reports_subject ON public.reports(subject_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON public.reports(report_type);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- SELECT policies
DROP POLICY IF EXISTS "select_all_reports_admin" ON public.reports;
CREATE POLICY "select_all_reports_admin" ON public.reports FOR SELECT
  TO authenticated USING (public.current_role_check('admin'));

DROP POLICY IF EXISTS "select_own_reports_author" ON public.reports;
CREATE POLICY "select_own_reports_author" ON public.reports FOR SELECT
  TO authenticated USING (author_id = auth.uid());

DROP POLICY IF EXISTS "select_reports_as_subject" ON public.reports;
CREATE POLICY "select_reports_as_subject" ON public.reports FOR SELECT
  TO authenticated USING (subject_id = auth.uid());

DROP POLICY IF EXISTS "select_reports_for_supervised" ON public.reports;
CREATE POLICY "select_reports_for_supervised" ON public.reports FOR SELECT
  TO authenticated USING (
    public.current_role_check('employee') AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = reports.subject_id
      AND (supervisor_id = auth.uid() OR account_manager_id = auth.uid())
    )
  );

-- INSERT policies
DROP POLICY IF EXISTS "insert_reports_admin" ON public.reports;
CREATE POLICY "insert_reports_admin" ON public.reports FOR INSERT
  TO authenticated WITH CHECK (public.current_role_check('admin'));

DROP POLICY IF EXISTS "insert_client_reports_employee" ON public.reports;
CREATE POLICY "insert_client_reports_employee" ON public.reports FOR INSERT
  TO authenticated WITH CHECK (
    public.current_role_check('employee')
    AND author_id = auth.uid()
    AND report_type = 'client'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = subject_id AND account_manager_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_intern_reports_self" ON public.reports;
CREATE POLICY "insert_intern_reports_self" ON public.reports FOR INSERT
  TO authenticated WITH CHECK (
    public.current_role_check('intern')
    AND author_id = auth.uid()
    AND subject_id = auth.uid()
    AND report_type = 'intern'
  );

-- UPDATE policies
DROP POLICY IF EXISTS "update_all_reports_admin" ON public.reports;
CREATE POLICY "update_all_reports_admin" ON public.reports FOR UPDATE
  TO authenticated
  USING (public.current_role_check('admin'))
  WITH CHECK (public.current_role_check('admin'));

DROP POLICY IF EXISTS "update_reports_employee" ON public.reports;
CREATE POLICY "update_reports_employee" ON public.reports FOR UPDATE
  TO authenticated
  USING (
    public.current_role_check('employee') AND (
      author_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = reports.subject_id
        AND (supervisor_id = auth.uid() OR account_manager_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    public.current_role_check('employee')
  );

-- DELETE policies
DROP POLICY IF EXISTS "delete_all_reports_admin" ON public.reports;
CREATE POLICY "delete_all_reports_admin" ON public.reports FOR DELETE
  TO authenticated USING (public.current_role_check('admin'));

DROP POLICY IF EXISTS "delete_own_reports_employee" ON public.reports;
CREATE POLICY "delete_own_reports_employee" ON public.reports FOR DELETE
  TO authenticated USING (
    public.current_role_check('employee') AND author_id = auth.uid()
  );

-- ============================================================
-- REVIEWS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_type text NOT NULL CHECK (review_type IN ('intern_performance', 'report')),
  reviewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_id uuid REFERENCES public.reports(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_report ON public.reviews(report_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- SELECT policies
DROP POLICY IF EXISTS "select_all_reviews_admin" ON public.reviews;
CREATE POLICY "select_all_reviews_admin" ON public.reviews FOR SELECT
  TO authenticated USING (public.current_role_check('admin'));

DROP POLICY IF EXISTS "select_own_reviews_given" ON public.reviews;
CREATE POLICY "select_own_reviews_given" ON public.reviews FOR SELECT
  TO authenticated USING (reviewer_id = auth.uid());

DROP POLICY IF EXISTS "select_reviews_received" ON public.reviews;
CREATE POLICY "select_reviews_received" ON public.reviews FOR SELECT
  TO authenticated USING (reviewee_id = auth.uid());

DROP POLICY IF EXISTS "select_reviews_for_supervised" ON public.reviews;
CREATE POLICY "select_reviews_for_supervised" ON public.reviews FOR SELECT
  TO authenticated USING (
    public.current_role_check('employee') AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = reviews.reviewee_id AND supervisor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "select_report_reviews_as_client" ON public.reviews;
CREATE POLICY "select_report_reviews_as_client" ON public.reviews FOR SELECT
  TO authenticated USING (
    public.current_role_check('client') AND review_type = 'report' AND EXISTS (
      SELECT 1 FROM public.reports
      WHERE id = reviews.report_id AND subject_id = auth.uid()
    )
  );

-- INSERT policies
DROP POLICY IF EXISTS "insert_reviews_admin" ON public.reviews;
CREATE POLICY "insert_reviews_admin" ON public.reviews FOR INSERT
  TO authenticated WITH CHECK (public.current_role_check('admin'));

DROP POLICY IF EXISTS "insert_intern_performance_reviews" ON public.reviews;
CREATE POLICY "insert_intern_performance_reviews" ON public.reviews FOR INSERT
  TO authenticated WITH CHECK (
    public.current_role_check('employee')
    AND reviewer_id = auth.uid()
    AND review_type = 'intern_performance'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = reviewee_id AND supervisor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_report_reviews_client" ON public.reviews;
CREATE POLICY "insert_report_reviews_client" ON public.reviews FOR INSERT
  TO authenticated WITH CHECK (
    public.current_role_check('client')
    AND reviewer_id = auth.uid()
    AND review_type = 'report'
    AND EXISTS (
      SELECT 1 FROM public.reports
      WHERE id = report_id AND subject_id = auth.uid()
    )
  );

-- DELETE policies
DROP POLICY IF EXISTS "delete_all_reviews_admin" ON public.reviews;
CREATE POLICY "delete_all_reviews_admin" ON public.reviews FOR DELETE
  TO authenticated USING (public.current_role_check('admin'));

DROP POLICY IF EXISTS "delete_own_reviews" ON public.reviews;
CREATE POLICY "delete_own_reviews" ON public.reviews FOR DELETE
  TO authenticated USING (reviewer_id = auth.uid());

-- ============================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_supervisor_id uuid;
  v_account_manager_id uuid;
  v_internship_type text;
  v_department text;
  v_full_name text;
BEGIN
  -- Check app_metadata first (set by admin via edge function)
  v_role := NEW.raw_app_meta_data->>'role';
  IF v_role IS NULL THEN
    -- Fall back to user_metadata (self-signup)
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
    -- Prevent self-assigned admin role
    IF v_role = 'admin' THEN
      v_role := 'client';
    END IF;
  END IF;

  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_app_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  v_supervisor_id := COALESCE(
    (NEW.raw_app_meta_data->>'supervisor_id')::uuid,
    (NEW.raw_user_meta_data->>'supervisor_id')::uuid
  );

  v_account_manager_id := COALESCE(
    (NEW.raw_app_meta_data->>'account_manager_id')::uuid,
    (NEW.raw_user_meta_data->>'account_manager_id')::uuid
  );

  v_internship_type := COALESCE(
    NEW.raw_app_meta_data->>'internship_type',
    NEW.raw_user_meta_data->>'internship_type'
  );

  v_department := COALESCE(
    NEW.raw_app_meta_data->>'department',
    NEW.raw_user_meta_data->>'department'
  );

  INSERT INTO public.profiles (id, full_name, email, role, supervisor_id, account_manager_id, internship_type, department)
  VALUES (
    NEW.id,
    v_full_name,
    NEW.email,
    v_role,
    v_supervisor_id,
    v_account_manager_id,
    v_internship_type,
    v_department
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();