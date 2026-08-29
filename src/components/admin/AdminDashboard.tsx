import { useEffect, useState, useCallback } from 'react';
import { Users, ClipboardList, FileText, Star, Plus, Trash2, Mail, Shield, Search, UserCog, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Profile, Task, Report, Review, UserRole, ProfileStatus } from '@/lib/types';
import { DEPARTMENTS, INTERNSHIP_TYPES } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { RoleBadge, ProfileStatusBadge, TaskStatusBadge, ReportStatusBadge, StarRating } from '@/components/Badges';
import type { PageKey } from '@/components/DashboardLayout';

interface AdminDashboardProps {
  page: PageKey;
}

export function AdminDashboard({ page }: AdminDashboardProps) {
  if (page === 'overview') return <AdminOverview />;
  if (page === 'profiles') return <AdminProfiles />;
  if (page === 'tasks') return <AdminTasks />;
  if (page === 'reports') return <AdminReports />;
  if (page === 'reviews') return <AdminReviews />;
  return <AdminOverview />;
}

function AdminOverview() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ employees: 0, interns: 0, clients: 0, tasks: 0, reports: 0, reviews: 0 });

  useEffect(() => {
    (async () => {
      const [emp, int, cli, tasks, reports, reviews] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'employee'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'intern'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }),
        supabase.from('reports').select('id', { count: 'exact', head: true }),
        supabase.from('reviews').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        employees: emp.count ?? 0,
        interns: int.count ?? 0,
        clients: cli.count ?? 0,
        tasks: tasks.count ?? 0,
        reports: reports.count ?? 0,
        reviews: reviews.count ?? 0,
      });
    })();
  }, []);

  const cards = [
    { label: 'Employees', value: stats.employees, icon: <Users className="w-5 h-5" />, color: 'text-blue-400 bg-blue-500/10' },
    { label: 'Interns', value: stats.interns, icon: <Shield className="w-5 h-5" />, color: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Clients', value: stats.clients, icon: <Users className="w-5 h-5" />, color: 'text-purple-400 bg-purple-500/10' },
    { label: 'Tasks', value: stats.tasks, icon: <ClipboardList className="w-5 h-5" />, color: 'text-amber-400 bg-amber-500/10' },
    { label: 'Reports', value: stats.reports, icon: <FileText className="w-5 h-5" />, color: 'text-cyan-400 bg-cyan-500/10' },
    { label: 'Reviews', value: stats.reviews, icon: <Star className="w-5 h-5" />, color: 'text-pink-400 bg-pink-500/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Welcome back, {profile?.full_name.split(' ')[0]}</h1>
        <p className="text-sm text-slate-500 mt-1">System-wide overview of all accounts and activity</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="card p-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
              {card.icon}
            </div>
            <div className="text-2xl font-bold text-slate-100">{card.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">Service Areas</h2>
        <div className="flex flex-wrap gap-2">
          {['VAPT', 'SOC', 'GRC', 'Security Audits', 'Cyber Security Trainings'].map((s) => (
            <span key={s} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminProfiles() {
  const { session } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Profile | null>(null);
  const [allEmployees, setAllEmployees] = useState<Profile[]>([]);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (!error && data) setProfiles(data as Profile[]);
    setLoading(false);
  }, []);

  const loadEmployees = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'employee').eq('status', 'active').order('full_name');
    if (data) setAllEmployees(data as Profile[]);
  }, []);

  useEffect(() => { loadProfiles(); loadEmployees(); }, [loadProfiles, loadEmployees]);

  async function handleDelete(p: Profile) {
    if (!confirm(`Delete account for ${p.full_name}? This cannot be undone.`)) return;
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-accounts?id=${p.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) {
      setProfiles(prev => prev.filter(x => x.id !== p.id));
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to delete account');
    }
  }

  const filtered = profiles.filter(p => {
    if (roleFilter !== 'all' && p.role !== roleFilter) return false;
    if (search && !p.full_name.toLowerCase().includes(search.toLowerCase()) && !p.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100">All Profiles</h1>
          <p className="text-sm text-slate-500 mt-1">{profiles.length} total accounts</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Account
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')} className="input sm:w-40 cursor-pointer">
          <option value="all" className="bg-slate-900">All Roles</option>
          <option value="admin" className="bg-slate-900">Admin</option>
          <option value="employee" className="bg-slate-900">Employee</option>
          <option value="intern" className="bg-slate-900">Intern</option>
          <option value="client" className="bg-slate-900">Client</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading profiles...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No profiles found</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((p) => (
            <div key={p.id} className="card p-4 flex items-center gap-4 hover:border-slate-700 transition-colors">
              <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center text-base font-semibold text-slate-300 shrink-0">
                {p.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-100">{p.full_name}</span>
                  <RoleBadge role={p.role} />
                  <ProfileStatusBadge status={p.status} />
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{p.email}</span>
                  {p.internship_type && <span className="text-emerald-400">{p.internship_type}</span>}
                  {p.department && <span className="text-blue-400">{p.department}</span>}
                  {p.phone && <span>{p.phone}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setShowEdit(p)} className="btn-ghost px-2.5 py-2" title="Edit">
                  <UserCog className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(p)} className="btn-ghost px-2.5 py-2 hover:text-red-400" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateAccountModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadProfiles(); }}
          session={session}
          employees={allEmployees}
        />
      )}

      {showEdit && (
        <EditProfileModal
          profile={showEdit}
          employees={allEmployees}
          onClose={() => setShowEdit(null)}
          onSaved={() => { setShowEdit(null); loadProfiles(); }}
          session={session}
        />
      )}
    </div>
  );
}

function CreateAccountModal({ onClose, onCreated, session, employees }: {
  onClose: () => void;
  onCreated: () => void;
  session: { access_token: string } | null;
  employees: Profile[];
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('intern');
  const [supervisorId, setSupervisorId] = useState('');
  const [accountManagerId, setAccountManagerId] = useState('');
  const [internshipType, setInternshipType] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-accounts?action=create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email, password, full_name: fullName, role,
        supervisor_id: supervisorId || null,
        account_manager_id: accountManagerId || null,
        internship_type: internshipType || null,
        department: department || null,
        phone: phone || null,
      }),
    });

    if (res.ok) {
      onCreated();
    } else {
      const err = await res.json();
      setError(err.error || 'Failed to create account');
    }
    setLoading(false);
  }

  return (
    <Modal open onClose={onClose} title="Create New Account" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Full Name</label>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" placeholder="John Doe" />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="user@rynexsecurity.com" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Password</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="Optional" />
          </div>
        </div>

        <div>
          <label className="label">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="input cursor-pointer">
            <option value="admin" className="bg-slate-900">Admin</option>
            <option value="employee" className="bg-slate-900">Employee</option>
            <option value="intern" className="bg-slate-900">Intern</option>
            <option value="client" className="bg-slate-900">Client</option>
          </select>
        </div>

        {role === 'intern' && (
          <>
            <div>
              <label className="label">Internship Track</label>
              <select value={internshipType} onChange={(e) => setInternshipType(e.target.value)} className="input cursor-pointer">
                <option value="" className="bg-slate-900">Select track...</option>
                {INTERNSHIP_TYPES.map((t) => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Supervisor (Employee)</label>
              <select value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)} className="input cursor-pointer">
                <option value="" className="bg-slate-900">Select supervisor...</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id} className="bg-slate-900">{emp.full_name}</option>)}
              </select>
            </div>
          </>
        )}

        {role === 'employee' && (
          <div>
            <label className="label">Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="input cursor-pointer">
              <option value="" className="bg-slate-900">Select department...</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
            </select>
          </div>
        )}

        {role === 'client' && (
          <div>
            <label className="label">Account Manager (Employee)</label>
            <select value={accountManagerId} onChange={(e) => setAccountManagerId(e.target.value)} className="input cursor-pointer">
              <option value="" className="bg-slate-900">Select manager...</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id} className="bg-slate-900">{emp.full_name}</option>)}
            </select>
          </div>
        )}

        {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Creating...' : 'Create Account'}</button>
        </div>
      </form>
    </Modal>
  );
}

