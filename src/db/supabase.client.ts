import { createServerClient, parseCookieHeader, type CookieMethodsServer } from '@supabase/ssr';

import type { SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';
import type { Database } from './database.types.ts';
import type { AstroCookies } from 'astro';

export type SupabaseClient = SupabaseClientType<Database>;

export const createSupabaseServerClient = (context: { headers: Headers; cookies: AstroCookies }): SupabaseClient => {
  // Validate environment variables
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      `Missing Supabase environment variables. Please configure: ${
        !supabaseUrl ? 'SUPABASE_URL ' : ''
      }${!supabaseKey ? 'PUBLIC_SUPABASE_KEY' : ''}`
    );
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get('Cookie') ?? '');
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    } as CookieMethodsServer,
  });

  return supabase;
};
