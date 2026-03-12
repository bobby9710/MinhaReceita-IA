import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";

let appPromise: Promise<Express> | null = null;

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

function getAllowedOrigins() {
  const fromEnv = process.env.FRONTEND_URL?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

  if (process.env.NODE_ENV !== "production") {
    return Array.from(new Set([...fromEnv, "http://localhost:5173", "http://127.0.0.1:5173"]));
  }

  return fromEnv;
}

function applyCors(req: Request, res: Response, allowedOrigins: string[]) {
  const origin = req.headers.origin;
  if (!origin) return;

  const isDevelopment = process.env.NODE_ENV !== "production";
  const isAllowed = allowedOrigins.includes(origin);

  if (isAllowed || (isDevelopment && allowedOrigins.length === 0)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }
}

function shouldServeFrontendAssets() {
  if (process.env.SERVE_STATIC === "true") {
    return true;
  }

  if (process.env.SERVE_STATIC === "false") {
    return false;
  }

  return !process.env.FRONTEND_URL;
}

export function createApp() {
  if (appPromise) {
    return appPromise;
  }

  appPromise = (async () => {
    const app = express();
    const httpServer = createServer(app);
    const allowedOrigins = getAllowedOrigins();

    app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : 0);

    app.use((req, res, next) => {
      applyCors(req, res, allowedOrigins);
      if (req.method === "OPTIONS") {
        return res.sendStatus(204);
      }
      next();
    });

    app.use(
      express.json({
        limit: "10mb",
        verify: (req, _res, buf) => {
          (req as any).rawBody = buf;
        },
      }),
    );

    app.use(express.urlencoded({ limit: "10mb", extended: false }));

    app.use((req, res, next) => {
      const start = Date.now();
      const path = req.path;
      let capturedJsonResponse: Record<string, any> | undefined = undefined;

      const originalResJson = res.json;
      res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
      };

      res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
          let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
          if (capturedJsonResponse) {
            logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          }

          log(logLine);
        }
      });

      next();
    });

    await registerRoutes(httpServer, app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
    });

    if (process.env.NODE_ENV === "production") {
      if (shouldServeFrontendAssets()) {
        serveStatic(app);
      }
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    return app;
  })();

  return appPromise;
}
