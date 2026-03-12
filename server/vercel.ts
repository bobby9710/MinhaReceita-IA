import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "./app";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await createApp();
  return app(req as any, res as any);
}
