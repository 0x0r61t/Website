import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import AuthScreen from '@/components/AuthScreen';
import { DashboardLayout, type PageKey } from '@/components/DashboardLayout';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { EmployeeDashboard } from '@/components/employee/EmployeeDashboard';
import { InternDashboard } from '@/components/intern/InternDashboard';
import { ClientDashboard } from '@/components/client/ClientDashboard';

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [page, setPage] = useState<PageKey>('overview');

  // Reset to overview when profile changes
  useEffect(() => {
    setPage('overview');
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e14]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00d4aa] to-[#00a884] flex items-center justify-center animate-pulse">
            <svg className="w-7 h-7 text-[#0a0e14]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500 font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return <AuthScreen />;
  }

  if (profile.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e14] p-4">
        <div className="card p-8 max-w-md text-center">
          <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-100">Account Suspended</h2>
          <p className="text-sm text-slate-500 mt-2">Your account has been suspended. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout currentPage={page} onPageChange={setPage}>
      {profile.role === 'admin' && <AdminDashboard page={page} />}
      {profile.role === 'employee' && <EmployeeDashboard page={page} />}
      {profile.role === 'intern' && <InternDashboard page={page} />}
      {profile.role === 'client' && <ClientDashboard page={page} />}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
