import { z } from "zod";
export * from "./models/auth";
export * from "./models/chat";
export const difficultyEnum = { enumValues: ["Fácil", "Média", "Difícil"] as const };
export const categoryEnum = { enumValues: ["Café da Manhã", "Almoço", "Jantar", "Sobremesa", "Lanche", "Outros"] as const };
const id = z.number().int().positive();
const optionalText = z.string().nullable().optional();
export const importAnalysisSchema = z.object({
 platform: z.enum(["tiktok", "instagram", "youtube", "website"]),
 video: z.enum(["analyzed", "audio_only", "unavailable", "not_applicable"]),
 description: z.boolean(), pinnedComments: z.number().int().nonnegative(), authorComments: z.number().int().nonnegative(),
 warnings: z.array(z.string().max(2000)).max(40), analyzedAt: z.string(),
 evidence: z.object({ description: z.string().max(10000), comments: z.array(z.string().max(2200)).max(20), videoObservations: z.string().max(20000), audioTranscript: z.string().max(20000).optional(), supplementalText: z.string().max(6000) }),
});
export const insertRecipeSchema = z.object({
 title: z.string().trim().min(1).max(200), description: z.string().min(1).max(10000),
 prepTime: z.number().int().positive().max(10080), difficulty: z.enum(difficultyEnum.enumValues), category: z.enum(categoryEnum.enumValues),
 notes: optionalText, imageUrl: z.string().max(8_000_000).nullable().optional(), sourceUrl: optionalText,
 importAnalysis: importAnalysisSchema.optional(),
});
export const insertIngredientSchema = z.object({ name: z.string().min(1), quantity: z.string(), unit: z.string() });
export const insertSpiceSchema = z.object({ name: z.string().min(1), quantity: optionalText });
export const insertStepSchema = z.object({ content: z.string().min(1), order: id });
export const recipeWithDetailsSchema = insertRecipeSchema.extend({
 ingredients: z.array(insertIngredientSchema).min(1).max(200), spices: z.array(insertSpiceSchema).max(100), steps: z.array(insertStepSchema).min(1).max(200),
});
export const insertMealPlanSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), category: z.enum(categoryEnum.enumValues), recipeId: id });
export const insertShoppingItemSchema = z.object({ name: z.string().trim().min(1), quantity: optionalText, unit: optionalText, price: optionalText, isBought: z.boolean().nullable().optional(), recipeId: id.nullable().optional() });
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type RecipeWithDetails = z.infer<typeof recipeWithDetailsSchema>;
export type Recipe = InsertRecipe & { id: number; userId: number; createdAt: Date; updatedAt: Date };
export type Ingredient = z.infer<typeof insertIngredientSchema>;
export type Spice = z.infer<typeof insertSpiceSchema>;
export type Step = z.infer<typeof insertStepSchema>;
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = InsertMealPlan & { id: number; userId: number };
export type InsertShoppingItem = z.infer<typeof insertShoppingItemSchema>;
export type ShoppingItem = InsertShoppingItem & { id: number; userId: number };
