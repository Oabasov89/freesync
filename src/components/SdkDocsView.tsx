import React, { useState } from 'react';
import {
  FileCode2,
  Copy,
  Check,
  Code2,
  Terminal,
  Zap,
  Sparkles,
  Layers,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { ProjectSettings } from '../types/baas';

interface SdkDocsViewProps {
  project: ProjectSettings | null;
}

export const SdkDocsView: React.FC<SdkDocsViewProps> = ({ project }) => {
  const [selectedLang, setSelectedLang] = useState<'ts' | 'react' | 'curl' | 'python'>('ts');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const endpoint = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const pubKey = project?.publishableKey || 'fs_pub_demo_live';

  const snippets = {
    ts: `// 1. Initialize FreeSync Client
import { FreeSyncClient } from './freesync-client';

const client = new FreeSyncClient({
  endpoint: '${endpoint}',
  publishableKey: '${pubKey}'
});

// 2. Realtime SSE Live Subscription
const unsubscribe = client.realtime.subscribe(
  ['collections.tasks', 'chat_messages'],
  (event) => {
    console.log('⚡ Realtime event received:', event.type, event.payload);
  }
);

// 3. User Authentication
await client.auth.signIn('user@example.com', 'mypassword');
// Or instant Magic Link
await client.auth.createMagicLink('user@example.com');

// 4. Document CRUD with Instant Realtime Sync
const { document } = await client.database.collection('tasks').create({
  title: 'Ship new realtime feature',
  status: 'in_progress',
  priority: 'high'
});

console.log('Created task with ID:', document.id);`,

    react: `import React, { useState, useEffect } from 'react';
import { FreeSyncClient } from './freesync-client';

const client = new FreeSyncClient({
  endpoint: '${endpoint}',
  publishableKey: '${pubKey}'
});

export function LiveTaskList() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    // Initial fetch
    client.database.collection('tasks').list().then((res) => {
      setTasks(res.documents);
    });

    // Subscribe to live SSE changes
    const unsubscribe = client.realtime.subscribe(['collections.tasks'], (evt) => {
      if (evt.type === 'document.created') {
        setTasks((prev) => [evt.payload.document, ...prev]);
      } else if (evt.type === 'document.updated') {
        setTasks((prev) =>
          prev.map((d) => (d.id === evt.payload.document.id ? evt.payload.document : d))
        );
      } else if (evt.type === 'document.deleted') {
        setTasks((prev) => prev.filter((d) => d.id !== evt.payload.documentId));
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      <h3>Live Tasks ({tasks.length})</h3>
      {tasks.map((task) => (
        <div key={task.id}>{task.data.title}</div>
      ))}
    </div>
  );
}`,

    curl: `# 1. Subscribe to Live Server-Sent Events (SSE)
curl -N "${endpoint}/api/v1/realtime/subscribe?channels=collections.*"

# 2. Query Documents from Collection
curl -X GET "${endpoint}/api/v1/databases/collections/tasks/documents" \\
  -H "x-freesync-key: ${pubKey}"

# 3. Create Document with Instant Realtime Broadcast
curl -X POST "${endpoint}/api/v1/databases/collections/tasks/documents" \\
  -H "Content-Type: application/json" \\
  -H "x-freesync-key: ${pubKey}" \\
  -d '{
    "data": {
      "title": "Build BaaS with Zero Cloud Fees",
      "status": "completed",
      "priority": "critical"
    }
  }'

# 4. Authenticate User (Get JWT Token)
curl -X POST "${endpoint}/api/v1/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "sarah@example.com",
    "password": "password123"
  }'`,

    python: `import requests
import json
import sseclient # pip install sseclient-py

BASE_URL = "${endpoint}/api/v1"
HEADERS = {
    "Content-Type": "application/json",
    "x-freesync-key": "${pubKey}"
}

# 1. Fetch live documents
response = requests.get(f"{BASE_URL}/databases/collections/tasks/documents", headers=HEADERS)
print("Tasks:", response.json())

# 2. Insert new record
payload = {
    "data": {
        "title": "Python worker task",
        "status": "in_progress"
    }
}
res = requests.post(f"{BASE_URL}/databases/collections/tasks/documents", headers=HEADERS, json=payload)
print("Inserted:", res.json())

# 3. Listen to Realtime Event Stream
def listen_realtime():
    stream = requests.get(f"{BASE_URL}/realtime/subscribe?channels=collections.*", stream=True)
    client = sseclient.SSEClient(stream)
    for event in client.events():
        print("⚡ Event:", event.event, json.loads(event.data))`,
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-violet-950/60 border border-violet-800/40 flex items-center justify-center text-violet-400">
            <FileCode2 className="h-4 w-4" />
          </div>
          <h1 className="text-xl sm:text-2xl font-serif tracking-tight text-zinc-100">
            Client SDKs & Code Generator
          </h1>
        </div>
        <p className="text-xs text-zinc-400 mt-1 font-sans">
          Zero-dependency client libraries for JavaScript, TypeScript, React, Python, and cURL with integrated Server-Sent Events.
        </p>
      </div>

      {/* Language Switcher */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 text-xs overflow-x-auto">
        {[
          { id: 'ts', label: 'TypeScript / Node.js' },
          { id: 'react', label: 'React Hooks' },
          { id: 'curl', label: 'cURL / Shell' },
          { id: 'python', label: 'Python' },
        ].map((lang) => (
          <button
            key={lang.id}
            onClick={() => setSelectedLang(lang.id as any)}
            className={`rounded-lg px-4 py-2 font-mono text-xs transition-all ${
              selectedLang === lang.id
                ? 'bg-violet-950/60 text-violet-200 border border-violet-700/50 font-medium'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* Code Card */}
      <div className="rounded-xl border border-zinc-800 bg-[#121212] p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-mono text-zinc-200 uppercase tracking-wider">
              {selectedLang} Code Snippet
            </span>
          </div>

          <button
            onClick={() => handleCopy(snippets[selectedLang], selectedLang)}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium px-3 py-1.5 text-xs shadow-sm transition-all"
          >
            {copiedSnippet === selectedLang ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedSnippet === selectedLang ? 'Copied to Clipboard!' : 'Copy Code'}</span>
          </button>
        </div>

        <div className="rounded-lg bg-zinc-950 p-4 border border-zinc-800 font-mono text-xs text-violet-300 overflow-x-auto leading-relaxed">
          <pre>{snippets[selectedLang]}</pre>
        </div>
      </div>
    </div>
  );
};
