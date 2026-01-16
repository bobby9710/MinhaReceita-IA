import { PageLayout } from "@/components/PageLayout";
import { useMealPlans, useCreateMealPlan, useDeleteMealPlan } from "@/hooks/use-meal-plans";
import { useRecipes } from "@/hooks/use-recipes";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, addWeeks, subWeeks } from "date-fns";
import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
        <h1 className="text-3xl font-display font-bold">Planejador de Refeições</h1>
        <div className="flex items-center gap-4 bg-card rounded-xl p-1 border border-border">
          <button 
            onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold px-4 min-w-[140px] text-center">
            {format(start, "d 'de' MMM")} - {format(end, "d 'de' MMM")}
          </span>
          <button 
            onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        <div className="w-max sm:w-full grid grid-cols-8 gap-2 sm:gap-4 pr-4 sm:pr-0">
          {/* Header Row */}
          <div className="sticky left-0 z-30 bg-background pt-12 font-bold text-muted-foreground text-[10px] sm:text-sm uppercase tracking-wider text-center border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0,1)] sm:shadow-none min-w-[80px]">
            Refeição
          </div>
          {days.map(day => (
            <div key={day.toString()} className="text-center pb-4 border-b-2 border-primary/20 min-w-[100px] sm:min-w-0">
              <p className="text-[10px] sm:text-xs font-bold text-primary uppercase mb-1">{format(day, "EEE")}</p>
              <p className="text-lg sm:text-2xl font-display font-bold">{format(day, "d")}</p>
            </div>
          ))}

          {/* Meal Rows */}
          {categories.map(category => (
            <React.Fragment key={category}>
              <div className="sticky left-0 z-30 flex items-center justify-center font-bold text-[10px] sm:text-sm text-foreground bg-accent/50 backdrop-blur-md rounded-lg h-24 sm:h-32 border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0,1)] sm:shadow-none px-1 text-center min-w-[80px]">
                {category}
              </div>
              {days.map(day => {
                const dayStr = format(day, "yyyy-MM-dd");
                const plan = mealPlans?.find(p => p.date === dayStr && p.category === category);

                return (
                  <div key={`${dayStr}-${category}`} className="h-24 sm:h-32 bg-card rounded-xl border border-border p-1.5 sm:p-2 relative group hover:border-primary/50 transition-colors shadow-sm min-w-[100px] sm:min-w-0">
                    {plan ? (
                      <div className="h-full flex flex-col justify-between overflow-hidden">
                        <div className="overflow-hidden">
                          <p className="font-bold text-[10px] sm:text-sm line-clamp-2 leading-tight">{plan.recipe.title}</p>
                          <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{plan.recipe.prepTime} min</p>
                        </div>
                        <button 
                          onClick={() => deletePlan.mutate(plan.id)}
                          className="self-end p-1 text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-md transition-all sm:opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setSelectedDay(day);
                            setSelectedCategory(category);
                            setIsModalOpen(true);
                          }}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg active:scale-90"
                        >
                          <Plus className="w-4 h-4 sm:w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
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
