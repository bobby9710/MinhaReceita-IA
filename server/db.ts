import "dotenv/config";
import dns from "node:dns";
import { MongoClient } from "mongodb";

// Configuração opcional restrita ao processo; não altera o DNS do Windows.
if (process.env.MONGODB_DNS_SERVERS?.trim()) {
  dns.setServers(process.env.MONGODB_DNS_SERVERS.split(",").map(server => server.trim()).filter(Boolean));
}

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Configure MONGODB_URI no arquivo .env para conectar ao MongoDB.");
export const mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 10 });
export const db = mongoClient.db(process.env.MONGODB_DB || "minha_receita");
let ready: Promise<void> | undefined;
export function connectDatabase() {
  return ready ??= (async () => {
    await mongoClient.connect();
    await db.command({ ping: 1 });
    await Promise.all([
      ...["users", "recipes", "meal_plans", "shopping_list", "conversations", "messages"].map(name => db.collection(name).createIndex({ id: 1 }, { unique: true })),
      db.collection("users").createIndex({ username: 1 }, { unique: true }),
      db.collection("users").createIndex({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } }),
      db.collection("recipes").createIndex({ userId: 1, createdAt: -1 }),
      db.collection("meal_plans").createIndex({ userId: 1, date: 1 }),
      db.collection("shopping_list").createIndex({ userId: 1 }),
      db.collection("messages").createIndex({ conversationId: 1, createdAt: 1 }),
      db.collection("ai_cache").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection("ai_import_cache").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection("recipe_images").createIndex({ id: 1 }, { unique: true }),
      db.collection("recipe_images").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection("recipe_images").createIndex({ userId: 1, recipeId: 1 }),
    ]);
  })().catch(error => { ready = undefined; throw error; });
}

export async function nextId(name: string): Promise<number> {
  const counter = await db.collection<{ _id: string; value: number }>("counters").findOneAndUpdate(
    { _id: name }, { $inc: { value: 1 } }, { upsert: true, returnDocument: "after" },
  );
  return counter!.value;
}
