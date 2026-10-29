import { createServer } from "http";
import { createApp, log } from "./app";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

(async () => {
  const httpServer = createServer();
  const app = await createApp(httpServer);
  httpServer.on("request", app);

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: process.platform !== "win32",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
