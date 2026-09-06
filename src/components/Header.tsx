import React from 'react';
import {
  Zap,
  UserCheck,
  LogOut,
  Home,
} from 'lucide-react';
import { ProjectSettings, User } from '../types/baas';

interface HeaderProps {
  project?: ProjectSettings | null;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  sseConnected?: boolean;
  activeConnections?: number;
  lastPingMs?: number;
  onResetDemo?: () => void;
  isResetting?: boolean;
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
  onNavigateLanding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenAuthModal,
  onSignOut,
  onNavigateLanding,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#262626] bg-[#0A0A0A]/95 backdrop-blur-md px-4 sm:px-6 py-2.5">
      <div className="flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-violet-300 shadow-sm">
            <Zap className="h-4 w-4 text-violet-400" />
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            Free<span className="text-violet-400">Sync</span>
          </span>
        </div>

        {/* Right Controls: Home Icon near Account Name */}
        <div className="flex items-center gap-2">
          {/* Landing Page Home Icon */}
          {onNavigateLanding && (
            <button
              id="header-btn-home"
              onClick={onNavigateLanding}
              title="Return to Home / Landing Page"
              aria-label="Return to Home / Landing Page"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              <Home className="h-4 w-4" />
            </button>
          )}

          {/* User Profile or Sign In */}
          {currentUser ? (
            <div className="flex items-center gap-1.5">
              <button
                id="header-btn-user-profile"
                onClick={onOpenAuthModal}
                title="View active session & user details"
                className="flex items-center gap-2 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200 transition-all cursor-pointer"
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
                <span className="font-medium max-w-[120px] truncate">{currentUser.name}</span>
                <span className="rounded bg-violet-500/15 border border-violet-500/25 px-1.5 py-0.2 text-[10px] font-mono text-violet-300 capitalize hidden sm:inline">
                  {currentUser.role}
                </span>
              </button>
              <button
                id="header-btn-signout"
                onClick={onSignOut}
                title="Sign Out"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="header-btn-signin"
              onClick={onOpenAuthModal}
              className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium px-3.5 py-1.5 text-xs shadow-sm transition-all cursor-pointer"
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

