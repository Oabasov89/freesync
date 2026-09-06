import React from 'react';
import {
  LayoutDashboard,
  Database,
  Users,
  Home,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collectionsCount: number;
  usersCount: number;
  functionsCount?: number;
  bucketsCount?: number;
  onNavigateLanding?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collectionsCount,
  usersCount,
  onNavigateLanding,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Overview & Metrics',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'database',
      label: 'Realtime Database',
      icon: Database,
      badge: collectionsCount > 0 ? `${collectionsCount} cols` : null,
    },
    {
      id: 'auth',
      label: 'Authentication & RBAC',
      icon: Users,
      badge: usersCount > 0 ? `${usersCount} users` : null,
    },
  ];

  return (
    <aside className="w-60 flex-shrink-0 border-r border-[#262626] bg-[#0D0D0D] p-3.5 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-65px)]">
      <div className="space-y-6">
        <div>
          <div className="text-[10px] font-mono font-medium uppercase tracking-widest text-zinc-500 px-3 mb-2">
            <span>Navigation</span>
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
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-all cursor-pointer ${
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
                    <span className="rounded bg-zinc-900 text-zinc-400 border border-zinc-800 px-1.5 py-0.5 text-[10px] font-mono">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
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
