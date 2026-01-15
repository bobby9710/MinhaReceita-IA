import { PageLayout } from "@/components/PageLayout";
import { useRecipes } from "@/hooks/use-recipes";
import { RecipeCard } from "@/components/RecipeCard";
import { Search, Filter } from "lucide-react";
import { useState } from "react";
import { categoryEnum } from "@shared/schema";

export default function RecipesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const { data: recipes, isLoading } = useRecipes({ search, category });

  return (
    <PageLayout>
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-display font-bold">Meu Livro de Receitas</h1>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Pesquisar receitas..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <select 
              className="appearance-none pl-4 pr-10 py-2 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Todas as Categorias</option>
              {categoryEnum.enumValues.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-80 bg-muted/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : recipes?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
          <p className="text-muted-foreground text-lg">Nenhuma receita encontrada. Hora de cozinhar algo novo!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes?.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
