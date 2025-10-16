import { defineMiddleware } from "astro:middleware";

import { supabaseClient } from "../db/supabase.client.ts";

export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;

  // Mock authentication - TODO: Replace with actual Supabase auth
  context.locals.userId = "2be2c57e-3845-4579-9a60-c872cbfb9886";

  return next();
});
