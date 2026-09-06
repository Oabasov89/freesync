import React, { useState, useEffect } from 'react';
import {
  Zap,
  Plus,
  Play,
  Check,
  Terminal,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Code2,
  Trash2,
  Layers,
} from 'lucide-react';
import { CloudFunction } from '../types/baas';

export const FunctionsView: React.FC = () => {
  const [functions, setFunctions] = useState<CloudFunction[]>([]);
  const [activeFnId, setActiveFnId] = useState<string | null>(null);
  const [testPayload, setTestPayload] = useState('{\n  "userId": "usr_demo",\n  "action": "task_assigned"\n}');
  const [execResult, setExecResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  // New Function Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newFnName, setNewFnName] = useState('');
  const [newFnTrigger, setNewFnTrigger] = useState<CloudFunction['trigger']>('onDocumentCreated');
  const [newFnTarget, setNewFnTarget] = useState('tasks');
  const [newFnCode, setNewFnCode] = useState(
    '// Event Trigger Hook\nexport default async function handleEvent(event, context) {\n  console.log("Processing event:", event);\n  // Broadcast custom alert\n  context.realtime.broadcast("alerts", {\n    title: "Event handled successfully",\n    timestamp: Date.now()\n  });\n}'
  );

  useEffect(() => {
    fetchFunctions();
  }, []);

  const fetchFunctions = async () => {
    try {
      const res = await fetch('/api/v1/functions');
      const data = await res.json();
      if (res.ok && data.functions) {
        setFunctions(data.functions);
        if (!activeFnId && data.functions.length > 0) {
          setActiveFnId(data.functions[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch functions', err);
    }
  };

  const handleToggle = async (fn: CloudFunction) => {
    try {
      await fetch(`/api/v1/functions/${fn.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !fn.enabled }),
      });
      fetchFunctions();
    } catch (err) {
      console.error('Failed to toggle function', err);
    }
  };

  const handleRunManual = async () => {
    if (!activeFnId) return;
    setIsRunning(true);
    setExecResult(null);
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(testPayload);
      } catch {}

      const res = await fetch(`/api/v1/functions/${activeFnId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: parsed }),
      });
      const data = await res.json();
      setExecResult(data);
      fetchFunctions();
    } catch (err: any) {
      setExecResult({ success: false, logs: [`Execution error: ${err?.message}`] });
    } finally {
      setIsRunning(false);
    }
  };

  const handleCreateFunction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFnName.trim()) return;
    try {
      const res = await fetch('/api/v1/functions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFnName,
          trigger: newFnTrigger,
          targetCollection: newFnTarget,
          code: newFnCode,
          enabled: true,
        }),
      });
      if (res.ok) {
        setShowNewModal(false);
        setNewFnName('');
        fetchFunctions();
      }
    } catch (err) {
      console.error('Create function failed', err);
    }
  };

  const handleDeleteFunction = async (id: string) => {
    try {
      await fetch(`/api/v1/functions/${id}`, { method: 'DELETE' });
      fetchFunctions();
    } catch (err) {
      console.error('Delete function failed', err);
    }
  };

  const activeFunction = functions.find((f) => f.id === activeFnId) || functions[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-violet-950/60 border border-violet-800/40 flex items-center justify-center text-violet-400">
              <Zap className="h-4 w-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-serif tracking-tight text-zinc-100">
              Edge Micro-Hooks & Serverless Functions
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Trigger lightweight automated logic on database inserts, user signups, or custom realtime events with zero cold starts.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium px-3.5 py-2 text-xs shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>New Function</span>
        </button>
      </div>

      {/* Main Grid: Functions List & Code / Runner Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Functions List */}
        <div className="lg:col-span-1 rounded-xl border border-zinc-800 bg-[#121212] p-4 space-y-3">
          <div className="text-xs font-serif text-zinc-300 px-1">
            Functions ({functions.length})
          </div>

          <div className="space-y-1.5">
            {functions.map((fn) => {
              const isActive = fn.id === activeFnId;
              return (
                <div
                  key={fn.id}
                  onClick={() => setActiveFnId(fn.id)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-violet-950/50 text-violet-200 border border-violet-700/50 font-medium'
                      : 'text-zinc-300 hover:bg-zinc-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Zap
                      className={`h-4 w-4 flex-shrink-0 ${
                        isActive ? 'text-violet-400' : 'text-zinc-400'
                      }`}
                    />
                    <div className="truncate">
                      <div className="truncate font-medium">{fn.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{fn.trigger}</div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(fn);
                    }}
                    className="text-zinc-400 hover:text-white"
                  >
                    {fn.enabled ? (
                      <span className="h-2 w-2 rounded-full bg-violet-400 inline-block" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-zinc-600 inline-block" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Code Studio & Manual Test Runner */}
        <div className="lg:col-span-3 rounded-xl border border-zinc-800 bg-[#121212] p-5 space-y-5">
          {activeFunction ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-serif text-zinc-100">{activeFunction.name}</h2>
                    <span className="rounded-full bg-violet-950/60 border border-violet-800/40 px-2.5 py-0.5 text-[10px] font-mono text-violet-300">
                      trigger:{activeFunction.trigger}
                    </span>
                    {activeFunction.targetCollection && (
                      <span className="rounded-full bg-zinc-900 border border-zinc-700 px-2.5 py-0.5 text-[10px] font-mono text-zinc-300">
                        col:{activeFunction.targetCollection}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    Executed: {activeFunction.executionCount} times • Last run:{' '}
                    {activeFunction.lastExecutedAt
                      ? new Date(activeFunction.lastExecutedAt).toLocaleTimeString()
                      : 'Never'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteFunction(activeFunction.id)}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-rose-950/40 hover:text-rose-400"
                    title="Delete Function"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Code Preview */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-violet-400" />
                  <span>Hook Implementation (TypeScript/JavaScript)</span>
                </label>
                <div className="rounded-lg bg-zinc-950 p-4 border border-zinc-800 font-mono text-xs text-violet-300 leading-relaxed overflow-x-auto">
                  <pre>{activeFunction.code}</pre>
                </div>
              </div>

              {/* Manual Test Runner */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-serif text-zinc-100 flex items-center gap-1.5">
                    <Play className="h-3.5 w-3.5 text-violet-400" />
                    <span>Test Runner & Payload Simulator</span>
                  </span>
                  <button
                    onClick={handleRunManual}
                    disabled={isRunning}
                    className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium px-3 py-1.5 text-xs shadow-sm transition-all disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>{isRunning ? 'Running...' : 'Execute Now'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-400 font-mono">Test Payload (JSON):</label>
                    <textarea
                      rows={4}
                      value={testPayload}
                      onChange={(e) => setTestPayload(e.target.value)}
                      className="w-full mt-1 rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 text-xs font-mono text-zinc-100 focus:border-violet-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 font-mono">Execution Logs & Output:</label>
                    <div className="mt-1 h-[98px] overflow-y-auto rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 text-[11px] font-mono text-zinc-300 space-y-1">
                      {execResult ? (
                        execResult.logs?.map((l: string, idx: number) => (
                          <div key={idx} className="text-violet-300">
                            {l}
                          </div>
                        ))
                      ) : (
                        <div className="text-zinc-500 text-[11px]">Awaiting execution...</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-zinc-500 text-sm">
              No function selected.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: New Function */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-[#121212] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-serif text-zinc-100 flex items-center gap-2">
                <Zap className="h-5 w-5 text-violet-400" />
                Create Edge Micro-Hook
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-zinc-400 hover:text-zinc-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFunction} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300">Function Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. onNewOrderNotify"
                  value={newFnName}
                  onChange={(e) => setNewFnName(e.target.value)}
                  className="w-full mt-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-zinc-300">Trigger Type</label>
                  <select
                    value={newFnTrigger}
                    onChange={(e) => setNewFnTrigger(e.target.value as any)}
                    className="w-full mt-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none"
                  >
                    <option value="onDocumentCreated">onDocumentCreated</option>
                    <option value="onDocumentUpdated">onDocumentUpdated</option>
                    <option value="onDocumentDeleted">onDocumentDeleted</option>
                    <option value="onUserRegister">onUserRegister</option>
                    <option value="webhook">Webhook / Direct Call</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-300">Target Collection</label>
                  <input
                    type="text"
                    placeholder="e.g. tasks, chat_messages"
                    value={newFnTarget}
                    onChange={(e) => setNewFnTarget(e.target.value)}
                    className="w-full mt-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300">Hook Logic (JavaScript)</label>
                <textarea
                  rows={6}
                  value={newFnCode}
                  onChange={(e) => setNewFnCode(e.target.value)}
                  className="w-full mt-1 rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs font-mono text-violet-300 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-2 text-xs shadow-sm"
                >
                  Create Hook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
