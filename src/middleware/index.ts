import { defineMiddleware } from "astro:middleware";

import { supabaseClient } from "@/db/supabase.client";
import { SkiSpecService } from "@/lib/services/SkiSpecService";

export const onRequest = defineMiddleware((context, next) => {
  context.locals.skiSpecService = new SkiSpecService(supabaseClient);

  // Mock authentication - TODO: Replace with actual Supabase auth
  context.locals.userId = "2be2c57e-3845-4579-9a60-c872cbfb9886";

  return next();
});
