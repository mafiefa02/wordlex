import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // react's plugin has to come after start's. `compiler` runs React Compiler
  // through oxc rather than Babel, so the build stays fast.
  plugins: [tailwindcss(), tanstackStart(), viteReact({ compiler: true })],
});
