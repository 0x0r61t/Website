import { useEffect, useState, useCallback } from 'react';
import { ClipboardList, FileText, UserCog, Mail, Send, CheckCircle2, Plus, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Task, Report, Profile, Review } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { TaskStatusBadge, ReportStatusBadge, StarRating, PriorityBadge } from '@/components/Badges';
import type { PageKey } from '@/components/DashboardLayout';

interface InternDashboardProps {
  page: PageKey;
}

export function InternDashboard({ page }: InternDashboardProps) {
  if (page === 'overview') return <InternOverview />;
  if (page === 'tasks') return <InternTasks />;
  if (page === 'reports') return <InternReports />;
  if (page === 'supervisor') return <InternSupervisor />;
  return <InternOverview />;
}

function InternOverview() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ tasks: 0, pending: 0, reports: 0, reviews: 0 });

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [tasks, pending, reports, reviews] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('assigned_to', profile.id),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('assigned_to', profile.id).eq('status', 'pending'),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('author_id', profile.id),
        supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('reviewee_id', profile.id),
      ]);
      setStats({
        tasks: tasks.count ?? 0,
        pending: pending.count ?? 0,
        reports: reports.count ?? 0,
        reviews: reviews.count ?? 0,
      });
    })();
  }, [profile]);

  const cards = [
    { label: 'Total Tasks', value: stats.tasks, icon: <ClipboardList className="w-5 h-5" />, color: 'text-amber-400 bg-amber-500/10' },
    { label: 'Pending', value: stats.pending, icon: <Send className="w-5 h-5" />, color: 'text-slate-400 bg-slate-500/10' },
    { label: 'My Reports', value: stats.reports, icon: <FileText className="w-5 h-5" />, color: 'text-cyan-400 bg-cyan-500/10' },
    { label: 'Reviews Received', value: stats.reviews, icon: <Star className="w-5 h-5" />, color: 'text-pink-400 bg-pink-500/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Welcome, {profile?.full_name.split(' ')[0]}</h1>
        <p className="text-sm text-slate-500 mt-1">{profile?.internship_type && `${profile.internship_type} Internship`}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

function InternTasks() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<(Task & { assigned_by_profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<(Task & { assigned_by_profile?: Profile }) | null>(null);
  const [submission, setSubmission] = useState('');

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

  async function submitTask(task: Task & { assigned_by_profile?: Profile }) {
    const { error } = await supabase.from('tasks').update({
      status: 'submitted',
      submission,
      submitted_at: new Date().toISOString(),
    }).eq('id', task.id);
    if (!error) {
      setSelectedTask(null);
      setSubmission('');
      load();
    }
  }

  async function markComplete(task: Task) {
    const { error } = await supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id);
    if (!error) load();
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">My Tasks</h1>
        <p className="text-sm text-slate-500 mt-1">Tasks assigned to you by your supervisor</p>
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
                    <PriorityBadge priority={t.priority} />
                  </div>
                  {t.description && <p className="text-xs text-slate-500 mt-1">{t.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span>By: <span className="text-slate-300">{t.assigned_by_profile?.full_name ?? 'Supervisor'}</span></span>
                    {t.due_date && <span>Due: <span className="text-slate-300">{t.due_date}</span></span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(t.status === 'pending' || t.status === 'in_progress') && (
                    <button onClick={() => { setSelectedTask(t); setSubmission(t.submission ?? ''); }} className="btn-primary">
                      <Send className="w-4 h-4" /> Submit
                    </button>
                  )}
                  {t.status === 'submitted' && (
                    <button onClick={() => markComplete(t)} className="btn-secondary">
                      <CheckCircle2 className="w-4 h-4" /> Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTask && (
        <Modal open onClose={() => setSelectedTask(null)} title={`Submit: ${selectedTask.title}`}>
          <div className="space-y-4">
            {selectedTask.description && (
              <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800">
                <div className="text-xs font-medium text-slate-500 mb-1">Description</div>
                <p className="text-sm text-slate-300">{selectedTask.description}</p>
              </div>
            )}
            <div>
              <label className="label">Your Submission</label>
              <textarea value={submission} onChange={(e) => setSubmission(e.target.value)} className="input min-h-[120px] resize-none" placeholder="Describe your work, findings, or results..." />
            </div>
            <button onClick={() => submitTask(selectedTask)} disabled={!submission.trim()} className="btn-primary w-full">
              <Send className="w-4 h-4" /> Submit Task
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InternReports() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [repRes, revRes] = await Promise.all([
      supabase.from('reports').select('*').eq('author_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('reviews').select('*').eq('reviewee_id', profile.id).order('created_at', { ascending: false }),
    ]);
    if (repRes.data) setReports(repRes.data as Report[]);
    if (revRes.data) setReviews(revRes.data as Review[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">My Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Submit reports and view feedback</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Report
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
      ) : (
        <>
          {reports.length === 0 ? (
            <div className="card p-12 text-center">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No reports submitted yet</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {reports.map((r) => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-100">{r.title}</span>
                    <ReportStatusBadge status={r.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.content}</p>
                  {r.feedback && (
                    <div className="mt-3 bg-slate-900/60 rounded-lg p-3 border border-slate-800">
                      <div className="text-xs font-medium text-[#00d4aa] mb-1">Supervisor Feedback</div>
                      <p className="text-sm text-slate-300">{r.feedback}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {reviews.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-slate-200 mb-3">Performance Reviews Received</h2>
              <div className="grid gap-3">
                {reviews.map((r) => (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-center gap-2">
                      <StarRating rating={r.rating} />
                    </div>
                    {r.comment && <p className="text-xs text-slate-400 mt-2">{r.comment}</p>}
                    <p className="text-xs text-slate-600 mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <CreateReportModal
          authorId={profile!.id}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}

function CreateReportModal({ authorId, onClose, onCreated }: {
  authorId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.from('reports').insert({
      title,
      content,
      report_type: 'intern',
      author_id: authorId,
      subject_id: authorId,
    });
    if (error) setError(error.message);
    else onCreated();
    setLoading(false);
  }

  return (
    <Modal open onClose={onClose} title="Submit New Report">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Report Title</label>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="e.g. Week 3 Red Team Assessment" />
        </div>
        <div>
          <label className="label">Report Content</label>
          <textarea required value={content} onChange={(e) => setContent(e.target.value)} className="input min-h-[160px] resize-none" placeholder="Describe your findings, methodology, and results..." />
        </div>
        {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Submitting...' : 'Submit Report'}</button>
        </div>
      </form>
    </Modal>
  );
}

function InternSupervisor() {
  const { profile } = useAuth();
  const [supervisor, setSupervisor] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.supervisor_id) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', profile.supervisor_id).maybeSingle();
      setSupervisor(data as Profile | null);
      setLoading(false);
    })();
  }, [profile]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">My Supervisor</h1>
        <p className="text-sm text-slate-500 mt-1">Your assigned supervisor contact</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
      ) : !supervisor ? (
        <div className="card p-12 text-center">
          <UserCog className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No supervisor assigned yet</p>
        </div>
      ) : (
        <div className="card p-6 max-w-md">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center text-2xl font-bold text-blue-400 shrink-0">
              {supervisor.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-100">{supervisor.full_name}</div>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-400">
                <Mail className="w-3.5 h-3.5" />
                {supervisor.email}
              </div>
              {supervisor.department && (
                <div className="mt-2">
                  <span className="badge border bg-blue-500/10 text-blue-400 border-blue-500/30">{supervisor.department}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
