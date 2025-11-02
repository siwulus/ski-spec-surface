/// <reference types="astro/client" />

import type { SkiSpecService } from '@/lib/services/SkiSpecService';
import type { SkiSpecImportExportService } from '@/lib/services/SkiSpecImportExportService';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '@/db/database.types';

declare global {
  namespace App {
    interface Locals {
      skiSpecService: SkiSpecService;
      skiSpecImportExportService: SkiSpecImportExportService;
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
  readonly OPENROUTER_API_KEY?: string;
  // Build-time environment variables (for config files)
  readonly CF_PAGES?: string;
  readonly BUILD_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Node.js process.env types for build-time config files
declare namespace NodeJS {
  interface ProcessEnv {
    readonly SUPABASE_URL: string;
    readonly SUPABASE_KEY: string;
    readonly PUBLIC_SUPABASE_URL: string;
    readonly PUBLIC_SUPABASE_KEY: string;
    readonly OPENROUTER_API_KEY?: string;
    // Build-time flags
    readonly CF_PAGES?: string;
    readonly BUILD_ENV?: string;
  }
}
