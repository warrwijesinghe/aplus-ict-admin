import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The production application is served below /admin by the shared Nginx container.
export default defineConfig({
  base: process.env.VITE_PUBLIC_BASE || "/",
  plugins: [react()],
  server: { port: 5174, strictPort: true },
  test: { environment: "jsdom", setupFiles: "./tests/setup.js" },
});
