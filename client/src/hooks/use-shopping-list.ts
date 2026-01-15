import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type ShoppingItem } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useShoppingList() {
  return useQuery({
    queryKey: [api.shoppingList.list.path],
    queryFn: async () => {
      const res = await fetch(api.shoppingList.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch shopping list");
      return api.shoppingList.list.responses[200].parse(await res.json());
    },
  });
}

export function useAddShoppingItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<ShoppingItem, "id" | "userId" | "isBought" | "recipeId">) => {
      const res = await fetch(api.shoppingList.create.path, {
        method: api.shoppingList.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to add item");
      return api.shoppingList.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shoppingList.list.path] });
      toast({ title: "Added", description: "Item added to shopping list" });
    },
  });
}

export function useUpdateShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ShoppingItem> }) => {
      const url = buildUrl(api.shoppingList.update.path, { id });
      const res = await fetch(url, {
        method: api.shoppingList.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update item");
      return api.shoppingList.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shoppingList.list.path] });
    },
  });
}

export function useDeleteShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.shoppingList.delete.path, { id });
      const res = await fetch(url, { 
        method: api.shoppingList.delete.method,
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shoppingList.list.path] });
    },
  });
}

export function useAddFromRecipe() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (recipeId: number) => {
      const url = buildUrl(api.shoppingList.addFromRecipe.path, { id: recipeId });
      const res = await fetch(url, { 
        method: api.shoppingList.addFromRecipe.method,
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to add ingredients");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shoppingList.list.path] });
      toast({ title: "Imported", description: "Ingredients added to shopping list" });
    },
  });
}

export function useClearShoppingList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.shoppingList.clear.path, { 
        method: api.shoppingList.clear.method,
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to clear list");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shoppingList.list.path] });
      toast({ title: "Cleared", description: "Shopping list cleared" });
    },
  });
}
