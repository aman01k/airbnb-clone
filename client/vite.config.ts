import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In development the API runs separately; proxying keeps everything on one
    // origin so the login cookie just works.
    proxy: { "/api": "http://localhost:4000" },
  },
});
