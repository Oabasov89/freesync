import { Request, Response, Router } from 'express';
import { authService } from './auth';
import { dbStore } from './db';
import { functionRunner } from './functions';
import { realtimeEngine } from './realtime';

export const apiRouter = Router();

// Middleware: Extract user from Bearer Token or API Key
const extractActor = (req: Request, res: Response, next: () => void) => {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = (req.headers['x-freesync-key'] || req.headers['x-api-key']) as string | undefined;
  const { user, isApiKeyAdmin } = authService.resolveActor(authHeader, apiKeyHeader);
  (req as any).actor = user;
  (req as any).isApiKeyAdmin = isApiKeyAdmin;
  next();
};

apiRouter.use(extractActor);

// --- HEALTH & STATUS ---
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    engine: 'FreeSync BaaS Core Engine',
    version: '1.4.0',
    freeTier: 'Unlimited / Self-Contained / Zero Cloud Billing',
    uptimeSeconds: process.uptime(),
    activeStreams: realtimeEngine.getStats().activeConnections,
    timestamp: new Date().toISOString(),
  });
});

// --- PROJECT SETTINGS ---
apiRouter.get('/projects/current', (req, res) => {
  res.json({
    project: dbStore.projectSettings,
  });
});

apiRouter.patch('/projects/current', (req, res) => {
  const { name, allowAnonymousAuth, allowEmailPasswordAuth, allowMagicLinkAuth, jwtExpiryHours } = req.body;
  if (name !== undefined) dbStore.projectSettings.name = name;
  if (allowAnonymousAuth !== undefined) dbStore.projectSettings.allowAnonymousAuth = Boolean(allowAnonymousAuth);
  if (allowEmailPasswordAuth !== undefined) dbStore.projectSettings.allowEmailPasswordAuth = Boolean(allowEmailPasswordAuth);
  if (allowMagicLinkAuth !== undefined) dbStore.projectSettings.allowMagicLinkAuth = Boolean(allowMagicLinkAuth);
  if (jwtExpiryHours !== undefined) dbStore.projectSettings.jwtExpiryHours = Number(jwtExpiryHours);

  dbStore.logAudit('PROJECT_SETTINGS_UPDATE', 'system', 'success', 'Updated project configurations');
  res.json({ project: dbStore.projectSettings });
});

apiRouter.post('/projects/regenerate-keys', (req, res) => {
  const { keyType } = req.body; // 'publishable' or 'secret'
  if (keyType === 'publishable') {
    dbStore.projectSettings.publishableKey = 'fs_pub_' + Math.random().toString(36).substring(2, 12) + '_live';
  } else {
    dbStore.projectSettings.secretKey = 'fs_sec_' + Math.random().toString(36).substring(2, 16) + '_admin';
  }
  dbStore.logAudit('REGENERATE_KEYS', 'system', 'warning', `Regenerated ${keyType} API key`);
  res.json({ project: dbStore.projectSettings });
});

// --- AUTHENTICATION WORKFLOWS ---
apiRouter.post('/auth/register', (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const result = authService.registerWithPassword(email, password, name);
    functionRunner.executeTrigger('onUserRegister', result.user);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Registration failed' });
  }
});

apiRouter.post('/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const result = authService.loginWithPassword(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err?.message || 'Login failed' });
  }
});

// Synchronize Supabase Authenticated Session
apiRouter.post('/auth/supabase-session', (req, res) => {
  try {
    const { user, token } = req.body;
    if (!user || !user.id) {
      return res.status(400).json({ error: 'Supabase user payload is required.' });
    }
    const result = authService.syncSupabaseSession(user, token);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to sync Supabase session' });
  }
});

apiRouter.post('/auth/anonymous', (req, res) => {
  try {
    const { name } = req.body;
    const result = authService.signInAnonymous(name);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Anonymous login failed' });
  }
});

apiRouter.post('/auth/magic-link/create', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required for magic link.' });
    }
    const result = authService.createMagicLink(email);
    res.json({
      message: 'Magic link generated successfully.',
      ...result,
      instructions: 'Open the link or pass token to /api/v1/auth/magic-link/verify?token=...',
    });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to create magic link' });
  }
});

apiRouter.get('/auth/magic-link/verify', (req, res) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({ error: 'Token query parameter is required.' });
    }
    const result = authService.verifyMagicLink(token);
    res.json({
      message: 'Authentication successful via Magic Link.',
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Invalid or expired magic link token' });
  }
});

apiRouter.post('/auth/link-anonymous', (req, res) => {
  try {
    const actor = (req as any).actor;
    if (!actor) {
      return res.status(401).json({ error: 'Must be authenticated as anonymous user to link email.' });
    }
    const { email, password } = req.body;
    const user = authService.linkEmailToAnonymous(actor.id, email, password);
    res.json({ user, message: 'Anonymous account successfully converted to permanent user.' });
  } catch (err: any) {
    res.status(400).json({ error: err?.message });
  }
});

