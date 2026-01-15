import { Link } from "wouter";
import { Clock, ChefHat, ExternalLink } from "lucide-react";
import type { Recipe } from "@shared/schema";
import { cn } from "@/lib/utils";

interface RecipeCardProps {
  recipe: Recipe;
}

const difficultyColor = {
  "Fácil": "bg-green-100 text-green-700",
  "Média": "bg-yellow-100 text-yellow-700",
  "Difícil": "bg-red-100 text-red-700",
};

export function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Link href={`/recipes/${recipe.id}`} className="block h-full">
      <div className="group h-full bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {recipe.imageUrl ? (
            <img 
              src={recipe.imageUrl} 
              alt={recipe.title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ChefHat className="w-12 h-12 opacity-20" />
            </div>
          )}
          <div className="absolute top-3 right-3">
            <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider", difficultyColor[recipe.difficulty as keyof typeof difficultyColor])}>
              {recipe.difficulty}
            </span>
          </div>
        </div>
        
        <div className="p-5 flex-1 flex flex-col">
          <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
            {recipe.category}
          </div>
          <h3 className="text-lg font-display font-bold text-foreground mb-2 line-clamp-1 group-hover:text-primary transition-colors">
            {recipe.title}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
            {recipe.description}
          </p>
          
          <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-border pt-4">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{recipe.prepTime} min</span>
            </div>
            {recipe.sourceUrl && (
              <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
