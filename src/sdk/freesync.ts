import { Document, QueryFilter, RealtimeEvent, User } from '../types/baas';

export interface ClientConfig {
  endpoint?: string;
  publishableKey?: string;
  token?: string;
}

export class FreeSyncClient {
  public endpoint: string;
  public publishableKey?: string;
  public token?: string;
  private currentUser: User | null = null;

  constructor(config: ClientConfig = {}) {
    this.endpoint = config.endpoint || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    this.publishableKey = config.publishableKey;
    this.token = config.token || (typeof localStorage !== 'undefined' ? localStorage.getItem('fs_auth_token') || undefined : undefined);
  }

  public setToken(token: string | null) {
    this.token = token || undefined;
    if (typeof localStorage !== 'undefined') {
      if (token) localStorage.setItem('fs_auth_token', token);
      else localStorage.removeItem('fs_auth_token');
    }
  }

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.endpoint}/api/v1${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (this.publishableKey) {
      headers['x-freesync-key'] = this.publishableKey;
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP error ${res.status}`);
    }
    return data;
  }

  // --- AUTH MODULE ---
  public auth = {
    signUp: async (email: string, password: string, name?: string) => {
      const res = await this.fetch<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      });
      this.setToken(res.token);
      this.currentUser = res.user;
      return res;
    },

    signIn: async (email: string, password: string) => {
      const res = await this.fetch<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      this.setToken(res.token);
      this.currentUser = res.user;
      return res;
    },

    signInAnonymous: async (name?: string) => {
      const res = await this.fetch<{ user: User; token: string }>('/auth/anonymous', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      this.setToken(res.token);
      this.currentUser = res.user;
      return res;
    },

    createMagicLink: async (email: string) => {
      return this.fetch<{ token: string; magicLinkUrl: string; expiresAt: string }>('/auth/magic-link/create', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    verifyMagicLink: async (token: string) => {
      const res = await this.fetch<{ user: User; token: string }>(`/auth/magic-link/verify?token=${encodeURIComponent(token)}`);
      this.setToken(res.token);
      this.currentUser = res.user;
      return res;
    },

    getUser: async () => {
      if (!this.token) return null;
      try {
        const res = await this.fetch<{ user: User }>('/auth/me');
        this.currentUser = res.user;
        return res.user;
      } catch {
        this.setToken(null);
        this.currentUser = null;
        return null;
      }
    },

    signOut: () => {
      this.setToken(null);
      this.currentUser = null;
    },
  };

  // --- DATABASE MODULE ---
  public database = {
    collection: (collectionId: string) => ({
      list: async (params?: {
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        limit?: number;
        offset?: number;
        filters?: QueryFilter[];
      }) => {
        const query = new URLSearchParams();
        if (params?.search) query.set('search', params.search);
        if (params?.sortBy) query.set('sortBy', params.sortBy);
        if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.offset) query.set('offset', String(params.offset));
        if (params?.filters) query.set('filters', JSON.stringify(params.filters));

        return this.fetch<{ documents: Document[]; total: number }>(
          `/databases/collections/${collectionId}/documents?${query.toString()}`
        );
      },

      get: async (docId: string) => {
        return this.fetch<{ document: Document }>(`/databases/collections/${collectionId}/documents/${docId}`);
      },

      create: async (data: Record<string, any>, customId?: string) => {
        return this.fetch<{ document: Document }>(`/databases/collections/${collectionId}/documents`, {
          method: 'POST',
          body: JSON.stringify({ data, id: customId }),
        });
      },

      update: async (docId: string, data: Record<string, any>) => {
        return this.fetch<{ document: Document }>(`/databases/collections/${collectionId}/documents/${docId}`, {
          method: 'PATCH',
          body: JSON.stringify({ data }),
        });
      },

      delete: async (docId: string) => {
        return this.fetch<{ success: boolean; message: string }>(`/databases/collections/${collectionId}/documents/${docId}`, {
          method: 'DELETE',
        });
      },

      // Live subscription helper on this collection
      subscribe: (onEvent: (event: RealtimeEvent) => void) => {
        return this.realtime.subscribe([`collections.${collectionId}`], onEvent);
      },
    }),
  };

  // --- REALTIME SYNC ENGINE ---
  public realtime = {
    subscribe: (
      channels: string[] = ['*'],
      onEvent: (event: RealtimeEvent) => void,
      onError?: (err: any) => void,
      clientName?: string
    ): (() => void) => {
      if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
        return () => {};
      }

      const clientId = 'c_' + Math.random().toString(36).substring(2, 9);
      const query = new URLSearchParams({
        clientId,
        channels: channels.join(','),
      });
      if (clientName) query.set('clientName', clientName);

      const url = `${this.endpoint}/api/v1/realtime/subscribe?${query.toString()}`;
      const eventSource = new EventSource(url);

      const eventTypes = [
        'document.created',
        'document.updated',
        'document.deleted',
        'user.registered',
        'user.updated',
        'function.executed',
        'storage.uploaded',
        'presence.join',
        'presence.leave',
        'custom.event',
      ];

      eventTypes.forEach((type) => {
        eventSource.addEventListener(type, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            onEvent(data);
          } catch (err) {
            console.error('Failed to parse SSE event data', err);
          }
        });
      });

      // Handle ping
      eventSource.addEventListener('ping', () => {
        // keepalive
      });

      eventSource.onerror = (err) => {
        if (onError) onError(err);
      };

      // Return unsubscribe closure
      return () => {
        eventSource.close();
      };
    },

    broadcast: async (channel: string, payload: any, type = 'custom.event') => {
      return this.fetch<{ event: RealtimeEvent }>('/realtime/broadcast', {
        method: 'POST',
        body: JSON.stringify({ channel, payload, type }),
      });
    },
  };

  // --- STORAGE ---
  public storage = {
    bucket: (bucketId: string) => ({
      listFiles: async () => {
        return this.fetch<{ files: any[] }>(`/storage/buckets/${bucketId}/files`);
      },
      upload: async (name: string, sizeBytes: number, mimeType: string, url?: string) => {
        return this.fetch<{ file: any }>(`/storage/buckets/${bucketId}/files`, {
          method: 'POST',
          body: JSON.stringify({ name, sizeBytes, mimeType, url }),
        });
      },
      delete: async (fileId: string) => {
        return this.fetch<{ success: boolean }>(`/storage/buckets/${bucketId}/files/${fileId}`, {
          method: 'DELETE',
        });
      },
    }),
  };

  // --- FUNCTIONS ---
  public functions = {
    invoke: async (functionId: string, payload: any = {}) => {
      return this.fetch<{ success: boolean; result: any; logs: string[] }>(`/functions/${functionId}/run`, {
        method: 'POST',
        body: JSON.stringify({ payload }),
      });
    },
  };
}

// Export singleton default instance for easy consumption
export const freesync = new FreeSyncClient();
