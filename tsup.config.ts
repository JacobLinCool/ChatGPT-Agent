import { defineConfig } from "tsup";

export default defineConfig(() => ({
    entry: ["src/index.ts"],
    outDir: "dist",
    target: "node18",
    format: ["cjs"],
    shims: true,
    clean: true,
    splitting: false,
}));
