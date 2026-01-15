import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type RecipeWithDetails } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useRecipes(filters?: { category?: string; search?: string }) {
  // Clean up empty filters
  const cleanFilters = filters ? Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v != null && v !== "")
  ) : undefined;

  return useQuery({
    queryKey: [api.recipes.list.path, cleanFilters],
    queryFn: async () => {
      const url = buildUrl(api.recipes.list.path);
      const queryParams = new URLSearchParams(cleanFilters as Record<string, string>).toString();
      const fullUrl = queryParams ? `${url}?${queryParams}` : url;
      
      const res = await fetch(fullUrl, { credentials: "include" });
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
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch recipe");
      return api.recipes.get.responses[200].parse(await res.json());
    },
    enabled: !isNaN(id),
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: RecipeWithDetails) => {
      const res = await fetch(api.recipes.create.path, {
        method: api.recipes.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
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
      const res = await fetch(url, {
        method: api.recipes.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
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
      const res = await fetch(url, { 
        method: api.recipes.delete.method,
        credentials: "include" 
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
    mutationFn: async (url: string) => {
      const res = await fetch(api.recipes.import.path, {
        method: api.recipes.import.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to import recipe. Try a different URL.");
      return api.recipes.import.responses[200].parse(await res.json());
    },
    onError: (error) => {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useGenerateRecipeImage() {
  return useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch(api.recipes.generateImage.path, {
        method: api.recipes.generateImage.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to generate image");
      return api.recipes.generateImage.responses[200].parse(await res.json());
    }
  });
}
