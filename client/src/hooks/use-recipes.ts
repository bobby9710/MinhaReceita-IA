import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type RecipeWithDetails } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { recipeWithDetailsSchema } from "@shared/schema";

export function useRecipes(filters?: { category?: string; search?: string }) {
  const cleanFilters = filters
    ? Object.fromEntries(Object.entries(filters).filter(([_, v]) => v != null && v !== ""))
    : undefined;

  return useQuery({
    queryKey: [api.recipes.list.path, cleanFilters],
    queryFn: async () => {
      const url = buildUrl(api.recipes.list.path);
      const queryParams = new URLSearchParams(cleanFilters as Record<string, string>).toString();
      const fullUrl = queryParams ? `${url}?${queryParams}` : url;

      const res = await apiFetch(fullUrl);
      if (!res.ok) throw new Error("Failed to fetch recipes");
      return api.recipes.list.responses[200].parse(await res.json());
    },
  });
}

export function useRecipe(id: number) {
  return useQuery({
    queryKey: [api.recipes.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.recipes.get.path, { id });
      const res = await apiFetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch recipe");
      return api.recipes.get.responses[200].parse(await res.json());
    },
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: RecipeWithDetails) => {
      const res = await apiFetch(api.recipes.create.path, {
        method: api.recipes.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to create recipe");
      }
      return api.recipes.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.recipes.list.path] });
      toast({ title: "Success", description: "Recipe created successfully!" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<RecipeWithDetails> }) => {
      const url = buildUrl(api.recipes.update.path, { id });
      const res = await apiFetch(url, {
        method: api.recipes.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to update recipe");
      return api.recipes.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.recipes.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.recipes.get.path, data.id] });
      toast({ title: "Success", description: "Recipe updated successfully!" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.recipes.delete.path, { id });
      const res = await apiFetch(url, {
        method: api.recipes.delete.method,
      });
      if (!res.ok) throw new Error("Failed to delete recipe");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.recipes.list.path] });
      toast({ title: "Deleted", description: "Recipe removed from your cookbook." });
    },
  });
}

export function useImportRecipe() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ url, supplementalText }: { url: string; supplementalText?: string }) => {
      const res = await apiFetch(api.recipes.import.path, {
        method: api.recipes.import.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, supplementalText }),
      });

      if (!res.ok) throw new Error((await res.json()).message || "Não foi possível importar a receita.");
      return api.recipes.import.responses[200].parse(await res.json());
    },
    onError: (error) => {
      toast({ title: "Não foi possível importar", description: error.message, variant: "destructive" });
    },
  });
}

export function useGenerateRecipe() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (prompt: string) => {
      const res = await apiFetch(api.recipes.generate.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Não foi possível gerar a receita.");
      return recipeWithDetailsSchema.parse(data);
    },
    onError: error => toast({ title: "Não foi possível gerar", description: error.message, variant: "destructive" }),
  });
}

export function useGenerateRecipeImage() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { title: string; description?: string; ingredients?: { name: string; quantity?: string | null; unit?: string | null }[]; spices?: { name: string; quantity?: string | null }[]; steps?: { content: string }[]; variation?: string }) => {
      const res = await apiFetch(api.recipes.generateImage.path, {
        method: api.recipes.generateImage.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Não foi possível gerar a imagem.");
      return api.recipes.generateImage.responses[200].parse(data);
    },
    onError: error => toast({ title: "Imagem não gerada", description: error.message, variant: "destructive" }),
  });
}
