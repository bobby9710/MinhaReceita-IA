import { PageLayout } from "@/components/PageLayout";
import { useRecipe, useDeleteRecipe } from "@/hooks/use-recipes";
import { useAddShoppingItem, useAddFromRecipe } from "@/hooks/use-shopping-list";
import { useRoute, Link, useLocation } from "wouter";
import { Clock, Users, ArrowLeft, Trash2, Edit, ShoppingCart, CalendarPlus, ChefHat, ExternalLink, Plus, Utensils } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getIngredientIcon } from "@/lib/ingredient-icons";

export default function RecipeDetailPage() {
  const [, params] = useRoute("/recipes/:id");
  const id = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: recipe, isLoading } = useRecipe(id);
  const deleteRecipe = useDeleteRecipe();
  const addIngredients = useAddFromRecipe();
  const addSingleIngredient = useAddShoppingItem();

  const [quantities, setQuantities] = useState<Record<number, string>>({});

  if (isLoading) return <PageLayout><div>Carregando...</div></PageLayout>;
  if (!recipe) return <PageLayout><div>Receita não encontrada</div></PageLayout>;

  const handleAddIndividual = (ing: any, index: number) => {
    const qty = quantities[index] || ing.quantity;
    addSingleIngredient.mutate({
      name: ing.name,
      quantity: qty,
      unit: ing.unit,
      recipeId: id
    }, {
      onSuccess: () => {
        toast({
          title: "Adicionado!",
          description: `${ing.name} adicionado à lista de compras.`
        });
      }
    });
  };

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja excluir esta receita?")) {
      await deleteRecipe.mutateAsync(id);
      setLocation("/recipes");
    }
  };

  return (
    <PageLayout>
      <div className="mb-8">
        <Link href="/recipes" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Receitas
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Left: Image & Info */}
        <div className="space-y-8">
          <div className="rounded-3xl overflow-hidden aspect-video shadow-xl">
            {recipe.imageUrl ? (
              <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-accent flex items-center justify-center">
                <ChefHat className="w-24 h-24 text-accent-foreground/20" />
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <Link href={`/recipes/${id}/edit`} className="flex-1">
              <button className="w-full py-3 rounded-xl border-2 border-border font-semibold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
                <Edit className="w-4 h-4" /> Editar Receita
              </button>
            </Link>
            <button 
              onClick={handleDelete}
              className="px-4 rounded-xl border-2 border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
            <h3 className="font-display font-bold text-lg">Ações Rápidas</h3>
            <div className="grid gap-3">
              <button 
                onClick={() => addIngredients.mutate(id)}
                disabled={addIngredients.isPending}
                className="w-full py-3 bg-emerald-50 text-emerald-700 rounded-xl font-semibold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" /> Adicionar à Lista de Compras
              </button>
              <Link href="/meal-planner">
                <button className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-semibold hover:bg-accent/80 transition-colors flex items-center justify-center gap-2">
                  <CalendarPlus className="w-4 h-4" /> Adicionar ao Plano de Refeições
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Content */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              {recipe.category}
            </span>
            <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-bold uppercase tracking-wider">
              {recipe.difficulty}
            </span>
          </div>

          <h1 className="text-4xl font-display font-bold text-foreground mb-4">{recipe.title}</h1>
          <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
            {recipe.description}
          </p>

          <div className="flex gap-8 border-y border-border py-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full text-primary">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Tempo de Preparo</p>
                <p className="font-bold">{recipe.prepTime} min</p>
              </div>
            </div>
            {recipe.sourceUrl && (
              <a 
                href={recipe.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-accent/50 text-accent-foreground rounded-xl hover:bg-accent transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="font-bold">Ver Receita Original</span>
              </a>
            )}
          </div>

          <div className="space-y-8">
            {/* Strict Separation: Ingredients */}
            <div>
              <h3 className="font-display font-bold text-xl mb-4 text-primary">Ingredientes</h3>
              <ul className="space-y-3">
                {recipe.ingredients.map((ing, i) => {
                  const Icon = getIngredientIcon(ing.name);
                  return (
                    <li key={i} className="flex items-center p-3 rounded-xl bg-card border border-border group/ing">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary mr-4">
                        <Icon className="w-5 h-5" />
                      </div>
                      <input 
                        type="text" 
                        className="w-16 bg-transparent border-b border-transparent focus:border-primary text-right mr-1 font-bold outline-none"
                        value={quantities[i] !== undefined ? quantities[i] : ing.quantity}
                        onChange={(e) => setQuantities(prev => ({ ...prev, [i]: e.target.value }))}
                      />
                      <span className="font-bold mr-4 text-foreground/80">{ing.unit}</span>
                      <span className="font-medium text-foreground flex-1">{ing.name}</span>
                      <button 
                        onClick={() => handleAddIndividual(ing, i)}
                        className="p-2 rounded-lg hover:bg-primary/10 text-primary opacity-0 group-hover/ing:opacity-100 transition-all"
                        title="Adicionar item individual"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Strict Separation: Spices */}
            {recipe.spices.length > 0 && (
              <div>
                <h3 className="font-display font-bold text-xl mb-4 text-orange-600">Temperos e Condimentos</h3>
                <div className="flex flex-wrap gap-2">
                  {recipe.spices.map((spice, i) => {
                    const Icon = getIngredientIcon(spice.name);
                    return (
                      <span key={i} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-50 text-orange-800 font-medium border border-orange-100">
                        <Icon className="w-4 h-4" />
                        {spice.quantity ? `${spice.quantity} ` : ''}{spice.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Steps */}
            <div>
              <h3 className="font-display font-bold text-xl mb-4 text-foreground">Instruções</h3>
              <div className="space-y-6">
                {recipe.steps.sort((a,b) => a.order - b.order).map((step, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground font-bold flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                      {step.order}
                    </div>
                    <p className="text-foreground/80 leading-relaxed pt-1">
                      {step.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
