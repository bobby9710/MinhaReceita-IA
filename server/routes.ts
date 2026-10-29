import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { AIError, aiCapabilities, generateRecipe } from "./ai";
import { importRecipe } from "./import-recipe";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replit_integrations/auth";
import { registerAuthRoutes } from "./replit_integrations/auth";
import { generateRecipeImageAsset, getImageAsset } from "./image-assets";
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Setup Auth first
  await setupAuth(app);
  registerAuthRoutes(app);

  // === Recipes Routes ===

  app.get(api.recipes.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const { category, search } = z.object({ category: z.string().optional(), search: z.string().max(200).optional() }).parse(req.query);
    const recipes = await storage.getRecipes(userId, category, search);
    res.json(recipes);
  });

  app.get(api.recipes.get.path, isAuthenticated, async (req, res) => {
    const recipe = await storage.getRecipe(Number(req.params.id), req.user!.id);
    if (!recipe) return res.status(404).json({ message: "Receita não encontrada" });
    res.json(recipe);
  });

  app.post(api.recipes.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const input = api.recipes.create.input.parse(req.body);
      const recipe = await storage.createRecipe(input, userId);
      res.status(201).json(recipe);
    } catch (err) {
      if ((err as any).status === 404) return res.status(404).json({ message: "Receita não encontrada." });
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Verifique os campos obrigatórios da receita." });
      }
      res.status(500).json({ message: "Não foi possível salvar a receita" });
    }
  });

  app.put(api.recipes.update.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const input = api.recipes.update.input.parse(req.body);
      const recipe = await storage.updateRecipe(Number(req.params.id), input, userId);
      res.json(recipe);
    } catch (err) {
      if ((err as any).status === 404) return res.status(404).json({ message: "Receita não encontrada." });
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Verifique os campos obrigatórios da receita." });
      }
      res.status(500).json({ message: "Não foi possível salvar a receita" });
    }
  });

  app.delete(api.recipes.delete.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    await storage.deleteRecipe(Number(req.params.id), userId);
    res.status(204).send();
  });

  app.get("/api/ai/capabilities", isAuthenticated, (_req, res) => res.json(aiCapabilities()));

  const aiRequests = new Map<number, number>();
  function reserveRequest(userId: number) {
    const now = Date.now();
    for (const [id, expiry] of aiRequests) if (expiry <= now) aiRequests.delete(id);
    if (aiRequests.has(userId)) throw new AIError("Aguarde alguns segundos antes de fazer outro pedido de IA.", 429);
    aiRequests.set(userId, now + 10000);
  }
  function aiFailure(error: unknown, res: import("express").Response) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Verifique o pedido ou endereço informado." });
    if (error instanceof AIError) return res.status(error.status).json({ message: error.message });
    return res.status(503).json({ message: "Não foi possível concluir o pedido de IA. Tente novamente mais tarde." });
  }
  app.post(api.recipes.generate.path, isAuthenticated, async (req, res) => {
    try {
      const { prompt } = api.recipes.generate.input.parse(req.body);
      reserveRequest(req.user!.id);
      const recipe = await generateRecipe(prompt, req.user!.id);
      try { recipe.imageUrl = await generateRecipeImageAsset(recipe, req.user!.id); }
      catch (error) {
        if (error instanceof AIError && error.status === 429) return aiFailure(error, res);
      }
      res.json(recipe);
    } catch (error) { aiFailure(error, res); }
  });
  app.post(api.recipes.import.path, isAuthenticated, async (req, res) => {
    try {
      const { url, supplementalText } = api.recipes.import.input.parse(req.body);
      reserveRequest(req.user!.id);
      res.json(await importRecipe(url, req.user!.id, supplementalText));
    } catch (error) { aiFailure(error, res); }
  });
  app.post(api.recipes.generateImage.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.recipes.generateImage.input.parse(req.body);
      res.json({ imageUrl: await generateRecipeImageAsset(input, req.user!.id) });
    } catch (error) { aiFailure(error, res); }
  });
  app.get("/api/recipe-images/:id", isAuthenticated, async (req, res) => {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) return res.status(404).end();
    const image = await getImageAsset(id.data, req.user!.id);
    if (!image) return res.status(404).end();
    res.set({ "Content-Type": image.mimeType, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" });
    res.send(image.data);
  });

  // === Meal Plans & Shopping List ===

  app.get(api.mealPlans.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const { startDate, endDate } = req.query as any;
    const plans = await storage.getMealPlans(userId, startDate, endDate);
    res.json(plans);
  });

  app.post(api.mealPlans.create.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const input = api.mealPlans.create.input.parse(req.body);
    const plan = await storage.createMealPlan(input, userId);
    res.status(201).json(plan);
  });

  app.delete(api.mealPlans.delete.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    await storage.deleteMealPlan(Number(req.params.id), userId);
    res.status(204).send();
  });

  app.get(api.shoppingList.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const items = await storage.getShoppingList(userId);
    res.json(items);
  });

  app.post(api.shoppingList.create.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const input = api.shoppingList.create.input.parse(req.body);
    const item = await storage.createShoppingItem(input, userId);
    res.status(201).json(item);
  });

  app.put(api.shoppingList.update.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const input = api.shoppingList.update.input.parse(req.body);
    const item = await storage.updateShoppingItem(Number(req.params.id), input, userId);
    res.json(item);
  });

  app.delete(api.shoppingList.delete.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    await storage.deleteShoppingItem(Number(req.params.id), userId);
    res.status(204).send();
  });

  app.post(api.shoppingList.addFromRecipe.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    await storage.addIngredientsToShoppingList(Number(req.params.id), userId);
    res.json({ message: "Ingredientes adicionados à lista de compras" });
  });

  app.delete(api.shoppingList.clear.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    await storage.clearShoppingList(userId);
    res.status(204).send();
  });

  return httpServer;
}
