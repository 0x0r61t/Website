import { useState, type ReactNode } from 'react';
import { Shield, LayoutDashboard, Users, FileText, Star, ClipboardList, LogOut, Menu, X, ChevronDown, Building2, UserCog } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

export type PageKey =
  | 'overview'
  | 'profiles'
  | 'tasks'
  | 'reports'
  | 'reviews'
  | 'supervisor'
  | 'interns'
  | 'clients'
  | 'account-manager';

interface NavItem {
  key: PageKey;
  label: string;
  icon: ReactNode;
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  admin: [
    { key: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'profiles', label: 'All Profiles', icon: <Users className="w-4 h-4" /> },
    { key: 'tasks', label: 'All Tasks', icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'reports', label: 'All Reports', icon: <FileText className="w-4 h-4" /> },
    { key: 'reviews', label: 'All Reviews', icon: <Star className="w-4 h-4" /> },
  ],
  employee: [
    { key: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'interns', label: 'My Interns', icon: <Users className="w-4 h-4" /> },
    { key: 'clients', label: 'My Clients', icon: <Building2 className="w-4 h-4" /> },
    { key: 'tasks', label: 'Tasks', icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
    { key: 'reviews', label: 'Intern Reviews', icon: <Star className="w-4 h-4" /> },
  ],
  intern: [
    { key: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'tasks', label: 'My Tasks', icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'reports', label: 'My Reports', icon: <FileText className="w-4 h-4" /> },
    { key: 'supervisor', label: 'My Supervisor', icon: <UserCog className="w-4 h-4" /> },
  ],
  client: [
    { key: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'tasks', label: 'My Tasks', icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'reports', label: 'My Reports', icon: <FileText className="w-4 h-4" /> },
    { key: 'account-manager', label: 'My Account Manager', icon: <UserCog className="w-4 h-4" /> },
  ],
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  employee: 'Employee',
  intern: 'Intern',
  client: 'Client',
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  employee: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  intern: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  client: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
};

interface DashboardLayoutProps {
  currentPage: PageKey;
  onPageChange: (page: PageKey) => void;
  children: ReactNode;
}

export function DashboardLayout({ currentPage, onPageChange, children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  if (!profile) return null;

  const navItems = NAV_BY_ROLE[profile.role] ?? [];

  function handleNav(key: PageKey) {
    onPageChange(key);
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen flex bg-[#0a0e14]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#0d1117] border-r border-slate-800 flex flex-col z-40 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00d4aa] to-[#00a884] flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#0a0e14]" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight">Rynex Security</div>
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Portal</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNav(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${currentPage === item.key ? 'bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-800 p-3 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-sm font-semibold text-slate-300 shrink-0">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-200 truncate">{profile.full_name}</div>
              <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border mt-0.5 ${ROLE_COLORS[profile.role]}`}>
                {ROLE_LABELS[profile.role]}
              </div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 mt-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between h-16 px-4 border-b border-slate-800 bg-[#0d1117] sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#00d4aa]" />
            <span className="text-sm font-bold">Rynex Security</span>
          </div>
          <div className="w-9" />
        </header>

        {/* Desktop header */}
        <header className="hidden lg:flex items-center justify-between h-16 px-6 border-b border-slate-800 bg-[#0d1117] sticky top-0 z-20">
          <div className="text-sm text-slate-500">
            <span className="text-slate-300 font-medium">{navItems.find((n) => n.key === currentPage)?.label ?? 'Dashboard'}</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-semibold text-slate-300">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-slate-200">{profile.full_name}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 card p-2 z-40 animate-fade-in">
                  <div className="px-3 py-2 border-b border-slate-800 mb-1">
                    <div className="text-sm font-medium text-slate-200">{profile.full_name}</div>
                    <div className="text-xs text-slate-500">{profile.email}</div>
                  </div>
                  <button
                    onClick={() => { setUserMenuOpen(false); signOut(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
