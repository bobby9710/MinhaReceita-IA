import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { MongoMemoryReplSet } from "mongodb-memory-server";

test("inicialização local e build de produção", { timeout: 90000 }, async t => {
  const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  t.after(() => mongo.stop());
  const modes = [{ name: "desenvolvimento", args: ["--import", "tsx", "script/dev.ts"] }];
  if (process.env.TEST_PRODUCTION === "true" && existsSync("dist/index.cjs")) modes.push({ name: "produção", args: ["dist/index.cjs"] });
  for (const mode of modes) {
    await t.test(mode.name, async t => {
      const probe = createServer();
      probe.listen(0, "127.0.0.1"); await once(probe, "listening");
      const port = (probe.address() as { port: number }).port;
      await new Promise<void>(resolve => probe.close(() => resolve()));
      const child = spawn(process.execPath, mode.args, {
        windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, PORT: String(port), MONGODB_URI: mongo.getUri(), MONGODB_DB: "teste_inicializacao", SESSION_SECRET: "segredo-teste-inicializacao", NODE_ENV: mode.name === "produção" ? "production" : "development", SERVE_STATIC: "true", FRONTEND_URL: "", VITE_API_URL: "", GROQ_API_KEY: "", GEMINI_API_KEY: "" },
      });
      let logs = "";
      child.stdout.on("data", chunk => { logs += chunk; });
      child.stderr.on("data", chunk => { logs += chunk; });
      t.after(async () => {
        if (child.exitCode === null) { child.kill(); await once(child, "exit"); }
      });
      const base = `http://127.0.0.1:${port}`;
      let ready = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        if (child.exitCode !== null) throw new Error(`O app encerrou: ${logs}`);
        try {
          const response = await fetch(base + "/api/user");
          if (response.status === 401) { ready = true; break; }
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      assert.equal(ready, true, logs);
      const page = await fetch(base);
      assert.equal(page.status, 200);
      assert.match(await page.text(), /id="root"/);
      const registered = await fetch(base + "/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: mode.name === "produção" ? "producao" : "desenvolvimento", password: "senha-de-teste" }) });
      assert.equal(registered.status, 201, logs);
      const cookie = registered.headers.get("set-cookie")!.split(";")[0];
      // A rejeição assíncrona deve chegar ao middleware de erro também no bundle.
      const invalid = await fetch(base + "/api/meal-plans", { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({}) });
      assert.equal(invalid.status, 400);
    });
  }
});
