/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { DatabaseView } from './components/DatabaseView';
import { AuthView } from './components/AuthView';
import { UserAuthModal } from './components/UserAuthModal';
import { LandingPageView } from './components/LandingPageView';
import { Collection, Document, ProjectSettings, RealtimeEvent, User } from './types/baas';
import { supabase, mapSupabaseUserToBaasUser } from './lib/supabase';

export default function App() {
  const [viewMode, setViewMode] = useState<'landing' | 'console'>('landing');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [project, setProject] = useState<ProjectSettings | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [activeSubscribers, setActiveSubscribers] = useState<number>(1);
  const [isServerHealthy, setIsServerHealthy] = useState<boolean>(true);
  const [liveToast, setLiveToast] = useState<{ message: string; type: string } | null>(null);

  // Active authenticated user state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('fs_auth_token') : null;
  });
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);

  // Strict Gate: Never allow unauthenticated users in console
  useEffect(() => {
    if (!currentUser && viewMode === 'console') {
      setViewMode('landing');
    }
  }, [currentUser, viewMode]);

  useEffect(() => {
    // 1. Check Supabase active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const mapped = mapSupabaseUserToBaasUser(session.user);
        setCurrentUser(mapped);
        setAuthToken(session.access_token);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('fs_auth_token', session.access_token);
        }
        // Sync with BaaS server
        fetch('/api/v1/auth/supabase-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: mapped, token: session.access_token }),
        }).catch(() => {});
      }
    });

    // 2. Listen to Supabase auth events
    const { data: authSub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const mapped = mapSupabaseUserToBaasUser(session.user);
        setCurrentUser(mapped);
        setAuthToken(session.access_token);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('fs_auth_token', session.access_token);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setAuthToken(null);
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('fs_auth_token');
        }
        setViewMode('landing');
      }
    });

    // 3. Fallback check for existing stored local token
    const storedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('fs_auth_token') : null;
    if (storedToken) {
      fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.user) {
            setCurrentUser(data.user);
            setAuthToken(storedToken);
          } else {
            localStorage.removeItem('fs_auth_token');
            setCurrentUser(null);
            setAuthToken(null);
          }
        })
        .catch(() => {});
    }

    fetchInitialPlatformData();

    // Subscribe to platform-wide events for realtime dashboard counters
    const es = new EventSource('/api/v1/realtime/subscribe?clientId=app_dashboard_master&channels=*');

    es.onopen = () => {
      setIsServerHealthy(true);
    };

    es.onerror = () => {
      // Fallback health check
      fetch('/api/v1/health')
        .then((r) => r.ok && setIsServerHealthy(true))
        .catch(() => setIsServerHealthy(false));
    };

    const handleAnyEvent = (e: MessageEvent) => {
      try {
        const evt: RealtimeEvent = JSON.parse(e.data);
        setRealtimeEvents((prev) => [evt, ...prev.slice(0, 49)]);

        // Show quick toast on document changes
        if (evt.type.startsWith('document.')) {
          setLiveToast({
            message: `⚡ ${evt.type} in "${evt.collectionId || 'database'}"`,
            type: 'event',
          });
          setTimeout(() => setLiveToast(null), 3500);
        }
      } catch {}
    };

    const types = ['document.created', 'document.updated', 'document.deleted', 'user.registered', 'custom.event'];
    types.forEach((t) => es.addEventListener(t, handleAnyEvent));

    return () => {
      es.close();
    };
  }, []);

  const fetchInitialPlatformData = async () => {
    try {
      const [colRes, usersRes, statsRes] = await Promise.all([
        fetch('/api/v1/databases/collections'),
        fetch('/api/v1/auth/users'),
        fetch('/api/v1/realtime/stats'),
      ]);

      const [colData, usersData, statsData] = await Promise.all([
        colRes.json(),
        usersRes.json(),
        statsRes.json(),
      ]);

      if (colData.collections) setCollections(colData.collections);
      if (usersData.users) setUsers(usersData.users);
      if (statsData.connectedClients !== undefined) {
        setActiveSubscribers(Math.max(1, statsData.connectedClients));
      }

      setProject({
        id: 'fs_proj_live_default',
        name: 'FreeSync Cloud Instance',
        region: 'edge-local',
        publishableKey: 'fs_pub_demo_live',
        secretKey: 'fs_sec_live_admin_secret',
        corsOrigins: ['*'],
        jwtExpiryHours: 72,
        realtimeEnabled: true,
        anonymousAuthEnabled: true,
        magicLinkEnabled: true,
      });
    } catch (err) {
      console.error('Failed to load platform data', err);
    }
  };

  const handleRefreshData = () => {
    fetchInitialPlatformData();
  };

  const handleSignInSuccess = (user: User, token: string) => {
    setCurrentUser(user);
    setAuthToken(token);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('fs_auth_token', token);
    }
    setLiveToast({
      message: `Signed in as ${user.name} (${user.role})`,
      type: 'auth',
    });
    setTimeout(() => setLiveToast(null), 3000);
    fetchInitialPlatformData();
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setCurrentUser(null);
    setAuthToken(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('fs_auth_token');
    }
    setViewMode('landing');
    setLiveToast({
      message: 'Signed out successfully. BaaS access locked.',
      type: 'auth',
    });
    setTimeout(() => setLiveToast(null), 3000);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0A0A0A] text-[#F5F5F5] font-sans antialiased selection:bg-violet-500/30 selection:text-violet-200">
      {/* Live Global Toast Notification */}
      {liveToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-violet-500/40 bg-[#141414]/95 px-4 py-2.5 text-xs font-mono text-violet-200 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-ping" />
          <span>{liveToast.message}</span>
        </div>
      )}

      {viewMode === 'landing' ? (
        <div className="h-screen w-screen overflow-y-auto bg-[#0A0A0A]">
          <LandingPageView
            currentUser={currentUser}
            authToken={authToken}
            project={project}
            activeSubscribers={activeSubscribers}
            collectionsCount={collections.length}
            onEnterConsole={(targetTab) => {
              if (!currentUser) {
                setLiveToast({
                  message: '🔒 Sign-in required: Please authenticate with Supabase credentials first.',
                  type: 'auth',
                });
                setTimeout(() => setLiveToast(null), 3500);
                setAuthModalMode('signin');
                setShowAuthModal(true);
                return;
              }
              if (targetTab) setActiveTab(targetTab);
              setViewMode('console');
            }}
            onSignInSuccess={handleSignInSuccess}
            onSignOut={handleSignOut}
          />
        </div>
      ) : (
        <div className="flex h-screen w-screen overflow-hidden bg-[#0A0A0A]">
          {/* Sidebar */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            collectionsCount={collections.length}
            usersCount={users.length}
            functionsCount={3}
            bucketsCount={2}
            onNavigateLanding={() => setViewMode('landing')}
          />

          {/* Main Content Area */}
          <div className="flex flex-1 flex-col overflow-hidden bg-[#0A0A0A]">
            {/* Header */}
            <Header
              project={project}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              sseConnected={isServerHealthy}
              activeConnections={activeSubscribers}
              lastPingMs={4}
              onResetDemo={handleRefreshData}
              isResetting={false}
              currentUser={currentUser}
              onOpenAuthModal={() => {
                setAuthModalMode('signin');
                setShowAuthModal(true);
              }}
              onSignOut={handleSignOut}
              onNavigateLanding={() => setViewMode('landing')}
            />

            {/* Dynamic Views Viewport */}
            <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 relative bg-[#0A0A0A]">
              {activeTab === 'dashboard' && (
                <DashboardView
                  project={project}
                  collections={collections}
                  users={users}
                  events={realtimeEvents}
                  stats={{ metrics: { activeRealtimeStreams: activeSubscribers, totalEventsBroadcast: realtimeEvents.length } }}
                  setActiveTab={(tab) => setActiveTab(tab)}
                  onQuickSeed={() => handleRefreshData()}
                />
              )}

              {activeTab === 'database' && (
                <DatabaseView
                  collections={collections}
                  activeCollectionId={activeCollectionId || collections[0]?.id || null}
                  setActiveCollectionId={setActiveCollectionId}
                  onRefreshCollections={handleRefreshData}
                  recentUpdatedDocIds={new Set()}
                  currentUser={currentUser}
                  authToken={authToken}
                />
              )}

              {activeTab === 'auth' && (
                <AuthView
                  users={users}
                  project={project}
                  onRefreshUsers={handleRefreshData}
                  currentUser={currentUser}
                  authToken={authToken}
                  onSignInSuccess={handleSignInSuccess}
                  onSignOut={handleSignOut}
                  onOpenAuthModal={() => {
                    setAuthModalMode('signin');
                    setShowAuthModal(true);
                  }}
                />
              )}
            </main>
          </div>
        </div>
      )}

      {/* Zero Cost User Auth Modal */}
      <UserAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        currentUser={currentUser}
        authToken={authToken}
        onSignInSuccess={handleSignInSuccess}
        onSignOut={handleSignOut}
        defaultMode={authModalMode}
      />
    </div>
  );
}
