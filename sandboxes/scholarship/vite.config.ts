import { fileURLToPath } from "node:url";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const directory = fileURLToPath(new URL("./", import.meta.url));
export default defineConfig({
  root: directory,
  base: "./",
  envDir: false,
  plugins: [tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) },
  },
  build: {
    outDir: process.env.REENTRY_TEST_FIXTURE_DIR
      ? path.join(process.env.REENTRY_TEST_FIXTURE_DIR, "portal")
      : path.resolve(directory, "../../.runtime/sites"),
    emptyOutDir: true,
    rolldownOptions: {
      onwarn(warning, warn) {
        // This is a client-only static portal, so RSC boundaries are irrelevant.
        if (
          warning.code === "MODULE_LEVEL_DIRECTIVE" &&
          warning.message.includes('"use client"')
        )
          return;
        warn(warning);
      },
      input: {
        instructions: path.join(directory, "instructions.html"),
        application: path.join(directory, "application.html"),
      },
    },
  },
});
