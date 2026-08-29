import { useEffect, useState, useCallback } from 'react';
import { Users, Building2, ClipboardList, FileText, Star, Plus, Mail, Search, CheckCircle2, MessageSquare, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Profile, Task, Report, Review, TaskPriority } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { TaskStatusBadge, ReportStatusBadge, StarRating, PriorityBadge } from '@/components/Badges';
import type { PageKey } from '@/components/DashboardLayout';

interface EmployeeDashboardProps {
  page: PageKey;
}

export function EmployeeDashboard({ page }: EmployeeDashboardProps) {
  if (page === 'overview') return <EmployeeOverview />;
  if (page === 'interns') return <EmployeeInterns />;
  if (page === 'clients') return <EmployeeClients />;
  if (page === 'tasks') return <EmployeeTasks />;
  if (page === 'reports') return <EmployeeReports />;
  if (page === 'reviews') return <EmployeeReviews />;
  return <EmployeeOverview />;
}

function EmployeeOverview() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ interns: 0, clients: 0, tasks: 0, reports: 0 });

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [int, cli, tasks, reports] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('supervisor_id', profile.id),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_manager_id', profile.id),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('assigned_by', profile.id),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('author_id', profile.id),
      ]);
      setStats({
        interns: int.count ?? 0,
        clients: cli.count ?? 0,
        tasks: tasks.count ?? 0,
        reports: reports.count ?? 0,
      });
    })();
  }, [profile]);

  const cards = [
    { label: 'My Interns', value: stats.interns, icon: <Users className="w-5 h-5" />, color: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'My Clients', value: stats.clients, icon: <Building2 className="w-5 h-5" />, color: 'text-purple-400 bg-purple-500/10' },
    { label: 'Tasks Assigned', value: stats.tasks, icon: <ClipboardList className="w-5 h-5" />, color: 'text-amber-400 bg-amber-500/10' },
    { label: 'Reports Uploaded', value: stats.reports, icon: <FileText className="w-5 h-5" />, color: 'text-cyan-400 bg-cyan-500/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Welcome, {profile?.full_name.split(' ')[0]}</h1>
        <p className="text-sm text-slate-500 mt-1">{profile?.department && `${profile.department} Department`}</p>
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

function EmployeeInterns() {
  const { profile } = useAuth();
  const [interns, setInterns] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAssignTask, setShowAssignTask] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').eq('supervisor_id', profile.id).order('full_name');
    if (!error && data) setInterns(data as Profile[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const filtered = interns.filter(i => !search || i.full_name.toLowerCase().includes(search.toLowerCase()) || i.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">My Interns</h1>
        <p className="text-sm text-slate-500 mt-1">{interns.length} intern(s) under your supervision</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input type="text" placeholder="Search interns..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No interns assigned to you yet</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((i) => (
            <div key={i.id} className="card p-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center text-base font-semibold text-slate-300 shrink-0">
                {i.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-100">{i.full_name}</span>
                  {i.internship_type && <span className="badge border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">{i.internship_type}</span>}
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                  <Mail className="w-3 h-3" />{i.email}
                </div>
              </div>
              <button onClick={() => setShowAssignTask(i)} className="btn-secondary">
                <Plus className="w-4 h-4" /> Assign Task
              </button>
            </div>
          ))}
        </div>
      )}

      {showAssignTask && (
        <AssignTaskModal
          assignee={showAssignTask}
          assignerId={profile!.id}
          onClose={() => setShowAssignTask(null)}
          onAssigned={() => { setShowAssignTask(null); }}
        />
      )}
    </div>
  );
}

