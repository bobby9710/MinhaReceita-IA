import { PageLayout } from "@/components/PageLayout";
import { useMealPlans, useCreateMealPlan, useDeleteMealPlan } from "@/hooks/use-meal-plans";
import { useRecipes } from "@/hooks/use-recipes";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function MealPlannerPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  const { data: mealPlans } = useMealPlans(format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd"));
  const { data: recipes } = useRecipes();
  const createPlan = useCreateMealPlan();
  const deletePlan = useDeleteMealPlan();

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("Almoço");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const categories = ["Café da Manhã", "Almoço", "Jantar", "Sobremesa"];

  const handleAdd = (recipeId: number) => {
    if (!selectedDay) return;
    createPlan.mutate({
      date: format(selectedDay, "yyyy-MM-dd"),
      category: selectedCategory as any,
      recipeId
    });
    setIsModalOpen(false);
  };

  return (
    <PageLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold">Meu Plano de Refeições</h1>
        <div className="flex items-center gap-4 bg-card rounded-xl p-1 border border-border">
          <button 
            onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold px-2 min-w-[120px] text-center text-sm">
            {format(start, "d 'jan.' yyyy")} - {format(end, "d 'jan.' yyyy")}
          </span>
          <button 
            onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-6 pb-24">
        {days.map(day => {
          const dayStr = format(day, "yyyy-MM-dd");
          const dayPlans = mealPlans?.filter(p => p.date === dayStr) || [];
          const isToday = format(new Date(), "yyyy-MM-dd") === dayStr;

          return (
            <div key={dayStr} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className={cn(
                  "font-display font-bold text-lg capitalize",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}>
                  {isToday && <span className="mr-2">Hoje •</span>}
                  {format(day, "EEEE d", { locale: ptBR })}
                </h2>
                <button 
                  onClick={() => {
                    setSelectedDay(day);
                    setSelectedCategory("Almoço");
                    setIsModalOpen(true);
                  }}
                  className="p-1 hover:bg-accent rounded-full transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {dayPlans.length > 0 ? (
                  dayPlans.map(plan => (
                    <div key={plan.id} className="bg-card rounded-2xl border border-border p-3 flex gap-4 relative group">
                      {plan.recipe.imageUrl ? (
                        <img 
                          src={plan.recipe.imageUrl} 
                          alt={plan.recipe.title}
                          className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                          <Plus className="w-6 h-6 text-muted-foreground/20" />
                        </div>
                      )}
                      <div className="flex-1 flex flex-col justify-center gap-1 overflow-hidden">
                        <p className="font-bold text-sm sm:text-base leading-snug line-clamp-2">
                          {plan.recipe.title}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                            plan.category === "Café da Manhã" && "bg-pink-100 text-pink-600",
                            plan.category === "Almoço" && "bg-orange-100 text-orange-600",
                            plan.category === "Jantar" && "bg-blue-100 text-blue-600",
                            plan.category === "Sobremesa" && "bg-purple-100 text-purple-600"
                          )}>
                            {plan.category}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => deletePlan.mutate(plan.id)}
                        className="absolute top-2 right-2 p-1.5 text-destructive/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-4 px-1">
                    <p className="text-muted-foreground text-sm italic">Nenhuma receita ainda</p>
                  </div>
                )}
              </div>
              <div className="h-px bg-border/50 mx-1" />
            </div>
          );
        })}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Receita para {selectedDay && format(selectedDay, "EEEE, d 'de' MMM")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {recipes?.map(recipe => (
              <button 
                key={recipe.id}
                onClick={() => handleAdd(recipe.id)}
                className="text-left p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-4"
              >
                {recipe.imageUrl && (
                  <img src={recipe.imageUrl} className="w-12 h-12 rounded-lg object-cover" />
                )}
                <div>
                  <p className="font-bold text-foreground">{recipe.title}</p>
                  <p className="text-xs text-muted-foreground">{recipe.prepTime} min</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
