import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/**/*", "!src/**/*.test.*", "!src/**/*.sql"],
  format: ["cjs"],
  outExtensions: () => ({
    js: ".cjs"
  })
});
