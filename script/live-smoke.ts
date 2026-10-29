import "dotenv/config";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { db, mongoClient } from "../server/db";

const base = `http://127.0.0.1:${process.env.PORT || 5000}`;
let userId: number | undefined;
let cookie = "";
async function request(path: string, method = "GET", body?: unknown) {
  return fetch(base + path, {
    method, headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(90000),
  });
}
try {
  assert.equal((await request("/")).status, 200);
  console.log("Página inicial: OK.");
  const registered = await request("/api/register", "POST", { username: `teste_${randomUUID()}`, firstName: "Teste", password: randomUUID(), email: "" });
  assert.equal(registered.status, 201, "Falha no cadastro de teste.");
  userId = (await registered.json()).id;
  cookie = registered.headers.get("set-cookie")!.split(";")[0];
  assert.equal((await request("/api/user")).status, 200);
  console.log("Cadastro e sessão no Atlas: OK.");
  const generated = await request("/api/recipes/generate", "POST", { prompt: "Crie uma receita simples de arroz com cenoura para duas pessoas. Escreva em português do Brasil." });
  const recipe = await generated.json();
  if (!generated.ok) throw new Error(`IA: HTTP ${generated.status}. ${recipe.message}`);
  assert.match(recipe.imageUrl || "", /^\/api\/recipe-images\//, "A receita gerada não recebeu imagem.");
  assert.equal((await request(recipe.imageUrl)).status, 200, "A imagem gerada não pôde ser aberta.");
  console.log(`Geração real de IA: OK (${recipe.ingredients.length} ingredientes, ${recipe.steps.length} etapas).`);
  const saved = await request("/api/recipes", "POST", recipe);
  assert.equal(saved.status, 201);
  const id = (await saved.json()).id;
  assert.equal((await request(`/api/recipes/${id}`)).status, 200);
  assert.equal((await request(`/api/recipes/${id}`, "DELETE")).status, 204);
  console.log("Salvar, consultar e excluir receita no Atlas: OK.");
} catch (error) {
  console.error(error instanceof Error && !error.message.includes("mongodb") ? error.message : "Falha no teste integrado.");
  process.exitCode = 1;
} finally {
  if (userId !== undefined) {
    await mongoClient.connect();
    await db.collection("recipes").deleteMany({ userId });
    await db.collection("recipe_images").deleteMany({ userId });
    await db.collection("users").deleteOne({ id: userId });
    const sessionId = decodeURIComponent(cookie.slice(cookie.indexOf("=") + 1)).slice(2).split(".")[0];
    if (sessionId) await db.collection<{ _id: string }>("sessions").deleteOne({ _id: sessionId });
    console.log("Conta e receitas temporárias removidas.");
  }
  await mongoClient.close();
}
