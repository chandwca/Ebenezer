import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../database/database.types.js';

export const applicationSchema = 'ebenezer_api' as const;
export type UserScopedSupabaseClient = SupabaseClient<Database, typeof applicationSchema>;
