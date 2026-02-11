import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_SERVER_URL": JSON.stringify(
      process.env.VITE_SERVER_URL || "ws://localhost:2567"
    ),
    "import.meta.env.VITE_PLAYER_URL": JSON.stringify(
      process.env.VITE_PLAYER_URL || "http://localhost:3001"
    ),
  },
});
