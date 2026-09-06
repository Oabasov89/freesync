import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Plus,
  UploadCloud,
  File,
  FileText,
  Image as ImageIcon,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Layers,
  HardDrive,
} from 'lucide-react';
import { StorageBucket, StorageFile } from '../types/baas';

export const StorageView: React.FC = () => {
  const [buckets, setBuckets] = useState<StorageBucket[]>([]);
  const [activeBucketId, setActiveBucketId] = useState<string | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Bucket Modal
  const [showNewBucketModal, setShowNewBucketModal] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [newBucketPublic, setNewBucketPublic] = useState(true);

  // Upload File Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadMime, setUploadMime] = useState('image/png');
  const [uploadSizeKb, setUploadSizeKb] = useState(128);

  useEffect(() => {
    fetchBuckets();
  }, []);

  const fetchBuckets = async () => {
    try {
      const res = await fetch('/api/v1/storage/buckets');
      const data = await res.json();
      if (res.ok && data.buckets) {
        setBuckets(data.buckets);
        if (!activeBucketId && data.buckets.length > 0) {
          setActiveBucketId(data.buckets[0].id);
          fetchFiles(data.buckets[0].id);
        } else if (activeBucketId) {
          fetchFiles(activeBucketId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch buckets', err);
    }
  };

  const fetchFiles = async (bucketId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/storage/buckets/${bucketId}/files`);
      const data = await res.json();
      if (res.ok) {
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error('Failed to fetch files', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectBucket = (bId: string) => {
    setActiveBucketId(bId);
    fetchFiles(bId);
  };

  const handleCreateBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBucketName.trim()) return;
    try {
      const res = await fetch('/api/v1/storage/buckets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBucketName, isPublic: newBucketPublic }),
      });
      if (res.ok) {
        setShowNewBucketModal(false);
        setNewBucketName('');
        fetchBuckets();
      }
    } catch (err) {
      console.error('Create bucket failed', err);
    }
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBucketId || !uploadFileName.trim()) return;
    try {
      const res = await fetch(`/api/v1/storage/buckets/${activeBucketId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadFileName,
          sizeBytes: uploadSizeKb * 1024,
          mimeType: uploadMime,
          url: `/api/v1/storage/buckets/${activeBucketId}/files/mock/${encodeURIComponent(uploadFileName)}`,
        }),
      });
      if (res.ok) {
        setShowUploadModal(false);
        setUploadFileName('');
        fetchBuckets();
      }
    } catch (err) {
      console.error('Upload failed', err);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!activeBucketId) return;
    try {
      await fetch(`/api/v1/storage/buckets/${activeBucketId}/files/${fileId}`, {
        method: 'DELETE',
      });
      fetchFiles(activeBucketId);
      fetchBuckets();
    } catch (err) {
      console.error('Delete file failed', err);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeBucket = buckets.find((b) => b.id === activeBucketId);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-violet-950/60 border border-violet-800/40 flex items-center justify-center text-violet-400">
              <FolderOpen className="h-4 w-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-serif tracking-tight text-zinc-100">
              Storage Buckets & Media Files
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Store images, assets, and user uploads with public access rules and MIME-type restrictions.
          </p>
        </div>

        <button
          onClick={() => setShowNewBucketModal(true)}
          className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium px-3.5 py-2 text-xs shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>New Bucket</span>
        </button>
      </div>

      {/* Grid: Buckets Sidebar & Files Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Buckets List */}
        <div className="lg:col-span-1 rounded-xl border border-zinc-800 bg-[#121212] p-4 space-y-3">
          <div className="text-xs font-serif text-zinc-300 px-1">
            Buckets ({buckets.length})
          </div>

          <div className="space-y-1.5">
            {buckets.map((b) => {
              const isActive = b.id === activeBucketId;
              return (
                <button
                  key={b.id}
                  onClick={() => handleSelectBucket(b.id)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs transition-all ${
                    isActive
                      ? 'bg-violet-950/50 text-violet-200 border border-violet-700/50 font-medium'
                      : 'text-zinc-300 hover:bg-zinc-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FolderOpen
                      className={`h-4 w-4 flex-shrink-0 ${
                        isActive ? 'text-violet-400' : 'text-zinc-400'
                      }`}
                    />
                    <span className="truncate font-sans">{b.name}</span>
                  </div>
                  <span className="rounded bg-zinc-900 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                    {b.fileCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Files Explorer */}
        <div className="lg:col-span-3 rounded-xl border border-zinc-800 bg-[#121212] p-5 space-y-4">
          {activeBucket ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-serif text-zinc-100">{activeBucket.name}</h2>
                    <span className="rounded-full bg-violet-950/60 border border-violet-800/40 px-2 py-0.5 text-[10px] font-mono text-violet-300">
                      {activeBucket.isPublic ? 'Public Read' : 'Private'}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    Total: {Number.isFinite(activeBucket.totalSizeKb) ? activeBucket.totalSizeKb : 0} KB • Max File: {Number.isFinite(activeBucket.maxFileSizeMb) ? activeBucket.maxFileSizeMb : 25} MB
                  </div>
                </div>

                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium px-3.5 py-2 text-xs shadow-sm transition-all"
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>Upload File</span>
                </button>
              </div>

              {/* Files Table */}
              <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/60">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-zinc-800 bg-zinc-900/90 text-zinc-400 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">File Name</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">MIME Type</th>
                      <th className="py-3 px-4">Uploaded</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {files.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-zinc-500 font-sans">
                          No files uploaded to this bucket yet. Click "Upload File" to test.
                        </td>
                      </tr>
                    ) : (
                      files.map((file) => (
                        <tr key={file.id} className="hover:bg-zinc-900/50 transition-colors">
                          <td className="py-3 px-4 text-zinc-200 font-medium">
                            <div className="flex items-center gap-2">
                              {file.mimeType.startsWith('image') ? (
                                <ImageIcon className="h-4 w-4 text-violet-400" />
                              ) : (
                                <FileText className="h-4 w-4 text-blue-400" />
                              )}
                              <span>{file.name}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-zinc-400">
                            {Number.isFinite(file.sizeBytes) ? Math.round(file.sizeBytes / 1024) : 0} KB
                          </td>

                          <td className="py-3 px-4 text-zinc-400">
                            <span className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px]">
                              {file.mimeType}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-zinc-500 text-[11px]">
                            {new Date(file.createdAt).toLocaleDateString()}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleCopy(file.url, file.id)}
                                className="rounded p-1.5 text-zinc-400 hover:text-zinc-100"
                                title="Copy File URL"
                              >
                                {copiedId === file.id ? (
                                  <Check className="h-3.5 w-3.5 text-violet-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteFile(file.id)}
                                className="rounded p-1.5 text-zinc-400 hover:text-rose-400"
                                title="Delete File"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-zinc-500 text-sm">
              No bucket selected.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: New Bucket */}
      {showNewBucketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-[#121212] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-serif text-zinc-100">Create Storage Bucket</h3>
              <button
                onClick={() => setShowNewBucketModal(false)}
                className="text-zinc-400 hover:text-zinc-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBucket} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300">Bucket Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. user-uploads, invoices"
                  value={newBucketName}
                  onChange={(e) => setNewBucketName(e.target.value)}
                  className="w-full mt-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300">Access Policy</label>
                <select
                  value={String(newBucketPublic)}
                  onChange={(e) => setNewBucketPublic(e.target.value === 'true')}
                  className="w-full mt-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none"
                >
                  <option value="true">Public (Public read URLs allowed)</option>
                  <option value="false">Private (Requires Auth Token)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowNewBucketModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-2 text-xs shadow-sm"
                >
                  Create Bucket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Upload File */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-[#121212] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-serif text-zinc-100">Upload File to {activeBucket?.name}</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-zinc-400 hover:text-zinc-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadFile} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300">File Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. hero-banner.png"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  className="w-full mt-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300">MIME Type</label>
                <select
                  value={uploadMime}
                  onChange={(e) => setUploadMime(e.target.value)}
                  className="w-full mt-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none"
                >
                  <option value="image/png">image/png</option>
                  <option value="image/jpeg">image/jpeg</option>
                  <option value="application/json">application/json</option>
                  <option value="application/pdf">application/pdf</option>
                  <option value="text/plain">text/plain</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300">Size (KB)</label>
                <input
                  type="number"
                  value={uploadSizeKb}
                  onChange={(e) => setUploadSizeKb(Number(e.target.value))}
                  className="w-full mt-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-2 text-xs shadow-sm"
                >
                  Save & Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
