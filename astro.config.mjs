// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";
import cloudflare from "@astrojs/cloudflare";

// Determine adapter based on environment
// Use Cloudflare adapter for production builds, Node.js for local development
// CF_PAGES=1 is automatically set by Cloudflare Pages
// BUILD_ENV=cloudflare can be set manually for testing
const isProd = process.env.CF_PAGES === "1" || process.env.BUILD_ENV === "cloudflare";
const adapter = isProd
  ? cloudflare({
      imageService: "compile",
    })
  : node({
      mode: "standalone",
    });

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
  },
  adapter,
});
