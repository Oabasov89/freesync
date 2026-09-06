import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  ShieldCheck,
  ArrowRight,
  LogOut,
  Copy,
  Check,
} from 'lucide-react';
import { User } from '../types/baas';
import { supabase, mapSupabaseUserToBaasUser, SUPABASE_URL } from '../lib/supabase';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  authToken: string | null;
  onSignInSuccess: (user: User, token: string) => void;
  onSignOut: () => void;
  defaultMode?: 'signin' | 'signup';
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  authToken,
  onSignInSuccess,
  onSignOut,
  defaultMode = 'signin',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  if (!isOpen) return null;

  const handleCopyToken = () => {
    if (authToken) {
      navigator.clipboard.writeText(authToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (mode === 'signup') {
        const { data: sbData, error: sbError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: name.trim() || undefined,
            },
          },
        });

        if (sbError) {
          throw new Error(`Supabase Auth: ${sbError.message}`);
        }

        if (sbData?.session && sbData?.user) {
          const baasUser = mapSupabaseUserToBaasUser(sbData.user);
          const syncRes = await fetch('/api/v1/auth/supabase-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: baasUser, token: sbData.session.access_token }),
          });
          const syncData = await syncRes.json();
          onSignInSuccess(syncData.user || baasUser, sbData.session.access_token);
          setSuccessMessage(`Account created in Supabase! Welcome, ${baasUser.name}.`);
          setTimeout(() => onClose(), 900);
        } else if (sbData?.user) {
          setSuccessMessage(
            `Registration submitted! Supabase sent a verification email to ${cleanEmail}. Please verify or sign in with test credentials.`
          );
        }
      } else {
        const { data: sbData, error: sbError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!sbError && sbData?.session && sbData?.user) {
          const baasUser = mapSupabaseUserToBaasUser(sbData.user);
          const syncRes = await fetch('/api/v1/auth/supabase-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: baasUser, token: sbData.session.access_token }),
          });
          const syncData = await syncRes.json();
          onSignInSuccess(syncData.user || baasUser, sbData.session.access_token);
          setSuccessMessage(`Signed in via Supabase as ${baasUser.name}.`);
          setTimeout(() => onClose(), 900);
        } else {
          // Fallback to local authentication for pre-seeded developer accounts
          const localRes = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, password }),
          });

          if (localRes.ok) {
            const localData = await localRes.json();
            onSignInSuccess(localData.user, localData.token);
            setSuccessMessage(`Signed in successfully as ${localData.user.name}.`);
            setTimeout(() => onClose(), 900);
          } else {
            const localData = await localRes.json().catch(() => ({}));
            throw new Error(
              sbError?.message
                ? `Supabase Auth: ${sbError.message}`
                : (localData.error || 'Invalid credentials.')
            );
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        id="user-auth-modal-card"
        className="w-full max-w-md rounded-2xl border border-[#262626] bg-[#121212] p-6 shadow-2xl relative"
      >
        {/* Close Button */}
        <button
          id="btn-close-auth-modal"
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Current User Active Session View */}
        {currentUser ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <img
                src={
                  currentUser.avatarUrl ||
                  `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(currentUser.id)}`
                }
                alt={currentUser.name}
                className="h-12 w-12 rounded-full ring-2 ring-violet-500/40 bg-zinc-800 object-cover"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-medium text-zinc-100">{currentUser.name}</h3>
                  <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] font-mono text-violet-300 capitalize">
                    {currentUser.role}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  {currentUser.email || currentUser.id}
                </p>
              </div>
            </div>

            {/* Zero Cost Security Note */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-medium text-emerald-300">Active Authenticated Session ($0 Cost)</div>
                <div className="text-zinc-400 text-[11px] mt-0.5">
                  Your identity is cryptographically verified in RAM. Queries to your database collections are automatically scoped to your user ID with zero database socket overhead.
                </div>
              </div>
            </div>

            {/* Token details */}
            {authToken && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 space-y-1.5 font-mono text-xs">
                <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                  <span>Session Bearer Token</span>
                  <button
                    onClick={handleCopyToken}
                    className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    {copiedToken ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-[11px] text-zinc-300 truncate bg-zinc-900 px-2.5 py-1.5 rounded border border-zinc-800">
                  {authToken}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                id="btn-modal-sign-out"
                onClick={() => {
                  onSignOut();
                  setSuccessMessage('Signed out successfully.');
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-300 hover:text-rose-200 border border-zinc-700 py-2.5 text-xs font-medium transition-all"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
              <button
                id="btn-modal-close-session"
                onClick={onClose}
                className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 text-white py-2.5 text-xs font-medium transition-all"
              >
                Continue to App
              </button>
            </div>
          </div>
        ) : (
          /* Sign In / Sign Up Form */
          <div className="space-y-4">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 text-violet-400 text-xs font-mono uppercase tracking-wider mb-1">
                <Zap className="h-3.5 w-3.5" />
                <span>Zero-Cost Authentication</span>
              </div>
              <h2 className="text-xl font-serif text-zinc-100">
                {mode === 'signin' ? 'Sign In to Your Account' : 'Create Free User Account'}
              </h2>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                {mode === 'signin'
                  ? 'Access your private database records and live sync streams.'
                  : 'Start using your self-hosted backend with instant user isolation.'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 rounded-xl bg-zinc-900/90 p-1 border border-zinc-800 text-xs">
              <button
                id="btn-tab-signin"
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`py-1.5 rounded-lg font-medium transition-all ${
                  mode === 'signin'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Sign In
              </button>
              <button
                id="btn-tab-signup"
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`py-1.5 rounded-lg font-medium transition-all ${
                  mode === 'signup'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Alerts */}
            {error && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 flex items-start gap-2.5 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'signup' && (
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Your Full Name</label>
                  <div className="relative">
                    <UserIcon className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      id="input-auth-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    id="input-auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Password</label>
                <div className="relative">
                  <Lock className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    id="input-auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-9 pr-10 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-submit-auth"
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium py-2.5 text-xs shadow-sm transition-all disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
