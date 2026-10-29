import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const recipe = {
  title: "Arroz com legumes", description: "Uma refeição simples.", prepTime: 25,
  difficulty: "Fácil", category: "Almoço",
  ingredients: [{ name: "Arroz", quantity: "1", unit: "xícara" }],
  spices: [{ name: "Sal", quantity: "a gosto" }],
  steps: [{ content: "Cozinhe o arroz com os legumes.", order: 1 }],
};

test("MongoDB, autenticação, dados e provedores de IA", { timeout: 180000 }, async t => {
  const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  process.env.MONGODB_URI = mongo.getUri();
  process.env.MONGODB_DB = "teste_minha_receita";
  process.env.SESSION_SECRET = "segredo-exclusivo-para-o-teste-de-integracao";
  process.env.NODE_ENV = "production";
  process.env.SERVE_STATIC = "false";
  process.env.FRONTEND_URL = "";
  process.env.GROQ_API_KEY = "chave-simulada";
  process.env.GEMINI_API_KEY = "chave-simulada";
  process.env.AI_PROVIDER = "groq";
  process.env.AI_FALLBACK_PROVIDER = "";
  const { createApp } = await import("../server/app");
  const { db, mongoClient } = await import("../server/db");
  const { generateRecipe } = await import("../server/ai");
  const { storage } = await import("../server/storage");
  const { isPublicIPv4, recipeContent } = await import("../server/import-recipe");
  const server = createServer(await createApp());
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const realFetch = globalThis.fetch;
  let alice = "";
  let bob = "";
  let recipeId = 0;
  let aliceId = 0;
  const request = async (route: string, cookie = "", method = "GET", body?: unknown) => realFetch(base + route, {
    method, headers: { "Content-Type": "application/json", Cookie: cookie }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  t.after(async () => {
    globalThis.fetch = realFetch;
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await mongoClient.close();
    await mongo.stop();
  });

  await t.test("cadastro e sessões persistem sem expor a senha", async () => {
    assert.equal((await request("/api/recipes")).status, 401);
    const response = await request("/api/register", "", "POST", { username: "alice", password: "senha12345", email: "alice@example.test" });
    assert.equal(response.status, 201);
    alice = response.headers.get("set-cookie")!.split(";")[0];
    const user = await response.json(); aliceId = user.id;
    assert.equal(user.password, undefined);
    assert.equal((await db.collection("users").findOne({ id: user.id }))!.password.startsWith("$2"), true);
    assert.equal(await db.collection("sessions").countDocuments(), 1);
    const me = await (await request("/api/user", alice)).json();
    assert.equal(me.id, user.id); assert.equal(me.password, undefined);
    const other = await request("/api/register", "", "POST", { username: "bob", password: "senha12345" });
    assert.equal(other.status, 201); bob = other.headers.get("set-cookie")!.split(";")[0];
    const duplicate = await request("/api/register", "", "POST", { username: "outra", password: "senha12345", email: "alice@example.test" });
    assert.equal(duplicate.status, 409);
  });
  await t.test("cadastro aceita e-mail vazio da tela e informa erros específicos", async () => {
    for (const [index, email] of ["", "   "].entries()) {
      const response = await request("/api/register", "", "POST", { username: `sem_email_${index}`, firstName: "Pessoa", password: "senha12345", email });
      assert.equal(response.status, 201);
      const user = await response.json();
      assert.equal(typeof user.email === "string", false);
      const cookie = response.headers.get("set-cookie")!.split(";")[0];
      assert.equal((await request("/api/user", cookie)).status, 200);
    }
    const shortPassword = await request("/api/register", "", "POST", { username: "teste_senha", password: "curta", email: "" });
    assert.equal(shortPassword.status, 400);
    assert.equal((await shortPassword.json()).message, "A senha deve ter pelo menos 8 caracteres.");
    const invalidEmail = await request("/api/register", "", "POST", { username: "teste_email", password: "senha12345", email: "invalido" });
    assert.equal(invalidEmail.status, 400);
    assert.match((await invalidEmail.json()).message, /e-mail válido/);
  });
  await t.test("receitas preservam detalhes e isolamento entre contas", async () => {
    const created = await request("/api/recipes", alice, "POST", recipe);
    assert.equal(created.status, 201);
    recipeId = (await created.json()).id;
    const stored = await (await request(`/api/recipes/${recipeId}`, alice)).json();
    assert.deepEqual(stored.ingredients, recipe.ingredients);
    assert.equal(stored._id, undefined);
    assert.equal((await request(`/api/recipes/${recipeId}`, bob)).status, 404);
    assert.equal((await request(`/api/recipes/${recipeId}`, bob, "PUT", { title: "Invasão" })).status, 404);
    assert.equal((await request(`/api/recipes/${recipeId}`, bob, "DELETE")).status, 404);
    assert.deepEqual(await (await request("/api/recipes", bob)).json(), []);
    const update = await request(`/api/recipes/${recipeId}`, alice, "PUT", { title: "Arroz (especial)", steps: [{ content: "Cozinhe por 20 minutos.", order: 1 }] });
    assert.equal(update.status, 200);
    assert.equal((await (await request("/api/recipes?search=%28especial%29", alice)).json()).length, 1);
    assert.equal((await request("/api/recipes", alice, "POST", { ...recipe, ingredients: [] })).status, 400);
    const concurrent = await Promise.all(Array.from({ length: 5 }, () => storage.createRecipe(recipe as any, aliceId)));
    assert.equal(new Set(concurrent.map(item => item.id)).size, 5);
  });
  await t.test("gera, protege, vincula e remove imagens das receitas", async () => {
    globalThis.fetch = async () => new Response(Buffer.from([0xff, 0xd8, 0xff, 0xd9]), { headers: { "Content-Type": "image/jpeg" } });
    const generated = await request("/api/recipes/generate-image", alice, "POST", { title: "Prato de teste", description: "Arroz com legumes", ingredients: [{ name: "Arroz" }] });
    assert.equal(generated.status, 200);
    const { imageUrl } = await generated.json();
    assert.match(imageUrl, /^\/api\/recipe-images\/[0-9a-f-]{36}$/);
    assert.equal((await request(imageUrl, alice)).status, 200);
    assert.equal((await request(imageUrl, bob)).status, 404);
    const created = await request("/api/recipes", alice, "POST", { ...recipe, imageUrl });
    assert.equal(created.status, 201);
    const record = await created.json();
    const asset = await db.collection("recipe_images").findOne({ recipeId: record.id, userId: aliceId });
    assert.ok(asset);
    assert.equal(asset.expiresAt, undefined);
    assert.equal((await request(`/api/recipes/${record.id}`, alice, "DELETE")).status, 204);
    assert.equal(await db.collection("recipe_images").countDocuments({ recipeId: record.id }), 0);
    globalThis.fetch = realFetch;
  });
  await t.test("planejamento e compras usam MongoDB e respeitam o dono", async () => {
    const plan = { date: "2026-10-27", category: "Almoço", recipeId };
    assert.equal((await request("/api/meal-plans", bob, "POST", plan)).status, 404);
    assert.equal((await request("/api/meal-plans", alice, "POST", plan)).status, 201);
    const plans = await (await request("/api/meal-plans?startDate=2026-10-26&endDate=2026-11-01", alice)).json();
    assert.equal(plans[0].recipe.id, recipeId);
    assert.equal((await request(`/api/shopping-list/from-recipe/${recipeId}`, bob, "POST")).status, 404);
    assert.equal((await request(`/api/shopping-list/from-recipe/${recipeId}`, alice, "POST")).status, 200);
    const items = await (await request("/api/shopping-list", alice)).json();
    assert.equal(items[0].name, "Arroz");
    assert.equal((await request(`/api/shopping-list/${items[0].id}`, bob, "PUT", { isBought: true })).status, 404);
    const updated = await (await request(`/api/shopping-list/${items[0].id}`, alice, "PUT", { isBought: true, price: "9.50" })).json();
    assert.equal(updated.price, "9.50"); assert.equal(updated.isBought, true);
    assert.equal((await request(`/api/recipes/${recipeId}`, alice, "DELETE")).status, 204);
    assert.equal(await db.collection("meal_plans").countDocuments({ recipeId }), 0);
    assert.equal((await db.collection("shopping_list").findOne({ id: items[0].id }))!.recipeId, null);
  });
  await t.test("IA valida JSON, usa cache e compartilha pedidos simultâneos", async () => {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return Response.json({ choices: [{ message: { content: JSON.stringify(recipe) } }] }); };
    const result = await generateRecipe("Receita simples com arroz e legumes", aliceId);
    assert.equal(result.title, recipe.title);
    await generateRecipe("Receita simples com arroz e legumes", aliceId);
    assert.equal(calls, 1);
    await Promise.all([generateRecipe("Receita nova com arroz", aliceId), generateRecipe("Receita nova com arroz", aliceId)]);
    assert.equal(calls, 2);
    globalThis.fetch = async () => Response.json({ choices: [{ message: { content: "{}" } }] });
    await assert.rejects(generateRecipe("Receita com resposta inválida", aliceId), /incompleta/);
    assert.equal(await db.collection("ai_cache").countDocuments(), 2);
  });
  await t.test("Gemini, limite 429 e alternativa explícita", async () => {
    process.env.AI_PROVIDER = "gemini";
    globalThis.fetch = async () => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(recipe) }] } }] });
    assert.equal((await generateRecipe("Receita via Gemini", aliceId)).title, recipe.title);
    process.env.AI_PROVIDER = "groq";
    globalThis.fetch = async () => new Response("", { status: 429 });
    await assert.rejects(generateRecipe("Receita com limite", aliceId), (error: any) => error.status === 429);
    process.env.AI_FALLBACK_PROVIDER = "gemini";
    globalThis.fetch = async url => {
      assert.match(String(url), /generativelanguage.googleapis.com/);
      return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(recipe) }] } }] });
    };
    assert.equal((await generateRecipe("Receita alternativa", aliceId)).title, recipe.title);
    process.env.AI_FALLBACK_PROVIDER = "";
    globalThis.fetch = realFetch;
  });
  await t.test("importação recusa redes privadas e protocolos inadequados", async () => {
    for (const ip of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "192.168.1.1", "172.16.0.1"]) assert.equal(isPublicIPv4(ip), false);
    assert.equal(isPublicIPv4("8.8.8.8"), true);
    await assert.rejects(recipeContent("http://127.0.0.1"), /HTTPS/);
    await assert.rejects(recipeContent("https://127.0.0.1"), /importado/);
  });
  await t.test("logout invalida a sessão autenticada e login funciona", async () => {
    assert.equal((await request("/api/logout", alice, "POST")).status, 200);
    assert.equal((await request("/api/user", alice)).status, 401);
    const login = await request("/api/login", "", "POST", { username: "alice", password: "senha12345" });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).password, undefined);
  });
});
