/// <reference types="astro/client" />

import type { SkiSpecService } from "@/lib/services/SkiSpecService";

declare global {
  namespace App {
    interface Locals {
      skiSpecService: SkiSpecService;
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
