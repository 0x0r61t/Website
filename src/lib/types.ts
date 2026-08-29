export type UserRole = 'admin' | 'employee' | 'intern' | 'client';

export type TaskStatus = 'pending' | 'in_progress' | 'submitted' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';
export type ReportStatus = 'pending' | 'reviewed' | 'approved';
export type ReportType = 'intern' | 'client';
export type ReviewType = 'intern_performance' | 'report';
export type ProfileStatus = 'active' | 'inactive' | 'suspended';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  supervisor_id: string | null;
  account_manager_id: string | null;
  internship_type: 'Red Team' | 'Blue Team' | null;
  department: string | null;
  phone: string | null;
  status: ProfileStatus;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  assigned_by: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  submission: string | null;
  submitted_at: string | null;
  feedback: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  title: string;
  content: string;
  report_type: ReportType;
  author_id: string;
  subject_id: string;
  task_id: string | null;
  status: ReportStatus;
  feedback: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  review_type: ReviewType;
  reviewer_id: string;
  reviewee_id: string;
  report_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export const DEPARTMENTS = ['VAPT', 'SOC', 'GRC', 'Security Audits', 'Training'] as const;
export const INTERNSHIP_TYPES = ['Red Team', 'Blue Team'] as const;
