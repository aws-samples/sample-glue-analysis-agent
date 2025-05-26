import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    define: {
      // Make env variables available at build time
      'process.env.VITE_REST_API_URL': JSON.stringify(env.VITE_REST_API_URL),
      'process.env.VITE_WEBSOCKET_REALTIME_DNS': JSON.stringify(env.VITE_WEBSOCKET_REALTIME_DNS),
    },
  };
});
