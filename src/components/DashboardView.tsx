import React from 'react';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Database,
  Radio,
  Sparkles,
  Users,
  Zap,
  Shield,
  MessageSquare,
  Kanban,
  Gauge,
  Plus,
} from 'lucide-react';
import { Collection, ProjectSettings, RealtimeEvent, User } from '../types/baas';

interface DashboardViewProps {
  project: ProjectSettings | null;
  collections: Collection[];
  users: User[];
  events: RealtimeEvent[];
  stats: any;
  setActiveTab: (tab: string) => void;
  onQuickSeed: (template: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  project,
  collections = [],
  users = [],
  events = [],
  stats,
  setActiveTab,
  onQuickSeed,
}) => {
  const totalDocs = Array.isArray(collections)
    ? collections.reduce((acc, c) => acc + (Number.isFinite(c?.documentCount) ? Number(c.documentCount) : 0), 0)
    : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner - Editorial Refined Container */}
      <div className="relative overflow-hidden rounded-xl border border-[#262626] bg-[#121212] p-6 sm:p-7 shadow-sm">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-[11px] font-mono tracking-wider uppercase text-violet-300">
                <Sparkles className="h-3 w-3 text-violet-400" />
                Zero-Cost BaaS Architecture
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                Instance: {project?.id || 'default'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-[#F5F5F5]">
              Realtime Synchronization &amp; <span className="italic font-normal text-violet-300">Authentication Engine</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Open-source alternative to Appwrite and Firebase. Push live updates across web, mobile, and IoT devices with sub-10ms latency using Server-Sent Events, complete with RBAC and passwordless authentication.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="dashboard-btn-simulator"
              onClick={() => setActiveTab('simulator')}
              className="flex items-center gap-2 rounded-lg bg-[#F5F5F5] hover:bg-white text-[#0A0A0A] font-serif font-medium px-4 py-2.5 text-xs shadow-sm transition-all"
            >
              <Radio className="h-3.5 w-3.5 text-violet-700" />
              <span>Launch Multi-Client Lab</span>
            </button>
            <button
              id="dashboard-btn-database"
              onClick={() => setActiveTab('database')}
              className="flex items-center gap-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium px-4 py-2.5 text-xs border border-zinc-800 transition-all"
            >
              <Database className="h-3.5 w-3.5 text-zinc-400" />
              <span>Manage Collections</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-[#262626] bg-[#121212] p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono uppercase tracking-wider mb-1">
            <span>Live Streams</span>
            <Radio className="h-3.5 w-3.5 text-violet-400 animate-pulse" />
          </div>
          <div className="text-2xl font-serif font-medium text-[#F5F5F5] mt-1">
            {Number.isFinite(stats?.metrics?.activeRealtimeStreams) ? stats.metrics.activeRealtimeStreams : 1}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-mono">
            ● 0ms Connection Setup
          </p>
        </div>

        <div className="rounded-lg border border-[#262626] bg-[#121212] p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono uppercase tracking-wider mb-1">
            <span>Documents</span>
            <Database className="h-3.5 w-3.5 text-zinc-400" />
          </div>
          <div className="text-2xl font-serif font-medium text-[#F5F5F5] mt-1">
            {Number.isFinite(totalDocs) ? totalDocs : 0}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-mono">
            Across {collections?.length || 0} collections
          </p>
        </div>

        <div className="rounded-lg border border-[#262626] bg-[#121212] p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono uppercase tracking-wider mb-1">
            <span>Users</span>
            <Users className="h-3.5 w-3.5 text-zinc-400" />
          </div>
          <div className="text-2xl font-serif font-medium text-[#F5F5F5] mt-1">
            {users?.length || 0}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-mono">
            Password + Magic Link
          </p>
        </div>

        <div className="rounded-lg border border-[#262626] bg-[#121212] p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono uppercase tracking-wider mb-1">
            <span>Events Streamed</span>
            <Activity className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <div className="text-2xl font-serif font-medium text-[#F5F5F5] mt-1">
            {Number.isFinite(stats?.metrics?.totalEventsBroadcast)
              ? stats.metrics.totalEventsBroadcast
              : (events?.length || 0)}
          </div>
          <p className="text-[11px] text-violet-400/80 mt-1 font-mono">
            Channel matching active
          </p>
        </div>
      </div>

      {/* Main Content Split: Live Event Stream & Quick Blueprints */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live SSE Event Stream */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-[#262626] bg-[#121212] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-violet-400 animate-ping"></div>
                <h2 className="text-sm font-serif font-medium text-[#F5F5F5]">Live Event Stream</h2>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                Listening to <code className="text-violet-300">channel:*</code>
              </span>
            </div>

            <div className="mt-4 space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {events.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                  Awaiting realtime events... Actions in database or simulator will stream here live.
                </div>
              ) : (
                events.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-[#171717] border border-[#262626] p-2.5 hover:border-zinc-700 transition-all font-mono text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-mono font-medium ${
                          evt.type.includes('created')
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            : evt.type.includes('updated')
                            ? 'bg-violet-500/10 text-violet-300 border border-violet-500/30'
                            : evt.type.includes('deleted')
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                            : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                        }`}
                      >
                        {evt.type}
                      </span>
                      <span className="text-zinc-400">
                        channel: <span className="text-zinc-200 font-medium">{evt.channel}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
                      {evt.actor && (
                        <span className="text-zinc-300">
                          by <strong className="text-violet-300 font-normal">{evt.actor.name}</strong>
                        </span>
                      )}
                      <span className="text-zinc-500">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Architecture Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-[#262626] bg-[#121212] p-4 space-y-2">
              <div className="flex items-center gap-2 text-zinc-200 text-xs font-serif font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" />
                <span>Zero Cloud Billing</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Deploy, host, and use locally or in self-hosted containers without cloud billing traps or arbitrary tier limits.
              </p>
            </div>

            <div className="rounded-lg border border-[#262626] bg-[#121212] p-4 space-y-2">
              <div className="flex items-center gap-2 text-zinc-200 text-xs font-serif font-medium">
                <Radio className="h-3.5 w-3.5 text-violet-400" />
                <span>Instant SSE Broadcasting</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Lightweight HTTP/2 Server-Sent Events bypass firewall blocks and WebSocket overhead for sub-10ms syncing.
              </p>
            </div>

            <div className="rounded-lg border border-[#262626] bg-[#121212] p-4 space-y-2">
              <div className="flex items-center gap-2 text-zinc-200 text-xs font-serif font-medium">
                <Shield className="h-3.5 w-3.5 text-violet-400" />
                <span>Simplified Auth &amp; RBAC</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Email/password, instant magic links, and anonymous guest conversion with flexible collection-level rules.
              </p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Starter Packs & Collections Quick List */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#262626] bg-[#121212] p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-medium">
              Collections ({collections.length})
            </h2>

            <div className="space-y-2">
              {collections.map((col) => (
                <div
                  key={col.id}
                  onClick={() => setActiveTab('database')}
                  className="group flex items-center justify-between rounded-lg bg-[#171717] border border-[#262626] p-3 hover:border-zinc-700 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded bg-zinc-900 text-zinc-400 group-hover:text-violet-300">
                      <Database className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-zinc-200 group-hover:text-white">
                        {col.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {col.id}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-400">
                      {col.documentCount || 0} docs
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveTab('database')}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 py-2.5 text-xs font-medium text-zinc-200 transition-all"
            >
              <Plus className="h-3.5 w-3.5 text-violet-400" />
              <span>Create Collection</span>
            </button>
          </div>

          {/* Quick Starter Templates */}
          <div className="rounded-xl border border-[#262626] bg-[#121212] p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-medium">
              Starter Blueprints
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Click to load ready-made collection schemas into your database:
            </p>

            <div className="space-y-2">
              <button
                onClick={() => onQuickSeed('chat')}
                className="w-full flex items-center justify-between rounded-lg bg-[#171717] border border-[#262626] hover:border-zinc-700 p-2.5 text-left text-xs transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="h-4 w-4 text-violet-400" />
                  <div>
                    <div className="font-medium text-zinc-200">Live Chat &amp; Channels</div>
                    <div className="text-[10px] text-zinc-500">Messages, avatar, likes, channels</div>
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500" />
              </button>

              <button
                onClick={() => onQuickSeed('tasks')}
                className="w-full flex items-center justify-between rounded-lg bg-[#171717] border border-[#262626] hover:border-zinc-700 p-2.5 text-left text-xs transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Kanban className="h-4 w-4 text-zinc-400" />
                  <div>
                    <div className="font-medium text-zinc-200">Kanban Task Board</div>
                    <div className="text-[10px] text-zinc-500">Status, priority, assignees, deadlines</div>
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500" />
              </button>

              <button
                onClick={() => onQuickSeed('metrics')}
                className="w-full flex items-center justify-between rounded-lg bg-[#171717] border border-[#262626] hover:border-zinc-700 p-2.5 text-left text-xs transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Gauge className="h-4 w-4 text-zinc-400" />
                  <div>
                    <div className="font-medium text-zinc-200">Live Metrics &amp; IoT Counter</div>
                    <div className="text-[10px] text-zinc-500">Sensor signals, values, timestamps</div>
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
