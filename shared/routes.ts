import { z } from 'zod';
import {
  insertRecipeSchema,
  insertIngredientSchema,
  insertSpiceSchema,
  insertStepSchema,
  insertMealPlanSchema,
  insertShoppingItemSchema,
  recipeWithDetailsSchema,
  type Recipe,
  type Ingredient,
  type Spice,
  type Step,
  type MealPlan,
  type ShoppingItem,
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export type { ShoppingItem, RecipeWithDetails, MealPlan } from "./schema";

export const api = {
  recipes: {
    generate: {
      method: 'POST' as const,
      path: '/api/recipes/generate',
      input: z.object({ prompt: z.string().trim().min(10).max(12000) }),
      responses: { 200: recipeWithDetailsSchema, 400: errorSchemas.validation },
    },
    list: {
      method: 'GET' as const,
      path: '/api/recipes',
      input: z.object({
        category: z.enum(["CafeManha", "CafeTarde", "Almoco", "Jantar", "Sobremesa", "Outros"]).optional(),
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<Recipe>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/recipes/:id',
      responses: {
        200: z.custom<Recipe & {
          ingredients: Ingredient[],
          spices: Spice[],
          steps: Step[]
        }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/recipes',
      input: recipeWithDetailsSchema,
      responses: {
        201: z.custom<Recipe>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/recipes/:id',
      input: recipeWithDetailsSchema.partial(),
      responses: {
        200: z.custom<Recipe>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/recipes/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    import: {
      method: 'POST' as const,
      path: '/api/recipes/import',
      input: z.object({ url: z.string().trim().min(5).max(2000), supplementalText: z.string().max(6000).optional() }),
      responses: {
        200: recipeWithDetailsSchema, // Returns PREVIEW data, not saved yet
        400: errorSchemas.validation,
      },
    },
    generateImage: {
      method: 'POST' as const,
      path: '/api/recipes/generate-image',
      input: z.object({
        title: z.string().trim().min(1).max(200),
        description: z.string().max(10000).optional(),
        ingredients: z.array(z.object({ name: z.string().max(300), quantity: z.string().max(100).nullish(), unit: z.string().max(100).nullish() })).max(200).optional(),
        spices: z.array(z.object({ name: z.string().max(300), quantity: z.string().max(100).nullish() })).max(100).optional(),
        steps: z.array(z.object({ content: z.string().max(2000) })).max(100).optional(),
        variation: z.string().max(64).optional(),
      }),
      responses: {
        200: z.object({ imageUrl: z.string() }),
        500: errorSchemas.internal,
      },
    }
  },
  mealPlans: {
    list: {
      method: 'GET' as const,
      path: '/api/meal-plans',
      input: z.object({
        startDate: z.string(), // YYYY-MM-DD
        endDate: z.string(),   // YYYY-MM-DD
      }),
      responses: {
        200: z.array(z.custom<MealPlan & { recipe: Recipe }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/meal-plans',
      input: insertMealPlanSchema,
      responses: {
        201: z.custom<MealPlan>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/meal-plans/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  shoppingList: {
    list: {
      method: 'GET' as const,
      path: '/api/shopping-list',
      responses: {
        200: z.array(z.custom<ShoppingItem>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/shopping-list',
      input: insertShoppingItemSchema,
      responses: {
        201: z.custom<ShoppingItem>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/shopping-list/:id',
      input: insertShoppingItemSchema.partial(),
      responses: {
        200: z.custom<ShoppingItem>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/shopping-list/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    addFromRecipe: {
      method: 'POST' as const,
      path: '/api/shopping-list/from-recipe/:id',
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
    clear: {
      method: 'DELETE' as const,
      path: '/api/shopping-list',
      responses: {
        204: z.void(),
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
