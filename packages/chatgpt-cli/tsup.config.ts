import { defineConfig } from "tsup";

export default defineConfig(() => ({
    entry: ["src/index.ts"],
    outDir: "dist",
    target: "node18",
    format: ["esm"],
    shims: true,
    clean: true,
    splitting: false,
}));
