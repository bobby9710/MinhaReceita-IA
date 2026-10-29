import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../server/app";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const requestUrl = new URL(req.url || "/api", `https://${req.headers.host || "localhost"}`);
  const rewrittenPath = requestUrl.searchParams.get("__api_path");
  if (rewrittenPath !== null) {
    requestUrl.searchParams.delete("__api_path");
    const normalizedPath = rewrittenPath.split("/").filter(Boolean).map(encodeURIComponent).join("/");
    const query = requestUrl.searchParams.toString();
    req.url = `/api/${normalizedPath}${query ? `?${query}` : ""}`;
  }
  const app = await createApp();
  return app(req as any, res as any);
}
