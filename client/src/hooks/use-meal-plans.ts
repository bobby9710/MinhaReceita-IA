import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type MealPlan } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

export function useMealPlans(startDate: string, endDate: string) {
  return useQuery({
    queryKey: [api.mealPlans.list.path, startDate, endDate],
    queryFn: async () => {
      const url = `${api.mealPlans.list.path}?startDate=${startDate}&endDate=${endDate}`;
      const res = await apiFetch(url);
      if (!res.ok) throw new Error("Failed to fetch meal plans");
      return api.mealPlans.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateMealPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<MealPlan, "id" | "userId">) => {
      const res = await apiFetch(api.mealPlans.create.path, {
        method: api.mealPlans.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to add meal plan");
      return api.mealPlans.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.mealPlans.list.path] });
      toast({ title: "Added", description: "Recipe added to meal plan" });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not add to meal plan", variant: "destructive" });
    }
  });
}

export function useDeleteMealPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.mealPlans.delete.path, { id });
      const res = await apiFetch(url, {
        method: api.mealPlans.delete.method,
      });
      if (!res.ok) throw new Error("Failed to remove meal plan");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.mealPlans.list.path] });
      toast({ title: "Removed", description: "Item removed from meal plan" });
    },
  });
}
