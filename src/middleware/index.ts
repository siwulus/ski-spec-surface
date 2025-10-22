import { createSupabaseServerInstance } from "@/db/supabase.client";
import { defineMiddleware } from "astro:middleware";

import { SkiSpecService } from "@/lib/services/SkiSpecService";

// Routes that should only be accessible to guests (not authenticated users)
const GUEST_ONLY_ROUTES = ["/auth/login", "/auth/register"];

// Public paths - Auth API endpoints & Server-Rendered Astro Pages
const PUBLIC_PATHS = [
  // Server-Rendered Astro Pages
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/reset-password",
  // Auth API endpoints
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/reset-password",
];

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });
  locals.skiSpecService = new SkiSpecService(supabase);
  locals.supabase = supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    locals.user = user;
    locals.userId = user.id;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    locals.session = session;
  } else if (!PUBLIC_PATHS.includes(url.pathname)) {
    const redirectUrl = new URL("/auth/login", url);
    redirectUrl.searchParams.set("redirectTo", url.pathname);
    return redirect(redirectUrl.toString());
  }

  if (GUEST_ONLY_ROUTES.some((route) => url.pathname.startsWith(route))) {
    if (user) {
      return redirect("/ski-specs");
    }
  }
  return next();
});
