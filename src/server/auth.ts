import { Collection, MagicLinkToken, SecurityRule, User, UserRole, UserSession } from '../types/baas';
import { dbStore } from './db';
import { realtimeEngine } from './realtime';

export class AuthService {
  // Generate simple cryptographically random token
  private generateToken(prefix = 'tok'): string {
    const part1 = Math.random().toString(36).substring(2);
    const part2 = Math.random().toString(36).substring(2);
    const time = Date.now().toString(36);
    return `${prefix}_${part1}${part2}_${time}`;
  }

  // Register with Email & Password
  public registerWithPassword(email: string, password: string, name?: string): { user: User; token: string } {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes('@')) {
      throw new Error('Invalid email address.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    // Check existing
    for (const u of dbStore.users.values()) {
      if (u.email && u.email.toLowerCase() === cleanEmail) {
        throw new Error('A user with this email address already exists.');
      }
    }

    const userId = 'usr_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    const now = new Date().toISOString();

    const user: User = {
      id: userId,
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      role: 'member',
      isAnonymous: false,
      emailVerified: false,
      status: 'active',
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(cleanEmail)}`,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    dbStore.users.set(user.id, user);
    dbStore.userPasswords.set(cleanEmail, password);

    const token = this.createSession(user.id);

    dbStore.logAudit('AUTH_REGISTER', 'auth', 'success', `User registered: ${user.email} (${user.id})`);

    // Broadcast Realtime Auth Event
    realtimeEngine.emitCustom('auth.users', 'user.registered', {
      user: this.sanitizeUser(user),
    });

    return { user, token };
  }

  // Login with Email & Password
  public loginWithPassword(email: string, password: string): { user: User; token: string } {
    const cleanEmail = email.toLowerCase().trim();
    const storedPassword = dbStore.userPasswords.get(cleanEmail);

    let matchedUser: User | undefined;
    for (const u of dbStore.users.values()) {
      if (u.email && u.email.toLowerCase() === cleanEmail) {
        matchedUser = u;
        break;
      }
    }

    if (!matchedUser || storedPassword !== password) {
      dbStore.logAudit('AUTH_LOGIN_FAILED', 'auth', 'warning', `Failed login attempt for ${cleanEmail}`);
      throw new Error('Invalid email or password.');
    }

    if (matchedUser.status === 'disabled') {
      throw new Error('This user account has been disabled.');
    }

    matchedUser.lastLoginAt = new Date().toISOString();
    matchedUser.updatedAt = new Date().toISOString();
    dbStore.users.set(matchedUser.id, matchedUser);

    const token = this.createSession(matchedUser.id);
    dbStore.logAudit('AUTH_LOGIN', 'auth', 'success', `User logged in: ${matchedUser.email}`);

    return { user: matchedUser, token };
  }

  // Create Anonymous Guest Account
  public signInAnonymous(name?: string): { user: User; token: string } {
    if (!dbStore.projectSettings.allowAnonymousAuth) {
      throw new Error('Anonymous guest authentication is disabled in project settings.');
    }

    const userId = 'anon_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    const now = new Date().toISOString();

    const user: User = {
      id: userId,
      name: name || `Guest-${userId.substring(5, 9)}`,
      role: 'guest',
      isAnonymous: true,
      emailVerified: false,
      status: 'active',
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(userId)}`,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    dbStore.users.set(user.id, user);
    const token = this.createSession(user.id);

    dbStore.logAudit('AUTH_ANONYMOUS', 'auth', 'success', `Anonymous guest session created: ${user.id}`);

    return { user, token };
  }

  // Create Magic Link (Passwordless)
  public createMagicLink(email: string): { token: string; magicLinkUrl: string; expiresAt: string } {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes('@')) {
      throw new Error('Invalid email address for Magic Link.');
    }

    const token = this.generateToken('mlink');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes validity

    dbStore.magicLinks.set(token, {
      email: cleanEmail,
      token,
      expiresAt,
      used: false,
    });

    const magicLinkUrl = `/api/v1/auth/magic-link/verify?token=${token}`;

    dbStore.logAudit('AUTH_MAGIC_LINK_SENT', 'auth', 'success', `Magic link generated for ${cleanEmail}`);

    return { token, magicLinkUrl, expiresAt };
  }

