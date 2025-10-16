/// <reference types="astro/client" />

import type { supabaseClient } from "@/db/supabase.client.ts";

declare global {
  namespace App {
    interface Locals {
      supabase: typeof supabaseClient;
      userId: string;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
