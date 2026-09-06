import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  ShieldCheck,
  Zap,
  Lock,
  Mail,
  ArrowRight,
  Database,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Plus,
  Key,
  Layers,
  FileText,
} from 'lucide-react';
import { User } from '../types/baas';

interface AuthSandboxTabProps {
  currentUser: User | null;
  authToken: string | null;
  onSignInSuccess: (user: User, token: string) => void;
  onSignOut: () => void;
  onOpenAuthModal: () => void;
  onRefreshUsers: () => void;
}

export const AuthSandboxTab: React.FC<AuthSandboxTabProps> = ({
  currentUser,
  authToken,
  onSignInSuccess,
  onSignOut,
  onOpenAuthModal,
  onRefreshUsers,
}) => {
  // In-page authentication form state
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Live Database Test state
  const [vaultDocs, setVaultDocs] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docCategory, setDocCategory] = useState('personal');
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [docFeedback, setDocFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Security RLS Test state
  const [unauthorizedTestResult, setUnauthorizedTestResult] = useState<any>(null);
  const [isTestingUnauthorized, setIsTestingUnauthorized] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [activeCodeSnippet, setActiveCodeSnippet] = useState<'curl' | 'js' | 'react'>('js');

  // Load documents when user or token changes
  useEffect(() => {
    fetchVaultDocs();
  }, [currentUser, authToken]);

  const fetchVaultDocs = async () => {
    setIsLoadingDocs(true);
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const res = await fetch('/api/v1/databases/collections/user_vault/documents', {
        headers,
      });
      const data = await res.json();
      if (res.ok) {
        setVaultDocs(data.documents || []);
      } else {
        setVaultDocs([]);
      }
    } catch {
      setVaultDocs([]);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleInPageAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setIsLoadingAuth(true);

    try {
      const endpoint = authMode === 'signup' ? '/api/v1/auth/register' : '/api/v1/auth/login';
      const payload =
        authMode === 'signup'
          ? { email: email.trim(), password, name: name.trim() || undefined }
          : { email: email.trim(), password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setAuthSuccess(`Welcome, ${data.user.name}! Authenticated with zero cost.`);
      onSignInSuccess(data.user, data.token);
      onRefreshUsers();
    } catch (err: any) {
      setAuthError(err.message || 'Failed to authenticate');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim()) return;
    if (!authToken) {
      setDocFeedback({
        type: 'error',
        message: 'You must sign in first to write to the protected user vault.',
      });
      return;
    }

    setIsCreatingDoc(true);
    setDocFeedback(null);

    try {
      const res = await fetch('/api/v1/databases/collections/user_vault/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          data: {
            title: docTitle.trim(),
            content: docContent.trim(),
            category: docCategory,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create document');
      }

      setDocFeedback({
        type: 'success',
        message: `Document saved! ID: ${data.document?.id}. Bound to your User ID.`,
      });
      setDocTitle('');
      setDocContent('');
      fetchVaultDocs();
    } catch (err: any) {
      setDocFeedback({
        type: 'error',
        message: err.message || 'Failed to write document',
      });
    } finally {
      setIsCreatingDoc(false);
    }
  };

  const handleTestUnauthorizedAccess = async () => {
    setIsTestingUnauthorized(true);
    setUnauthorizedTestResult(null);

    try {
      // Intentionally omit Authorization header to test RLS
      const res = await fetch('/api/v1/databases/collections/user_vault/documents');
      const data = await res.json();
      setUnauthorizedTestResult({
        status: res.status,
        statusText: res.statusText,
        body: data,
        blocked: res.status === 403,
      });
    } catch (err: any) {
      setUnauthorizedTestResult({
        status: 500,
        statusText: 'Network Error',
        body: { error: err.message },
        blocked: false,
      });
    } finally {
      setIsTestingUnauthorized(false);
    }
  };

  const handleCopyToken = () => {
    if (authToken) {
      navigator.clipboard.writeText(authToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const fillDemoCreds = (demoEmail: string, demoPass: string, demoName?: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    if (demoName) setName(demoName);
    setAuthError(null);
    setAuthSuccess(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Value Banner: Zero Cost Architecture Explained */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-zinc-900/60 to-zinc-950 p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-medium text-emerald-400 uppercase tracking-wider">
                Self-Hosted • Zero External Cloud Bills ($0.00)
              </span>
            </div>
            <h2 className="text-lg font-serif text-zinc-100">
              Live Authentication & Database Sandbox
            </h2>
            <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed">
              Sign in or create a user account below. All sessions use stateless cryptographically signed JWT tokens verified in high-speed RAM. Documents are automatically isolated using <strong className="text-zinc-200">Row-Level Security (RLS)</strong>, preventing remote DB socket exhaustion and scaling with 10+ concurrent users effortlessly.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-center">
              <div className="text-[10px] text-zinc-500 font-mono uppercase">RAM Auth Latency</div>
              <div className="text-sm font-semibold font-mono text-violet-400">~0.12 ms</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-center">
              <div className="text-[10px] text-zinc-500 font-mono uppercase">DB Socket Cost</div>
              <div className="text-sm font-semibold font-mono text-emerald-400">$0.00 / mo</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Left Column (Auth State / Sign In Form), Right Column (Live Database Sandbox) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 5 cols */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Session Status / Sign In Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-400" />
                <h3 className="text-sm font-medium text-zinc-100">
                  {currentUser ? 'Active Authenticated Identity' : 'Sign In or Sign Up'}
                </h3>
              </div>
              {currentUser && (
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                  Online
                </span>
              )}
            </div>

            {currentUser ? (
              /* Signed In User View */
              <div className="space-y-4">
                <div className="flex items-center gap-3.5 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/80">
                  <img
                    src={
                      currentUser.avatarUrl ||
                      `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(currentUser.id)}`
                    }
                    alt={currentUser.name}
                    className="h-12 w-12 rounded-full ring-2 ring-violet-500/30 object-cover bg-zinc-800"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-100 truncate">
                        {currentUser.name}
                      </span>
                      <span className="rounded bg-violet-500/20 border border-violet-500/30 px-1.5 py-0.2 text-[10px] font-mono text-violet-300 capitalize">
                        {currentUser.role}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-mono truncate mt-0.5">
                      {currentUser.email || currentUser.id}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      User ID: {currentUser.id}
                    </p>
                  </div>
                </div>

                {/* Token Preview */}
                {authToken && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                      <span>JWT Bearer Token:</span>
                      <button
                        onClick={handleCopyToken}
                        className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        {copiedToken ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 font-mono text-[11px] text-zinc-300 break-all select-all">
                      {authToken}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    id="btn-sandbox-signout"
                    onClick={() => {
                      onSignOut();
                      setAuthSuccess(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-300 border border-zinc-700 py-2 text-xs font-medium transition-all"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                  <button
                    id="btn-sandbox-open-modal"
                    onClick={onOpenAuthModal}
                    className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 text-white py-2 text-xs font-medium transition-all"
                  >
                    Switch Account
                  </button>
                </div>
              </div>
            ) : (
              /* In-page Sign In / Sign Up Form */
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 rounded-xl bg-zinc-950 p-1 border border-zinc-800 text-xs">
                  <button
                    id="btn-tab-inpage-signin"
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    className={`py-1.5 rounded-lg font-medium transition-all ${
                      authMode === 'signin'
                        ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    id="btn-tab-inpage-signup"
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    className={`py-1.5 rounded-lg font-medium transition-all ${
                      authMode === 'signup'
                        ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                {authError && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 flex items-start gap-2 text-xs text-rose-300">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                {authSuccess && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 flex items-start gap-2 text-xs text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{authSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleInPageAuth} className="space-y-3">
                  {authMode === 'signup' && (
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Your Full Name</label>
                      <div className="relative">
                        <UserIcon className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-2.5" />
                        <input
                          id="input-inpage-name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Jordan Lee"
                          className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-2.5" />
                      <input
                        id="input-inpage-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@freesync.dev"
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Password</label>
                    <div className="relative">
                      <Lock className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-2.5" />
                      <input
                        id="input-inpage-password"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    id="btn-inpage-submit"
                    type="submit"
                    disabled={isLoadingAuth}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium py-2.5 text-xs shadow-sm transition-all disabled:opacity-50"
                  >
                    {isLoadingAuth ? (
                      <span>Authenticating...</span>
                    ) : (
                      <>
                        <span>{authMode === 'signin' ? 'Sign In Now' : 'Create Zero-Cost Account'}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </form>

                {/* Demo Quick Fill */}
                <div className="pt-2 border-t border-zinc-800">
                  <div className="text-[11px] text-zinc-500 mb-1.5 flex items-center justify-between">
                    <span>Quick Fill Demo Credentials:</span>
                    <span className="font-mono text-violet-400">1-Click</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fillDemoCreds('alex@freesync.dev', 'developer123', 'Alex Chen')}
                      className="rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 px-2 py-1 text-[11px] font-mono text-zinc-300 transition-colors"
                    >
                      alex@freesync.dev
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoCreds('sarah@freesync.dev', 'developer123', 'Sarah Connor')}
                      className="rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 px-2 py-1 text-[11px] font-mono text-zinc-300 transition-colors"
                    >
                      sarah@freesync.dev
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RLS Security Enforcement Verification Tool */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-medium text-zinc-100">Live Security Rule Tester</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Verify that unauthenticated visitors cannot read your private records. Clicking this tests calling the database endpoint with <code className="text-amber-300">no token</code>.
            </p>

            <button
              id="btn-test-unauthorized"
              onClick={handleTestUnauthorizedAccess}
              disabled={isTestingUnauthorized}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-amber-500/30 text-amber-300 py-2 text-xs font-mono transition-all disabled:opacity-50"
            >
              {isTestingUnauthorized ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5" />
              )}
              <span>Test Unauthorized Query (GET /user_vault)</span>
            </button>

            {unauthorizedTestResult && (
              <div
                className={`rounded-xl border p-3 font-mono text-xs space-y-1.5 ${
                  unauthorizedTestResult.blocked
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>HTTP {unauthorizedTestResult.status} {unauthorizedTestResult.statusText}</span>
                  <span>{unauthorizedTestResult.blocked ? '✓ RLS BLOCKED SECURELY' : 'UNPROTECTED'}</span>
                </div>
                <div className="text-[11px] text-zinc-400 break-all">
                  {JSON.stringify(unauthorizedTestResult.body)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 7 cols - Personal Database Playground & Live Docs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Personal Database Records Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-violet-400" />
                <h3 className="text-sm font-medium text-zinc-100">
                  Protected User Vault Documents
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchVaultDocs}
                  disabled={isLoadingDocs}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1 text-xs text-zinc-300 transition-colors"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoadingDocs ? 'animate-spin text-violet-400' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* New Document Form */}
            <form onSubmit={handleCreateDocument} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 text-violet-400" />
                  <span>Write Record as Current User</span>
                </span>
                <span className="text-[11px] font-mono text-zinc-500">
                  Collection: <span className="text-violet-300">user_vault</span>
                </span>
              </div>

              {docFeedback && (
                <div
                  className={`rounded-lg p-2.5 text-xs flex items-center gap-2 ${
                    docFeedback.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                  }`}
                >
                  {docFeedback.type === 'success' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>{docFeedback.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <input
                    id="input-vault-title"
                    type="text"
                    required
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Document Title (e.g. My Secret Project Notes)"
                    className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div>
                  <select
                    id="select-vault-category"
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 focus:border-violet-500 focus:outline-none"
                  >
                    <option value="personal">Category: Personal</option>
                    <option value="architecture">Category: Architecture</option>
                    <option value="confidential">Category: Confidential</option>
                  </select>
                </div>
              </div>

              <div>
                <textarea
                  id="textarea-vault-content"
                  required
                  rows={2}
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  placeholder="Record payload content or JSON..."
                  className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none resize-none font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-zinc-500 font-mono">
                  Actor: <span className="text-zinc-300">{currentUser ? currentUser.name : 'Unauthenticated'}</span>
                </div>
                <button
                  id="btn-submit-vault-doc"
                  type="submit"
                  disabled={isCreatingDoc || !currentUser}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-1.5 text-xs shadow-sm transition-all disabled:opacity-40"
                >
                  {isCreatingDoc ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  <span>Save Record</span>
                </button>
              </div>
            </form>

            {/* List of Documents */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Your Visible Records ({vaultDocs.length})</span>
                <span className="font-mono text-[11px] text-zinc-500">
                  {currentUser ? `Owner: ${currentUser.id}` : 'Sign in to see your records'}
                </span>
              </div>

              {vaultDocs.length === 0 ? (
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-6 text-center text-xs text-zinc-500 font-sans">
                  {currentUser
                    ? 'No records created yet for this account. Type a note above to write your first database record!'
                    : 'Sign in to view your private database records.'}
                </div>
              ) : (
                vaultDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 space-y-2 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-medium text-zinc-100">
                          {doc.data?.title || 'Untitled Document'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-300">
                            {doc.data?.category || 'general'}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            ID: {doc.id}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                        Owner: {doc.createdBy}
                      </span>
                    </div>
                    <div className="rounded-lg bg-zinc-900/80 p-2.5 font-mono text-[11px] text-zinc-300 leading-relaxed">
                      {doc.data?.content || JSON.stringify(doc.data)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Developer Integration Code Snippets */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-violet-400" />
                <h3 className="text-sm font-medium text-zinc-100">
                  How to Call From Your App ($0 Host)
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                {(['js', 'curl', 'react'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveCodeSnippet(tab)}
                    className={`rounded-md px-2 py-1 text-[11px] font-mono uppercase transition-all ${
                      activeCodeSnippet === tab
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
              {activeCodeSnippet === 'js' && (
                <pre>{`// 1. Sign in user to acquire stateless token
const res = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'alex@freesync.dev', password: 'developer123' })
});
const { token, user } = await res.json();

// 2. Query your private database (zero socket pool cost)
const docsRes = await fetch('/api/v1/databases/collections/user_vault/documents', {
  headers: { Authorization: \`Bearer \${token}\` }
});
const { documents } = await docsRes.json();
console.log('User documents:', documents);`}</pre>
              )}

              {activeCodeSnippet === 'curl' && (
                <pre>{`# 1. Sign in
curl -X POST https://your-server.com/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "alex@freesync.dev", "password": "developer123"}'

# 2. Write private document
curl -X POST https://your-server.com/api/v1/databases/collections/user_vault/documents \\
  -H "Authorization: Bearer ${authToken || 'fs_jwt_token_here'}" \\
  -H "Content-Type: application/json" \\
  -d '{"data": {"title": "Zero-Cost Document", "content": "Running self-hosted!"}}'`}</pre>
              )}

              {activeCodeSnippet === 'react' && (
                <pre>{`// In your React Component
import { useState, useEffect } from 'react';

export function UserNotesView({ token }) {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    fetch('/api/v1/databases/collections/user_vault/documents', {
      headers: { Authorization: \`Bearer \${token}\` }
    })
      .then(r => r.json())
      .then(data => setNotes(data.documents));
  }, [token]);

  return (
    <div>
      {notes.map(note => <div key={note.id}>{note.data.title}</div>)}
    </div>
  );
}`}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
