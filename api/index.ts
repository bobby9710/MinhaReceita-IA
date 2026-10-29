import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../server/app.ts";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
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
  } catch (error) {
    console.error("[vercel-api] Falha ao inicializar o backend:", error);
    if (res.headersSent) return;
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : "Erro desconhecido";
    const mongodbFailure = /mongo|querysrv|server selection|authentication failed|econnrefused|enotfound/i.test(detail);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({
      code: "BACKEND_INIT_FAILED",
      message: mongodbFailure
        ? "A API não conseguiu conectar ao MongoDB Atlas. Verifique MONGODB_URI e o Network Access do Atlas."
        : "A API não conseguiu iniciar. Consulte os Runtime Logs da função na Vercel.",
    }));
  }
}
