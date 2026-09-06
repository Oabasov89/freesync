import React from 'react';
import {
  Zap,
  Radio,
  PlayCircle,
  RefreshCw,
  Sparkles,
  UserCheck,
  User as UserIcon,
  LogOut,
  Home,
} from 'lucide-react';
import { ProjectSettings, User } from '../types/baas';

interface HeaderProps {
  project: ProjectSettings | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sseConnected: boolean;
  activeConnections: number;
  lastPingMs: number;
  onResetDemo: () => void;
  isResetting: boolean;
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
  onNavigateLanding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  activeTab,
  setActiveTab,
  sseConnected,
  activeConnections,
  lastPingMs,
  onResetDemo,
  isResetting,
  currentUser,
  onOpenAuthModal,
  onSignOut,
  onNavigateLanding,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#262626] bg-[#0A0A0A]/95 backdrop-blur-md px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-violet-300 shadow-sm">
            <Zap className="h-4.5 w-4.5 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-serif tracking-tight text-[#F5F5F5]">
                Free<span className="italic text-violet-400">Sync</span>
              </span>
              <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-violet-300">
                BaaS Platform
              </span>
              <span className="hidden md:inline-flex items-center rounded-full bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                $0.00 / Zero Cost
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-zinc-400 font-sans">
              Realtime Sync & Simplified Auth Engine
            </p>
          </div>
        </div>

        {/* Realtime Stream & Engine Health Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:flex items-center gap-2 rounded-lg bg-[#121212] border border-[#262626] px-3 py-1.5 text-xs text-zinc-300">
            <div className="flex items-center gap-1.5">
              <span
                className={`relative flex h-2 w-2 ${
                  sseConnected ? 'text-violet-400' : 'text-amber-400'
                }`}
              >
                {sseConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    sseConnected ? 'bg-violet-400' : 'bg-amber-400'
                  }`}
                ></span>
              </span>
              <span className="font-mono text-[11px]">
                {sseConnected ? 'SSE Live Active' : 'Connecting SSE...'}
              </span>
            </div>
            <div className="h-3 w-px bg-zinc-800 mx-1" />
            <span className="text-zinc-400 text-[11px]">
              Streams:{' '}
              <strong className="text-violet-300 font-mono font-medium">
                {Number.isFinite(activeConnections) ? Math.max(1, activeConnections) : 1}
              </strong>
            </span>
            <div className="h-3 w-px bg-zinc-800 mx-1" />
            <span className="text-zinc-400 text-[11px]">
              Latency:{' '}
              <strong className="text-zinc-200 font-mono">
                {Number.isFinite(lastPingMs) ? lastPingMs : 4}ms
              </strong>
            </span>
          </div>

          {/* Landing Page Quick Button */}
          {onNavigateLanding && (
            <button
              id="header-btn-landing"
              onClick={onNavigateLanding}
              className="hidden md:flex items-center gap-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all"
              title="Return to FreeSync BaaS Public Landing Page"
            >
              <Home className="h-3.5 w-3.5 text-violet-400" />
              <span>Landing Page</span>
            </button>
          )}

          {/* Multi-Client Simulator Quick Button */}
          <button
            id="header-btn-simulator"
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'simulator'
                ? 'bg-[#F5F5F5] text-[#0A0A0A] font-semibold shadow-sm'
                : 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30'
            }`}
          >
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>Multi-Client Lab</span>
          </button>

          {/* API Playground Quick Button */}
          <button
            id="header-btn-playground"
            onClick={() => setActiveTab('playground')}
            className={`hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'playground'
                ? 'bg-[#F5F5F5] text-[#0A0A0A] font-semibold'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
            }`}
          >
            <PlayCircle className="h-3.5 w-3.5 text-zinc-400" />
            <span>Playground</span>
          </button>

          {/* Reset Demo Data Button */}
          <button
            id="header-btn-reset-demo"
            onClick={onResetDemo}
            disabled={isResetting}
            title="Reset to fresh demo state with sample chat, tasks & metrics"
            className="flex items-center gap-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-zinc-400 ${
                isResetting ? 'animate-spin text-violet-400' : ''
              }`}
            />
            <span className="hidden xl:inline">Seed Demo</span>
          </button>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block mx-0.5" />

          {/* User Sign In / User Profile Trigger */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                id="header-btn-user-profile"
                onClick={onOpenAuthModal}
                title="View active session & user details"
                className="flex items-center gap-2 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-violet-500/30 px-2.5 py-1.5 text-xs text-zinc-200 transition-all"
              >
                <img
                  src={
                    currentUser.avatarUrl ||
                    `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(currentUser.id)}`
                  }
                  alt={currentUser.name}
                  className="h-4 w-4 rounded-full object-cover bg-zinc-800"
                  referrerPolicy="no-referrer"
                />
                <span className="font-medium max-w-[90px] truncate">{currentUser.name}</span>
                <span className="rounded bg-violet-500/20 px-1.5 py-0.2 text-[10px] font-mono text-violet-300 capitalize hidden sm:inline">
                  {currentUser.role}
                </span>
              </button>
              <button
                id="header-btn-signout"
                onClick={onSignOut}
                title="Sign Out"
                className="rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 p-1.5 text-zinc-400 hover:text-rose-300 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="header-btn-signin"
              onClick={onOpenAuthModal}
              className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium px-3 py-1.5 text-xs shadow-sm transition-all"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Sign In / Sign Up</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
