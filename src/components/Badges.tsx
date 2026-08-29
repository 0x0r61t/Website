import type { TaskStatus, ReportStatus, ProfileStatus, TaskPriority, UserRole } from '@/lib/types';

const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  pending: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  submitted: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

const REPORT_STATUS_STYLES: Record<ReportStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  reviewed: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

const PROFILE_STATUS_STYLES: Record<ProfileStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  suspended: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  high: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const ROLE_STYLES: Record<UserRole, string> = {
  admin: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  employee: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  intern: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  client: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`badge border ${TASK_STATUS_STYLES[status]}`}>{status.replace('_', ' ')}</span>;
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return <span className={`badge border ${REPORT_STATUS_STYLES[status]}`}>{status}</span>;
}

export function ProfileStatusBadge({ status }: { status: ProfileStatus }) {
  return <span className={`badge border ${PROFILE_STATUS_STYLES[status]}`}>{status}</span>;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <span className={`badge border ${PRIORITY_STYLES[priority]}`}>{priority} priority</span>;
}

export function RoleBadge({ role }: { role: UserRole }) {
  return <span className={`badge border ${ROLE_STYLES[role]}`}>{role}</span>;
}

export function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const starSize = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${starSize} ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600 fill-slate-600'}`}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}
