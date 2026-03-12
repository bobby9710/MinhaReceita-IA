import express, { type Express } from "express";
import fs from "fs";
import path from "path";

function resolveDistPath() {
  const candidates = [
    path.resolve(__dirname, "public"),
    path.resolve(__dirname, "../dist/public"),
    path.resolve(process.cwd(), "dist/public"),
  ];

  const distPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!distPath) {
    throw new Error(
      `Could not find the build directory. Tried: ${candidates.join(", ")}. Make sure to build the client first`,
    );
  }

  return distPath;
}

export function serveStatic(app: Express) {
  const distPath = resolveDistPath();

  app.use(express.static(distPath));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
