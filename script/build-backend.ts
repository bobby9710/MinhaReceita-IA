import { build as esbuild } from "esbuild";
import { readFile } from "fs/promises";

const allowlist = [
  "connect-pg-simple",
  "cors",
  "drizzle-orm",
  "express",
  "express-session",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "ws",
  "zod",
];

async function buildBackend() {
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    outfile: "dist/index.cjs",
    platform: "node",
    bundle: true,
    format: "cjs",
    define: { "process.env.NODE_ENV": '"production"' },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildBackend().catch((err) => {
  console.error(err);
  process.exit(1);
});
