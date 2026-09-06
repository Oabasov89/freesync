import React, { useState } from 'react';
import {
  Terminal,
  Play,
  Send,
  Code,
  Copy,
  Check,
  Sparkles,
  Key,
  Shield,
  Layers,
  ArrowRight,
  Database,
  Lock,
} from 'lucide-react';
import { ProjectSettings } from '../types/baas';

interface PlaygroundViewProps {
  project: ProjectSettings | null;
}

export const PlaygroundView: React.FC<PlaygroundViewProps> = ({ project }) => {
  const [method, setMethod] = useState<'GET' | 'POST' | 'PATCH' | 'DELETE'>('GET');
  const [endpoint, setEndpoint] = useState('/api/v1/databases/collections/tasks/documents');
  const [authType, setAuthType] = useState<'none' | 'publishable' | 'secret' | 'bearer'>('publishable');
  const [bearerToken, setBearerToken] = useState('');
  const [requestBody, setRequestBody] = useState(
    JSON.stringify(
      {
        data: {
          title: 'Testing REST Endpoint from Playground',
          status: 'in_progress',
          priority: 'high',
        },
      },
      null,
      2
    )
  );

  const [isLoading, setIsLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseLatency, setResponseLatency] = useState<number | null>(null);
  const [responseData, setResponseData] = useState<any>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // Preset Endpoints
  const presets = [
    { label: 'List Tasks', method: 'GET', url: '/api/v1/databases/collections/tasks/documents' },
    {
      label: 'Create Task',
      method: 'POST',
      url: '/api/v1/databases/collections/tasks/documents',
      body: JSON.stringify({ data: { title: 'New task from REST', status: 'todo', priority: 'medium' } }, null, 2),
    },
    { label: 'List Chat Messages', method: 'GET', url: '/api/v1/databases/collections/chat_messages/documents' },
    { label: 'Platform Health', method: 'GET', url: '/api/v1/health' },
    { label: 'Realtime SSE Stats', method: 'GET', url: '/api/v1/realtime/stats' },
    { label: 'List Users (Admin)', method: 'GET', url: '/api/v1/auth/users' },
  ];

  const handleApplyPreset = (p: typeof presets[0]) => {
    setMethod(p.method as any);
    setEndpoint(p.url);
    if (p.body) setRequestBody(p.body);
  };

  const handleExecuteRequest = async () => {
    setIsLoading(true);
    setResponseStatus(null);
    setResponseData(null);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authType === 'publishable' && project?.publishableKey) {
      headers['x-freesync-key'] = project.publishableKey;
    } else if (authType === 'secret' && project?.secretKey) {
      headers['x-freesync-key'] = project.secretKey;
    } else if (authType === 'bearer' && bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
    }

    const startTime = performance.now();
    try {
      const res = await fetch(endpoint, {
        method,
        headers,
        body: method !== 'GET' ? requestBody : undefined,
      });

      const endTime = performance.now();
      setResponseLatency(Math.round(endTime - startTime));
      setResponseStatus(res.status);

      const headerObj: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        headerObj[k] = v;
      });
      setResponseHeaders(headerObj);

      const data = await res.json();
      setResponseData(data);
    } catch (err: any) {
      setResponseStatus(500);
      setResponseData({ error: err.message || 'Request execution failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(JSON.stringify(responseData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-violet-950/60 border border-violet-800/40 flex items-center justify-center text-violet-400">
            <Terminal className="h-4 w-4" />
          </div>
          <h1 className="text-xl sm:text-2xl font-serif tracking-tight text-zinc-100">
            Interactive REST API Playground
          </h1>
        </div>
        <p className="text-xs text-zinc-400 mt-1 font-sans">
          Execute live HTTP requests against your FreeSync BaaS backend with custom headers, API keys, and Bearer tokens.
        </p>
      </div>

      {/* Quick Presets */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-[11px] font-medium uppercase text-zinc-500 font-mono flex-shrink-0">
          Presets:
        </span>
        {presets.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleApplyPreset(p)}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition-all flex-shrink-0"
          >
            <span
              className={`font-mono font-medium text-[10px] ${
                p.method === 'GET'
                  ? 'text-violet-400'
                  : p.method === 'POST'
                  ? 'text-blue-400'
                  : 'text-amber-400'
              }`}
            >
              {p.method}
            </span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Main Request / Response Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Request Builder */}
        <div className="rounded-xl border border-zinc-800 bg-[#121212] p-5 space-y-4 shadow-sm">
          <h2 className="text-sm font-serif text-zinc-100">
            HTTP Request Configuration
          </h2>

          {/* Method & URL */}
          <div className="flex items-center gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2.5 text-xs font-mono font-medium text-violet-400 focus:border-violet-500 focus:outline-none"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>

            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="/api/v1/..."
              className="flex-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2.5 text-xs font-mono text-zinc-100 focus:border-violet-500 focus:outline-none"
            />
          </div>

          {/* Authentication Header Options */}
          <div className="space-y-2 rounded-xl bg-zinc-950/60 p-3.5 border border-zinc-800">
            <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-violet-400" />
              <span>Authentication Header</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { id: 'publishable', label: 'Publishable Key' },
                { id: 'secret', label: 'Secret Admin Key' },
                { id: 'bearer', label: 'Bearer Token' },
                { id: 'none', label: 'No Auth' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAuthType(opt.id as any)}
                  className={`rounded-lg py-1.5 px-2 font-mono text-[11px] transition-all ${
                    authType === opt.id
                      ? 'bg-violet-950/60 text-violet-300 border border-violet-800/60 font-medium'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {authType === 'bearer' && (
              <input
                type="text"
                placeholder="Paste Bearer JWT token..."
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                className="w-full mt-2 rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-xs font-mono text-zinc-100 focus:border-violet-500 focus:outline-none"
              />
            )}
          </div>

          {/* Request Body Editor (for POST/PATCH) */}
          {method !== 'GET' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 font-sans">Request Body (JSON)</label>
              <textarea
                rows={7}
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-xs font-mono text-violet-300 focus:border-violet-500 focus:outline-none leading-relaxed"
              />
            </div>
          )}

          {/* Send Button */}
          <button
            id="playground-btn-send"
            onClick={handleExecuteRequest}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium py-2.5 text-xs shadow-sm transition-all disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span>{isLoading ? 'Executing...' : 'Send Request'}</span>
          </button>
        </div>

        {/* Right Column: Response Viewer */}
        <div className="rounded-xl border border-zinc-800 bg-[#121212] p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-serif text-zinc-100">
                  Response Output
                </h3>
                {responseStatus !== null && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-mono font-medium ${
                      responseStatus >= 200 && responseStatus < 300
                        ? 'bg-violet-950/60 text-violet-300 border border-violet-800/40'
                        : 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                    }`}
                  >
                    {responseStatus} {responseStatus === 200 ? 'OK' : responseStatus === 201 ? 'Created' : ''}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {responseLatency !== null && (
                  <span className="text-xs font-mono text-zinc-400">
                    ⚡ {responseLatency}ms
                  </span>
                )}
                {responseData && (
                  <button
                    onClick={handleCopyResponse}
                    className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
                  >
                    {copied ? <Check className="h-3 w-3 text-violet-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* JSON Response Area */}
            <div className="rounded-lg bg-zinc-950 p-4 border border-zinc-800 font-mono text-xs overflow-auto max-h-[380px] min-h-[220px]">
              {responseData ? (
                <pre className="text-violet-300 text-[11px] leading-relaxed">
                  {JSON.stringify(responseData, null, 2)}
                </pre>
              ) : (
                <div className="py-20 text-center text-zinc-500 font-sans text-xs">
                  Click "Send Request" to execute and inspect live response payloads.
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 font-mono pt-2 border-t border-zinc-800 flex items-center justify-between">
            <span>Server: FreeSync Core Engine</span>
            <span>CORS: Allowed (*)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
