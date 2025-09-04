import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export interface CreateInstagramUserParams {
  username: string;
  display_name?: string;
  bio?: string;
  location?: string;
  discovered_through?: string;
  company_id?: string;
  person_id?: string;
}

/**
 * Creates or gets an existing Instagram user using the database function.
 * This ensures no duplicates and handles username normalization.
 */
export async function createOrGetInstagramUser(
  supabase: SupabaseClient<Database>,
  params: CreateInstagramUserParams
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_or_get_instagram_user', {
      username_param: params.username,
      display_name_param: params.display_name || null,
      bio_param: params.bio || null,
      location_param: params.location || null,
      discovered_through_param: params.discovered_through || 'comment',
      company_id_param: params.company_id || null,
      person_id_param: params.person_id || null
    });

    if (error) {
      console.error('Error creating/getting Instagram user:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to create or get Instagram user:', error);
    return null;
  }
}

/**
 * Normalizes a username by removing @ symbol and trimming whitespace
 */
export function normalizeUsername(username: string): string {
  return username.replace(/^@+/, '').trim();
}