// vite.config.js
// -----------------------------------------------------------------------
// Vite is the tool that runs our React app during development and
// bundles it for production. This config just registers the React
// plugin - you rarely need to touch this file as a fresher.
// -----------------------------------------------------------------------
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
