import { createClient } from '@supabase/supabase-js';
import { User, UserRole } from '../types/baas';

const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

export const SUPABASE_URL: string =
  env.VITE_SUPABASE_URL || 'https://qloqkizzrwatgolnmqlx.supabase.co';
export const SUPABASE_ANON_KEY: string =
  env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_7ltjDS9yqrFPwWD6G-AoxA_DeNX6o4s';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Maps a Supabase Auth User + Session to our internal BaaS User model
 */
export function mapSupabaseUserToBaasUser(
  sbUser: any,
  role: UserRole = 'member'
): User {
  const metadata = sbUser.user_metadata || {};
  const name =
    metadata.full_name ||
    metadata.name ||
    sbUser.email?.split('@')[0] ||
    'Developer';

  return {
    id: sbUser.id,
    email: sbUser.email || '',
    name: name,
    role: (metadata.role as UserRole) || role,
    isAnonymous: false,
    emailVerified: Boolean(sbUser.email_confirmed_at || sbUser.confirmed_at),
    status: 'active',
    avatarUrl:
      metadata.avatar_url ||
      `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(sbUser.id)}`,
    createdAt: sbUser.created_at || new Date().toISOString(),
    updatedAt: sbUser.updated_at || new Date().toISOString(),
    lastLoginAt: sbUser.last_sign_in_at || new Date().toISOString(),
  };
}
