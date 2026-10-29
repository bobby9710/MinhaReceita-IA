import "dotenv/config";
import { randomUUID } from "node:crypto";
import { db, mongoClient } from "../server/db";
const url = process.argv[2];
if (!url) throw new Error("Informe o link público para testar a importação.");
const base = `http://127.0.0.1:${process.env.PORT || 5000}`;
let userId: number | undefined;
let cookie = "";
try {
  for (let attempt = 0; attempt < 80; attempt++) {
    try { if ((await fetch(base + "/api/user", { signal: AbortSignal.timeout(1000) })).status === 401) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  const registration = await fetch(base + "/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: `teste_video_${randomUUID()}`, password: randomUUID() }) });
  if (registration.status !== 201) throw new Error("Falha ao criar conta temporária.");
  userId = (await registration.json()).id;
  cookie = registration.headers.get("set-cookie")!.split(";")[0];
  const response = await fetch(base + "/api/recipes/import", { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ url }), signal: AbortSignal.timeout(480000) });
  const recipe = await response.json();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${recipe.message}`);
  if (!recipe.imageUrl) throw new Error("A importação não recebeu uma capa ou imagem gerada.");
  console.log(JSON.stringify({ titulo: recipe.title, ingredientes: recipe.ingredients, video: recipe.importAnalysis?.video, descricao: recipe.importAnalysis?.description, fixados: recipe.importAnalysis?.pinnedComments, avisos: recipe.importAnalysis?.warnings }, null, 2));
  const saved = await fetch(base + "/api/recipes", { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify(recipe) });
  if (saved.status !== 201) throw new Error("Falha ao salvar a receita importada.");
  const record = await saved.json();
  const loaded = await fetch(base + `/api/recipes/${record.id}`, { headers: { Cookie: cookie } });
  const stored = await loaded.json();
  if (!stored.importAnalysis?.evidence?.videoObservations) throw new Error("As evidências da importação não foram persistidas.");
  const image = await fetch(base + recipe.imageUrl, { headers: { Cookie: cookie } });
  if (!image.ok || !image.headers.get("content-type")?.startsWith("image/")) throw new Error("A capa armazenada não pôde ser aberta.");
  const imageBytes = new Uint8Array(await image.arrayBuffer());
  if (imageBytes.length < 4 || imageBytes[0] !== 0xff || imageBytes[1] !== 0xd8) throw new Error("A capa armazenada não retornou os bytes de um JPEG válido.");
  console.log("Importação, capa e persistência das fontes no Atlas: aprovadas.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falha ao testar a importação.");
  process.exitCode = 1;
} finally {
  if (userId !== undefined) {
    await mongoClient.connect();
    await db.collection("recipes").deleteMany({ userId });
    await db.collection("ai_import_cache").deleteMany({ userId });
    await db.collection("recipe_images").deleteMany({ userId });
    await db.collection("users").deleteOne({ id: userId });
    const sessionId = decodeURIComponent(cookie.slice(cookie.indexOf("=") + 1)).slice(2).split(".")[0];
    await db.collection<{ _id: string }>("sessions").deleteOne({ _id: sessionId });
    console.log("Dados temporários da importação removidos.");
  }
  await mongoClient.close();
}
