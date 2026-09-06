import React, { useState } from 'react';
import {
  Settings,
  Key,
  Copy,
  Check,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Shield,
  Server,
  Database,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { ProjectSettings } from '../types/baas';

interface SettingsViewProps {
  project: ProjectSettings | null;
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ project, onRefreshData }) => {
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportJson = async () => {
    setExportLoading(true);
    try {
      const [colRes, usersRes, buckRes, fnRes] = await Promise.all([
        fetch('/api/v1/databases/collections'),
        fetch('/api/v1/auth/users'),
        fetch('/api/v1/storage/buckets'),
        fetch('/api/v1/functions'),
      ]);

      const [cols, users, bucks, fns] = await Promise.all([
        colRes.json(),
        usersRes.json(),
        buckRes.json(),
        fnRes.json(),
      ]);

      const backup = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        platform: 'FreeSync BaaS',
        project,
        collections: cols.collections,
        users: users.users,
        storageBuckets: bucks.buckets,
        functions: fns.functions,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `freesync-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setExportLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    setResetLoading(true);
    try {
      await fetch('/api/v1/health', { method: 'GET' });
      // Clear or reload
      setShowConfirmReset(false);
      onRefreshData();
    } catch (err) {
      console.error('Reset failed', err);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-violet-950/60 border border-violet-800/40 flex items-center justify-center text-violet-400">
            <Settings className="h-4 w-4" />
          </div>
          <h1 className="text-xl sm:text-2xl font-serif tracking-tight text-zinc-100">
            Project Settings & Security Configuration
          </h1>
        </div>
        <p className="text-xs text-zinc-400 mt-1 font-sans">
          Manage API keys, environment parameters, CORS domains, and database backup exports.
        </p>
      </div>

      {/* General Project Info */}
      <div className="rounded-xl border border-zinc-800 bg-[#121212] p-5 space-y-4 shadow-sm">
        <h2 className="text-sm font-serif text-zinc-100">
          General Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="rounded-lg bg-zinc-950 p-3.5 border border-zinc-800">
            <div className="text-zinc-500 text-[11px] mb-1 font-sans">Project Name</div>
            <div className="text-zinc-100 font-medium">{project?.name || 'FreeSync Cloud'}</div>
          </div>

          <div className="rounded-lg bg-zinc-950 p-3.5 border border-zinc-800">
            <div className="text-zinc-500 text-[11px] mb-1 font-sans">Project ID</div>
            <div className="text-violet-400 font-medium">{project?.id || 'fs_proj_live'}</div>
          </div>

          <div className="rounded-lg bg-zinc-950 p-3.5 border border-zinc-800">
            <div className="text-zinc-500 text-[11px] mb-1 font-sans">Cloud Cost Tier</div>
            <div className="text-violet-300 font-medium flex items-center gap-1.5">
              <span>Zero-Cost ($0.00 / Free Forever)</span>
            </div>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="rounded-xl border border-zinc-800 bg-[#121212] p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h2 className="text-sm font-serif text-zinc-100 flex items-center gap-2">
            <Key className="h-4 w-4 text-violet-400" />
            <span>API Credentials & Access Tokens</span>
          </h2>
          <span className="text-[11px] text-zinc-500 font-mono">Headers: x-freesync-key</span>
        </div>

        <div className="space-y-3">
          {/* Publishable Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Publishable Client Key (Public Safe)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={project?.publishableKey || 'fs_pub_demo_live'}
                className="flex-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs font-mono text-violet-300 focus:outline-none"
              />
              <button
                onClick={() => handleCopy(project?.publishableKey || 'fs_pub_demo_live', 'pub')}
                className="rounded-lg bg-zinc-900 hover:bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-200 border border-zinc-800 flex items-center gap-1.5"
              >
                {copiedKey === 'pub' ? <Check className="h-3.5 w-3.5 text-violet-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedKey === 'pub' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Secret Admin Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-rose-400" />
              <span>Secret Admin Key (Full Backend Access)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showSecretKey ? 'text' : 'password'}
                readOnly
                value={project?.secretKey || 'fs_sec_live_admin_secret'}
                className="flex-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs font-mono text-rose-400 focus:outline-none"
              />
              <button
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="rounded-lg bg-zinc-900 hover:bg-zinc-800 p-2 text-zinc-400 hover:text-zinc-100 border border-zinc-800"
              >
                {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                onClick={() => handleCopy(project?.secretKey || 'fs_sec_live_admin_secret', 'sec')}
                className="rounded-lg bg-zinc-900 hover:bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-200 border border-zinc-800 flex items-center gap-1.5"
              >
                {copiedKey === 'sec' ? <Check className="h-3.5 w-3.5 text-violet-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedKey === 'sec' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Backup & Portability */}
      <div className="rounded-xl border border-zinc-800 bg-[#121212] p-5 space-y-4 shadow-sm">
        <h2 className="text-sm font-serif text-zinc-100 flex items-center gap-2">
          <Database className="h-4 w-4 text-violet-400" />
          <span>Data Portability & Full JSON Backup</span>
        </h2>
        <p className="text-xs text-zinc-400 font-sans">
          Export the entire database, user directory, schema definitions, and serverless hooks as a standard JSON bundle with zero vendor lock-in.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExportJson}
            disabled={exportLoading}
            className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-2.5 text-xs shadow-sm transition-all disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{exportLoading ? 'Exporting Snapshot...' : 'Export Complete JSON Snapshot'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