function EditProfileModal({ profile, employees, onClose, onSaved, session }: {
  profile: Profile;
  employees: Profile[];
  onClose: () => void;
  onSaved: () => void;
  session: { access_token: string } | null;
}) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [role, setRole] = useState<UserRole>(profile.role);
  const [supervisorId, setSupervisorId] = useState(profile.supervisor_id ?? '');
  const [accountManagerId, setAccountManagerId] = useState(profile.account_manager_id ?? '');
  const [internshipType, setInternshipType] = useState(profile.internship_type ?? '');
  const [department, setDepartment] = useState(profile.department ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [status, setStatus] = useState<ProfileStatus>(profile.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-accounts`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: profile.id,
        full_name: fullName,
        role,
        supervisor_id: supervisorId || null,
        account_manager_id: accountManagerId || null,
        internship_type: internshipType || null,
        department: department || null,
        phone: phone || null,
        status,
      }),
    });

    if (res.ok) {
      onSaved();
    } else {
      const err = await res.json();
      setError(err.error || 'Failed to update profile');
    }
    setLoading(false);
  }

  return (
    <Modal open onClose={onClose} title={`Edit ${profile.full_name}`} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Full Name</label>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="input cursor-pointer">
              <option value="admin" className="bg-slate-900">Admin</option>
              <option value="employee" className="bg-slate-900">Employee</option>
              <option value="intern" className="bg-slate-900">Intern</option>
              <option value="client" className="bg-slate-900">Client</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as ProfileStatus)} className="input cursor-pointer">
              <option value="active" className="bg-slate-900">Active</option>
              <option value="inactive" className="bg-slate-900">Inactive</option>
              <option value="suspended" className="bg-slate-900">Suspended</option>
            </select>
          </div>
        </div>

        {role === 'intern' && (
          <>
            <div>
              <label className="label">Internship Track</label>
              <select value={internshipType} onChange={(e) => setInternshipType(e.target.value)} className="input cursor-pointer">
                <option value="" className="bg-slate-900">None</option>
                {INTERNSHIP_TYPES.map((t) => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Supervisor</label>
              <select value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)} className="input cursor-pointer">
                <option value="" className="bg-slate-900">None</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id} className="bg-slate-900">{emp.full_name}</option>)}
              </select>
            </div>
          </>
        )}

        {role === 'employee' && (
          <div>
            <label className="label">Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="input cursor-pointer">
              <option value="" className="bg-slate-900">None</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
            </select>
          </div>
        )}

        {role === 'client' && (
          <div>
            <label className="label">Account Manager</label>
            <select value={accountManagerId} onChange={(e) => setAccountManagerId(e.target.value)} className="input cursor-pointer">
              <option value="" className="bg-slate-900">None</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id} className="bg-slate-900">{emp.full_name}</option>)}
            </select>
          </div>
        )}

        {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>
    </Modal>
  );
}

function AdminTasks() {
  const [tasks, setTasks] = useState<(Task & { assigned_to_profile?: Profile; assigned_by_profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assigned_to_profile:profiles!tasks_assigned_to_fkey(*), assigned_by_profile:profiles!tasks_assigned_by_fkey(*)')
        .order('created_at', { ascending: false });
      if (!error && data) setTasks(data as unknown as (Task & { assigned_to_profile?: Profile; assigned_by_profile?: Profile })[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">All Tasks</h1>
        <p className="text-sm text-slate-500 mt-1">System-wide task overview</p>
      </div>
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No tasks created yet</p>
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
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span>Assigned to: <span className="text-slate-300">{t.assigned_to_profile?.full_name ?? 'Unknown'}</span></span>
                    <span>By: <span className="text-slate-300">{t.assigned_by_profile?.full_name ?? 'Unknown'}</span></span>
                    {t.due_date && <span>Due: <span className="text-slate-300">{t.due_date}</span></span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminReports() {
  const [reports, setReports] = useState<(Report & { author_profile?: Profile; subject_profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*, author_profile:profiles!reports_author_id_fkey(*), subject_profile:profiles!reports_subject_id_fkey(*)')
        .order('created_at', { ascending: false });
      if (!error && data) setReports(data as unknown as (Report & { author_profile?: Profile; subject_profile?: Profile })[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">All Reports</h1>
        <p className="text-sm text-slate-500 mt-1">System-wide report overview</p>
      </div>
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No reports submitted yet</p>
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
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span>Author: <span className="text-slate-300">{r.author_profile?.full_name ?? 'Unknown'}</span></span>
                    <span>Subject: <span className="text-slate-300">{r.subject_profile?.full_name ?? 'Unknown'}</span></span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminReviews() {
  const [reviews, setReviews] = useState<(Review & { reviewer_profile?: Profile; reviewee_profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, reviewer_profile:profiles!reviews_reviewer_id_fkey(*), reviewee_profile:profiles!reviews_reviewee_id_fkey(*)')
        .order('created_at', { ascending: false });
      if (!error && data) setReviews(data as unknown as (Review & { reviewer_profile?: Profile; reviewee_profile?: Profile })[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">All Reviews</h1>
        <p className="text-sm text-slate-500 mt-1">System-wide review overview</p>
      </div>
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="card p-12 text-center">
          <Star className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No reviews given yet</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {reviews.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StarRating rating={r.rating} />
                    <span className="badge border bg-slate-700/30 text-slate-400 border-slate-700">{r.review_type.replace('_', ' ')}</span>
                  </div>
                  {r.comment && <p className="text-xs text-slate-400 mt-2">{r.comment}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span>By: <span className="text-slate-300">{r.reviewer_profile?.full_name ?? 'Unknown'}</span></span>
                    <span>For: <span className="text-slate-300">{r.reviewee_profile?.full_name ?? 'Unknown'}</span></span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
