import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replit_integrations/auth";
import { registerAuthRoutes } from "./replit_integrations/auth";
import { openai } from "./replit_integrations/image"; // Reuse OpenAI client
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup Auth first
  await setupAuth(app);
  registerAuthRoutes(app);

  // === AI Helper Functions ===
  
  async function downloadAudio(url: string): Promise<string> {
    // Ensure downloads dir exists
    const downloadDir = path.join(process.cwd(), "downloads");
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir);
    }

    const outputId = randomUUID();
    const outputPath = path.join(downloadDir, `${outputId}.%(ext)s`);
    
    // Use yt-dlp to download audio
    // -x: extract audio
    // --audio-format mp3: convert to mp3
    // --audio-quality 0: best quality
    try {
      // Check if it's a video site supported by yt-dlp
      await execAsync(`yt-dlp -x --audio-format mp3 --audio-quality 9 -o "${outputPath}" "${url}"`);
      return path.join(downloadDir, `${outputId}.mp3`);
    } catch (error) {
      console.error("yt-dlp error:", error);
      throw new Error("Failed to download media from URL. Make sure it's a valid public link.");
    }
  }

  async function transcribeAudio(filePath: string): Promise<string> {
    try {
      // Need to use fs.createReadStream for OpenAI file upload
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "gpt-4o-mini-transcribe",
      });
      return transcription.text;
    } catch (error) {
      console.error("Transcription error:", error);
      throw new Error("Failed to transcribe audio.");
    } finally {
      // Cleanup file
      fs.unlink(filePath, () => {});
    }
  }

  async function analyzeRecipe(text: string, originalUrl: string): Promise<any> {
    const prompt = `
      Analyze the following cooking content and extract a structured recipe.
      Content: "${text}"
      
      HARD RULES:
      1. Strictly separate Ingredients (food items) from Spices (seasonings, salt, pepper, herbs).
      2. If quantity is missing, infer it or use "a gosto" for spices.
      3. Format Step-by-step instructions clearly.
      4. Suggest a Title, Description, Prep Time (minutes), Difficulty (Facil, Media, Dificil), Category (CafeManha, CafeTarde, Almoco, Jantar, Sobremesa, Outros).
      5. Translate everything to Portuguese.

      Return JSON format:
      {
        "title": string,
        "description": string,
        "prepTime": number,
        "difficulty": "Facil" | "Media" | "Dificil",
        "category": "CafeManha" | "CafeTarde" | "Almoco" | "Jantar" | "Sobremesa" | "Outros",
        "ingredients": [{ "name": string, "quantity": string, "unit": string }],
        "spices": [{ "name": string, "quantity": string }],
        "steps": [{ "content": string, "order": number }],
        "notes": string (optional observations)
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: "You are a professional chef assistant." }, { role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("AI returned empty response");
    
    const data = JSON.parse(content);
    return { ...data, sourceUrl: originalUrl };
  }

  // === Recipes Routes ===

  app.get(api.recipes.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { category, search } = req.query as any;
    const recipes = await storage.getRecipes(userId, category, search);
    res.json(recipes);
  });

  app.get(api.recipes.get.path, isAuthenticated, async (req, res) => {
    const recipe = await storage.getRecipe(Number(req.params.id));
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });
    res.json(recipe);
  });

  app.post(api.recipes.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.recipes.create.input.parse(req.body);
      const recipe = await storage.createRecipe(input, userId);
      res.status(201).json(recipe);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.put(api.recipes.update.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.recipes.update.input.parse(req.body);
      const recipe = await storage.updateRecipe(Number(req.params.id), input, userId);
      res.json(recipe);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.delete(api.recipes.delete.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    await storage.deleteRecipe(Number(req.params.id), userId);
    res.status(204).send();
  });

  // === AI Import Route ===
  app.post(api.recipes.import.path, isAuthenticated, async (req, res) => {
    try {
      const { url } = req.body;
      
      // 1. Determine type (Video vs Text)
      // For MVP simplicity, we'll assume most social links are video/media and try yt-dlp first.
      // If it fails or is a text site, we could use a scraper, but let's stick to yt-dlp -> Whisper for the "Video" requirement
      // and direct text analysis for others.
      
      let textToAnalyze = "";

      // Check if likely video
      const isVideoSite = url.includes("youtube") || url.includes("youtu.be") || url.includes("tiktok") || url.includes("instagram");
      
      if (isVideoSite) {
        console.log("Processing video...");
        try {
          const audioPath = await downloadAudio(url);
          console.log("Audio downloaded, transcribing...");
          textToAnalyze = await transcribeAudio(audioPath);
        } catch (e) {
           console.log("Video download failed, falling back to URL analysis directly (maybe description extraction)");
           // Fallback: Ask AI to scrape/analyze the URL directly? 
           // Replit AI integration doesn't support browsing.
           // We will rely on what we have. If yt-dlp fails, we might just fail or try to guess from metadata if possible.
           // For now, let's propagate the error if it was a video site.
           throw e;
        }
      } else {
        // Text site or unknown
        // Ideally we fetch the HTML content.
        // For MVP, since we don't have a browsing tool installed, we'll try to fetch using standard fetch if it's a static site.
        try {
          const response = await fetch(url);
          const html = await response.text();
          // Naive extraction of body text to avoid token limits
          // A real scraper would be better, but we are limited.
          textToAnalyze = html.replace(/<[^>]*>/g, ' ').substring(0, 15000); // Limit context
        } catch (e) {
          throw new Error("Failed to fetch website content");
        }
      }

      console.log("Analyzing content...");
      const recipeData = await analyzeRecipe(textToAnalyze, url);
      
      // Generate Image
      console.log("Generating image...");
      try {
        const imageResponse = await openai.images.generate({
          model: "gpt-image-1",
          prompt: `Professional food photography of ${recipeData.title}. High quality, delicious, studio lighting.`,
          size: "512x512",
        });
        recipeData.imageUrl = imageResponse.data[0].url;
      } catch (e) {
        console.error("Image generation failed", e);
        // Continue without image
      }

      res.json(recipeData);

    } catch (error: any) {
      console.error("Import error:", error);
      res.status(400).json({ message: error.message || "Failed to import recipe" });
    }
  });

  app.post(api.recipes.generateImage.path, isAuthenticated, async (req, res) => {
    try {
      const { title } = req.body;
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: `Professional food photography of ${title}. High quality, delicious, studio lighting.`,
        size: "512x512",
      });
      res.json({ imageUrl: response.data[0].url });
    } catch (e) {
      res.status(500).json({ message: "Failed to generate image" });
    }
  });

  // === Meal Plans & Shopping List ===

  app.get(api.mealPlans.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { startDate, endDate } = req.query as any;
    const plans = await storage.getMealPlans(userId, startDate, endDate);
    res.json(plans);
  });

  app.post(api.mealPlans.create.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const input = api.mealPlans.create.input.parse(req.body);
    const plan = await storage.createMealPlan(input, userId);
    res.status(201).json(plan);
  });

  app.delete(api.mealPlans.delete.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    await storage.deleteMealPlan(Number(req.params.id), userId);
    res.status(204).send();
  });

  app.get(api.shoppingList.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const items = await storage.getShoppingList(userId);
    res.json(items);
  });

  app.post(api.shoppingList.create.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const input = api.shoppingList.create.input.parse(req.body);
    const item = await storage.createShoppingItem(input, userId);
    res.status(201).json(item);
  });

  app.put(api.shoppingList.update.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const input = api.shoppingList.update.input.parse(req.body);
    const item = await storage.updateShoppingItem(Number(req.params.id), input, userId);
    res.json(item);
  });

  app.delete(api.shoppingList.delete.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    await storage.deleteShoppingItem(Number(req.params.id), userId);
    res.status(204).send();
  });

  app.post(api.shoppingList.addFromRecipe.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    await storage.addIngredientsToShoppingList(Number(req.params.id), userId);
    res.json({ message: "Ingredients added to shopping list" });
  });

  app.delete(api.shoppingList.clear.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    await storage.clearShoppingList(userId);
    res.status(204).send();
  });

  return httpServer;
}
