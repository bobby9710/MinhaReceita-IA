import { PageLayout } from "@/components/PageLayout";
import { useCreateRecipe, useUpdateRecipe, useRecipe, useImportRecipe, useGenerateRecipeImage } from "@/hooks/use-recipes";
import { useRoute, useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { recipeWithDetailsSchema, type RecipeWithDetails, categoryEnum, difficultyEnum } from "@shared/schema";
import { Sparkles, Plus, Trash2, ArrowRight, Loader2, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function RecipeFormPage() {
  const [, params] = useRoute("/recipes/:id/edit");
  const isEdit = !!params?.id;
  const id = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();

  const { data: existingRecipe, isLoading: isLoadingRecipe } = useRecipe(id);
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const importRecipe = useImportRecipe();
  const generateImage = useGenerateRecipeImage();

  const [importUrl, setImportUrl] = useState("");

  const form = useForm<RecipeWithDetails>({
    resolver: zodResolver(recipeWithDetailsSchema),
    defaultValues: {
      title: "",
      description: "",
      prepTime: 30,
      difficulty: "Média",
      category: "Almoço",
      ingredients: [{ name: "", quantity: "", unit: "un" }],
      spices: [],
      steps: [{ content: "", order: 1 }],
    }
  });

  useEffect(() => {
    if (existingRecipe) {
      form.reset({
        ...existingRecipe,
        ingredients: existingRecipe.ingredients || [],
        spices: existingRecipe.spices || [],
        steps: existingRecipe.steps || []
      });
    }
  }, [existingRecipe, form]);

  const { fields: ingredients, append: appendIng, remove: removeIng } = useFieldArray({
    control: form.control,
    name: "ingredients"
  });

  const { fields: spices, append: appendSpice, remove: removeSpice } = useFieldArray({
    control: form.control,
    name: "spices"
  });

  const { fields: steps, append: appendStep, remove: removeStep } = useFieldArray({
    control: form.control,
    name: "steps"
  });

  const onSubmit = async (data: RecipeWithDetails) => {
    // Ensure orders are correct
    data.steps = data.steps.map((s, i) => ({ ...s, order: i + 1 }));
    
    if (isEdit) {
      await updateRecipe.mutateAsync({ id, data });
    } else {
      await createRecipe.mutateAsync(data);
    }
    setLocation("/recipes");
  };

  const handleImport = async () => {
    if (!importUrl) return;
    const data = await importRecipe.mutateAsync(importUrl);
    form.reset(data);
  };

  const handleGenerateImage = async () => {
    const title = form.getValues("title");
    if (!title) return;
    const { imageUrl } = await generateImage.mutateAsync(title);
    form.setValue("imageUrl", imageUrl);
  };

  if (isEdit && isLoadingRecipe) return <div>Carregando...</div>;

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-display font-bold mb-8">{isEdit ? "Editar Receita" : "Criar Nova Receita"}</h1>

        {!isEdit && (
          <div className="bg-card rounded-2xl p-6 border border-primary/20 shadow-lg shadow-primary/5 mb-8">
            <div className="flex items-center gap-3 mb-4 text-primary">
              <Sparkles className="w-5 h-5" />
              <h2 className="font-bold">Importação Mágica com IA</h2>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="url"
                  placeholder="Cole a URL da receita aqui..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                />
              </div>
              <button 
                onClick={handleImport}
                disabled={importRecipe.isPending}
                className="bg-primary text-primary-foreground px-6 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {importRecipe.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Importar"}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Info */}
          <section className="bg-card rounded-2xl p-6 border border-border space-y-6">
            <h3 className="font-display font-bold text-lg border-b border-border pb-2">Informações Básicas</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold">Título</label>
                <input {...form.register("title")} className="w-full px-4 py-2 rounded-xl border border-border bg-background" />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold">Descrição</label>
                <textarea {...form.register("description")} className="w-full px-4 py-2 rounded-xl border border-border bg-background h-24" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Tempo de Preparo (min)</label>
                <input type="number" {...form.register("prepTime", { valueAsNumber: true })} className="w-full px-4 py-2 rounded-xl border border-border bg-background" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Categoria</label>
                <select {...form.register("category")} className="w-full px-4 py-2 rounded-xl border border-border bg-background">
                  {categoryEnum.enumValues.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Dificuldade</label>
                <select {...form.register("difficulty")} className="w-full px-4 py-2 rounded-xl border border-border bg-background">
                  {difficultyEnum.enumValues.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold">URL da Imagem</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input {...form.register("imageUrl")} className="flex-1 px-4 py-2 rounded-xl border border-border bg-background min-w-0" placeholder="https://..." />
                  <button 
                    type="button" 
                    onClick={handleGenerateImage}
                    disabled={generateImage.isPending}
                    className="w-full sm:w-auto px-4 py-2 bg-accent text-accent-foreground rounded-xl font-bold text-sm hover:bg-accent/80 flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    {generateImage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    Gerar Imagem com IA
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Ingredients - Strict Separation */}
          <section className="bg-card rounded-2xl p-4 sm:p-6 border border-border space-y-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-2 gap-2">
              <h3 className="font-display font-bold text-lg text-primary truncate">Ingredientes</h3>
              <button type="button" onClick={() => appendIng({ name: "", quantity: "", unit: "un" })} className="text-xs sm:text-sm text-primary font-bold hover:underline flex items-center gap-1 flex-shrink-0">
                <Plus className="w-4 h-4" /> Adicionar Ingrediente
              </button>
            </div>
            
            <div className="space-y-3">
              {ingredients.map((field, index) => (
                <div key={field.id} className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 items-center">
                  <input {...form.register(`ingredients.${index}.quantity`)} placeholder="Qtd" className="w-[60px] sm:w-20 px-3 py-2 rounded-lg border border-border" />
                  <input {...form.register(`ingredients.${index}.unit`)} placeholder="Unid" className="w-[60px] sm:w-20 px-3 py-2 rounded-lg border border-border" />
                  <input {...form.register(`ingredients.${index}.name`)} placeholder="Nome" className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border border-border" />
                  <button type="button" onClick={() => removeIng(index)} className="p-2 text-destructive/50 hover:text-destructive flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Spices - Strict Separation */}
          <section className="bg-card rounded-2xl p-4 sm:p-6 border border-border space-y-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-2 gap-2">
              <h3 className="font-display font-bold text-lg text-orange-600 truncate">Temperos e Condimentos</h3>
              <button type="button" onClick={() => appendSpice({ name: "", quantity: "" })} className="text-xs sm:text-sm text-orange-600 font-bold hover:underline flex items-center gap-1 flex-shrink-0">
                <Plus className="w-4 h-4" /> Adicionar Tempero
              </button>
            </div>
            
            <div className="space-y-3">
              {spices.map((field, index) => (
                <div key={field.id} className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 items-center">
                  <input {...form.register(`spices.${index}.quantity`)} placeholder="Qtd (opc)" className="w-full sm:w-24 px-3 py-2 rounded-lg border border-border" />
                  <input {...form.register(`spices.${index}.name`)} placeholder="Nome do Tempero" className="flex-1 min-w-[150px] px-3 py-2 rounded-lg border border-border" />
                  <button type="button" onClick={() => removeSpice(index)} className="p-2 text-destructive/50 hover:text-destructive flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Steps */}
          <section className="bg-card rounded-2xl p-6 border border-border space-y-4">
             <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-display font-bold text-lg">Instruções</h3>
              <button type="button" onClick={() => appendStep({ content: "", order: steps.length + 1 })} className="text-sm font-bold hover:underline flex items-center gap-1">
                <Plus className="w-4 h-4" /> Adicionar Passo
              </button>
            </div>

            <div className="space-y-4">
              {steps.map((field, index) => (
                <div key={field.id} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground mt-1 flex-shrink-0">
                    {index + 1}
                  </div>
                  <textarea 
                    {...form.register(`steps.${index}.content`)} 
                    className="flex-1 px-4 py-2 rounded-lg border border-border h-20"
                    placeholder="Descreva este passo..."
                  />
                  <button type="button" onClick={() => removeStep(index)} className="p-2 text-destructive/50 hover:text-destructive self-start">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-end gap-4 pt-4">
            <button 
              type="button" 
              onClick={() => setLocation("/recipes")}
              className="px-6 py-3 font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={createRecipe.isPending || updateRecipe.isPending}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {(createRecipe.isPending || updateRecipe.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar Receita
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
