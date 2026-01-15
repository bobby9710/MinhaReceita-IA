import { db } from "./db";
import { 
  recipes, ingredients, spices, steps, mealPlans, shoppingList,
  type Recipe, type InsertRecipe, type RecipeWithDetails,
  type MealPlan, type InsertMealPlan,
  type ShoppingItem, type InsertShoppingItem,
  type User
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User (from Auth integration handles this, but we might need helpers)
  
  // Recipes
  createRecipe(recipe: RecipeWithDetails, userId: string): Promise<Recipe>;
  getRecipe(id: number): Promise<(Recipe & { ingredients: any[], spices: any[], steps: any[] }) | undefined>;
  getRecipes(userId: string, category?: string, search?: string): Promise<Recipe[]>;
  updateRecipe(id: number, recipe: Partial<RecipeWithDetails>, userId: string): Promise<Recipe>;
  deleteRecipe(id: number, userId: string): Promise<void>;

  // Meal Plans
  getMealPlans(userId: string, startDate: string, endDate: string): Promise<(MealPlan & { recipe: Recipe })[]>;
  createMealPlan(plan: InsertMealPlan, userId: string): Promise<MealPlan>;
  deleteMealPlan(id: number, userId: string): Promise<void>;

  // Shopping List
  getShoppingList(userId: string): Promise<ShoppingItem[]>;
  createShoppingItem(item: InsertShoppingItem, userId: string): Promise<ShoppingItem>;
  updateShoppingItem(id: number, updates: Partial<InsertShoppingItem>, userId: string): Promise<ShoppingItem>;
  deleteShoppingItem(id: number, userId: string): Promise<void>;
  clearShoppingList(userId: string): Promise<void>;
  addIngredientsToShoppingList(recipeId: number, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createRecipe(recipe: RecipeWithDetails, userId: string): Promise<Recipe> {
    return await db.transaction(async (tx) => {
      const [newRecipe] = await tx.insert(recipes).values({
        ...recipe,
        userId,
      }).returning();

      if (recipe.ingredients.length > 0) {
        await tx.insert(ingredients).values(
          recipe.ingredients.map(i => ({ ...i, recipeId: newRecipe.id }))
        );
      }

      if (recipe.spices.length > 0) {
        await tx.insert(spices).values(
          recipe.spices.map(s => ({ ...s, recipeId: newRecipe.id }))
        );
      }

      if (recipe.steps.length > 0) {
        await tx.insert(steps).values(
          recipe.steps.map(s => ({ ...s, recipeId: newRecipe.id }))
        );
      }

      return newRecipe;
    });
  }

  async getRecipe(id: number): Promise<(Recipe & { ingredients: any[], spices: any[], steps: any[] }) | undefined> {
    return await db.query.recipes.findFirst({
      where: eq(recipes.id, id),
      with: {
        ingredients: true,
        spices: true,
        steps: {
          orderBy: (steps, { asc }) => [asc(steps.order)],
        },
      },
    });
  }

  async getRecipes(userId: string, category?: string, search?: string): Promise<Recipe[]> {
    let conditions = [eq(recipes.userId, userId)];
    
    if (category) {
      conditions.push(eq(recipes.category, category as any));
    }

    if (search) {
      conditions.push(sql`lower(${recipes.title}) LIKE lower(${`%${search}%`})`);
    }

    return await db.select().from(recipes)
      .where(and(...conditions))
      .orderBy(desc(recipes.createdAt));
  }

  async updateRecipe(id: number, updates: Partial<RecipeWithDetails>, userId: string): Promise<Recipe> {
    return await db.transaction(async (tx) => {
      // Verify ownership
      const [existing] = await tx.select().from(recipes).where(and(eq(recipes.id, id), eq(recipes.userId, userId)));
      if (!existing) throw new Error("Recipe not found or unauthorized");

      // Update base recipe
      const { ingredients: newIngredients, spices: newSpices, steps: newSteps, ...recipeFields } = updates;
      
      const [updatedRecipe] = await tx.update(recipes)
        .set({ ...recipeFields, updatedAt: new Date() })
        .where(eq(recipes.id, id))
        .returning();

      // Replace sub-entities if provided
      // Note: In a real app we might diff, but for MVP replacing ensures consistency with UI state
      if (newIngredients) {
        await tx.delete(ingredients).where(eq(ingredients.recipeId, id));
        if (newIngredients.length > 0) {
          await tx.insert(ingredients).values(newIngredients.map(i => ({ ...i, recipeId: id })));
        }
      }

      if (newSpices) {
        await tx.delete(spices).where(eq(spices.recipeId, id));
        if (newSpices.length > 0) {
          await tx.insert(spices).values(newSpices.map(s => ({ ...s, recipeId: id })));
        }
      }

      if (newSteps) {
        await tx.delete(steps).where(eq(steps.recipeId, id));
        if (newSteps.length > 0) {
          await tx.insert(steps).values(newSteps.map(s => ({ ...s, recipeId: id })));
        }
      }

      return updatedRecipe;
    });
  }

  async deleteRecipe(id: number, userId: string): Promise<void> {
    await db.delete(recipes).where(and(eq(recipes.id, id), eq(recipes.userId, userId)));
  }

  // Meal Plans
  async getMealPlans(userId: string, startDate: string, endDate: string): Promise<(MealPlan & { recipe: Recipe })[]> {
    return await db.query.mealPlans.findMany({
      where: and(
        eq(mealPlans.userId, userId),
        sql`${mealPlans.date} >= ${startDate}`,
        sql`${mealPlans.date} <= ${endDate}`
      ),
      with: {
        recipe: true
      }
    });
  }

  async createMealPlan(plan: InsertMealPlan, userId: string): Promise<MealPlan> {
    const [newPlan] = await db.insert(mealPlans).values({ ...plan, userId }).returning();
    return newPlan;
  }

  async deleteMealPlan(id: number, userId: string): Promise<void> {
    await db.delete(mealPlans).where(and(eq(mealPlans.id, id), eq(mealPlans.userId, userId)));
  }

  // Shopping List
  async getShoppingList(userId: string): Promise<ShoppingItem[]> {
    return await db.select().from(shoppingList).where(eq(shoppingList.userId, userId));
  }

  async createShoppingItem(item: InsertShoppingItem, userId: string): Promise<ShoppingItem> {
    const [newItem] = await db.insert(shoppingList).values({ ...item, userId }).returning();
    return newItem;
  }

  async updateShoppingItem(id: number, updates: Partial<InsertShoppingItem>, userId: string): Promise<ShoppingItem> {
    const [updated] = await db.update(shoppingList)
      .set(updates)
      .where(and(eq(shoppingList.id, id), eq(shoppingList.userId, userId)))
      .returning();
    return updated;
  }

  async deleteShoppingItem(id: number, userId: string): Promise<void> {
    await db.delete(shoppingList).where(and(eq(shoppingList.id, id), eq(shoppingList.userId, userId)));
  }

  async clearShoppingList(userId: string): Promise<void> {
    await db.delete(shoppingList).where(eq(shoppingList.userId, userId));
  }

  async addIngredientsToShoppingList(recipeId: number, userId: string): Promise<void> {
    const recipeIngredients = await db.select().from(ingredients).where(eq(ingredients.recipeId, recipeId));
    if (recipeIngredients.length > 0) {
      await db.insert(shoppingList).values(
        recipeIngredients.map(i => ({
          userId,
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          recipeId,
          isBought: false
        }))
      );
    }
  }
}

export const storage = new DatabaseStorage();
