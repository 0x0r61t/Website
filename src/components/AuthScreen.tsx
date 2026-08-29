import { useState } from 'react';
import { Shield, Lock, Mail, User, ArrowRight, Eye, EyeOff, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import type { UserRole } from '@/lib/types';
import { DEPARTMENTS, INTERNSHIP_TYPES } from '@/lib/types';

type Mode = 'signin' | 'signup';

const ROLE_OPTIONS: { value: UserRole; label: string; desc: string }[] = [
  { value: 'employee', label: 'Employee', desc: 'Supervise interns, manage clients' },
  { value: 'intern', label: 'Intern', desc: 'Red Team / Blue Team internship' },
  { value: 'client', label: 'Client', desc: 'View reports and provide reviews' },
];

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('intern');
  const [internshipType, setInternshipType] = useState<string>('Red Team');
  const [department, setDepartment] = useState<string>('VAPT');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      const extra: Record<string, unknown> = {};
      if (role === 'intern') extra.internship_type = internshipType;
      if (role === 'employee') extra.department = department;
      const { error } = await signUp(email, password, fullName, role, extra);
      if (error) {
        setError(error);
      } else {
        setError(null);
        setMode('signin');
        setEmail('');
        setPassword('');
        setFullName('');
        setLoading(false);
        return;
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(#00d4aa 1px, transparent 1px), linear-gradient(90deg, #00d4aa 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00d4aa]/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px]" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00d4aa] to-[#00a884] flex items-center justify-center mb-4 shadow-lg shadow-[#00d4aa]/30">
            <Shield className="w-8 h-8 text-[#0a0e14]" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Rynex Security</h1>
          <p className="text-sm text-slate-500 mt-1 font-mono">Secure Access Portal</p>
        </div>

        <div className="card p-6 sm:p-8 animate-fade-in">
          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-slate-900/60 rounded-lg mb-6">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'signin' ? 'bg-[#00d4aa] text-[#0a0e14]' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'signup' ? 'bg-[#00d4aa] text-[#0a0e14]' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="animate-fade-in">
                <label className="label">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="input pl-10"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@rynexsecurity.com"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <>
                <div className="animate-fade-in">
                  <label className="label">Account Type</label>
                  <div className="space-y-2">
                    {ROLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRole(opt.value)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${role === opt.value ? 'border-[#00d4aa] bg-[#00d4aa]/5' : 'border-slate-700 bg-slate-900/40 hover:border-slate-600'}`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${role === opt.value ? 'border-[#00d4aa]' : 'border-slate-600'}`}>
                          {role === opt.value && <div className="w-2 h-2 rounded-full bg-[#00d4aa]" />}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-200">{opt.label}</div>
                          <div className="text-xs text-slate-500">{opt.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {role === 'intern' && (
                  <div className="animate-fade-in">
                    <label className="label">Internship Track</label>
                    <div className="grid grid-cols-2 gap-2">
                      {INTERNSHIP_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setInternshipType(t)}
                          className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${internshipType === t ? 'border-[#00d4aa] bg-[#00d4aa]/10 text-[#00d4aa]' : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-600'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {role === 'employee' && (
                  <div className="animate-fade-in">
                    <label className="label">Department</label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="input cursor-pointer"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d} className="bg-slate-900">{d}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 animate-fade-in">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {mode === 'signup' && (
            <p className="text-xs text-slate-500 mt-4 text-center">
              Admin accounts are created by existing administrators only.
            </p>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6 font-mono">
          RYNEX SECURITY · VAPT · SOC · GRC · AUDITS · TRAINING
        </p>
      </div>
    </div>
  );
}
