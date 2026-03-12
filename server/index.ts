import { createServer } from "http";
import { createApp, log } from "./app";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

(async () => {
  const app = await createApp();
  const httpServer = createServer(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
