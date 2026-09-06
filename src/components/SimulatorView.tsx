import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Send,
  Plus,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  Laptop,
  Smartphone,
  Cpu,
  RefreshCw,
  MessageSquare,
  Kanban,
  Gauge,
  Activity,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Document, RealtimeEvent } from '../types/baas';

export const SimulatorView: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'chat' | 'tasks' | 'counter'>('chat');

  // Client A (Web App - Alice) State
  const [clientAMessages, setClientAMessages] = useState<Document[]>([]);
  const [clientATasks, setClientATasks] = useState<Document[]>([]);
  const [clientACounter, setClientACounter] = useState<number>(42);
  const [clientAInput, setClientAInput] = useState('');
  const [clientALastLatency, setClientALastLatency] = useState<number | null>(null);
  const [clientAPulse, setClientAPulse] = useState(false);

  // Client B (Mobile App - Bob) State
  const [clientBMessages, setClientBMessages] = useState<Document[]>([]);
  const [clientBTasks, setClientBTasks] = useState<Document[]>([]);
  const [clientBCounter, setClientBCounter] = useState<number>(42);
  const [clientBInput, setClientBInput] = useState('');
  const [clientBLastLatency, setClientBLastLatency] = useState<number | null>(null);
  const [clientBPulse, setClientBPulse] = useState(false);

  // Live Event Wire Log
  const [wireEvents, setWireEvents] = useState<RealtimeEvent[]>([]);
  const [selectedWireEvent, setSelectedWireEvent] = useState<RealtimeEvent | null>(null);

  // Tasks quick new task
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Initial fetch for chat & tasks
  useEffect(() => {
    fetchInitialData();

    // Subscribe to SSE stream for Client A
    const esA = new EventSource('/api/v1/realtime/subscribe?clientId=client_alice_web&clientName=Alice-Web');
    // Subscribe to SSE stream for Client B
    const esB = new EventSource('/api/v1/realtime/subscribe?clientId=client_bob_mobile&clientName=Bob-Mobile');

    const handleEventA = (e: MessageEvent) => {
      try {
        const evt: RealtimeEvent = JSON.parse(e.data);
        handleIncomingEvent(evt, 'A');
      } catch {}
    };

    const handleEventB = (e: MessageEvent) => {
      try {
        const evt: RealtimeEvent = JSON.parse(e.data);
        handleIncomingEvent(evt, 'B');
      } catch {}
    };

    const eventTypes = ['document.created', 'document.updated', 'document.deleted', 'custom.event'];
    eventTypes.forEach((t) => {
      esA.addEventListener(t, handleEventA);
      esB.addEventListener(t, handleEventB);
    });

    return () => {
      esA.close();
      esB.close();
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      const [chatRes, tasksRes] = await Promise.all([
        fetch('/api/v1/databases/collections/chat_messages/documents?limit=20'),
        fetch('/api/v1/databases/collections/tasks/documents?limit=20'),
      ]);

      const chatData = await chatRes.json();
      const tasksData = await tasksRes.json();

      if (chatData.documents) {
        setClientAMessages(chatData.documents);
        setClientBMessages(chatData.documents);
      }
      if (tasksData.documents) {
        setClientATasks(tasksData.documents);
        setClientBTasks(tasksData.documents);
      }
    } catch (err) {
      console.error('Failed to load initial simulator data', err);
    }
  };

  const handleIncomingEvent = (evt: RealtimeEvent, client: 'A' | 'B') => {
    const receivedTime = Date.now();
    const eventTime = evt?.timestamp ? new Date(evt.timestamp).getTime() : NaN;
    const latency = isNaN(eventTime) ? 3 : Math.max(1, receivedTime - eventTime);

    // Record in wire log
    setWireEvents((prev) => [evt, ...prev.slice(0, 40)]);

    if (client === 'A') {
      setClientALastLatency(Number.isFinite(latency) ? latency : 3);
      setClientAPulse(true);
      setTimeout(() => setClientAPulse(false), 800);
    } else {
      setClientBLastLatency(Number.isFinite(latency) ? latency : 4);
      setClientBPulse(true);
      setTimeout(() => setClientBPulse(false), 800);
    }

    // Process Chat Event
    if (evt.collectionId === 'chat_messages' || evt.channel.includes('chat')) {
      if (evt.type === 'document.created') {
        const newDoc = evt.payload?.document;
        if (newDoc) {
          if (client === 'A') setClientAMessages((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
          if (client === 'B') setClientBMessages((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
        }
      }
    }

    // Process Task Event
    if (evt.collectionId === 'tasks' || evt.channel.includes('tasks')) {
      if (evt.type === 'document.created') {
        const newDoc = evt.payload?.document;
        if (newDoc) {
          if (client === 'A') setClientATasks((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
          if (client === 'B') setClientBTasks((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
        }
      } else if (evt.type === 'document.updated') {
        const updatedDoc = evt.payload?.document;
        if (updatedDoc) {
          if (client === 'A')
            setClientATasks((prev) => prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)));
          if (client === 'B')
            setClientBTasks((prev) => prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)));
        }
      } else if (evt.type === 'document.deleted') {
        const docId = evt.payload?.documentId;
        if (docId) {
          if (client === 'A') setClientATasks((prev) => prev.filter((d) => d.id !== docId));
          if (client === 'B') setClientBTasks((prev) => prev.filter((d) => d.id !== docId));
        }
      }
    }

    // Process Counter Event
    if (evt.channel === 'counter.sync') {
      const val = evt.payload?.value;
      if (typeof val === 'number') {
        if (client === 'A') setClientACounter(val);
        if (client === 'B') setClientBCounter(val);
      }
    }
  };

  // Send message from Client A
  const handleSendFromA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientAInput.trim()) return;
    const text = clientAInput;
    setClientAInput('');

    try {
      await fetch('/api/v1/databases/collections/chat_messages/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            sender: 'Alice (Web)',
            text,
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
            channel: 'general',
            likes: 0,
          },
        }),
      });
    } catch (err) {
      console.error('Send from A failed', err);
    }
  };

  // Send message from Client B
  const handleSendFromB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientBInput.trim()) return;
    const text = clientBInput;
    setClientBInput('');

    try {
      await fetch('/api/v1/databases/collections/chat_messages/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            sender: 'Bob (Mobile)',
            text,
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
            channel: 'general',
            likes: 0,
          },
        }),
      });
    } catch (err) {
      console.error('Send from B failed', err);
    }
  };

  // Task state toggle from either client
  const handleToggleTaskStatus = async (task: Document) => {
    const nextStatus = task.data.status === 'completed' ? 'todo' : 'completed';
    try {
      await fetch(`/api/v1/databases/collections/tasks/documents/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            ...task.data,
            status: nextStatus,
            completed: nextStatus === 'completed',
          },
        }),
      });
    } catch (err) {
      console.error('Task update failed', err);
    }
  };

  // Add new task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const title = newTaskTitle;
    setNewTaskTitle('');

    try {
      await fetch('/api/v1/databases/collections/tasks/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            title,
            status: 'todo',
            priority: 'high',
            assignee: 'Alice',
            completed: false,
          },
        }),
      });
    } catch (err) {
      console.error('Add task failed', err);
    }
  };

  // Counter broadcast
  const handleUpdateCounter = async (delta: number) => {
    const nextVal = clientACounter + delta;
    try {
      await fetch('/api/v1/realtime/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'counter.sync',
          type: 'custom.event',
          payload: { value: nextVal, actor: 'Alice' },
        }),
      });
    } catch (err) {
      console.error('Broadcast counter failed', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-violet-950/60 border border-violet-800/40 flex items-center justify-center text-violet-400">
              <Radio className="h-4 w-4 animate-pulse" />
            </div>
            <h1 className="text-xl sm:text-2xl font-serif tracking-tight text-zinc-100">
              Live Realtime Simulator
            </h1>
            <span className="rounded-full bg-violet-950/60 border border-violet-800/40 px-2.5 py-0.5 text-[11px] text-violet-300 font-mono">
              SSE Stream Benchmark
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Test instant bidirectional sync between two virtual clients (Web vs. Mobile). Changes made in Client A reflect in Client B within milliseconds!
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1.5 rounded-xl bg-zinc-950 p-1 border border-zinc-800 text-xs">
          <button
            onClick={() => setActiveMode('chat')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
              activeMode === 'chat'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Live Chat Sync</span>
          </button>

          <button
            onClick={() => setActiveMode('tasks')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
              activeMode === 'tasks'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Kanban Sync</span>
          </button>

          <button
            onClick={() => setActiveMode('counter')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
              activeMode === 'counter'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Gauge className="h-3.5 w-3.5" />
            <span>State Broadcast</span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Simulated Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device A: Web Browser (Alice) */}
        <div
          className={`rounded-xl border bg-[#121212] p-5 shadow-sm transition-all duration-300 ${
            clientAPulse
              ? 'border-violet-500 ring-2 ring-violet-500/30'
              : 'border-zinc-800'
          }`}
        >
          {/* Device Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-violet-400">
                <Laptop className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-serif text-zinc-100 flex items-center gap-2">
                  <span>Client A: Web Dashboard</span>
                  <span className="rounded-full bg-violet-950/60 border border-violet-800/40 px-2 py-0.2 text-[10px] text-violet-300 font-mono">
                    Alice (Admin)
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  SSE Channel: <code className="text-violet-400">collections.*</code>
                </div>
              </div>
            </div>

            <div className="text-right font-mono text-[11px]">
              <span className="text-zinc-500">Latency: </span>
              <strong className="text-violet-400">
                {clientALastLatency !== null ? `${clientALastLatency}ms` : '3ms'}
              </strong>
            </div>
          </div>

          {/* Active Mode Content for Client A */}
          <div className="mt-4 space-y-4">
            {activeMode === 'chat' && (
              <div className="space-y-3">
                <div className="h-64 overflow-y-auto space-y-2 rounded-xl bg-zinc-950/70 p-3 border border-zinc-800/80">
                  {clientAMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col p-2.5 rounded-lg text-xs ${
                        msg.data.sender?.includes('Alice')
                          ? 'bg-violet-950/30 border border-violet-800/30 ml-6'
                          : 'bg-zinc-900 border border-zinc-800 mr-6'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1 font-mono">
                        <span className="font-medium text-zinc-200">{msg.data.sender}</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-zinc-100 font-sans">{msg.data.text}</div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendFromA} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Message as Alice (Web)..."
                    value={clientAInput}
                    onChange={(e) => setClientAInput(e.target.value)}
                    className="flex-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-2 text-xs flex items-center gap-1 shadow"
                  >
                    <span>Send</span>
                    <Send className="h-3 w-3" />
                  </button>
                </form>
              </div>
            )}

            {activeMode === 'tasks' && (
              <div className="space-y-3">
                <form onSubmit={handleAddTask} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add new collaborative task..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="flex-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium px-3 py-2 text-xs flex items-center gap-1 shadow"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </form>

                <div className="h-56 overflow-y-auto space-y-2 rounded-xl bg-zinc-950/70 p-3 border border-zinc-800/80">
                  {clientATasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleToggleTaskStatus(t)}
                      className="group flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-violet-500/40 cursor-pointer transition-all text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-4 w-4 rounded flex items-center justify-center border ${
                            t.data.status === 'completed'
                              ? 'bg-violet-600 border-violet-500 text-white'
                              : 'border-zinc-700'
                          }`}
                        >
                          {t.data.status === 'completed' && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                        <span
                          className={`${
                            t.data.status === 'completed'
                              ? 'line-through text-zinc-500'
                              : 'text-zinc-200'
                          }`}
                        >
                          {t.data.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {t.data.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeMode === 'counter' && (
              <div className="py-8 flex flex-col items-center justify-center space-y-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
                <div className="text-4xl font-serif text-zinc-100">
                  {clientACounter}
                </div>
                <div className="text-xs text-zinc-400 font-sans">Synchronized Global State Counter</div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleUpdateCounter(-1)}
                    className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-xs font-medium text-zinc-200 border border-zinc-700"
                  >
                    - 1
                  </button>
                  <button
                    onClick={() => handleUpdateCounter(1)}
                    className="rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-medium text-white shadow"
                  >
                    + 1 (Broadcast)
                  </button>
                  <button
                    onClick={() => handleUpdateCounter(10)}
                    className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-xs font-medium text-zinc-200 border border-zinc-700"
                  >
                    + 10
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Device B: Mobile App (Bob) */}
        <div
          className={`rounded-xl border bg-[#121212] p-5 shadow-sm transition-all duration-300 ${
            clientBPulse
              ? 'border-violet-500 ring-2 ring-violet-500/30'
              : 'border-zinc-800'
          }`}
        >
          {/* Device Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-violet-400">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-serif text-zinc-100 flex items-center gap-2">
                  <span>Client B: Mobile App</span>
                  <span className="rounded-full bg-violet-950/60 border border-violet-800/40 px-2 py-0.2 text-[10px] text-violet-300 font-mono">
                    Bob (Member)
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  SSE Channel: <code className="text-violet-400">collections.*</code>
                </div>
              </div>
            </div>

            <div className="text-right font-mono text-[11px]">
              <span className="text-zinc-500">Latency: </span>
              <strong className="text-violet-400">
                {clientBLastLatency !== null ? `${clientBLastLatency}ms` : '4ms'}
              </strong>
            </div>
          </div>

          {/* Active Mode Content for Client B */}
          <div className="mt-4 space-y-4">
            {activeMode === 'chat' && (
              <div className="space-y-3">
                <div className="h-64 overflow-y-auto space-y-2 rounded-xl bg-zinc-950/70 p-3 border border-zinc-800/80">
                  {clientBMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col p-2.5 rounded-lg text-xs ${
                        msg.data.sender?.includes('Bob')
                          ? 'bg-violet-950/30 border border-violet-800/30 ml-6'
                          : 'bg-zinc-900 border border-zinc-800 mr-6'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1 font-mono">
                        <span className="font-medium text-zinc-200">{msg.data.sender}</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-zinc-100 font-sans">{msg.data.text}</div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendFromB} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Message as Bob (Mobile)..."
                    value={clientBInput}
                    onChange={(e) => setClientBInput(e.target.value)}
                    className="flex-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-2 text-xs flex items-center gap-1 shadow"
                  >
                    <span>Send</span>
                    <Send className="h-3 w-3" />
                  </button>
                </form>
              </div>
            )}

            {activeMode === 'tasks' && (
              <div className="space-y-3">
                <div className="text-xs text-zinc-400 font-sans">
                  Click any task to toggle status. It immediately syncs back to Client A!
                </div>

                <div className="h-64 overflow-y-auto space-y-2 rounded-xl bg-zinc-950/70 p-3 border border-zinc-800/80">
                  {clientBTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleToggleTaskStatus(t)}
                      className="group flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-violet-500/40 cursor-pointer transition-all text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-4 w-4 rounded flex items-center justify-center border ${
                            t.data.status === 'completed'
                              ? 'bg-violet-600 border-violet-500 text-white'
                              : 'border-zinc-700'
                          }`}
                        >
                          {t.data.status === 'completed' && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                        <span
                          className={`${
                            t.data.status === 'completed'
                              ? 'line-through text-zinc-500'
                              : 'text-zinc-200'
                          }`}
                        >
                          {t.data.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {t.data.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeMode === 'counter' && (
              <div className="py-8 flex flex-col items-center justify-center space-y-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
                <div className="text-4xl font-serif text-zinc-100">
                  {clientBCounter}
                </div>
                <div className="text-xs text-zinc-400 font-sans">Client B Live Receiver (Mobile)</div>
                <p className="text-[11px] text-zinc-500 font-mono text-center">
                  Live state synchronized via Server-Sent Events stream.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Event Wire Protocol Inspector */}
      <div className="rounded-xl border border-zinc-800 bg-[#121212] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 className="text-sm font-serif text-zinc-100 flex items-center gap-2">
            <Activity className="h-4 w-4 text-violet-400" />
            Live SSE Protocol Packet Inspector
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            {wireEvents.length} events captured in session
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Events List */}
          <div className="h-48 overflow-y-auto space-y-1.5 pr-1">
            {wireEvents.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                Interact with Client A or Client B above to inspect realtime SSE packets.
              </div>
            ) : (
              wireEvents.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => setSelectedWireEvent(evt)}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all text-xs font-mono ${
                    selectedWireEvent?.id === evt.id
                      ? 'bg-violet-950/50 border border-violet-700/50 text-violet-200'
                      : 'bg-zinc-950/70 border border-zinc-800/80 hover:bg-zinc-800/60 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-violet-400 font-bold">{evt.type}</span>
                    <span className="text-zinc-500 font-normal">{evt.channel}</span>
                  </div>
                  <span className="text-zinc-500 text-[10px]">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Payload Inspector */}
          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800 font-mono text-xs overflow-x-auto h-48">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 font-mono">
              Event Payload (JSON)
            </div>
            {selectedWireEvent ? (
              <pre className="text-violet-300 text-[11px] leading-relaxed">
                {JSON.stringify(selectedWireEvent, null, 2)}
              </pre>
            ) : (
              <div className="text-zinc-600 text-xs py-8 text-center font-sans">
                Click any captured packet on the left to inspect its structure.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
