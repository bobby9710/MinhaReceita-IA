import type { IncomingMessage, ServerResponse } from "http";
// Gerado por `npm run build` antes de a Vercel empacotar esta função.
// @ts-expect-error O artefato CommonJS não possui declaração de tipos.
import vercelBundle from "../dist/vercel.cjs";

const bundledHandler = typeof vercelBundle === "function" ? vercelBundle : vercelBundle.default;

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
    if (typeof bundledHandler !== "function") throw new Error("O bundle do backend não exportou um handler válido.");
    return bundledHandler(req, res);
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