function EmployeeClients() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAssignTask, setShowAssignTask] = useState<Profile | null>(null);
  const [showUploadReport, setShowUploadReport] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').eq('account_manager_id', profile.id).order('full_name');
    if (!error && data) setClients(data as Profile[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const filtered = clients.filter(c => !search || c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">My Clients</h1>
        <p className="text-sm text-slate-500 mt-1">{clients.length} client(s) under your management</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input type="text" placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No clients assigned to you yet</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => (
            <div key={c.id} className="card p-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center text-base font-semibold text-slate-300 shrink-0">
                {c.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-slate-100">{c.full_name}</span>
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                  <Mail className="w-3 h-3" />{c.email}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setShowUploadReport(c)} className="btn-secondary">
                  <FileText className="w-4 h-4" /> Upload Report
                </button>
                <button onClick={() => setShowAssignTask(c)} className="btn-secondary">
                  <Plus className="w-4 h-4" /> Task
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAssignTask && (
        <AssignTaskModal
          assignee={showAssignTask}
          assignerId={profile!.id}
          onClose={() => setShowAssignTask(null)}
          onAssigned={() => setShowAssignTask(null)}
        />
      )}
      {showUploadReport && (
        <UploadReportModal
          client={showUploadReport}
          authorId={profile!.id}
          onClose={() => setShowUploadReport(null)}
          onUploaded={() => setShowUploadReport(null)}
        />
      )}
    </div>
  );
}

function AssignTaskModal({ assignee, assignerId, onClose, onAssigned }: {
  assignee: Profile;
  assignerId: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.from('tasks').insert({
      title,
      description: description || null,
      assigned_to: assignee.id,
      assigned_by: assignerId,
      priority,
      due_date: dueDate || null,
    });
    if (error) setError(error.message);
    else onAssigned();
    setLoading(false);
  }

  return (
    <Modal open onClose={onClose} title={`Assign Task to ${assignee.full_name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Task Title</label>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="e.g. Network vulnerability scan" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[80px] resize-none" placeholder="Task details..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="input cursor-pointer">
              <option value="low" className="bg-slate-900">Low</option>
              <option value="medium" className="bg-slate-900">Medium</option>
              <option value="high" className="bg-slate-900">High</option>
            </select>
          </div>
          <div>
            <label className="label">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
          </div>
        </div>
        {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Assigning...' : 'Assign Task'}</button>
        </div>
      </form>
    </Modal>
  );
}

function UploadReportModal({ client, authorId, onClose, onUploaded }: {
  client: Profile;
  authorId: string;
  onClose: () => void;
  onUploaded: () => void;
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
      report_type: 'client',
      author_id: authorId,
      subject_id: client.id,
    });
    if (error) setError(error.message);
    else onUploaded();
    setLoading(false);
  }

  return (
    <Modal open onClose={onClose} title={`Upload Report for ${client.full_name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Report Title</label>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="e.g. Q3 VAPT Assessment Report" />
        </div>
        <div>
          <label className="label">Report Content</label>
          <textarea required value={content} onChange={(e) => setContent(e.target.value)} className="input min-h-[160px] resize-none" placeholder="Report findings, summary, recommendations..." />
        </div>
        {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Uploading...' : 'Upload Report'}</button>
        </div>
      </form>
    </Modal>
  );
}

function EmployeeTasks() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<(Task & { assigned_to_profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<(Task & { assigned_to_profile?: Profile }) | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*, assigned_to_profile:profiles!tasks_assigned_to_fkey(*)')
      .eq('assigned_by', profile.id)
      .order('created_at', { ascending: false });
    if (!error && data) setTasks(data as unknown as (Task & { assigned_to_profile?: Profile })[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  async function markComplete(task: Task) {
    const { error } = await supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id);
    if (!error) load();
  }

  async function markInProgress(task: Task) {
    const { error } = await supabase.from('tasks').update({ status: 'in_progress' }).eq('id', task.id);
    if (!error) load();
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Tasks</h1>
        <p className="text-sm text-slate-500 mt-1">Tasks you have assigned</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'in_progress', 'submitted', 'completed'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === f ? 'bg-[#00d4aa]/10 text-[#00d4aa] border-[#00d4aa]/30' : 'bg-slate-900/40 text-slate-400 border-slate-700 hover:border-slate-600'}`}>
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No tasks found</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((t) => (
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
                    <span>For: <span className="text-slate-300">{t.assigned_to_profile?.full_name ?? 'Unknown'}</span></span>
                    {t.due_date && <span>Due: <span className="text-slate-300">{t.due_date}</span></span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setSelectedTask(t)} className="btn-ghost px-2.5 py-2" title="View details">
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  {t.status !== 'completed' && (
                    <button onClick={() => markComplete(t)} className="btn-secondary" title="Mark complete">
                      <CheckCircle2 className="w-4 h-4" /> Complete
                    </button>
                  )}
                  {t.status === 'pending' && (
                    <button onClick={() => markInProgress(t)} className="btn-ghost px-2.5 py-2" title="Start progress">
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTask && (
        <Modal open onClose={() => setSelectedTask(null)} title={selectedTask.title}>
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <TaskStatusBadge status={selectedTask.status} />
              <PriorityBadge priority={selectedTask.priority} />
            </div>
            {selectedTask.description && <p className="text-sm text-slate-400">{selectedTask.description}</p>}
            {selectedTask.submission && (
              <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800">
                <div className="text-xs font-medium text-slate-500 mb-1">Submission</div>
                <p className="text-sm text-slate-300">{selectedTask.submission}</p>
                {selectedTask.submitted_at && <p className="text-xs text-slate-600 mt-2">Submitted: {new Date(selectedTask.submitted_at).toLocaleString()}</p>}
              </div>
            )}
            {selectedTask.feedback && (
              <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800">
                <div className="text-xs font-medium text-slate-500 mb-1">Feedback</div>
                <p className="text-sm text-slate-300">{selectedTask.feedback}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function EmployeeReports() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<(Report & { subject_profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<(Report & { subject_profile?: Profile }) | null>(null);
  const [feedback, setFeedback] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    // Get reports where I'm the author (client reports I uploaded) OR where subject is my intern
    const [myReports, internReports] = await Promise.all([
      supabase.from('reports').select('*, subject_profile:profiles!reports_subject_id_fkey(*)').eq('author_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('reports').select('*, subject_profile:profiles!reports_subject_id_fkey(*)').eq('report_type', 'intern').order('created_at', { ascending: false }),
    ]);

    const allReports: (Report & { subject_profile?: Profile })[] = [];
    if (myReports.data) allReports.push(...(myReports.data as unknown as (Report & { subject_profile?: Profile })[]));
    if (internReports.data) {
      // Filter to only reports where subject is an intern I supervise
      const supervisedIds = new Set<string>();
      const { data: myInterns } = await supabase.from('profiles').select('id').eq('supervisor_id', profile.id);
      if (myInterns) myInterns.forEach((i: { id: string }) => supervisedIds.add(i.id));
      internReports.data.forEach((r) => {
        if (supervisedIds.has(r.subject_id)) {
          allReports.push(r as unknown as (Report & { subject_profile?: Profile }));
        }
      });
    }

    // Deduplicate
    const seen = new Set<string>();
    const deduped = allReports.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    setReports(deduped);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  async function markReport(report: Report & { subject_profile?: Profile }, status: string, feedbackText: string) {
    const updates: Record<string, unknown> = { status };
    if (feedbackText) updates.feedback = feedbackText;
    const { error } = await supabase.from('reports').update(updates).eq('id', report.id);
    if (!error) {
      setSelectedReport(null);
      setFeedback('');
      setNewStatus('');
      load();
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Client reports you uploaded and intern reports for review</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No reports yet</p>
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
                    <span className="badge border bg-slate-700/30 text-slate-400 border-slate-700">{r.report_type}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.content}</p>
                  <div className="text-xs text-slate-500 mt-2">
                    For: <span className="text-slate-300">{r.subject_profile?.full_name ?? 'Unknown'}</span>
                  </div>
                </div>
                <button onClick={() => { setSelectedReport(r); setFeedback(r.feedback ?? ''); setNewStatus(r.status); }} className="btn-secondary shrink-0">
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReport && (
        <Modal open onClose={() => setSelectedReport(null)} title={selectedReport.title}>
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <ReportStatusBadge status={selectedReport.status} />
              <span className="badge border bg-slate-700/30 text-slate-400 border-slate-700">{selectedReport.report_type}</span>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800">
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedReport.content}</p>
            </div>
            {selectedReport.report_type === 'intern' && (
              <>
                <div>
                  <label className="label">Update Status</label>
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="input cursor-pointer">
                    <option value="pending" className="bg-slate-900">Pending</option>
                    <option value="reviewed" className="bg-slate-900">Reviewed</option>
                    <option value="approved" className="bg-slate-900">Approved</option>
                  </select>
                </div>
                <div>
                  <label className="label">Feedback</label>
                  <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} className="input min-h-[80px] resize-none" placeholder="Provide feedback on this report..." />
                </div>
                <button onClick={() => markReport(selectedReport, newStatus, feedback)} className="btn-primary w-full">
                  <CheckCircle2 className="w-4 h-4" /> Save Review
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function EmployeeReviews() {
  const { profile } = useAuth();
  const [interns, setInterns] = useState<Profile[]>([]);
  const [reviews, setReviews] = useState<(Review & { reviewee_profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data: internData } = await supabase.from('profiles').select('*').eq('supervisor_id', profile.id).order('full_name');
    if (internData) setInterns(internData as Profile[]);
    const { data: reviewData } = await supabase.from('reviews').select('*, reviewee_profile:profiles!reviews_reviewee_id_fkey(*)').eq('reviewer_id', profile.id).order('created_at', { ascending: false });
    if (reviewData) setReviews(reviewData as unknown as (Review & { reviewee_profile?: Profile })[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Intern Reviews</h1>
          <p className="text-sm text-slate-500 mt-1">Give performance reviews to your interns</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
      ) : (
        <>
          {interns.length > 0 && (
            <div className="card p-4">
              <h2 className="text-sm font-semibold text-slate-200 mb-3">Give a Review</h2>
              <div className="grid gap-2">
                {interns.map((i) => (
                  <button key={i.id} onClick={() => setShowReview(i)} className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-colors text-left">
                    <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-sm font-semibold text-slate-300 shrink-0">
                      {i.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-200">{i.full_name}</div>
                      <div className="text-xs text-slate-500">{i.internship_type}</div>
                    </div>
                    <Star className="w-4 h-4 text-slate-600" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Reviews Given</h2>
            {reviews.length === 0 ? (
              <div className="card p-12 text-center">
                <Star className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No reviews given yet</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {reviews.map((r) => (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StarRating rating={r.rating} />
                      <span className="text-sm font-medium text-slate-200">{r.reviewee_profile?.full_name ?? 'Unknown'}</span>
                    </div>
                    {r.comment && <p className="text-xs text-slate-400 mt-2">{r.comment}</p>}
                    <p className="text-xs text-slate-600 mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showReview && (
        <GiveReviewModal
          intern={showReview}
          reviewerId={profile!.id}
          onClose={() => setShowReview(null)}
          onSubmitted={() => { setShowReview(null); load(); }}
        />
      )}
    </div>
  );
}

function GiveReviewModal({ intern, reviewerId, onClose, onSubmitted }: {
  intern: Profile;
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
      review_type: 'intern_performance',
      reviewer_id: reviewerId,
      reviewee_id: intern.id,
      rating,
      comment: comment || null,
    });
    if (error) setError(error.message);
    else onSubmitted();
    setLoading(false);
  }

  return (
    <Modal open onClose={onClose} title={`Review ${intern.full_name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="input min-h-[100px] resize-none" placeholder="Performance feedback..." />
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