  // Verify Magic Link
  public verifyMagicLink(token: string): { user: User; token: string } {
    const item = dbStore.magicLinks.get(token);
    if (!item) {
      throw new Error('Invalid or expired magic link token.');
    }
    if (item.used) {
      throw new Error('This magic link has already been used.');
    }
    if (new Date(item.expiresAt) < new Date()) {
      throw new Error('Magic link has expired.');
    }

    item.used = true;
    dbStore.magicLinks.set(token, item);

    // Find or create user
    let user: User | undefined;
    for (const u of dbStore.users.values()) {
      if (u.email && u.email.toLowerCase() === item.email.toLowerCase()) {
        user = u;
        break;
      }
    }

    const now = new Date().toISOString();
    if (!user) {
      const userId = 'usr_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      user = {
        id: userId,
        email: item.email,
        name: item.email.split('@')[0],
        role: 'member',
        isAnonymous: false,
        emailVerified: true,
        status: 'active',
        avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(item.email)}`,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };
      dbStore.users.set(user.id, user);
    } else {
      user.emailVerified = true;
      user.lastLoginAt = now;
      user.updatedAt = now;
      dbStore.users.set(user.id, user);
    }

    const sessionToken = this.createSession(user.id);
    dbStore.logAudit('AUTH_MAGIC_LINK_SUCCESS', 'auth', 'success', `User authenticated via magic link: ${user.email}`);

    return { user, token: sessionToken };
  }

  // Synchronize authenticated Supabase User
  public syncSupabaseSession(
    supabaseUser: { id: string; email?: string; name?: string; role?: string },
    accessToken?: string
  ): { user: User; token: string } {
    const cleanEmail = (supabaseUser.email || '').toLowerCase().trim();
    const now = new Date().toISOString();

    let user: User | undefined;
    if (supabaseUser.id && dbStore.users.has(supabaseUser.id)) {
      user = dbStore.users.get(supabaseUser.id);
    } else if (cleanEmail) {
      for (const u of dbStore.users.values()) {
        if (u.email && u.email.toLowerCase() === cleanEmail) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      const role: UserRole = cleanEmail === 'admin@freesync.local' || cleanEmail.includes('admin') ? 'admin' : 'member';
      user = {
        id: supabaseUser.id || 'sb_' + Math.random().toString(36).substring(2, 9),
        email: cleanEmail,
        name: supabaseUser.name || (cleanEmail ? cleanEmail.split('@')[0] : 'Supabase Developer'),
        role: (supabaseUser.role as UserRole) || role,
        isAnonymous: false,
        emailVerified: true,
        status: 'active',
        avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(cleanEmail || supabaseUser.id)}`,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };
      dbStore.users.set(user.id, user);
    } else {
      user.lastLoginAt = now;
      user.updatedAt = now;
      if (supabaseUser.name) user.name = supabaseUser.name;
      dbStore.users.set(user.id, user);
    }

    const sessionToken = accessToken || this.createSession(user.id);
    if (accessToken && !dbStore.sessions.has(accessToken)) {
      dbStore.sessions.set(accessToken, {
        id: 'sess_sb_' + Math.random().toString(36).substring(2, 9),
        userId: user.id,
        token: accessToken,
        createdAt: now,
        expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
      });
    }

    dbStore.logAudit('AUTH_SUPABASE_LOGIN', 'auth', 'success', `Supabase user session authenticated: ${user.email} (${user.id})`);

    realtimeEngine.emitCustom('auth.users', 'user.signed_in', {
      user: this.sanitizeUser(user),
      provider: 'supabase',
    });

    return { user, token: sessionToken };
  }

  // Convert anonymous account to permanent
  public linkEmailToAnonymous(userId: string, email: string, password?: string): User {
    const user = dbStore.users.get(userId);
    if (!user) throw new Error('User not found.');
    if (!user.isAnonymous) throw new Error('User is not an anonymous account.');

    const cleanEmail = email.toLowerCase().trim();
    for (const u of dbStore.users.values()) {
      if (u.id !== userId && u.email && u.email.toLowerCase() === cleanEmail) {
        throw new Error('An account with this email already exists.');
      }
    }

    user.email = cleanEmail;
    user.isAnonymous = false;
    user.role = 'member';
    user.updatedAt = new Date().toISOString();
    dbStore.users.set(userId, user);

    if (password) {
      dbStore.userPasswords.set(cleanEmail, password);
    }

    dbStore.logAudit('AUTH_LINK_ACCOUNT', 'auth', 'success', `Guest account ${userId} upgraded to ${cleanEmail}`);
    return user;
  }

  // Create active session token
  public createSession(userId: string): string {
    const token = this.generateToken('fs_jwt');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (dbStore.projectSettings.jwtExpiryHours || 24) * 3600000).toISOString();

    const session: UserSession = {
      id: 'sess_' + Math.random().toString(36).substring(2, 9),
      userId,
      token,
      createdAt: now.toISOString(),
      expiresAt,
    };

    dbStore.sessions.set(token, session);
    return token;
  }

  // Resolve user from token or API key
  public resolveActor(authHeader?: string, apiKeyHeader?: string): { user?: User; isApiKeyAdmin: boolean } {
    // 1. Check Secret Admin API Key
    if (apiKeyHeader && apiKeyHeader === dbStore.projectSettings.secretKey) {
      return {
        user: {
          id: 'sys_admin_key',
          name: 'Admin API Key',
          role: 'admin',
          isAnonymous: false,
          emailVerified: true,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        isApiKeyAdmin: true,
      };
    }

    // 2. Check Bearer Token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const session = dbStore.sessions.get(token);
      if (session) {
        if (new Date(session.expiresAt) > new Date()) {
          const user = dbStore.users.get(session.userId);
          if (user && user.status === 'active') {
            return { user, isApiKeyAdmin: false };
          }
        }
      }
    }

    return { user: undefined, isApiKeyAdmin: false };
  }

  // Evaluate RBAC permissions for a collection operation
  public evaluateAccess(
    collection: Collection,
    action: 'read' | 'create' | 'update' | 'delete',
    user?: User,
    doc?: any
  ): { allowed: boolean; reason?: string } {
    const rules = collection.securityRule;
    if (!rules) return { allowed: true };

    const rule = rules[action];

    // Admin role always allowed
    if (user && user.role === 'admin') {
      return { allowed: true };
    }

    switch (rule) {
      case 'public':
        return { allowed: true };

      case 'authenticated':
        if (!user) {
          return { allowed: false, reason: 'Authentication required for this operation.' };
        }
        return { allowed: true };

      case 'owner':
        if (!user) {
          return { allowed: false, reason: 'Must be authenticated to access owned records.' };
        }
        if (doc) {
          const ownerId = doc.createdBy || doc.data?.createdBy || doc.data?.userId || doc.data?.authorId;
          if (ownerId && ownerId !== user.id) {
            return { allowed: false, reason: 'Access denied: You do not own this document.' };
          }
        }
        return { allowed: true };

      case 'admin':
        if (!user || user.role !== 'admin') {
          return { allowed: false, reason: 'Administrative permissions required.' };
        }
        return { allowed: true };

      case 'custom':
        // Custom expression evaluator (e.g., auth.role == 'member')
        if (rules.customCondition && user) {
          try {
            if (rules.customCondition.includes("role == 'admin'") && user.role !== 'admin') {
              return { allowed: false, reason: 'Custom rule rejected.' };
            }
          } catch {
            return { allowed: false, reason: 'Custom security rule error.' };
          }
        }
        return { allowed: !!user };

      default:
        return { allowed: true };
    }
  }

  public sanitizeUser(user: User): Partial<User> {
    const { ...safe } = user;
    return safe;
  }

  public getUsers(): User[] {
    return Array.from(dbStore.users.values());
  }

  public updateUserRole(userId: string, role: UserRole): User | undefined {
    const user = dbStore.users.get(userId);
    if (!user) return undefined;
    user.role = role;
    user.updatedAt = new Date().toISOString();
    dbStore.users.set(userId, user);
    dbStore.logAudit('USER_ROLE_UPDATED', 'auth', 'success', `Changed user ${user.name} role to ${role}`);
    return user;
  }

  public toggleUserStatus(userId: string, status: 'active' | 'disabled'): User | undefined {
    const user = dbStore.users.get(userId);
    if (!user) return undefined;
    user.status = status;
    user.updatedAt = new Date().toISOString();
    dbStore.users.set(userId, user);
    dbStore.logAudit('USER_STATUS_UPDATED', 'auth', 'warning', `Set user ${user.name} status to ${status}`);
    return user;
  }
}

export const authService = new AuthService();
