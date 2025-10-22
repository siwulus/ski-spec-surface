/// <reference types="astro/client" />

import type { SkiSpecService } from "@/lib/services/SkiSpecService";
import type { Session, User } from "@supabase/supabase-js";

declare global {
  namespace App {
    interface Locals {
      skiSpecService: SkiSpecService;
      supabase: SupabaseClient<Database>;
      userId: string;
      /** User session from Supabase Auth (set by middleware) */
      session: Session | null;
      /** User object from Supabase Auth (set by middleware) */
      user: User | null;
    }
  }
}

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_KEY: string;
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
