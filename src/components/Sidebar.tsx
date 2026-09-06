import React from 'react';
import {
  LayoutDashboard,
  Database,
  Users,
  Radio,
  Terminal,
  FolderOpen,
  Zap,
  FileCode2,
  Settings,
  ShieldCheck,
  Home,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collectionsCount: number;
  usersCount: number;
  functionsCount: number;
  bucketsCount: number;
  onNavigateLanding?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collectionsCount,
  usersCount,
  functionsCount,
  bucketsCount,
  onNavigateLanding,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Overview & Metrics',
      icon: LayoutDashboard,
      badge: null,
      section: 'Core',
    },
    {
      id: 'database',
      label: 'Realtime Database',
      icon: Database,
      badge: collectionsCount > 0 ? `${collectionsCount} cols` : null,
      section: 'Core',
    },
    {
      id: 'auth',
      label: 'Authentication & RBAC',
      icon: Users,
      badge: usersCount > 0 ? `${usersCount} users` : null,
      section: 'Core',
    },
    {
      id: 'simulator',
      label: 'Multi-Client Lab',
      icon: Radio,
      badge: 'Live',
      badgeColor: 'violet',
      section: 'Interactive',
    },
    {
      id: 'playground',
      label: 'API Playground',
      icon: Terminal,
      badge: 'REST',
      section: 'Interactive',
    },
    {
      id: 'storage',
      label: 'Storage Buckets',
      icon: FolderOpen,
      badge: bucketsCount > 0 ? `${bucketsCount}` : null,
      section: 'Services',
    },
    {
      id: 'functions',
      label: 'Edge Micro-Hooks',
      icon: Zap,
      badge: functionsCount > 0 ? `${functionsCount}` : null,
      section: 'Services',
    },
    {
      id: 'sdk',
      label: 'Client SDKs & Docs',
      icon: FileCode2,
      badge: 'v1.4',
      section: 'Developer',
    },
    {
      id: 'settings',
      label: 'Settings & Exports',
      icon: Settings,
      badge: null,
      section: 'Developer',
    },
  ];

  return (
    <aside className="w-60 flex-shrink-0 border-r border-[#262626] bg-[#0D0D0D] p-3.5 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-65px)]">
      <div className="space-y-6">
        <div>
          <div className="text-[10px] font-mono font-medium uppercase tracking-widest text-zinc-500 px-3 mb-2 flex items-center justify-between">
            <span>Navigation</span>
            {onNavigateLanding && (
              <button
                onClick={onNavigateLanding}
                className="text-[10px] text-violet-400 hover:text-violet-300 font-mono flex items-center gap-1"
                title="View Public Landing Page"
              >
                <Home className="h-3 w-3" />
                <span>Landing</span>
              </button>
            )}
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-all ${
                    isActive
                      ? 'bg-zinc-800/90 text-[#F5F5F5] border border-zinc-700/80 font-medium'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? 'text-violet-400' : 'text-zinc-500'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                        item.badgeColor === 'violet'
                          ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Free-tier zero-billing card */}
        <div className="rounded-lg bg-[#141414] border border-[#262626] p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-zinc-200 text-xs font-serif font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
            <span>Zero-Cost Engine</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
            No credit card, no cloud bills, zero lock-in. Realtime synchronization and auth on your instance.
          </p>
          <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
            <span>Quota: Unlimited</span>
            <span className="text-violet-400 font-medium">Active</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-[#262626] text-[11px] text-zinc-400 flex items-center justify-between">
        <span className="font-mono text-[10px]">v1.4.0-stable</span>
        <span className="flex items-center gap-1 text-zinc-400 text-[10px] font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block"></span>
          SSE Ready
        </span>
      </div>
    </aside>
  );
};
