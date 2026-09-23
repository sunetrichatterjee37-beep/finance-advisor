import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tanstackStart(), nitro(), react(), tailwind()],
  server: { port: 3000, host: "0.0.0.0" },
});
