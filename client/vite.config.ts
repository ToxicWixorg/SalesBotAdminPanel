import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/react-router")
            )
              return "vendor";
            if (id.includes("/@tanstack/")) return "query";
            if (id.includes("/framer-motion/")) return "motion";
            if (id.includes("/i18next") || id.includes("/react-i18next"))
              return "i18n";
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
