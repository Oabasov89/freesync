import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Key,
  Lock,
  Unlock,
  Sparkles,
  Check,
  Copy,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  Terminal,
  Zap,
} from 'lucide-react';
import { ProjectSettings, User, UserRole } from '../types/baas';
import { AuthSandboxTab } from './AuthSandboxTab';

interface AuthViewProps {
  users: User[];
  project: ProjectSettings | null;
  onRefreshUsers: () => void;
  currentUser?: User | null;
  authToken?: string | null;
  onSignInSuccess?: (user: User, token: string) => void;
  onSignOut?: () => void;
  onOpenAuthModal?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  users,
  project,
  onRefreshUsers,
  currentUser = null,
  authToken = null,
  onSignInSuccess = () => {},
  onSignOut = () => {},
  onOpenAuthModal = () => {},
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'sandbox' | 'users' | 'magic-link' | 'anonymous' | 'providers'>('sandbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('member');
  const [createError, setCreateError] = useState<string | null>(null);

  // Magic Link Tester State
  const [magicEmail, setMagicEmail] = useState('developer@example.com');
  const [generatedMagicLink, setGeneratedMagicLink] = useState<{
    token: string;
    magicLinkUrl: string;
    expiresAt: string;
  } | null>(null);
  const [magicVerifyResult, setMagicVerifyResult] = useState<any>(null);
  const [isSendingMagic, setIsSendingMagic] = useState(false);

  // Anonymous Guest Tester State
  const [anonName, setAnonName] = useState('Guest Explorer');
  const [anonResult, setAnonResult] = useState<any>(null);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkResult, setLinkResult] = useState<any>(null);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          name: newName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register user');

