import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ command, mode }) => {
  // Vite bakes `VITE_*` into the bundle, so a build with no API origin ships a
  // client that calls localhost and tells every visitor the game is
  // unreachable. There is no runtime signal for that, so the build is where it
  // has to fail.
  if (command === "build" && !loadEnv(mode, root, "VITE_").VITE_API_URL) {
    throw new Error("VITE_API_URL is not set — see apps/play/.env.example.");
  }

  return {
    // `@/*` is in tsconfig, which type-checking and the production build honour
    // and the dev server does not. Without this, dev fails on an import the
    // build accepts.
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    // react's plugin has to come after start's. `compiler` runs React Compiler
    // through oxc rather than Babel, so the build stays fast.
    // nitro turns the build into the Build Output API layout Vercel serves; it
    // detects the platform itself, so there is no target to pin here.
    plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact({ compiler: true })],
  };
});
