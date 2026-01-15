import { pgTable, text, serial, integer, boolean, timestamp, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Import Auth and Chat models to re-export them
export * from "./models/auth";
export * from "./models/chat";

// Enums
export const difficultyEnum = pgEnum("difficulty", ["Facil", "Media", "Dificil"]);
export const categoryEnum = pgEnum("category", ["CafeManha", "CafeTarde", "Almoco", "Jantar", "Sobremesa", "Outros"]);

// Recipes Table
export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // Linked to Auth user.id
  title: text("title").notNull(),
  description: text("description").notNull(),
  prepTime: integer("prep_time").notNull(), // in minutes
  difficulty: difficultyEnum("difficulty").notNull(),
  category: categoryEnum("category").notNull(),
  notes: text("notes"),
  imageUrl: text("image_url"),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ingredients Table (Strictly separated from Spices)
export const ingredients = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity").notNull(),
  unit: text("unit").notNull(),
});

// Spices Table
export const spices = pgTable("spices", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity"), // Optional for spices
});

// Steps Table
export const steps = pgTable("steps", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  order: integer("order").notNull(),
});

// Meal Plans Table
export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  category: categoryEnum("category").notNull(),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
});

// Shopping List Table
export const shoppingList = pgTable("shopping_list", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  quantity: text("quantity"),
  unit: text("unit"),
  isBought: boolean("is_bought").default(false),
  recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "set null" }), // Optional link
});

// Relations
export const recipesRelations = relations(recipes, ({ many }) => ({
  ingredients: many(ingredients),
  spices: many(spices),
  steps: many(steps),
}));

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [ingredients.recipeId],
    references: [recipes.id],
  }),
}));

export const spicesRelations = relations(spices, ({ one }) => ({
  recipe: one(recipes, {
    fields: [spices.recipeId],
    references: [recipes.id],
  }),
}));

export const stepsRelations = relations(steps, ({ one }) => ({
  recipe: one(recipes, {
    fields: [steps.recipeId],
    references: [recipes.id],
  }),
}));

export const mealPlansRelations = relations(mealPlans, ({ one }) => ({
  recipe: one(recipes, {
    fields: [mealPlans.recipeId],
    references: [recipes.id],
  }),
}));

// Zod Schemas
export const insertRecipeSchema = createInsertSchema(recipes).omit({ id: true, createdAt: true, updatedAt: true, userId: true });
export const insertIngredientSchema = createInsertSchema(ingredients).omit({ id: true, recipeId: true });
export const insertSpiceSchema = createInsertSchema(spices).omit({ id: true, recipeId: true });
export const insertStepSchema = createInsertSchema(steps).omit({ id: true, recipeId: true });
export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({ id: true, userId: true });
export const insertShoppingItemSchema = createInsertSchema(shoppingList).omit({ id: true, userId: true });

// Composite Types for API
export const recipeWithDetailsSchema = insertRecipeSchema.extend({
  ingredients: z.array(insertIngredientSchema),
  spices: z.array(insertSpiceSchema),
  steps: z.array(insertStepSchema),
});

export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Ingredient = typeof ingredients.$inferSelect;
export type Spice = typeof spices.$inferSelect;
export type Step = typeof steps.$inferSelect;
export type MealPlan = typeof mealPlans.$inferSelect;
export type ShoppingItem = typeof shoppingList.$inferSelect;
export type RecipeWithDetails = z.infer<typeof recipeWithDetailsSchema>;