apiRouter.get('/auth/me', (req, res) => {
  const actor = (req as any).actor;
  if (!actor) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: actor });
});

apiRouter.get('/auth/users', (req, res) => {
  res.json({ users: authService.getUsers() });
});

apiRouter.patch('/auth/users/:id/role', (req, res) => {
  const { role } = req.body;
  const user = authService.updateUserRole(req.params.id, role);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

apiRouter.patch('/auth/users/:id/status', (req, res) => {
  const { status } = req.body;
  const user = authService.toggleUserStatus(req.params.id, status);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// --- REALTIME SERVER-SENT EVENTS (SSE) ---
apiRouter.get('/realtime/subscribe', (req: Request, res: Response) => {
  const clientId = (req.query.clientId as string) || 'client_' + Math.random().toString(36).substring(2, 9);
  const clientName = req.query.clientName as string | undefined;
  const channelsParam = req.query.channels as string | undefined;
  const channels = channelsParam ? channelsParam.split(',').map((c) => c.trim()) : ['*'];

  // Set SSE HTTP Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });
  res.flushHeaders?.();

  const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
  realtimeEngine.registerClient(clientId, res, ip, channels, clientName);

  req.on('close', () => {
    realtimeEngine.unregisterClient(clientId);
  });
});

apiRouter.post('/realtime/channels', (req, res) => {
  const { clientId, channels } = req.body;
  if (!clientId || !Array.isArray(channels)) {
    return res.status(400).json({ error: 'clientId and channels array are required.' });
  }
  const ok = realtimeEngine.updateClientChannels(clientId, channels);
  res.json({ success: ok, channels });
});

apiRouter.post('/realtime/broadcast', (req, res) => {
  const { channel, type, payload } = req.body;
  if (!channel || !payload) {
    return res.status(400).json({ error: 'Channel and payload are required.' });
  }
  const actor = (req as any).actor;
  const event = realtimeEngine.emitCustom(
    channel,
    type || 'custom.event',
    payload,
    actor ? { id: actor.id, name: actor.name, role: actor.role } : undefined
  );
  res.status(201).json({ event });
});

apiRouter.get('/realtime/stats', (req, res) => {
  res.json(realtimeEngine.getStats());
});

// --- DATABASE & COLLECTIONS ---
apiRouter.get('/databases/collections', (req, res) => {
  res.json({ collections: dbStore.getCollections() });
});

apiRouter.post('/databases/collections', (req, res) => {
  try {
    const { id, name, description, fields, securityRule } = req.body;
    if (!name) return res.status(400).json({ error: 'Collection name is required.' });

    const collectionId = id || name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (dbStore.collections.has(collectionId)) {
      return res.status(400).json({ error: `Collection with id '${collectionId}' already exists.` });
    }

    const col = dbStore.createCollection({
      id: collectionId,
      name,
      description: description || '',
      fields: fields || [
        { id: 'f_title', name: 'title', type: 'string', required: true },
      ],
      securityRule: securityRule || {
        id: 'sec_' + collectionId,
        collectionId,
        read: 'public',
        create: 'public',
        update: 'public',
        delete: 'admin',
      },
    });

    res.status(201).json({ collection: col });
  } catch (err: any) {
    res.status(400).json({ error: err?.message });
  }
});

apiRouter.get('/databases/collections/:id', (req, res) => {
  const col = dbStore.getCollection(req.params.id);
  if (!col) return res.status(404).json({ error: 'Collection not found' });
  res.json({ collection: col });
});

apiRouter.patch('/databases/collections/:id', (req, res) => {
  const updated = dbStore.updateCollection(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Collection not found' });
  res.json({ collection: updated });
});

apiRouter.delete('/databases/collections/:id', (req, res) => {
  const ok = dbStore.deleteCollection(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Collection not found' });
  res.json({ success: true, message: `Collection ${req.params.id} deleted` });
});

// --- DOCUMENTS CRUD ---
apiRouter.get('/databases/collections/:colId/documents', (req, res) => {
  const col = dbStore.getCollection(req.params.colId);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  const actor = (req as any).actor;
  const access = authService.evaluateAccess(col, 'read', actor);
  if (!access.allowed) {
    return res.status(403).json({ error: access.reason || 'Read access forbidden' });
  }

  const { search, sortBy, sortOrder, limit, offset, filters: filterJson } = req.query;
  let filters;
  if (typeof filterJson === 'string') {
    try {
      filters = JSON.parse(filterJson);
    } catch {
      filters = undefined;
    }
  }

  const result = dbStore.getDocuments(req.params.colId, {
    search: search as string,
    sortBy: sortBy as string,
    sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
    limit: limit ? Number(limit) : 50,
    offset: offset ? Number(offset) : 0,
    filters,
  });

  // Enforce Row-Level Security (RLS) for 'owner' read rules: users only see their own records
  if (col.securityRule?.read === 'owner' && actor && actor.role !== 'admin') {
    result.documents = result.documents.filter(
      (d) => d.createdBy === actor.id || d.data?.userId === actor.id || d.data?.authorId === actor.id
    );
    result.total = result.documents.length;
  }

  res.json(result);
});

apiRouter.post('/databases/collections/:colId/documents', (req, res) => {
  const col = dbStore.getCollection(req.params.colId);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  const actor = (req as any).actor;
  const access = authService.evaluateAccess(col, 'create', actor);
  if (!access.allowed) {
    return res.status(403).json({ error: access.reason || 'Create access forbidden' });
  }

  try {
    const { data, id: customId } = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Document data object is required.' });
    }

    const doc = dbStore.createDocument(
      req.params.colId,
      data,
      actor ? { id: actor.id, name: actor.name, role: actor.role } : undefined,
      customId
    );

    // Trigger Cloud Functions
    functionRunner.executeTrigger('onDocumentCreated', { collection: col, document: doc }, col.id);

    res.status(201).json({ document: doc });
  } catch (err: any) {
    res.status(400).json({ error: err?.message });
  }
});

apiRouter.get('/databases/collections/:colId/documents/:docId', (req, res) => {
  const col = dbStore.getCollection(req.params.colId);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  const doc = dbStore.getDocument(req.params.colId, req.params.docId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const actor = (req as any).actor;
  const access = authService.evaluateAccess(col, 'read', actor, doc);
  if (!access.allowed) {
    return res.status(403).json({ error: access.reason || 'Read access forbidden' });
  }

  res.json({ document: doc });
});

apiRouter.patch('/databases/collections/:colId/documents/:docId', (req, res) => {
  const col = dbStore.getCollection(req.params.colId);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  const existing = dbStore.getDocument(req.params.colId, req.params.docId);
  if (!existing) return res.status(404).json({ error: 'Document not found' });

  const actor = (req as any).actor;
  const access = authService.evaluateAccess(col, 'update', actor, existing);
  if (!access.allowed) {
    return res.status(403).json({ error: access.reason || 'Update access forbidden' });
  }

  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Updates data object is required.' });
  }

  const updated = dbStore.updateDocument(
    req.params.colId,
    req.params.docId,
    data,
    actor ? { id: actor.id, name: actor.name, role: actor.role } : undefined
  );

  if (!updated) return res.status(404).json({ error: 'Document update failed' });

  functionRunner.executeTrigger('onDocumentUpdated', { collection: col, document: updated }, col.id);

  res.json({ document: updated });
});

apiRouter.delete('/databases/collections/:colId/documents/:docId', (req, res) => {
  const col = dbStore.getCollection(req.params.colId);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  const existing = dbStore.getDocument(req.params.colId, req.params.docId);
  if (!existing) return res.status(404).json({ error: 'Document not found' });

  const actor = (req as any).actor;
  const access = authService.evaluateAccess(col, 'delete', actor, existing);
  if (!access.allowed) {
    return res.status(403).json({ error: access.reason || 'Delete access forbidden' });
  }

  const ok = dbStore.deleteDocument(
    req.params.colId,
    req.params.docId,
    actor ? { id: actor.id, name: actor.name, role: actor.role } : undefined
  );

  if (!ok) return res.status(404).json({ error: 'Document not found' });

  functionRunner.executeTrigger('onDocumentDeleted', { collection: col, documentId: req.params.docId }, col.id);

  res.json({ success: true, message: `Document ${req.params.docId} deleted` });
});

// --- STORAGE ---
apiRouter.get('/storage/buckets', (req, res) => {
  res.json({ buckets: dbStore.getBuckets() });
});

apiRouter.post('/storage/buckets', (req, res) => {
  const { name, isPublic, maxFileSizeMb } = req.body;
  if (!name) return res.status(400).json({ error: 'Bucket name is required' });
  const bucket = dbStore.createBucket(name, isPublic, maxFileSizeMb);
  res.status(201).json({ bucket });
});

apiRouter.get('/storage/buckets/:bucketId/files', (req, res) => {
  res.json({ files: dbStore.getFiles(req.params.bucketId) });
});

apiRouter.post('/storage/buckets/:bucketId/files', (req, res) => {
  const { name, sizeBytes, mimeType, url } = req.body;
  if (!name) return res.status(400).json({ error: 'File name is required' });
  const actor = (req as any).actor;
  try {
    const file = dbStore.uploadFile(
      req.params.bucketId,
      name,
      sizeBytes || 1024,
      mimeType || 'application/octet-stream',
      url,
      actor?.id
    );
    res.status(201).json({ file });
  } catch (err: any) {
    res.status(400).json({ error: err?.message });
  }
});

apiRouter.delete('/storage/buckets/:bucketId/files/:fileId', (req, res) => {
  const ok = dbStore.deleteFile(req.params.bucketId, req.params.fileId);
  if (!ok) return res.status(404).json({ error: 'File not found' });
  res.json({ success: true });
});

// --- FUNCTIONS ---
apiRouter.get('/functions', (req, res) => {
  res.json({ functions: dbStore.getFunctions() });
});

apiRouter.post('/functions', (req, res) => {
  const { id, name, trigger, targetCollection, code, enabled } = req.body;
  if (!name || !trigger) return res.status(400).json({ error: 'Name and trigger are required' });

  const fn = dbStore.createFunction({
    id: id || 'fn_' + Math.random().toString(36).substring(2, 9),
    name,
    trigger,
    targetCollection,
    code: code || '// Serverless Micro-Hook\nexport default async function (event, context) {\n  console.log(event);\n}',
    enabled: enabled !== undefined ? enabled : true,
  });
  res.status(201).json({ function: fn });
});

apiRouter.post('/functions/:id/run', async (req, res) => {
  try {
    const result = await functionRunner.runFunctionManually(req.params.id, req.body.payload || {});
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message });
  }
});

apiRouter.patch('/functions/:id/toggle', (req, res) => {
  const fn = dbStore.toggleFunction(req.params.id, Boolean(req.body.enabled));
  if (!fn) return res.status(404).json({ error: 'Function not found' });
  res.json({ function: fn });
});

apiRouter.delete('/functions/:id', (req, res) => {
  const ok = dbStore.deleteFunction(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Function not found' });
  res.json({ success: true });
});

// --- AUDIT LOGS & STATS ---
apiRouter.get('/logs', (req, res) => {
  res.json({ logs: dbStore.auditLogs.slice(0, 100) });
});

apiRouter.get('/stats/overview', (req, res) => {
  const collections = dbStore.getCollections();
  const totalDocs = collections.reduce((acc, c) => acc + (c.documentCount || 0), 0);
  const buckets = dbStore.getBuckets();
  const totalFiles = buckets.reduce((acc, b) => acc + b.fileCount, 0);
  const realtime = realtimeEngine.getStats();

  res.json({
    metrics: {
      totalUsers: dbStore.users.size,
      totalCollections: collections.length,
      totalDocuments: totalDocs,
      totalBuckets: buckets.length,
      totalFiles,
      activeRealtimeStreams: realtime.activeConnections,
      totalEventsBroadcast: realtime.totalEventsBroadcast,
      auditLogCount: dbStore.auditLogs.length,
      serverUptimeSec: Math.floor(process.uptime()),
    },
    recentEvents: realtime.recentEvents.slice(0, 10),
  });
});

apiRouter.post('/system/reset-demo', (req, res) => {
  // Re-instantiate clean store
  dbStore.collections.clear();
  dbStore.documents.clear();
  dbStore.users.clear();
  dbStore.storageBuckets.clear();
  dbStore.storageFiles.clear();
  dbStore.cloudFunctions.clear();
  (dbStore as any).seedInitialData();

  dbStore.logAudit('SYSTEM_RESET', 'system', 'warning', 'Reset demonstration database and sample collections');
  res.json({ success: true, message: 'Database refreshed to initial state' });
});

apiRouter.get('/system/export-backup', (req, res) => {
  const backup = {
    exportedAt: new Date().toISOString(),
    project: dbStore.projectSettings,
    collections: Array.from(dbStore.collections.values()),
    documents: Object.fromEntries(dbStore.documents),
    users: Array.from(dbStore.users.values()),
    buckets: Array.from(dbStore.storageBuckets.values()),
    files: Object.fromEntries(dbStore.storageFiles),
    functions: Array.from(dbStore.cloudFunctions.values()),
  };
  res.setHeader('Content-Disposition', 'attachment; filename="freesync-backup.json"');
  res.json(backup);
});

apiRouter.post('/system/import-backup', (req, res) => {
  try {
    const backup = req.body;
    if (!backup || !backup.collections) {
      return res.status(400).json({ error: 'Invalid backup JSON payload' });
    }

    if (backup.collections) {
      dbStore.collections.clear();
      backup.collections.forEach((c: any) => dbStore.collections.set(c.id, c));
    }
    if (backup.documents) {
      dbStore.documents.clear();
      Object.entries(backup.documents).forEach(([k, v]) => dbStore.documents.set(k, v as any));
    }
    if (backup.users) {
      dbStore.users.clear();
      backup.users.forEach((u: any) => dbStore.users.set(u.id, u));
    }

    dbStore.logAudit('SYSTEM_IMPORT', 'system', 'success', 'Imported data snapshot backup');
    res.json({ success: true, message: 'Backup restored successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err?.message });
  }
});
