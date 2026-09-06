import React, { useState, useEffect } from 'react';
import {
  Database,
  Plus,
  Search,
  Trash2,
  Edit,
  Code,
  Shield,
  RefreshCw,
  Copy,
  Check,
  Layers,
  FileJson,
  UserCheck,
  Lock,
} from 'lucide-react';
import { Collection, Document, FieldType, SchemaField, SecurityRule, User } from '../types/baas';

interface DatabaseViewProps {
  collections: Collection[];
  activeCollectionId: string | null;
  setActiveCollectionId: (id: string) => void;
  onRefreshCollections: () => void;
  recentUpdatedDocIds: Set<string>;
  currentUser?: User | null;
  authToken?: string | null;
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({
  collections,
  activeCollectionId,
  setActiveCollectionId,
  onRefreshCollections,
  recentUpdatedDocIds,
  currentUser,
  authToken,
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('all');

  // Tab inside database view: 'documents' | 'schema' | 'rules'
  const [viewSubTab, setViewSubTab] = useState<'documents' | 'schema' | 'rules'>('documents');

  // New Collection Dialog state
  const [showCreateColModal, setShowCreateColModal] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [newColFields, setNewColFields] = useState<SchemaField[]>([
    { id: 'f_1', name: 'title', type: 'string', required: true, description: 'Title or name' },
    { id: 'f_2', name: 'status', type: 'string', required: false, defaultValue: 'active' },
  ]);

  // Document Editor Modal State
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [docFormData, setDocFormData] = useState<Record<string, any>>({});
  const [docJsonMode, setDocJsonMode] = useState(false);
  const [docJsonString, setDocJsonString] = useState('{}');
  const [docError, setDocError] = useState<string | null>(null);

  // Security Rules editing
  const [currentRules, setCurrentRules] = useState<SecurityRule | null>(null);

  const activeCollection = collections.find((c) => c.id === activeCollectionId) || collections[0];

  const displayedDocuments = documents.filter((doc) => {
    if (filterMode === 'mine') {
      if (!currentUser) return false;
      return doc.createdBy === currentUser.id;
    }
    return true;
  });

  useEffect(() => {
    if (!activeCollectionId && collections.length > 0) {
      setActiveCollectionId(collections[0].id);
    }
  }, [collections, activeCollectionId, setActiveCollectionId]);

  useEffect(() => {
    if (activeCollection) {
      setCurrentRules(activeCollection.securityRule);
      fetchDocuments(activeCollection.id);
    }
  }, [activeCollectionId, activeCollection]);

  const fetchDocuments = async (colId: string) => {
    setIsLoadingDocs(true);
    try {
      const q = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const headers: Record<string, string> = {};
      const token = authToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('fs_auth_token') : null);
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/databases/collections/${colId}/documents?limit=100${q}`, {
        headers,
      });
      const data = await res.json();
      if (res.ok) {
        setDocuments(data.documents || []);
        setTotalDocs(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch documents', err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenCreateDoc = () => {
    setEditingDoc(null);
    const initialData: Record<string, any> = {};
    activeCollection?.fields.forEach((f) => {
      if (f.defaultValue !== undefined) {
        initialData[f.name] = f.defaultValue;
      } else if (f.type === 'number') {
        initialData[f.name] = 0;
      } else if (f.type === 'boolean') {
        initialData[f.name] = false;
      } else if (['author', 'sender', 'assignee', 'user', 'userName'].includes(f.name)) {
        initialData[f.name] = currentUser?.name || currentUser?.email || 'Authenticated User';
      } else {
        initialData[f.name] = '';
      }
    });
    setDocFormData(initialData);
    setDocJsonString(JSON.stringify(initialData, null, 2));
    setDocError(null);
    setShowDocModal(true);
  };

  const handleOpenEditDoc = (doc: Document) => {
    setEditingDoc(doc);
    setDocFormData({ ...doc.data });
    setDocJsonString(JSON.stringify(doc.data, null, 2));
    setDocError(null);
    setShowDocModal(true);
  };

  const handleSaveDocument = async () => {
    if (!activeCollection) return;
    setDocError(null);

    let payloadData = docFormData;
    if (docJsonMode) {
      try {
        payloadData = JSON.parse(docJsonString);
      } catch {
        setDocError('Invalid JSON format. Please check syntax.');
        return;
      }
    }

    const token = authToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('fs_auth_token') : null);
    const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) authHeaders['Authorization'] = `Bearer ${token}`;

    try {
      if (editingDoc) {
        // Update existing document
        const res = await fetch(
          `/api/v1/databases/collections/${activeCollection.id}/documents/${editingDoc.id}`,
          {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ data: payloadData }),
          }
        );
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Failed to update document');
      } else {
        // Create new document
        const res = await fetch(
          `/api/v1/databases/collections/${activeCollection.id}/documents`,
          {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ data: payloadData }),
          }
        );
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Failed to create document');
      }

      setShowDocModal(false);
      fetchDocuments(activeCollection.id);
      onRefreshCollections();
    } catch (err: any) {
      setDocError(err.message || 'Error saving document');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!activeCollection) return;
    if (!confirm('Are you sure you want to delete this document? This will broadcast a delete event to all live subscribers.')) {
      return;
    }
    try {
      const token = authToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('fs_auth_token') : null);
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(
        `/api/v1/databases/collections/${activeCollection.id}/documents/${docId}`,
        { method: 'DELETE', headers }
      );
      if (res.ok) {
        fetchDocuments(activeCollection.id);
        onRefreshCollections();
      }
    } catch (err) {
      console.error('Failed to delete doc', err);
    }
  };

  const handleCreateCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    try {
      const colId = newColName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const res = await fetch('/api/v1/databases/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: colId,
          name: newColName,
          description: newColDesc,
          fields: newColFields,
        }),
      });

      if (res.ok) {
        setShowCreateColModal(false);
        setNewColName('');
        setNewColDesc('');
        onRefreshCollections();
        setActiveCollectionId(colId);
      }
    } catch (err) {
      console.error('Failed to create collection', err);
    }
  };

  const handleSaveSecurityRules = async () => {
    if (!activeCollection || !currentRules) return;
    try {
      await fetch(`/api/v1/databases/collections/${activeCollection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ securityRule: currentRules }),
      });
      onRefreshCollections();
      alert('Security & RBAC rules saved for collection ' + activeCollection.name);
    } catch (err) {
      console.error('Failed to save security rules', err);
    }
  };

  const addSchemaField = () => {
    const newId = 'f_' + (newColFields.length + 1);
    setNewColFields([
      ...newColFields,
      { id: newId, name: `field_${newColFields.length + 1}`, type: 'string', required: false },
    ]);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-serif tracking-tight text-[#F5F5F5] flex items-center gap-2">
              <Database className="h-5 w-5 text-violet-400" />
              Realtime Database &amp; <span className="italic font-normal text-violet-300">Schema Explorer</span>
            </h1>
            <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] text-violet-300 font-mono">
              Live Synchronized
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Create schema-typed collections, query with zero-lag indexers, and stream changes across clients.
          </p>
        </div>

        <button
          id="db-btn-create-collection"
          onClick={() => setShowCreateColModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[#F5F5F5] hover:bg-white text-[#0A0A0A] font-serif font-medium px-3.5 py-2 text-xs shadow-sm transition-all"
        >
          <Plus className="h-3.5 w-3.5 text-violet-700" />
          <span>New Collection</span>
        </button>
      </div>

      {/* Main Grid: Collections Sidebar & Active Collection Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Collections List */}
        <div className="lg:col-span-1 rounded-xl border border-[#262626] bg-[#121212] p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-zinc-400 px-1">
            <span>Collections ({collections.length})</span>
            <button
              onClick={onRefreshCollections}
              title="Refresh collections"
              className="text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-1">
            {collections.map((col) => {
              const isActive = activeCollection?.id === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => setActiveCollectionId(col.id)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-all ${
                    isActive
                      ? 'bg-violet-500/10 text-violet-300 border border-violet-500/30 font-medium'
                      : 'text-zinc-300 hover:bg-[#1A1A1A] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Database
                      className={`h-3.5 w-3.5 flex-shrink-0 ${
                        isActive ? 'text-violet-400' : 'text-zinc-500'
                      }`}
                    />
                    <div className="truncate">
                      <div className="truncate font-medium">{col.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono truncate">{col.id}</div>
                    </div>
                  </div>
                  <span className="rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 flex-shrink-0">
                    {col.documentCount || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Collection Workspace */}
        <div className="lg:col-span-3 rounded-xl border border-[#262626] bg-[#121212] p-5 space-y-5">
          {activeCollection ? (
            <>
              {/* Collection Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-serif font-medium text-[#F5F5F5]">{activeCollection.name}</h2>
                    <span className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[11px] font-mono text-violet-300">
                      collection:{activeCollection.id}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                    {activeCollection.description || 'Live document collection'}
                  </p>
                </div>

                {/* Sub tabs: Documents | Schema | Security Rules */}
                <div className="flex items-center gap-1 rounded-lg bg-[#171717] p-1 border border-[#262626] text-xs font-mono">
                  <button
                    onClick={() => setViewSubTab('documents')}
                    className={`flex items-center gap-1.5 rounded px-2.5 py-1 transition-all ${
                      viewSubTab === 'documents'
                        ? 'bg-zinc-800 text-[#F5F5F5] font-medium border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Layers className="h-3 w-3" />
                    <span>Docs ({totalDocs})</span>
                  </button>

                  <button
                    onClick={() => setViewSubTab('schema')}
                    className={`flex items-center gap-1.5 rounded px-2.5 py-1 transition-all ${
                      viewSubTab === 'schema'
                        ? 'bg-zinc-800 text-[#F5F5F5] font-medium border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Code className="h-3 w-3" />
                    <span>Schema ({activeCollection.fields.length})</span>
                  </button>

                  <button
                    onClick={() => setViewSubTab('rules')}
                    className={`flex items-center gap-1.5 rounded px-2.5 py-1 transition-all ${
                      viewSubTab === 'rules'
                        ? 'bg-zinc-800 text-[#F5F5F5] font-medium border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Shield className="h-3 w-3" />
                    <span>Security</span>
                  </button>
                </div>
              </div>

              {/* Authenticated Identity & RLS Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-violet-500/20 bg-violet-950/20 px-3.5 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-zinc-300">
                    Active BaaS User: <strong className="text-violet-200 font-mono">{currentUser ? currentUser.name : 'Anonymous Guest'}</strong>
                  </span>
                  {currentUser && (
                    <span className="rounded bg-violet-500/15 border border-violet-500/30 px-2 py-0.2 text-[10px] font-mono text-violet-300 capitalize">
                      {currentUser.role}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1">
                    <span className="text-zinc-500">Read:</span>
                    <span className="text-zinc-300">{activeCollection.securityRule.read}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="text-zinc-500">Create:</span>
                    <span className="text-zinc-300">{activeCollection.securityRule.create}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="text-zinc-500">Update/Delete:</span>
                    <span className="text-zinc-300">{activeCollection.securityRule.update}</span>
                  </span>
                </div>
              </div>

              {/* Sub Tab: Documents Table */}
              {viewSubTab === 'documents' && (
                <div className="space-y-4">
                  {/* Search, Filter and Action Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Search documents..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && fetchDocuments(activeCollection.id)}
                          className="w-full rounded-lg bg-[#171717] border border-[#262626] pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none font-mono"
                        />
                      </div>

                      {/* Filter: All vs My Records */}
                      <div className="flex items-center rounded-lg bg-[#171717] p-0.5 border border-[#262626] text-[11px] font-mono">
                        <button
                          onClick={() => setFilterMode('all')}
                          className={`px-2.5 py-1 rounded transition-colors ${
                            filterMode === 'all'
                              ? 'bg-zinc-800 text-zinc-100 font-medium'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          All ({documents.length})
                        </button>
                        <button
                          onClick={() => setFilterMode('mine')}
                          className={`px-2.5 py-1 rounded transition-colors ${
                            filterMode === 'mine'
                              ? 'bg-zinc-800 text-violet-300 font-medium'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          My Records
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => fetchDocuments(activeCollection.id)}
                        disabled={isLoadingDocs}
                        className="flex items-center gap-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all font-mono"
                      >
                        <RefreshCw
                          className={`h-3 w-3 text-zinc-400 ${isLoadingDocs ? 'animate-spin' : ''}`}
                        />
                        <span>Sync</span>
                      </button>

                      <button
                        id="db-btn-add-document"
                        onClick={handleOpenCreateDoc}
                        className="flex items-center gap-1.5 rounded-lg bg-[#F5F5F5] hover:bg-white text-[#0A0A0A] font-serif font-medium px-3.5 py-1.5 text-xs shadow-sm transition-all"
                      >
                        <Plus className="h-3.5 w-3.5 text-violet-700" />
                        <span>Add Document</span>
                      </button>
                    </div>
                  </div>

                  {/* Documents Data Table */}
                  <div className="overflow-x-auto rounded-lg border border-[#262626] bg-[#121212]">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="border-b border-[#262626] bg-[#171717] text-zinc-400 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3.5 font-medium">Document ID</th>
                          <th className="py-2.5 px-3.5 font-medium">Created By</th>
                          {activeCollection.fields.slice(0, 3).map((f) => (
                            <th key={f.id} className="py-2.5 px-3.5 font-medium">
                              {f.name}
                            </th>
                          ))}
                          <th className="py-2.5 px-3.5 font-medium">Created</th>
                          <th className="py-2.5 px-3.5 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#262626]">
                        {displayedDocuments.length === 0 ? (
                          <tr>
                            <td
                              colSpan={activeCollection.fields.slice(0, 3).length + 4}
                              className="py-12 text-center text-zinc-500 font-sans text-xs"
                            >
                              {filterMode === 'mine'
                                ? 'No documents created by your active user account yet. Click "Add Document" to insert a record tagged with your identity.'
                                : 'No documents found in this collection. Click "Add Document" to insert a record.'}
                            </td>
                          </tr>
                        ) : (
                          displayedDocuments.map((doc) => {
                            const isRecentlyUpdated = recentUpdatedDocIds.has(doc.id);
                            const isMyDoc = currentUser && doc.createdBy === currentUser.id;
                            return (
                              <tr
                                key={doc.id}
                                className={`group hover:bg-[#1A1A1A] transition-colors ${
                                  isRecentlyUpdated
                                    ? 'bg-violet-500/10 ring-1 ring-violet-500/30'
                                    : ''
                                }`}
                              >
                                <td className="py-2.5 px-3.5 text-violet-300 font-medium whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <span>{doc.id}</span>
                                    <button
                                      onClick={() => handleCopy(doc.id, doc.id)}
                                      className="text-zinc-600 hover:text-zinc-300"
                                      title="Copy ID"
                                    >
                                      {copiedId === doc.id ? (
                                        <Check className="h-3 w-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </button>
                                  </div>
                                </td>

                                {/* Created By Tag */}
                                <td className="py-2.5 px-3.5 whitespace-nowrap">
                                  {isMyDoc ? (
                                    <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 font-mono">
                                      You ({currentUser.role})
                                    </span>
                                  ) : (
                                    <span className="rounded bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 font-mono max-w-[120px] truncate inline-block">
                                      {doc.createdBy || 'system'}
                                    </span>
                                  )}
                                </td>

                                {activeCollection.fields.slice(0, 3).map((f) => {
                                  const val = doc.data[f.name];
                                  return (
                                    <td
                                      key={f.id}
                                      className="py-2.5 px-3.5 text-zinc-300 max-w-[180px] truncate"
                                    >
                                      {val === null || val === undefined ? (
                                        <span className="text-zinc-600 italic">null</span>
                                      ) : typeof val === 'boolean' ? (
                                        <span
                                          className={`rounded px-1.5 py-0.5 text-[10px] ${
                                            val
                                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                          }`}
                                        >
                                          {String(val)}
                                        </span>
                                      ) : typeof val === 'object' ? (
                                        <span className="text-violet-300 font-mono">
                                          {JSON.stringify(val)}
                                        </span>
                                      ) : (
                                        String(val)
                                      )}
                                    </td>
                                  );
                                })}

                                <td className="py-2.5 px-3.5 text-zinc-500 text-[11px] whitespace-nowrap font-mono">
                                  {new Date(doc.createdAt).toLocaleTimeString()}
                                </td>

                                <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => handleOpenEditDoc(doc)}
                                      className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-all"
                                      title="Edit Document"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteDocument(doc.id)}
                                      className="rounded p-1 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
                                      title="Delete Document"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub Tab: Schema Designer */}
              {viewSubTab === 'schema' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-serif font-medium text-[#F5F5F5]">Schema Attributes &amp; Types</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Typed validation ensures data integrity across real-time subscriptions and REST APIs.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activeCollection.fields.map((f) => (
                      <div
                        key={f.id}
                        className="rounded-lg border border-[#262626] bg-[#171717] p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-medium text-xs text-zinc-200">{f.name}</span>
                          <span className="rounded bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] font-mono text-violet-300">
                            {f.type}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400">
                          {f.description || 'Attribute field'}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 pt-1 border-t border-[#262626] font-mono">
                          <span>{f.required ? '● Required' : '○ Optional'}</span>
                          {f.defaultValue !== undefined && (
                            <span>Default: {String(f.defaultValue)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub Tab: Security & RBAC Rules */}
              {viewSubTab === 'rules' && currentRules && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-serif font-medium text-[#F5F5F5] flex items-center gap-2">
                      <Shield className="h-4 w-4 text-violet-400" />
                      Collection Access Control &amp; Security Policies
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Configure granular read, create, update, and delete permissions for this collection.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-[#262626] bg-[#171717] p-4 space-y-2">
                      <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Read Permission</label>
                      <select
                        value={currentRules.read}
                        onChange={(e) =>
                          setCurrentRules({ ...currentRules, read: e.target.value as any })
                        }
                        className="w-full rounded-lg bg-[#121212] border border-[#262626] px-3 py-2 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none font-mono"
                      >
                        <option value="public">Public (Anyone can read)</option>
                        <option value="authenticated">Authenticated Users Only</option>
                        <option value="owner">Owner Only ($userId == createdBy)</option>
                        <option value="admin">Admin Role Only</option>
                      </select>
                      <p className="text-[11px] text-zinc-500 font-mono">Controls GET /documents requests.</p>
                    </div>

                    <div className="rounded-lg border border-[#262626] bg-[#171717] p-4 space-y-2">
                      <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Create Permission</label>
                      <select
                        value={currentRules.create}
                        onChange={(e) =>
                          setCurrentRules({ ...currentRules, create: e.target.value as any })
                        }
                        className="w-full rounded-lg bg-[#121212] border border-[#262626] px-3 py-2 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none font-mono"
                      >
                        <option value="public">Public (Anyone can insert)</option>
                        <option value="authenticated">Authenticated Users Only</option>
                        <option value="admin">Admin Role Only</option>
                      </select>
                      <p className="text-[11px] text-zinc-500 font-mono">Controls POST /documents requests.</p>
                    </div>

                    <div className="rounded-lg border border-[#262626] bg-[#171717] p-4 space-y-2">
                      <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Update Permission</label>
                      <select
                        value={currentRules.update}
                        onChange={(e) =>
                          setCurrentRules({ ...currentRules, update: e.target.value as any })
                        }
                        className="w-full rounded-lg bg-[#121212] border border-[#262626] px-3 py-2 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none font-mono"
                      >
                        <option value="public">Public (Anyone can edit)</option>
                        <option value="authenticated">Authenticated Users</option>
                        <option value="owner">Owner Only ($userId == createdBy)</option>
                        <option value="admin">Admin Role Only</option>
                      </select>
                      <p className="text-[11px] text-zinc-500 font-mono">Controls PATCH /documents/:id.</p>
                    </div>

                    <div className="rounded-lg border border-[#262626] bg-[#171717] p-4 space-y-2">
                      <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Delete Permission</label>
                      <select
                        value={currentRules.delete}
                        onChange={(e) =>
                          setCurrentRules({ ...currentRules, delete: e.target.value as any })
                        }
                        className="w-full rounded-lg bg-[#121212] border border-[#262626] px-3 py-2 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none font-mono"
                      >
                        <option value="public">Public (Anyone can delete)</option>
                        <option value="admin">Admin Role Only</option>
                        <option value="owner">Owner Only ($userId == createdBy)</option>
                        <option value="authenticated">Authenticated Users</option>
                      </select>
                      <p className="text-[11px] text-zinc-500 font-mono">Controls DELETE /documents/:id.</p>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveSecurityRules}
                    className="flex items-center gap-2 rounded-lg bg-[#F5F5F5] hover:bg-white text-[#0A0A0A] font-serif font-medium px-4 py-2 text-xs shadow-sm transition-all"
                  >
                    <Check className="h-3.5 w-3.5 text-violet-700" />
                    <span>Save Security Policy</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center text-zinc-500 text-sm font-sans">
              No collection selected. Select or create a collection to inspect documents.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Create New Collection */}
      {showCreateColModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#262626] bg-[#121212] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <h3 className="text-base font-serif font-medium text-[#F5F5F5] flex items-center gap-2">
                <Database className="h-4 w-4 text-violet-400" />
                Create Realtime Collection
              </h3>
              <button
                onClick={() => setShowCreateColModal(false)}
                className="text-zinc-500 hover:text-zinc-200 text-lg font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCollectionSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Collection Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Products, User Profiles, Orders"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full mt-1 rounded-lg bg-[#171717] border border-[#262626] px-3 py-2 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Description</label>
                <input
                  type="text"
                  placeholder="Short description of this dataset"
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                  className="w-full mt-1 rounded-lg bg-[#171717] border border-[#262626] px-3 py-2 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Initial Schema Fields</label>
                  <button
                    type="button"
                    onClick={addSchemaField}
                    className="text-xs text-violet-300 hover:underline flex items-center gap-1 font-mono"
                  >
                    <Plus className="h-3 w-3" /> Add Field
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {newColFields.map((field, idx) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Field name"
                        value={field.name}
                        onChange={(e) => {
                          const copy = [...newColFields];
                          copy[idx].name = e.target.value;
                          setNewColFields(copy);
                        }}
                        className="flex-1 rounded-lg bg-[#171717] border border-[#262626] px-2.5 py-1.5 text-xs text-zinc-200 font-mono"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => {
                          const copy = [...newColFields];
                          copy[idx].type = e.target.value as FieldType;
                          setNewColFields(copy);
                        }}
                        className="rounded-lg bg-[#171717] border border-[#262626] px-2.5 py-1.5 text-xs text-zinc-200 font-mono"
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="json">JSON</option>
                        <option value="datetime">DateTime</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowCreateColModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#F5F5F5] hover:bg-white text-[#0A0A0A] font-serif font-medium px-4 py-2 text-xs shadow-sm"
                >
                  Create Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Document Add / Edit */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#262626] bg-[#121212] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <h3 className="text-base font-serif font-medium text-[#F5F5F5] flex items-center gap-2">
                <FileJson className="h-4 w-4 text-violet-400" />
                {editingDoc ? `Edit Document (${editingDoc.id})` : 'Insert Document'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDocJsonMode(!docJsonMode)}
                  className="text-xs text-violet-300 hover:underline font-mono"
                >
                  {docJsonMode ? 'Form View' : 'Raw JSON'}
                </button>
                <button
                  onClick={() => setShowDocModal(false)}
                  className="text-zinc-500 hover:text-zinc-200 text-lg font-mono ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {docError && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300 font-mono">
                {docError}
              </div>
            )}

            {docJsonMode ? (
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Document Data (JSON)</label>
                <textarea
                  rows={8}
                  value={docJsonString}
                  onChange={(e) => setDocJsonString(e.target.value)}
                  className="w-full mt-1 rounded-lg bg-[#171717] border border-[#262626] p-3 text-xs font-mono text-violet-300 focus:border-zinc-500 focus:outline-none"
                />
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {activeCollection?.fields.map((f) => (
                  <div key={f.id}>
                    <label className="text-xs font-mono text-zinc-300 flex items-center justify-between">
                      <span>{f.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{f.type}</span>
                    </label>

                    {f.type === 'boolean' ? (
                      <select
                        value={String(docFormData[f.name] ?? false)}
                        onChange={(e) =>
                          setDocFormData({ ...docFormData, [f.name]: e.target.value === 'true' })
                        }
                        className="w-full mt-1 rounded-lg bg-[#171717] border border-[#262626] px-3 py-2 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none font-mono"
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : f.type === 'number' ? (
                      <input
                        type="number"
                        value={docFormData[f.name] ?? ''}
                        onChange={(e) =>
                          setDocFormData({ ...docFormData, [f.name]: Number(e.target.value) })
                        }
                        className="w-full mt-1 rounded-lg bg-[#171717] border border-[#262626] px-3 py-2 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none font-mono"
                      />
                    ) : (
                      <input
                        type="text"
                        value={docFormData[f.name] ?? ''}
                        onChange={(e) =>
                          setDocFormData({ ...docFormData, [f.name]: e.target.value })
                        }
                        className="w-full mt-1 rounded-lg bg-[#171717] border border-[#262626] px-3 py-2 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none font-sans"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#262626]">
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="rounded-lg px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDocument}
                className="rounded-lg bg-[#F5F5F5] hover:bg-white text-[#0A0A0A] font-serif font-medium px-4 py-2 text-xs shadow-sm"
              >
                {editingDoc ? 'Save Changes' : 'Insert Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
