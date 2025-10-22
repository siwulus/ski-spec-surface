import { createServerClient, parseCookieHeader, type CookieMethodsServer } from "@supabase/ssr";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.ts";
import type { AstroCookies } from "astro";

export const createSupabaseServerClient = (context: {
  headers: Headers;
  cookies: AstroCookies;
}): SupabaseClient<Database> => {
  const supabase = createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    } as CookieMethodsServer,
  });

  return supabase;
};
