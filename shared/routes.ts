import { z } from 'zod';
import { 
  insertRecipeSchema, 
  insertIngredientSchema, 
  insertSpiceSchema, 
  insertStepSchema,
  insertMealPlanSchema,
  insertShoppingItemSchema,
  recipeWithDetailsSchema,
  recipes,
  ingredients,
  spices,
  steps,
  mealPlans,
  shoppingList
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

export type ShoppingItem = typeof shoppingList.$inferSelect;

export const api = {
  recipes: {
    list: {
      method: 'GET' as const,
      path: '/api/recipes',
      input: z.object({
        category: z.enum(["CafeManha", "CafeTarde", "Almoco", "Jantar", "Sobremesa", "Outros"]).optional(),
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof recipes.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/recipes/:id',
      responses: {
        200: z.custom<typeof recipes.$inferSelect & { 
          ingredients: typeof ingredients.$inferSelect[], 
          spices: typeof spices.$inferSelect[], 
          steps: typeof steps.$inferSelect[] 
        }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/recipes',
      input: recipeWithDetailsSchema,
      responses: {
        201: z.custom<typeof recipes.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/recipes/:id',
      input: recipeWithDetailsSchema.partial(),
      responses: {
        200: z.custom<typeof recipes.$inferSelect>(),
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
      input: z.object({ url: z.string().url() }),
      responses: {
        200: recipeWithDetailsSchema, // Returns PREVIEW data, not saved yet
        400: errorSchemas.validation,
      },
    },
    generateImage: {
      method: 'POST' as const,
      path: '/api/recipes/generate-image',
      input: z.object({ title: z.string() }),
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
        200: z.array(z.custom<typeof mealPlans.$inferSelect & { recipe: typeof recipes.$inferSelect }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/meal-plans',
      input: insertMealPlanSchema,
      responses: {
        201: z.custom<typeof mealPlans.$inferSelect>(),
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
        200: z.array(z.custom<typeof shoppingList.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/shopping-list',
      input: insertShoppingItemSchema,
      responses: {
        201: z.custom<typeof shoppingList.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/shopping-list/:id',
      input: insertShoppingItemSchema.partial(),
      responses: {
        200: z.custom<typeof shoppingList.$inferSelect>(),
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
