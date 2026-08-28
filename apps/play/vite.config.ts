import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // react's plugin has to come after start's. `compiler` runs React Compiler
  // through oxc rather than Babel, so the build stays fast.
  // nitro turns the build into the Build Output API layout Vercel serves; it
  // detects the platform itself, so there is no target to pin here.
  plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact({ compiler: true })],
});
