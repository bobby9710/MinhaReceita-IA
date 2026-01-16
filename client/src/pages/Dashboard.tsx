import { PageLayout } from "@/components/PageLayout";
import { useAuth } from "@/hooks/use-auth";
import { useRecipes } from "@/hooks/use-recipes";
import { useMealPlans } from "@/hooks/use-meal-plans";
import { RecipeCard } from "@/components/RecipeCard";
import { format, startOfDay, endOfDay } from "date-fns";
import { Calendar, ShoppingBag, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: recipes } = useRecipes();
  
  // Get today's meal plan
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: mealPlans } = useMealPlans(today, today);

  const recentRecipes = recipes?.slice(0, 3);

  return (
    <PageLayout>
      <header className="mb-10">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Bom Apetite, {user?.firstName}! 👩‍🍳
        </h1>
        <p className="text-muted-foreground">Aqui está o que está acontecendo na sua cozinha hoje.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Today's Plan */}
        <div className="lg:col-span-2 bg-gradient-to-br from-primary to-orange-600 rounded-3xl p-8 text-white shadow-xl shadow-primary/25 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold">Menu de Hoje</h2>
            </div>
            
            {mealPlans && mealPlans.length > 0 ? (
              <div className="grid gap-4">
                {mealPlans.map(plan => (
                  <Link href={`/recipes/${plan.recipeId}`} key={plan.id}>
                    <div className="bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm p-3 rounded-2xl flex gap-4 cursor-pointer border border-white/10 group">
                      {plan.recipe.imageUrl ? (
                        <img 
                          src={plan.recipe.imageUrl} 
                          alt={plan.recipe.title}
                          className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-white/20"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-6 h-6 text-white/40" />
                        </div>
                      )}
                      <div className="flex-1 flex flex-col justify-center gap-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border border-white/20 backdrop-blur-md",
                            plan.category === "Café da Manhã" && "bg-pink-500/30 text-white",
                            plan.category === "Almoço" && "bg-orange-500/30 text-white",
                            plan.category === "Jantar" && "bg-blue-500/30 text-white",
                            plan.category === "Sobremesa" && "bg-purple-500/30 text-white"
                          )}>
                            {plan.category}
                          </span>
                        </div>
                        <span className="font-bold text-base leading-tight text-white line-clamp-1 group-hover:underline">{plan.recipe.title}</span>
                      </div>
                      <div className="self-center bg-white/20 text-white px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap backdrop-blur-sm">
                        {plan.recipe.prepTime} min
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/10 text-center">
                <p className="opacity-90 mb-4">Nenhuma refeição planejada para hoje.</p>
                <Link href="/meal-planner">
                  <button className="bg-white text-primary px-6 py-2 rounded-full font-bold text-sm hover:bg-white/90 transition-colors">
                    Planejar Refeições
                  </button>
                </Link>
              </div>
            )}
          </div>
          {/* Decorative Circle */}
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {/* Quick Stats / Actions */}
        <div className="space-y-6">
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-3 text-emerald-600 mb-2">
              <ShoppingBag className="w-5 h-5" />
              <span className="font-bold">Lista de Compras</span>
            </div>
            <p className="text-muted-foreground text-sm mb-4">Não esqueça de verificar o que você precisa para esta semana.</p>
            <Link href="/shopping-list">
              <button className="w-full py-2 rounded-lg border-2 border-emerald-100 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors text-sm">
                Ver Lista
              </button>
            </Link>
          </div>
          
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-3 text-blue-600 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-bold">Total de Receitas</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{recipes?.length || 0}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-bold">Adicionadas Recentemente</h2>
        <Link href="/recipes" className="text-primary font-semibold hover:underline">Ver Todas</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recentRecipes?.map(recipe => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </PageLayout>
  );
}
