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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<"category" | "recipe">("category");
  const [tempCategory, setTempCategory] = useState<string>("Almoço");

  const categories = ["Café da Manhã", "Almoço", "Jantar", "Sobremesa"];

  const handleAdd = (recipeId: number) => {
    if (!selectedDay) return;
    createPlan.mutate({
      date: format(selectedDay, "yyyy-MM-dd"),
      category: tempCategory as any,
      recipeId
    });
    setIsModalOpen(false);
  };

  const filteredRecipes = recipes?.filter(r => r.category === tempCategory) || [];

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
                    setStep("category");
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
        <DialogContent className="max-w-md w-[90%] rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-display font-bold">
              {step === "category" ? "Escolha a Refeição" : `Receitas de ${tempCategory}`}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedDay && format(selectedDay, "EEEE, d 'de' MMM", { locale: ptBR })}
            </p>
          </DialogHeader>

          <div className="p-4 space-y-2">
            {step === "category" ? (
              <div className="grid gap-2">
                {categories.map(cat => {
                  let Icon = Plus;
                  if (cat === "Café da Manhã") Icon = Plus; // Coffee placeholder if needed
                  if (cat === "Almoço") Icon = ChevronRight;
                  
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setTempCategory(cat);
                        setStep("recipe");
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all group active:scale-[0.98]"
                    >
                      <span className="font-bold text-lg">{cat}</span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <button 
                  onClick={() => setStep("category")}
                  className="text-sm font-bold text-primary flex items-center gap-1 mb-2 hover:underline"
                >
                  <ChevronLeft className="w-4 h-4" /> Voltar para categorias
                </button>
                
                {filteredRecipes.length > 0 ? (
                  <div className="grid gap-3">
                    {filteredRecipes.map(recipe => (
                      <button 
                        key={recipe.id}
                        onClick={() => handleAdd(recipe.id)}
                        className="text-left p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-4 active:scale-[0.98]"
                      >
                        {recipe.imageUrl ? (
                          <img src={recipe.imageUrl} className="w-14 h-14 rounded-lg object-cover shadow-sm" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-accent flex items-center justify-center">
                            <Plus className="w-5 h-5 text-muted-foreground/20" />
                          </div>
                        )}
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold text-foreground truncate">{recipe.title}</p>
                          <p className="text-xs text-muted-foreground">{recipe.prepTime} min</p>
                        </div>
                        <Plus className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Você ainda não tem receitas nesta categoria.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