      if (newRole !== 'member') {
        // Update role
        await fetch(`/api/v1/auth/users/${data.user.id}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        });
      }

      setShowCreateModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      onRefreshUsers();
    } catch (err: any) {
      setCreateError(err.message);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      await fetch(`/api/v1/auth/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      onRefreshUsers();
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const handleChangeRole = async (userId: string, role: UserRole) => {
    try {
      await fetch(`/api/v1/auth/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      onRefreshUsers();
    } catch (err) {
      console.error('Failed to change role', err);
    }
  };

  const handleGenerateMagicLink = async () => {
    if (!magicEmail) return;
    setIsSendingMagic(true);
    setMagicVerifyResult(null);
    try {
      const res = await fetch('/api/v1/auth/magic-link/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: magicEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedMagicLink(data);
      }
    } catch (err) {
      console.error('Magic link generation failed', err);
    } finally {
      setIsSendingMagic(false);
    }
  };

  const handleVerifyMagicLink = async (token: string) => {
    try {
      const res = await fetch(`/api/v1/auth/magic-link/verify?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      setMagicVerifyResult(data);
      onRefreshUsers();
    } catch (err) {
      console.error('Magic link verification failed', err);
    }
  };

  const handleCreateAnonSession = async () => {
    try {
      const res = await fetch('/api/v1/auth/anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: anonName }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnonResult(data);
        onRefreshUsers();
      }
    } catch (err) {
      console.error('Anon session creation failed', err);
    }
  };

  const handleLinkAnonAccount = async () => {
    if (!anonResult?.token || !linkEmail) return;
    try {
      const res = await fetch('/api/v1/auth/link-anonymous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonResult.token}`,
        },
        body: JSON.stringify({ email: linkEmail, password: linkPassword || 'password123' }),
      });
      const data = await res.json();
      setLinkResult(data);
      onRefreshUsers();
    } catch (err) {
      console.error('Linking failed', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-violet-950/60 border border-violet-800/40 flex items-center justify-center text-violet-400">
              <Users className="h-4 w-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-serif tracking-tight text-zinc-100">
              User Authentication & RBAC
            </h1>
            <span className="rounded-full bg-violet-950/60 border border-violet-800/40 px-2.5 py-0.5 text-[11px] text-violet-300 font-mono">
              Simplified
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Manage users, test passwordless magic links in real time, issue JWT tokens, and configure RBAC roles.
          </p>
        </div>

        <button
          id="auth-btn-create-user"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-2 text-xs shadow-sm transition-all"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Add User</span>
        </button>
      </div>

      {/* Navigation Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 text-xs overflow-x-auto">
        <button
          id="btn-subtab-sandbox"
          onClick={() => setActiveSubTab('sandbox')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-medium transition-all whitespace-nowrap ${
            activeSubTab === 'sandbox'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          <span>Live Sign In & DB Sandbox</span>
        </button>

        <button
          id="btn-subtab-users"
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-medium transition-all whitespace-nowrap ${
            activeSubTab === 'users'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Users className="h-3.5 w-3.5 text-violet-400" />
          <span>User Directory ({users.length})</span>
        </button>

        <button
          id="btn-subtab-magic"
          onClick={() => setActiveSubTab('magic-link')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-medium transition-all whitespace-nowrap ${
            activeSubTab === 'magic-link'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Mail className="h-3.5 w-3.5 text-violet-400" />
          <span>Magic Link Studio</span>
        </button>

        <button
          id="btn-subtab-anon"
          onClick={() => setActiveSubTab('anonymous')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-medium transition-all whitespace-nowrap ${
            activeSubTab === 'anonymous'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <span>Guest / Anonymous Auth</span>
        </button>

        <button
          id="btn-subtab-providers"
          onClick={() => setActiveSubTab('providers')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-medium transition-all whitespace-nowrap ${
            activeSubTab === 'providers'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Shield className="h-3.5 w-3.5 text-violet-400" />
          <span>RBAC & Auth Settings</span>
        </button>
      </div>

      {/* SUB TAB: Live Sign In & DB Sandbox */}
      {activeSubTab === 'sandbox' && (
        <AuthSandboxTab
          currentUser={currentUser}
          authToken={authToken}
          onSignInSuccess={onSignInSuccess}
          onSignOut={onSignOut}
          onOpenAuthModal={onOpenAuthModal}
          onRefreshUsers={onRefreshUsers}
        />
      )}

      {/* SUB TAB: Users Directory */}
      {activeSubTab === 'users' && (
        <div className="rounded-xl border border-zinc-800 bg-[#121212] p-5 space-y-4 shadow-sm">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search by name, email, or user ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 pl-3 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>

            <button
              onClick={onRefreshUsers}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5 text-zinc-400" />
              <span>Refresh Users</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/60">
            <table className="w-full text-left text-xs font-sans">
              <thead className="border-b border-zinc-800 bg-zinc-900/90 text-zinc-400 uppercase tracking-wider text-[11px] font-mono">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Auth Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 font-sans">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      No users match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              u.avatarUrl ||
                              `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
                                u.id
                              )}`
                            }
                            alt={u.name}
                            className="h-8 w-8 rounded-full bg-zinc-800 ring-1 ring-zinc-700 object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="font-medium text-zinc-100 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {u.emailVerified && (
                                <UserCheck className="h-3 w-3 text-violet-400" title="Verified" />
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-mono">
                              {u.email || u.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u.id, e.target.value as UserRole)}
                          className="rounded-lg bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs font-mono text-violet-300 focus:outline-none"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="guest">Guest</option>
                          <option value="service_role">Service Role</option>
                        </select>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-mono ${
                            u.isAnonymous
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                          }`}
                        >
                          {u.isAnonymous ? 'Anonymous' : 'Password / Email'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            u.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              u.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          {u.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-zinc-400 text-xs font-mono">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleStatus(u.id, u.status)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                            u.status === 'active'
                              ? 'bg-zinc-800 text-rose-400 hover:bg-rose-500/20'
                              : 'bg-zinc-800 text-violet-300 hover:bg-violet-500/20'
                          }`}
                        >
                          {u.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB TAB: Magic Link Studio */}
      {activeSubTab === 'magic-link' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Generator Form */}
          <div className="rounded-xl border border-zinc-800 bg-[#121212] p-5 space-y-4 shadow-sm">
            <div>
              <h2 className="text-base font-serif text-zinc-100 flex items-center gap-2">
                <Mail className="h-4 w-4 text-violet-400" />
                Magic Link / Passwordless Tester
              </h2>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                Passwordless auth generates a cryptographically secure one-time verification token sent to the user email.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300">Recipient Email</label>
                <input
                  type="email"
                  value={magicEmail}
                  onChange={(e) => setMagicEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full mt-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleGenerateMagicLink}
                disabled={isSendingMagic}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium py-2.5 text-xs shadow-sm transition-all disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{isSendingMagic ? 'Generating Token...' : 'Generate & Simulate Magic Link'}</span>
              </button>
            </div>

            {/* Simulated Live Mailbox Card */}
            {generatedMagicLink && (
              <div className="mt-4 rounded-xl border border-violet-800/40 bg-violet-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-violet-300 font-medium">
                  <span>📬 Simulated Incoming Mailbox</span>
                  <span className="text-[10px] font-mono text-zinc-400">15 min expiry</span>
                </div>

                <div className="rounded-lg bg-zinc-950/90 border border-zinc-800 p-3 text-xs space-y-2">
                  <div className="text-zinc-300 font-mono text-[11px]">
                    To: <strong className="text-zinc-100">{magicEmail}</strong>
                  </div>
                  <div className="text-zinc-300 font-mono text-[11px] truncate">
                    Token: <span className="text-violet-400">{generatedMagicLink.token}</span>
                  </div>
                  <div className="pt-2 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleCopy(generatedMagicLink.token)}
                      className="rounded bg-zinc-800 px-2.5 py-1 text-[11px] font-mono text-zinc-300 hover:bg-zinc-700"
                    >
                      {copiedToken === generatedMagicLink.token ? 'Copied!' : 'Copy Token'}
                    </button>

                    <button
                      onClick={() => handleVerifyMagicLink(generatedMagicLink.token)}
                      className="rounded bg-violet-600 hover:bg-violet-500 px-3 py-1 text-xs font-medium text-white flex items-center gap-1.5 shadow"
                    >
                      <span>1-Click Verify Link</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Verification Inspector */}
          <div className="rounded-xl border border-zinc-800 bg-[#121212] p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-serif text-zinc-100 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-violet-400" />
              Verification Output & Session Token
            </h3>

            {magicVerifyResult ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-3 text-xs text-violet-300">
                  ✓ {magicVerifyResult.message}
                </div>

                <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-xs font-mono space-y-1">
                  <div className="text-zinc-400 text-[11px]">Issued JWT Bearer Token:</div>
                  <div className="text-violet-300 break-all bg-zinc-900 p-2 rounded">
                    {magicVerifyResult.token}
                  </div>
                </div>

                <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-xs font-mono space-y-1">
                  <div className="text-zinc-400 text-[11px]">Authenticated User:</div>
                  <pre className="text-zinc-200 text-[11px] overflow-x-auto">
                    {JSON.stringify(magicVerifyResult.user, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-zinc-500 text-xs">
                Click "1-Click Verify Link" on the left to test token validation and view the resulting user payload.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB TAB: Anonymous Guest Auth */}
      {activeSubTab === 'anonymous' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-zinc-800 bg-[#121212] p-5 space-y-4 shadow-sm">
            <div>
              <h2 className="text-base font-serif text-zinc-100 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Anonymous Guest Authentication
              </h2>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                Allow visitors to start using the app immediately without signup, then seamlessly upgrade their account later without losing their documents.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300">Guest Display Name</label>
                <input
                  type="text"
                  value={anonName}
                  onChange={(e) => setAnonName(e.target.value)}
                  className="w-full mt-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleCreateAnonSession}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-medium py-2.5 text-xs shadow transition-all"
              >
                <span>Create Guest Session</span>
              </button>
            </div>

            {anonResult && (
              <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-xs font-mono space-y-2">
                <div className="text-violet-400">✓ Anonymous User ID: {anonResult.user.id}</div>
                <div className="text-zinc-400 text-[11px] truncate">
                  Token: <span className="text-zinc-200">{anonResult.token}</span>
                </div>
              </div>
            )}
          </div>

          {/* Account Upgrade Form */}
          <div className="rounded-xl border border-zinc-800 bg-[#121212] p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-serif text-zinc-100">Upgrade Guest Account to Permanent</h3>
            <p className="text-xs text-zinc-400">
              Link an email and password to the current anonymous session.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300">Email Address</label>
                <input
                  type="email"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                  placeholder="newuser@example.com"
                  className="w-full mt-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300">Password</label>
                <input
                  type="password"
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full mt-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleLinkAnonAccount}
                disabled={!anonResult?.token}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium py-2.5 text-xs shadow transition-all disabled:opacity-50"
              >
                <span>Link & Upgrade Account</span>
              </button>

              {linkResult && (
                <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-3 text-xs text-violet-300 font-mono">
                  ✓ {linkResult.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB: RBAC & Providers Settings */}
      {activeSubTab === 'providers' && (
        <div className="rounded-xl border border-zinc-800 bg-[#121212] p-5 space-y-6 shadow-sm">
          <div>
            <h2 className="text-base font-serif text-zinc-100">Authentication Providers & Policies</h2>
            <p className="text-xs text-zinc-400">
              Configure available login methods and security restrictions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-xs text-zinc-100 font-serif">Email / Password</span>
                <span className="rounded-full bg-violet-950/60 border border-violet-800/40 text-violet-300 px-2 py-0.5 text-[10px] font-mono">
                  Enabled
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans">Standard registration and login with bcrypt hashing.</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-xs text-zinc-100 font-serif">Magic Links</span>
                <span className="rounded-full bg-violet-950/60 border border-violet-800/40 text-violet-300 px-2 py-0.5 text-[10px] font-mono">
                  Enabled
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans">Passwordless authentication with one-time tokens.</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-xs text-zinc-100 font-serif">Anonymous Guests</span>
                <span className="rounded-full bg-violet-950/60 border border-violet-800/40 text-violet-300 px-2 py-0.5 text-[10px] font-mono">
                  Enabled
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans">Immediate friction-free onboarding with account linking.</p>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#121212] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-serif text-zinc-100 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-violet-400" />
                Create New User
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-zinc-100"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300 font-sans">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 font-sans">
              <div>
                <label className="text-xs font-medium text-zinc-300">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full mt-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full mt-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full mt-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full mt-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="guest">Guest</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-2 text-xs shadow-md"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
