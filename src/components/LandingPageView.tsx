import React, { useState } from 'react';
import {
  Zap,
  Radio,
  Database,
  Lock,
  FolderOpen,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  User as UserIcon,
  Mail,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sparkles,
  Layers,
  Cpu,
  Activity,
  LogOut,
  ExternalLink,
  ChevronRight,
  Code2,
  CheckCheck,
} from 'lucide-react';
import { User, ProjectSettings } from '../types/baas';
import { supabase, mapSupabaseUserToBaasUser, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

interface LandingPageViewProps {
  currentUser: User | null;
  authToken: string | null;
  project: ProjectSettings | null;
  activeSubscribers: number;
  collectionsCount: number;
  onEnterConsole: (targetTab?: string) => void;
  onSignInSuccess: (user: User, token: string) => void;
  onSignOut: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  currentUser,
  authToken,
  project,
  activeSubscribers,
  collectionsCount,
  onEnterConsole,
  onSignInSuccess,
  onSignOut,
}) => {
  // Auth Form State
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // SDK Tab selection
  const [selectedSdk, setSelectedSdk] = useState<'js' | 'react' | 'curl' | 'python'>('js');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyToken = () => {
    if (authToken) {
      navigator.clipboard.writeText(authToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (authMode === 'signup') {
        // Authenticate with Supabase GoTrue Auth
        let sbUser: any = null;
        let sbSession: any = null;
        try {
          const { data: sbData, error: sbError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: password,
            options: {
              data: {
                name: name.trim() || undefined,
              },
            },
          });
          if (!sbError) {
            sbUser = sbData?.user;
            sbSession = sbData?.session;
          }
        } catch {}

        // Register in FreeSync BaaS store
        let localUser: any = null;
        let localToken: string | null = null;
        try {
          const localRes = await fetch('/api/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, password, name: name.trim() || undefined }),
          });
          if (localRes.ok) {
            const data = await localRes.json();
            localUser = data.user;
            localToken = data.token;
          }
        } catch {}

        if (sbSession && sbUser) {
          const baasUser = mapSupabaseUserToBaasUser(sbUser);
          await fetch('/api/v1/auth/supabase-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: baasUser, token: sbSession.access_token }),
          }).catch(() => {});
          onSignInSuccess(baasUser, sbSession.access_token);
          setSuccessMessage(`Account registered and verified! Welcome, ${baasUser.name}.`);
        } else if (localUser && localToken) {
          onSignInSuccess(localUser, localToken);
          setSuccessMessage(`Account created successfully! Welcome, ${localUser.name}.`);
        } else if (sbUser) {
          setSuccessMessage(`Account registered! Verification email sent to ${cleanEmail}.`);
        } else {
          throw new Error('Registration failed. Please check your email and password.');
        }
      } else {
        // Sign In with Supabase GoTrue Auth
        const { data: sbData, error: sbError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (!sbError && sbData?.session && sbData?.user) {
          // Authenticated via Supabase credentials!
          const baasUser = mapSupabaseUserToBaasUser(sbData.user);
          const syncRes = await fetch('/api/v1/auth/supabase-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: baasUser, token: sbData.session.access_token }),
          });
          const syncData = await syncRes.json();
          onSignInSuccess(syncData.user || baasUser, sbData.session.access_token);
          setSuccessMessage(`Signed in successfully as ${baasUser.name}.`);
        } else {
          // Fallback to BaaS local authentication
          const localRes = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, password }),
          });

          if (localRes.ok) {
            const localData = await localRes.json();
            onSignInSuccess(localData.user, localData.token);
            setSuccessMessage(`Signed in successfully as ${localData.user.name}.`);
          } else {
            const localData = await localRes.json().catch(() => ({}));
            throw new Error(
              sbError?.message
                ? sbError.message
                : (localData.error || 'Invalid email or password.')
            );
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const codeSnippets = {
    js: `// FreeSync Client SDK - 3 lines to connect
import { FreeSync } from '@freesync/client';

const fs = new FreeSync({
  endpoint: window.location.origin,
  apiKey: '${project?.publishableKey || 'fs_pub_demo_live'}'
});

// Authenticate user
const { user, token } = await fs.auth.signIn({
  email: '${currentUser?.email || 'user@example.com'}',
  password: 'your_secure_password'
});

// Real-time document subscription with zero socket exhaustion
fs.collection('chat_messages').subscribe((event) => {
  console.log('Realtime DB Event:', event.type, event.document);
});`,
    react: `// React Real-time Hook
import { useFreeSyncCollection, useAuth } from '@freesync/react';

export function LiveChatRoom() {
  const { user } = useAuth();
  const { documents: messages, insertDoc } = useFreeSyncCollection('chat_messages');

  const sendMessage = async (text) => {
    await insertDoc({
      text,
      sender: user.name,
      createdAt: new Date().toISOString()
    });
  };

  return (
    <ul>
      {messages.map(msg => <li key={msg.id}>{msg.data.text}</li>)}
    </ul>
  );
}`,
    curl: `# 1. Sign In / Get Bearer Token
curl -X POST "${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "alex@freesync.dev", "password": "developer123"}'

# 2. Insert into Protected Database Collection
curl -X POST "${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/databases/collections/user_vault/documents" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"data": {"title": "Zero-Cost Deployment", "tier": "free"}}'`,
    python: `# Python Async Client
import aiohttp
import asyncio

async def fetch_realtime_data():
    headers = {"Authorization": "Bearer YOUR_JWT_TOKEN"}
    async with aiohttp.ClientSession() as session:
        url = "${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/databases/collections/chat_messages/documents"
        async with session.get(url, headers=headers) as resp:
            data = await resp.json()
            print("Received documents:", len(data.get("documents", [])))

asyncio.run(fetch_realtime_data())`,
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(codeSnippets[selectedSdk]);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] font-sans selection:bg-violet-500/30 selection:text-violet-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-[#262626] bg-[#0A0A0A]/95 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-violet-300 shadow-sm">
              <Zap className="h-4.5 w-4.5 text-violet-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">
                  Free<span className="text-violet-400">Sync</span>
                </span>
                <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-violet-300">
                  BaaS Platform
                </span>
                <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                  $0.00 / Zero Cost
                </span>
              </div>
            </div>
          </div>

          {/* Nav Anchors (Desktop) */}
          <nav className="hidden lg:flex items-center gap-6 text-xs text-zinc-400">
            <a href="#features" className="hover:text-zinc-200 transition-colors">
              Features
            </a>
            <a href="#architecture" className="hover:text-zinc-200 transition-colors">
              Architecture
            </a>
            <a href="#code-sdk" className="hover:text-zinc-200 transition-colors">
              Code SDK
            </a>
            <a href="#comparison" className="hover:text-zinc-200 transition-colors">
              Cost Matrix
            </a>
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300">
                  <img
                    src={
                      currentUser.avatarUrl ||
                      `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(currentUser.id)}`
                    }
                    alt={currentUser.name}
                    className="h-4 w-4 rounded-full bg-zinc-800 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="font-medium max-w-[100px] truncate">{currentUser.name}</span>
                  <span className="rounded bg-violet-500/20 px-1.5 py-0.2 text-[10px] font-mono text-violet-300 capitalize">
                    {currentUser.role}
                  </span>
                </div>
                <button
                  id="landing-btn-enter-console"
                  onClick={() => onEnterConsole()}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all"
                >
                  <span>Launch Console</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  id="landing-btn-signout"
                  onClick={onSignOut}
                  title="Sign Out"
                  className="rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 p-1.5 text-zinc-400 hover:text-rose-300 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="landing-btn-signin-nav"
                  onClick={() => {
                    setAuthMode('signin');
                    const formEl = document.getElementById('auth-card-section');
                    if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all"
                >
                  <Lock className="h-3.5 w-3.5 text-violet-200" />
                  <span>Sign In Required</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-8 border-b border-[#262626]">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Left Hero Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/30 px-3 py-1 text-xs font-mono text-violet-300">
              <span className="flex h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
              <span>Free & Self-Contained Backend-as-a-Service</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-bold tracking-tight text-white leading-[1.12]">
              The Open Realtime Backend <br />
              <span className="text-violet-400">
                Without the Cloud Tax.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed">
              Eliminate unpredictable cloud bills. FreeSync delivers a lightning-fast schemaless document database,
              browser-native Server-Sent Events (SSE) live sync, Row-Level Security, Edge Micro-Hooks, and JWT auth
              with zero socket exhaustion and 100% data ownership.
            </p>

            {/* Architecture Highlights Checkpoints */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-zinc-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Zero external API keys or billing cards</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Row-Level Security (RLS) & tenant isolation</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Sub-millisecond memory-first document queries</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Unlimited realtime client subscribers</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-4">
              {currentUser ? (
                <button
                  id="hero-btn-launch-console"
                  onClick={() => onEnterConsole('dashboard')}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white px-5 py-3 text-sm font-semibold shadow-lg shadow-violet-600/20 transition-all cursor-pointer"
                >
                  <span>Enter BaaS Console</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  id="hero-btn-signin-prompt"
                  onClick={() => {
                    setAuthMode('signin');
                    const formEl = document.getElementById('auth-card-section');
                    if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
                    setError('Please sign in or create an account to access the BaaS system.');
                  }}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white px-5 py-3 text-sm font-semibold shadow-lg shadow-violet-600/20 transition-all cursor-pointer"
                >
                  <Lock className="h-4 w-4" />
                  <span>Sign In to Access BaaS</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              <button
                id="hero-btn-database"
                onClick={() => {
                  if (currentUser) {
                    onEnterConsole('database');
                  } else {
                    setAuthMode('signin');
                    const formEl = document.getElementById('auth-card-section');
                    if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
                    setError('Please sign in or create an account to access the database.');
                  }
                }}
                className="flex items-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-5 py-3 text-sm font-medium text-zinc-200 transition-all cursor-pointer"
              >
                <Database className="h-4 w-4 text-zinc-400" />
                <span>Explore Realtime Database</span>
              </button>
            </div>
          </div>

          {/* Right Hero Column: Authentication Card */}
          <div id="auth-card-section" className="lg:col-span-5">
            <div className="rounded-2xl border border-[#262626] bg-[#121212]/90 backdrop-blur-xl p-6 sm:p-7 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-5">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    {currentUser ? 'Active BaaS Session' : 'BaaS Developer Access'}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {currentUser ? 'Signed in with active credentials' : 'Sign in or register for immediate database access'}
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-violet-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>

              {currentUser ? (
                /* Authenticated User View */
                <div className="space-y-4">
                  <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          currentUser.avatarUrl ||
                          `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(currentUser.id)}`
                        }
                        alt={currentUser.name}
                        className="h-12 w-12 rounded-full border border-violet-500/40 bg-zinc-800 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white truncate">{currentUser.name}</h3>
                          <span className="rounded bg-violet-500/20 px-2 py-0.5 text-[10px] font-mono text-violet-300 capitalize">
                            {currentUser.role}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 truncate">{currentUser.email || 'Anonymous Guest'}</p>
                        <p className="text-[10px] font-mono text-emerald-400 mt-0.5 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Authenticated & RLS Authorized
                        </p>
                      </div>
                    </div>

                    {authToken && (
                      <div className="pt-2 border-t border-violet-500/20">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                          <span>Bearer Session Token:</span>
                          <button
                            onClick={handleCopyToken}
                            className="text-violet-300 hover:text-white flex items-center gap-1"
                          >
                            {copiedToken ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <div className="rounded bg-black/50 p-2 font-mono text-[11px] text-zinc-300 truncate select-all border border-zinc-800">
                          {authToken}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    id="auth-card-btn-console"
                    onClick={() => onEnterConsole()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium py-3 text-sm shadow-md transition-all"
                  >
                    <span>Enter BaaS Console & Database</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    id="auth-card-btn-signout"
                    onClick={onSignOut}
                    className="w-full rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 py-2.5 text-xs text-zinc-300 hover:text-rose-300 transition-all"
                  >
                    Sign Out of This Account
                  </button>
                </div>
              ) : (
                /* Unauthenticated Sign In / Sign Up Form */
                <div>
                  {/* Tab Selector */}
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-950 p-1 mb-5 border border-zinc-800/80 text-xs">
                    <button
                      type="button"
                      id="tab-btn-signin"
                      onClick={() => {
                        setAuthMode('signin');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className={`rounded-lg py-2.5 font-medium transition-all ${
                        authMode === 'signin'
                          ? 'bg-zinc-800 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      id="tab-btn-signup"
                      onClick={() => {
                        setAuthMode('signup');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className={`rounded-lg py-2.5 font-medium transition-all ${
                        authMode === 'signup'
                          ? 'bg-zinc-800 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Create Account
                    </button>
                  </div>

                  {/* Feedback Banners */}
                  {error && (
                    <div className="mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-start gap-2">
                      <span className="font-semibold">Error:</span>
                      <span>{error}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-300 flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                    {authMode === 'signup' && (
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-300 mb-1">Full Name</label>
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                          <input
                            id="input-landing-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Jordan Miller"
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-9.5 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 focus:outline-none transition-all"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                        <input
                          id="input-landing-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="developer@example.com"
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-9.5 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                        <input
                          id="input-landing-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={authMode === 'signup' ? 'Min 6 characters' : 'Enter your password'}
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-9.5 pr-9.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 focus:outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      id="btn-landing-auth-submit"
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-3 text-xs shadow-lg shadow-violet-600/20 transition-all mt-4 cursor-pointer"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        <span>{authMode === 'signup' ? 'Create Free Account' : 'Sign In'}</span>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Live System Diagnostics / Hardware Metrics Bar */}
      <section className="border-b border-[#262626] bg-[#0E0E0E] py-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-800/80 bg-[#141414] p-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Connected Streams</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-2xl font-mono font-semibold text-white">
              {Number.isFinite(activeSubscribers) ? Math.max(1, activeSubscribers) : 1}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Live active SSE broadcast channels</p>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-[#141414] p-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Query Latency</span>
              <Activity className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <div className="text-2xl font-mono font-semibold text-violet-300">~0.12 ms</div>
            <p className="text-[11px] text-zinc-400 mt-1">In-memory sub-millisecond cache</p>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-[#141414] p-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Monthly Cloud Cost</span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300">
                100% Free
              </span>
            </div>
            <div className="text-2xl font-mono font-semibold text-emerald-400">$0.00</div>
            <p className="text-[11px] text-zinc-400 mt-1">Zero metered reads or lock-in</p>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-[#141414] p-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Row-Level Security</span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-mono font-semibold text-white">Enforced</div>
            <p className="text-[11px] text-zinc-400 mt-1">Tenant-scoped access controls</p>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section id="features" className="py-16 px-4 sm:px-8 border-b border-[#262626]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-mono uppercase tracking-wider text-violet-400">Everything You Need</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              A Complete Backend Suite. Zero Setup Friction.
            </h2>
            <p className="text-sm text-zinc-400">
              FreeSync replaces fragmented infrastructure with an elegant, cohesive platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="rounded-xl border border-zinc-800 bg-[#121212] p-6 space-y-3 hover:border-zinc-700 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Realtime Document Database</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Schemaless JSON collections with instant change broadcasting. Automatic indexing, compound filtering,
                and zero socket limits.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-xl border border-zinc-800 bg-[#121212] p-6 space-y-3 hover:border-zinc-700 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Stateless JWT Auth & RBAC</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Built-in email/password registration, bcrypt hashing, magic links, and granular Role-Based Access
                Control (Admin, Member, Guest).
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-xl border border-zinc-800 bg-[#121212] p-6 space-y-3 hover:border-zinc-700 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Row-Level Security (RLS)</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Protect sensitive tenant records automatically. The database engine filters queries so authenticated
                users only read and write their own documents.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-xl border border-zinc-800 bg-[#121212] p-6 space-y-3 hover:border-zinc-700 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Edge Micro-Hooks</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Event-driven JavaScript hooks that execute on document write, user registration, or incoming webhooks
                without maintaining separate Lambda functions.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-xl border border-zinc-800 bg-[#121212] p-6 space-y-3 hover:border-zinc-700 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                <FolderOpen className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">S3 Object Storage</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Integrated buckets for file uploads, avatars, images, and binary documents with MIME validation and
                public/private bucket permissions.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-xl border border-zinc-800 bg-[#121212] p-6 space-y-3 hover:border-zinc-700 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                <Radio className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Multi-Client Lab & Wire Logs</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Built-in interactive simulator to verify realtime state propagation across concurrent client devices
                with live wire event inspection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Code SDK Section */}
      <section id="code-sdk" className="py-16 px-4 sm:px-8 border-b border-[#262626] bg-[#0D0D0D]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-violet-400">Developer First</span>
              <h2 className="text-3xl font-bold text-white tracking-tight">Connect in 3 Lines of Code</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Standard REST and Server-Sent Events work with any frontend framework.
              </p>
            </div>

            {/* Language Switcher Tabs */}
            <div className="flex items-center gap-1 rounded-lg bg-zinc-900 p-1 border border-zinc-800 text-xs">
              <button
                onClick={() => setSelectedSdk('js')}
                className={`rounded-md px-3 py-1.5 font-medium transition-all ${
                  selectedSdk === 'js' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                JavaScript / TS
              </button>
              <button
                onClick={() => setSelectedSdk('react')}
                className={`rounded-md px-3 py-1.5 font-medium transition-all ${
                  selectedSdk === 'react' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                React Hook
              </button>
              <button
                onClick={() => setSelectedSdk('curl')}
                className={`rounded-md px-3 py-1.5 font-medium transition-all ${
                  selectedSdk === 'curl' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                cURL
              </button>
              <button
                onClick={() => setSelectedSdk('python')}
                className={`rounded-md px-3 py-1.5 font-medium transition-all ${
                  selectedSdk === 'python' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Python
              </button>
            </div>
          </div>

          {/* Code Viewer Box */}
          <div className="rounded-xl border border-[#262626] bg-[#080808] p-4 sm:p-5 relative shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-zinc-500">
                  {selectedSdk === 'js' && 'client.ts'}
                  {selectedSdk === 'react' && 'ChatRoom.tsx'}
                  {selectedSdk === 'curl' && 'terminal.sh'}
                  {selectedSdk === 'python' && 'sync_worker.py'}
                </span>
              </div>
              <button
                onClick={handleCopySnippet}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1 text-xs text-zinc-300 transition-colors"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            <pre className="font-mono text-xs text-zinc-300 overflow-x-auto p-2 leading-relaxed selection:bg-violet-500/40">
              {codeSnippets[selectedSdk]}
            </pre>
          </div>
        </div>
      </section>

      {/* Zero-Cost Comparison Matrix */}
      <section id="comparison" className="py-16 px-4 sm:px-8 border-b border-[#262626]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">Zero Cloud Bill</span>
            <h2 className="text-3xl font-bold text-white tracking-tight">How FreeSync Compares</h2>
            <p className="text-xs text-zinc-400">
              Transparent side-by-side comparison with commercial backend platforms.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#121212]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60 font-mono text-zinc-400">
                  <th className="p-4">Feature Metric</th>
                  <th className="p-4 text-violet-400 font-semibold">FreeSync BaaS</th>
                  <th className="p-4">Firebase (Google)</th>
                  <th className="p-4">Supabase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                <tr>
                  <td className="p-4 font-medium text-white">Monthly Minimum Cost</td>
                  <td className="p-4 text-emerald-400 font-semibold font-mono">$0.00 Forever</td>
                  <td className="p-4 text-zinc-400 font-mono">$25+ (Metered Blaze)</td>
                  <td className="p-4 text-zinc-400 font-mono">$25 / mo (Pro Tier)</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">DB Socket Exhaustion Limits</td>
                  <td className="p-4 text-emerald-400 font-semibold">Zero (Stateless store)</td>
                  <td className="p-4 text-zinc-400">Socket quota limits</td>
                  <td className="p-4 text-zinc-400">60 connection pool cap</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Credit Card Required</td>
                  <td className="p-4 text-emerald-400 font-semibold">Never Required</td>
                  <td className="p-4 text-zinc-400">Mandatory for scaling</td>
                  <td className="p-4 text-zinc-400">Required after trial</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Realtime Read Pricing</td>
                  <td className="p-4 text-emerald-400 font-semibold">Unlimited Free</td>
                  <td className="p-4 text-zinc-400">$0.06 per 100k reads</td>
                  <td className="p-4 text-zinc-400">Metered egress ($0.09/GB)</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Project Sleep / Inactivity Pause</td>
                  <td className="p-4 text-emerald-400 font-semibold">Never Paused</td>
                  <td className="p-4 text-zinc-400">No pause</td>
                  <td className="p-4 text-zinc-400">Paused after 7 days inactive</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Row-Level Security (RLS)</td>
                  <td className="p-4 text-emerald-400 font-semibold">Native Built-In</td>
                  <td className="p-4 text-zinc-400">Firestore security rules</td>
                  <td className="p-4 text-zinc-400">Postgres RLS</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 px-4 sm:px-8 bg-zinc-950/60 border-b border-[#262626]">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Stop Paying the Cloud Tax. <br />
            Start Building with FreeSync.
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto">
            Launch your real-time database, configure Row-Level Security, and authenticate users in seconds.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {currentUser ? (
              <button
                id="btn-bottom-launch-console"
                onClick={() => onEnterConsole()}
                className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 text-sm font-semibold shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
              >
                <span>Launch BaaS Console</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                id="btn-bottom-signin-prompt"
                onClick={() => {
                  setAuthMode('signin');
                  const formEl = document.getElementById('auth-card-section');
                  if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
                  setError('Please sign in or create an account to access the BaaS system.');
                }}
                className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 text-sm font-semibold shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                <span>Sign In to Launch Console</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => {
                setAuthMode('signup');
                const formEl = document.getElementById('auth-card-section');
                if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
              }}
              className="rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-6 py-3 text-sm font-medium text-zinc-300 transition-all cursor-pointer"
            >
              Register Free Account
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-8 bg-[#070707] text-xs text-zinc-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-200">
              Free<span className="text-violet-400">Sync</span> BaaS
            </span>
            <span>• Zero-Cost Realtime Backend Engine</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <span className="font-mono text-[11px]">Version 1.4.0</span>
            <span>•</span>
            <button
              onClick={() => {
                if (currentUser) {
                  onEnterConsole('database');
                } else {
                  setAuthMode('signin');
                  const formEl = document.getElementById('auth-card-section');
                  if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
                  setError('Sign-in required to view the database.');
                }
              }}
              className="hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Realtime Database
            </button>
            <span>•</span>
            <button
              onClick={() => {
                if (currentUser) {
                  onEnterConsole('auth');
                } else {
                  setAuthMode('signin');
                  const formEl = document.getElementById('auth-card-section');
                  if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
                  setError('Sign-in required to view authentication management.');
                }
              }}
              className="hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Authentication
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
