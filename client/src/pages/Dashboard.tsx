import { PageLayout } from "@/components/PageLayout";
import { useAuth } from "@/hooks/use-auth";
import { useRecipes } from "@/hooks/use-recipes";
import { useMealPlans } from "@/hooks/use-meal-plans";
import { RecipeCard } from "@/components/RecipeCard";
import { format, startOfDay, endOfDay } from "date-fns";
import { Calendar, ShoppingBag, TrendingUp } from "lucide-react";
import { Link } from "wouter";

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
          Bon Appétit, {user?.firstName}! 👩‍🍳
        </h1>
        <p className="text-muted-foreground">Here's what's happening in your kitchen today.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Today's Plan */}
        <div className="lg:col-span-2 bg-gradient-to-br from-primary to-orange-600 rounded-3xl p-8 text-white shadow-xl shadow-primary/25 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold">Today's Menu</h2>
            </div>
            
            {mealPlans && mealPlans.length > 0 ? (
              <div className="grid gap-4">
                {mealPlans.map(plan => (
                  <Link href={`/recipes/${plan.recipeId}`} key={plan.id}>
                    <div className="bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm p-4 rounded-xl flex items-center justify-between cursor-pointer border border-white/10">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1 block">{plan.category}</span>
                        <span className="font-bold text-lg">{plan.recipe.title}</span>
                      </div>
                      <div className="bg-white text-primary px-3 py-1 rounded-full text-xs font-bold">
                        {plan.recipe.prepTime} min
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/10 text-center">
                <p className="opacity-90 mb-4">No meals planned for today.</p>
                <Link href="/meal-planner">
                  <button className="bg-white text-primary px-6 py-2 rounded-full font-bold text-sm hover:bg-white/90 transition-colors">
                    Plan Meals
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
              <span className="font-bold">Shopping List</span>
            </div>
            <p className="text-muted-foreground text-sm mb-4">Don't forget to check what you need for this week.</p>
            <Link href="/shopping-list">
              <button className="w-full py-2 rounded-lg border-2 border-emerald-100 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors text-sm">
                View List
              </button>
            </Link>
          </div>
          
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-3 text-blue-600 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-bold">Total Recipes</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{recipes?.length || 0}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-bold">Recently Added</h2>
        <Link href="/recipes" className="text-primary font-semibold hover:underline">View All</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recentRecipes?.map(recipe => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </PageLayout>
  );
}
