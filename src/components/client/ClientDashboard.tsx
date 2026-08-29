import { useEffect, useState, useCallback } from 'react';
import { ClipboardList, FileText, UserCog, Mail, CheckCircle2, Star, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Task, Report, Review, Profile } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { TaskStatusBadge, ReportStatusBadge, StarRating } from '@/components/Badges';
import type { PageKey } from '@/components/DashboardLayout';

interface ClientDashboardProps {
  page: PageKey;
}

export function ClientDashboard({ page }: ClientDashboardProps) {
  if (page === 'overview') return <ClientOverview />;
  if (page === 'tasks') return <ClientTasks />;
  if (page === 'reports') return <ClientReports />;
  if (page === 'account-manager') return <ClientAccountManager />;
  return <ClientOverview />;
}

function ClientOverview() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ tasks: 0, reports: 0, reviews: 0 });

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [tasks, reports, reviews] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('assigned_to', profile.id),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('subject_id', profile.id),
        supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('reviewer_id', profile.id),
      ]);
      setStats({
        tasks: tasks.count ?? 0,
        reports: reports.count ?? 0,
        reviews: reviews.count ?? 0,
      });
    })();
  }, [profile]);

  const cards = [
    { label: 'My Tasks', value: stats.tasks, icon: <ClipboardList className="w-5 h-5" />, color: 'text-amber-400 bg-amber-500/10' },
    { label: 'Reports', value: stats.reports, icon: <FileText className="w-5 h-5" />, color: 'text-cyan-400 bg-cyan-500/10' },
    { label: 'Reviews Given', value: stats.reviews, icon: <Star className="w-5 h-5" />, color: 'text-pink-400 bg-pink-500/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Welcome, {profile?.full_name.split(' ')[0]}</h1>
        <p className="text-sm text-slate-500 mt-1">View your reports, tasks, and provide feedback</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.color}`}>{c.icon}</div>
            <div className="text-2xl font-bold text-slate-100">{c.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientTasks() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<(Task & { assigned_by_profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*, assigned_by_profile:profiles!tasks_assigned_by_fkey(*)')
      .eq('assigned_to', profile.id)
      .order('created_at', { ascending: false });
    if (!error && data) setTasks(data as unknown as (Task & { assigned_by_profile?: Profile })[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  async function markComplete(task: Task) {
    const { error } = await supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id);
    if (!error) load();
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">My Tasks</h1>
        <p className="text-sm text-slate-500 mt-1">Tasks assigned to you by your account manager</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
      ) : tasks.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No tasks assigned yet</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {tasks.map((t) => (
            <div key={t.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-100">{t.title}</span>
                    <TaskStatusBadge status={t.status} />
                  </div>
                  {t.description && <p className="text-xs text-slate-500 mt-1">{t.description}</p>}
                  <div className="text-xs text-slate-500 mt-2">
                    By: <span className="text-slate-300">{t.assigned_by_profile?.full_name ?? 'Account Manager'}</span>
                    {t.due_date && <span className="ml-3">Due: <span className="text-slate-300">{t.due_date}</span></span>}
                  </div>
                </div>
                {t.status !== 'completed' && (
                  <button onClick={() => markComplete(t)} className="btn-secondary shrink-0">
                    <CheckCircle2 className="w-4 h-4" /> Mark Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClientReports() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState<Report | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [repRes, revRes] = await Promise.all([
      supabase.from('reports').select('*').eq('subject_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('reviews').select('*, report_id').eq('reviewer_id', profile.id).order('created_at', { ascending: false }),
    ]);
    if (repRes.data) setReports(repRes.data as Report[]);
    if (revRes.data) setMyReviews(revRes.data as Review[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const reviewedReportIds = new Set(myReviews.filter(r => r.report_id).map(r => r.report_id!));

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">My Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Reports prepared for you and your reviews</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No reports available yet</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {reports.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-100">{r.title}</span>
                    <ReportStatusBadge status={r.status} />
                    {reviewedReportIds.has(r.id) && (
                      <span className="badge border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        <Star className="w-3 h-3" /> Reviewed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.content}</p>
                  <p className="text-xs text-slate-600 mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                {!reviewedReportIds.has(r.id) && (
                  <button onClick={() => setShowReview(r)} className="btn-primary shrink-0">
                    <Star className="w-4 h-4" /> Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showReview && (
        <GiveReportReviewModal
          report={showReview}
          reviewerId={profile!.id}
          onClose={() => setShowReview(null)}
          onSubmitted={() => { setShowReview(null); load(); }}
        />
      )}
    </div>
  );
}

function GiveReportReviewModal({ report, reviewerId, onClose, onSubmitted }: {
  report: Report;
  reviewerId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.from('reviews').insert({
      review_type: 'report',
      reviewer_id: reviewerId,
      reviewee_id: report.author_id,
      report_id: report.id,
      rating,
      comment: comment || null,
    });
    if (error) setError(error.message);
    else onSubmitted();
    setLoading(false);
  }

  return (
    <Modal open onClose={onClose} title={`Review: ${report.title}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800">
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{report.content}</p>
        </div>
        <div>
          <label className="label">Rating</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button" onClick={() => setRating(star)} className="p-1">
                <svg className={`w-8 h-8 transition-colors ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600 fill-slate-700 hover:text-slate-500'}`} viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Comment</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="input min-h-[100px] resize-none" placeholder="Your feedback on this report..." />
        </div>
        {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Submitting...' : 'Submit Review'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ClientAccountManager() {
  const { profile } = useAuth();
  const [manager, setManager] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.account_manager_id) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', profile.account_manager_id).maybeSingle();
      setManager(data as Profile | null);
      setLoading(false);
    })();
  }, [profile]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">My Account Manager</h1>
        <p className="text-sm text-slate-500 mt-1">Your dedicated account manager contact</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
      ) : !manager ? (
        <div className="card p-12 text-center">
          <UserCog className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No account manager assigned yet</p>
        </div>
      ) : (
        <div className="card p-6 max-w-md">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center text-2xl font-bold text-purple-400 shrink-0">
              {manager.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-100">{manager.full_name}</div>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-400">
                <Mail className="w-3.5 h-3.5" />
                {manager.email}
              </div>
              {manager.department && (
                <div className="mt-2">
                  <span className="badge border bg-purple-500/10 text-purple-400 border-purple-500/30">{manager.department}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
