export type UserRole = 'admin' | 'member' | 'guest' | 'service_role';

export interface User {
  id: string;
  email?: string;
  name: string;
  role: UserRole;
  isAnonymous: boolean;
  emailVerified: boolean;
  status: 'active' | 'disabled' | 'pending';
  avatarUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: string;
  createdAt: string;
}

export interface MagicLinkToken {
  token: string;
  email: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export type FieldType = 'string' | 'number' | 'boolean' | 'json' | 'array' | 'datetime' | 'relation';

export interface SchemaField {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  unique?: boolean;
  defaultValue?: any;
  relationCollection?: string; // target collection if type === 'relation'
  description?: string;
}

export interface SecurityRule {
  id: string;
  collectionId: string;
  read: 'public' | 'authenticated' | 'owner' | 'admin' | 'custom';
  create: 'public' | 'authenticated' | 'owner' | 'admin' | 'custom';
  update: 'public' | 'authenticated' | 'owner' | 'admin' | 'custom';
  delete: 'public' | 'authenticated' | 'owner' | 'admin' | 'custom';
  customCondition?: string; // e.g. "auth.role == 'manager' || doc.authorId == auth.uid"
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  fields: SchemaField[];
  securityRule: SecurityRule;
  createdAt: string;
  updatedAt: string;
  documentCount?: number;
}

export interface Document {
  id: string;
  collectionId: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type RealtimeEventType =
  | 'document.created'
  | 'document.updated'
  | 'document.deleted'
  | 'user.registered'
  | 'user.signed_in'
  | 'user.updated'
  | 'function.executed'
  | 'storage.uploaded'
  | 'presence.join'
  | 'presence.leave'
  | 'custom.event';

export interface RealtimeEvent {
  id: string;
  type: RealtimeEventType;
  channel: string;
  collectionId?: string;
  documentId?: string;
  payload: any;
  actor?: {
    id: string;
    name: string;
    role: string;
  };
  timestamp: string;
}

export interface StorageBucket {
  id: string;
  name: string;
  isPublic: boolean;
  allowedMimeTypes: string[];
  maxFileSizeMb: number;
  fileCount: number;
  totalSizeKb: number;
  createdAt: string;
}

export interface StorageFile {
  id: string;
  bucketId: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  url: string;
  uploadedBy?: string;
  createdAt: string;
}

export interface CloudFunction {
  id: string;
  name: string;
  trigger: 'onDocumentCreated' | 'onDocumentUpdated' | 'onDocumentDeleted' | 'onUserRegister' | 'webhook';
  targetCollection?: string;
  code: string;
  enabled: boolean;
  executionCount: number;
  lastExecutedAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  category: 'auth' | 'database' | 'realtime' | 'storage' | 'functions' | 'system';
  status: 'success' | 'warning' | 'error';
  details: string;
  meta?: any;
  ip?: string;
  timestamp: string;
}

export interface ProjectSettings {
  id: string;
  name: string;
  publishableKey: string;
  secretKey: string;
  allowAnonymousAuth: boolean;
  allowEmailPasswordAuth: boolean;
  allowMagicLinkAuth: boolean;
  jwtExpiryHours: number;
  rateLimitPerMinute: number;
  createdAt: string;
}

export interface RealtimeClientConnection {
  id: string;
  ip: string;
  connectedAt: string;
  channels: string[];
  clientId?: string;
  clientName?: string;
}

export interface QueryFilter {
  field: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'in';
  value: any;
}
