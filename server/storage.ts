import { db, mongoClient, nextId } from "./db";
import type { Recipe, RecipeWithDetails, InsertMealPlan, MealPlan, InsertShoppingItem, ShoppingItem } from "@shared/schema";
import { claimImageAsset, deleteImageAsset } from "./image-assets";
type RecipeDocument = Recipe & RecipeWithDetails;
const recipes = db.collection<RecipeDocument>("recipes");
const plans = db.collection<MealPlan>("meal_plans");
const shopping = db.collection<ShoppingItem>("shopping_list");
const projection = { _id: 0 };
function missing(): never { throw Object.assign(new Error("Registro não encontrado."), { status: 404 }); }
export class DatabaseStorage {
 async createRecipe(recipe: RecipeWithDetails, userId: number): Promise<RecipeDocument> {
  const document = { ...recipe, id: await nextId("recipes"), userId, createdAt: new Date(), updatedAt: new Date() };
  await recipes.insertOne({ ...document });
  try { await claimImageAsset(document.imageUrl, userId, document.id); }
  catch (error) { await recipes.deleteOne({ id: document.id, userId }); throw error; }
  return document;
 }
 async getRecipe(id: number, userId: number) { return (await recipes.findOne({ id, userId }, { projection })) ?? undefined; }
 async getRecipes(userId: number, category?: string, search?: string) {
  const filter: Record<string, unknown> = { userId };
  if (category) filter.category = category;
  if (search) filter.title = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  return recipes.find(filter, { projection }).sort({ createdAt: -1 }).toArray();
 }
 async updateRecipe(id: number, updates: Partial<RecipeWithDetails>, userId: number) {
  const existing = await recipes.findOne({ id, userId }, { projection: { imageUrl: 1 } });
  if (!existing) return missing();
  if (updates.imageUrl && updates.imageUrl !== existing.imageUrl) await claimImageAsset(updates.imageUrl, userId, id);
  const recipe = await recipes.findOneAndUpdate({ id, userId }, { $set: { ...updates, updatedAt: new Date() } }, { returnDocument: "after", projection });
  if (updates.imageUrl !== undefined && updates.imageUrl !== existing.imageUrl) await deleteImageAsset(existing.imageUrl, userId);
  return recipe ?? missing();
 }
 async deleteRecipe(id: number, userId: number) {
  const existing = await recipes.findOne({ id, userId }, { projection: { imageUrl: 1 } });
  if (!existing) missing();
  const session = mongoClient.startSession();
  try {
   await session.withTransaction(async () => {
    const result = await recipes.deleteOne({ id, userId }, { session });
    if (!result.deletedCount) missing();
    await plans.deleteMany({ recipeId: id, userId }, { session });
    await shopping.updateMany({ recipeId: id, userId }, { $set: { recipeId: null } }, { session });
   });
  } finally { await session.endSession(); }
  await deleteImageAsset(existing.imageUrl, userId);
 }
 async getMealPlans(userId: number, startDate: string, endDate: string) {
  const entries = await plans.find({ userId, date: { $gte: startDate, $lte: endDate } }, { projection }).toArray();
  const result: (MealPlan & { recipe: Recipe })[] = [];
  for (const plan of entries) { const recipe = await this.getRecipe(plan.recipeId, userId); if (recipe) result.push({ ...plan, recipe }); }
  return result;
 }
 async createMealPlan(plan: InsertMealPlan, userId: number) {
  if (!await this.getRecipe(plan.recipeId, userId)) missing();
  const document = { ...plan, userId, id: await nextId("meal_plans") };
  await plans.insertOne({ ...document }); return document;
 }
 async deleteMealPlan(id: number, userId: number) { await plans.deleteOne({ id, userId }); }
 async getShoppingList(userId: number) { return shopping.find({ userId }, { projection }).toArray(); }
 async createShoppingItem(item: InsertShoppingItem, userId: number) {
  if (item.recipeId && !await this.getRecipe(item.recipeId, userId)) missing();
  const document = { ...item, isBought: item.isBought ?? false, userId, id: await nextId("shopping_list") };
  await shopping.insertOne({ ...document }); return document;
 }
 async updateShoppingItem(id: number, updates: Partial<InsertShoppingItem>, userId: number) {
  if (updates.recipeId && !await this.getRecipe(updates.recipeId, userId)) missing();
  return await shopping.findOneAndUpdate({ id, userId }, { $set: updates }, { returnDocument: "after", projection }) ?? missing();
 }
 async deleteShoppingItem(id: number, userId: number) { await shopping.deleteOne({ id, userId }); }
 async clearShoppingList(userId: number) { await shopping.deleteMany({ userId }); }
 async addIngredientsToShoppingList(recipeId: number, userId: number) {
  const recipe = await this.getRecipe(recipeId, userId);
  if (!recipe) missing();
  const items = await Promise.all(recipe.ingredients.map(async i => ({ ...i, userId, recipeId, isBought: false, id: await nextId("shopping_list") })));
  if (items.length) await shopping.insertMany(items);
 }
}
export const storage = new DatabaseStorage();
