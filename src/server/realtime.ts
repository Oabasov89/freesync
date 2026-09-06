import { Response } from 'express';
import { RealtimeClientConnection, RealtimeEvent, RealtimeEventType } from '../types/baas';

interface SSEClient {
  id: string;
  res: Response;
  channels: Set<string>;
  connectedAt: string;
  ip: string;
  clientId?: string;
  clientName?: string;
}

class RealtimeEngine {
  private clients: Map<string, SSEClient> = new Map();
  private eventHistory: RealtimeEvent[] = [];
  private maxHistory = 200;
  private totalEventsBroadcast = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Send heartbeat ping every 15 seconds to keep connections alive
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 15000);
  }

  public registerClient(
    clientId: string,
    res: Response,
    ip: string,
    channels: string[] = ['*'],
    clientName?: string
  ): void {
    const channelSet = new Set(channels.length > 0 ? channels : ['*']);
    const client: SSEClient = {
      id: clientId,
      res,
      channels: channelSet,
      connectedAt: new Date().toISOString(),
      ip,
      clientId,
      clientName: clientName || `Client-${clientId.substring(0, 5)}`,
    };

    this.clients.set(clientId, client);

    // Initial connected handshake message
    this.sendToClient(client, {
      id: 'evt_init_' + Date.now(),
      type: 'presence.join',
      channel: 'system',
      payload: {
        message: 'Connected to FreeSync Realtime Engine',
        clientId: client.id,
        connectedAt: client.connectedAt,
        subscribedChannels: Array.from(client.channels),
        activeConnections: this.clients.size,
      },
      timestamp: new Date().toISOString(),
    });

    // Notify other clients of presence
    this.broadcast({
      id: 'evt_presence_' + Date.now(),
      type: 'presence.join',
      channel: 'presence',
      payload: {
        clientId: client.id,
        clientName: client.clientName,
        totalConnected: this.clients.size,
      },
      timestamp: new Date().toISOString(),
    });
  }

  public unregisterClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      this.broadcast({
        id: 'evt_leave_' + Date.now(),
        type: 'presence.leave',
        channel: 'presence',
        payload: {
          clientId,
          clientName: client.clientName,
          totalConnected: this.clients.size,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  public updateClientChannels(clientId: string, channels: string[]): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;
    client.channels = new Set(channels);
    return true;
  }

  public broadcast(event: RealtimeEvent): void {
    this.totalEventsBroadcast++;
    this.eventHistory.unshift(event);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.pop();
    }

    const payloadString = JSON.stringify(event);

    this.clients.forEach((client) => {
      // Check channel subscription match
      // Subscribed to all ('*'), or exact match, or wildcard prefix match (e.g. "collections.*" matches "collections.tasks")
      let matches = client.channels.has('*') || client.channels.has(event.channel);
      if (!matches) {
        for (const sub of client.channels) {
          if (sub.endsWith('*')) {
            const prefix = sub.slice(0, -1);
            if (event.channel.startsWith(prefix)) {
              matches = true;
              break;
            }
          }
        }
      }

      if (matches) {
        try {
          client.res.write(`event: ${event.type}\n`);
          client.res.write(`data: ${payloadString}\n\n`);
        } catch (err) {
          // Connection likely closed
          this.unregisterClient(client.id);
        }
      }
    });
  }

  public emitCustom(
    channel: string,
    type: RealtimeEventType,
    payload: any,
    actor?: { id: string; name: string; role: string },
    collectionId?: string,
    documentId?: string
  ): RealtimeEvent {
    const event: RealtimeEvent = {
      id: 'evt_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      type,
      channel,
      collectionId,
      documentId,
      payload,
      actor,
      timestamp: new Date().toISOString(),
    };
    this.broadcast(event);
    return event;
  }

  private sendToClient(client: SSEClient, event: RealtimeEvent): void {
    try {
      client.res.write(`event: ${event.type}\n`);
      client.res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      this.unregisterClient(client.id);
    }
  }

  private sendHeartbeat(): void {
    const pingData = JSON.stringify({
      ping: true,
      time: new Date().toISOString(),
      connections: this.clients.size,
    });
    this.clients.forEach((client) => {
      try {
        client.res.write(`event: ping\n`);
        client.res.write(`data: ${pingData}\n\n`);
      } catch {
        this.unregisterClient(client.id);
      }
    });
  }

  public getStats() {
    return {
      activeConnections: this.clients.size,
      totalEventsBroadcast: this.totalEventsBroadcast,
      recentEvents: this.eventHistory.slice(0, 30),
      connectedClients: Array.from(this.clients.values()).map(
        (c): RealtimeClientConnection => ({
          id: c.id,
          ip: c.ip,
          connectedAt: c.connectedAt,
          channels: Array.from(c.channels),
          clientId: c.clientId,
          clientName: c.clientName,
        })
      ),
    };
  }
}

export const realtimeEngine = new RealtimeEngine();
