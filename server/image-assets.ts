import { createHash, randomUUID } from "node:crypto";
import { Binary } from "mongodb";
import { db } from "./db";
import { AIError } from "./ai";

const images = db.collection<{ id: string; userId: number; data: Buffer; mimeType: string; promptHash?: string; recipeId?: number; createdAt: Date; expiresAt?: Date }>("recipe_images");
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export function imageAssetUrl(id: string) { return `/api/recipe-images/${id}`; }
export function imageAssetId(url?: string | null) {
  const match = url?.match(/^\/api\/recipe-images\/([0-9a-f-]{36})$/i);
  return match?.[1];
}

export async function saveImageAsset(data: Buffer, mimeType: string, userId: number, promptHash?: string) {
  if (!data.length || data.length > MAX_IMAGE_BYTES) throw new AIError("A imagem ultrapassa o limite de 3 MB.", 422);
  if (!/^image\/(jpeg|png|webp)$/.test(mimeType)) throw new AIError("O formato da imagem não é compatível.", 422);
  const signatureValid = mimeType === "image/jpeg" ? data[0] === 0xff && data[1] === 0xd8
    : mimeType === "image/png" ? data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    : data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP";
  if (!signatureValid) throw new AIError("O serviço retornou um arquivo que não é uma imagem válida.", 502);
  if (promptHash) {
    const existing = await images.findOne({ userId, promptHash, expiresAt: { $gt: new Date() } }, { projection: { id: 1 } });
    if (existing) return imageAssetUrl(existing.id);
  }
  const id = randomUUID();
  await images.insertOne({ id, userId, data, mimeType, promptHash, createdAt: new Date(), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
  return imageAssetUrl(id);
}

let activeGenerations = 0;
type ImageRecipe = {
  title: string;
  description?: string;
  ingredients?: { name: string; quantity?: string | null; unit?: string | null }[];
  spices?: { name: string; quantity?: string | null }[];
  steps?: { content: string }[];
  variation?: string;
};

function culinaryClarification(input: ImageRecipe) {
  const text = `${input.title} ${input.description || ""}`.toLocaleLowerCase("pt-BR");
  const rules: string[] = [];
  if (text.includes("tapioca")) rules.push("Brazilian tapioca means a thin white cassava-starch crepe cooked in a skillet, folded around the filling. It is NOT tapioca pearls, pudding, bread, cake, muffin or cupcake.");
  if (text.includes("cuscuz")) rules.push("Brazilian couscous means a molded, steamed yellow corn-flake dish, not Moroccan couscous grains.");
  if (text.includes("pastel")) rules.push("Brazilian pastel means a thin, crisp, rectangular fried pastry with a savory filling, not a cake.");
  if (text.includes("pão de queijo") || text.includes("pao de queijo")) rules.push("Pão de queijo means small round Brazilian baked cheese rolls with a lightly cracked golden crust.");
  if (text.includes("farofa")) rules.push("Farofa means toasted coarse cassava flour served as a crumbly savory side dish.");
  return rules.join(" ");
}

export async function generateRecipeImageAsset(input: ImageRecipe, userId: number) {
  if (activeGenerations >= 2) throw new AIError("Há imagens sendo geradas. Aguarde um momento e tente novamente.", 429);
  const ingredientNames = input.ingredients?.slice(0, 20).map(item => [item.quantity, item.unit, item.name].filter(Boolean).join(" ")).filter(Boolean).join(", ");
  const spices = input.spices?.slice(0, 12).map(item => [item.quantity, item.name].filter(Boolean).join(" ")).filter(Boolean).join(", ");
  const preparation = input.steps?.slice(0, 12).map((item, index) => `${index + 1}. ${item.content}`).join(" ");
  const prompt = [
    "Realistic editorial food photograph of the exact finished recipe described below. Accurately reproduce the dish shape, cooking method, filling, texture and dominant ingredients. Do not reinterpret the recipe as a dessert or a different dish.",
    "Horizontal 4:3 composition, natural soft light, entire plated food visible, normal serving size, appetizing but believable home cooking. No people, hands, text, labels, logos, packaging or decorative ingredients absent from the recipe.",
    `Exact dish: ${input.title.slice(0, 200)}.`,
    input.description ? `Recipe description: ${input.description.slice(0, 800)}.` : "",
    ingredientNames ? `Ingredients and proportions: ${ingredientNames.slice(0, 900)}.` : "",
    spices ? `Seasonings: ${spices.slice(0, 400)}.` : "",
    preparation ? `Preparation and final assembly: ${preparation.slice(0, 1400)}.` : "",
    culinaryClarification(input),
  ].filter(Boolean).join(" ");
  const promptHash = createHash("sha256").update(`${prompt}|${input.variation || "automatic"}`).digest("hex");
  const cached = await images.findOne({ userId, promptHash, expiresAt: { $gt: new Date() } }, { projection: { id: 1 } });
  if (cached) return imageAssetUrl(cached.id);
  activeGenerations++;
  try {
    const base = process.env.FREE_IMAGE_API_URL || "https://image.pollinations.ai/prompt/";
    const url = new URL(encodeURIComponent(prompt), base.endsWith("/") ? base : base + "/");
    url.searchParams.set("width", "768");
    url.searchParams.set("height", "576");
    url.searchParams.set("nologo", "true");
    url.searchParams.set("seed", String(parseInt(promptHash.slice(0, 8), 16)));
    const response = await fetch(url, { headers: { Accept: "image/jpeg,image/png,image/webp" }, signal: AbortSignal.timeout(120000) });
    if (response.status === 402) throw new AIError("A cota gratuita do serviço de imagens terminou. Tente novamente mais tarde ou configure outro serviço gratuito em FREE_IMAGE_API_URL.", 503);
    if (response.status === 429) throw new AIError("O serviço gratuito de imagens atingiu o limite. Tente novamente mais tarde.", 429);
    if (!response.ok) throw new AIError("O serviço gratuito de imagens está indisponível.");
    const mimeType = response.headers.get("content-type")?.split(";")[0] || "";
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > MAX_IMAGE_BYTES) throw new AIError("A imagem gerada ultrapassou o limite permitido.", 422);
    const data = Buffer.from(await response.arrayBuffer());
    return await saveImageAsset(data, mimeType, userId, promptHash);
  } catch (error) {
    if (error instanceof AIError) throw error;
    throw new AIError("Não foi possível gerar a imagem gratuita agora. Tente novamente mais tarde.");
  } finally { activeGenerations--; }
}

export async function getImageAsset(id: string, userId: number) {
  const image = await images.findOne({ id, userId }, { projection: { _id: 0, data: 1, mimeType: 1 } });
  if (!image) return null;
  const storedData = image.data as unknown;
  const bytes = storedData instanceof Binary ? storedData.buffer : storedData as Uint8Array;
  return { data: Buffer.from(bytes), mimeType: image.mimeType };
}
export async function claimImageAsset(url: string | null | undefined, userId: number, recipeId: number) {
  const id = imageAssetId(url);
  if (!id) return;
  const result = await images.updateOne({ id, userId }, { $set: { recipeId }, $unset: { expiresAt: "" } });
  if (!result.matchedCount) throw new AIError("A imagem selecionada não está disponível para esta conta.", 400);
}
export async function deleteImageAsset(url: string | null | undefined, userId: number) {
  const id = imageAssetId(url);
  if (id) await images.deleteOne({ id, userId });
}
