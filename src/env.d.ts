/// <reference types="astro/client" />

import type { SkiSpecService } from "@/lib/services/SkiSpecService";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";

declare global {
  namespace App {
    interface Locals {
      skiSpecService: SkiSpecService;
      supabase: SupabaseClient<Database>;
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
