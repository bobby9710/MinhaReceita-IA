import { PageLayout } from "@/components/PageLayout";
import { useCreateRecipe, useUpdateRecipe, useRecipe, useImportRecipe, useGenerateRecipe, useGenerateRecipeImage } from "@/hooks/use-recipes";
import { useRoute, useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { recipeWithDetailsSchema, type RecipeWithDetails, categoryEnum, difficultyEnum } from "@shared/schema";
import { Sparkles, Plus, Trash2, ArrowRight, Loader2, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ImportEvidence } from "@/components/ImportEvidence";
import { useToast } from "@/hooks/use-toast";

export default function RecipeFormPage() {
  const [, params] = useRoute("/recipes/:id/edit");
  const isEdit = !!params?.id;
  const id = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: existingRecipe, isLoading: isLoadingRecipe } = useRecipe(id);
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const importRecipe = useImportRecipe();
  const generateRecipe = useGenerateRecipe();
  const generateImage = useGenerateRecipeImage();
  const [recipePrompt, setRecipePrompt] = useState("");

  const [importUrl, setImportUrl] = useState("");
  const [supplementalText, setSupplementalText] = useState("");

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
      notes: "",
      sourceUrl: "",
      imageUrl: "",
    }
  });

  useEffect(() => {
    if (existingRecipe) {
      form.reset({
        ...existingRecipe,
        notes: existingRecipe.notes ?? "",
        sourceUrl: existingRecipe.sourceUrl ?? "",
        imageUrl: existingRecipe.imageUrl ?? "",
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
    importRecipe.mutate({ url: importUrl, supplementalText }, { onSuccess: data => form.reset(data) });
  };

  const handleGenerate = () => {
    generateRecipe.mutate(recipePrompt, {
      onSuccess: data => {
        form.reset(data);
        if (!data.imageUrl) {
          toast({
            title: "Receita gerada sem imagem",
            description: "A cota do serviço gratuito de imagens está indisponível agora. Você pode salvar a receita e tentar novamente em “Gerar imagem com IA”.",
          });
        }
      },
    });
  };

  const handleGenerateImage = () => {
    const title = form.getValues("title")?.trim();
    if (!title) {
      form.setError("title", { message: "Informe o título antes de gerar a imagem." });
      return;
    }
    generateImage.mutate({
      title,
      description: form.getValues("description"),
      ingredients: form.getValues("ingredients")?.map(({ name, quantity, unit }) => ({ name, quantity, unit })),
      spices: form.getValues("spices")?.map(({ name, quantity }) => ({ name, quantity })),
      steps: form.getValues("steps")?.map(({ content }) => ({ content })),
      variation: crypto.randomUUID(),
    }, { onSuccess: ({ imageUrl }) => form.setValue("imageUrl", imageUrl, { shouldDirty: true, shouldValidate: true }) });
  };

  if (isEdit && isLoadingRecipe) return <div>Carregando...</div>;

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-display font-bold mb-8">{isEdit ? "Editar Receita" : "Criar Nova Receita"}</h1>

        {!isEdit && (
          <section className="bg-card rounded-2xl p-6 border border-primary/20 mb-6 space-y-3">
            <h2 className="font-bold text-primary flex items-center gap-2"><Sparkles className="w-5 h-5" /> Criar receita com IA</h2>
            <label htmlFor="recipe-prompt" className="block text-sm">Conte o que deseja preparar ou cole o texto de uma receita. Inclua ingredientes, porções e restrições alimentares.</label>
            <textarea id="recipe-prompt" value={recipePrompt} onChange={event => setRecipePrompt(event.target.value)} maxLength={12000} rows={3} placeholder="Quero um jantar rápido para duas pessoas com arroz e legumes, sem leite." className="w-full px-4 py-3 rounded-xl border border-border bg-background" />
            <button type="button" onClick={handleGenerate} disabled={recipePrompt.trim().length < 10 || generateRecipe.isPending || importRecipe.isPending} className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold disabled:opacity-50 flex items-center gap-2">
              {generateRecipe.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {generateRecipe.isPending ? "Preparando receita…" : "Gerar receita"}
            </button>
            <p className="text-xs text-muted-foreground">Revise a receita antes de salvar. A disponibilidade da IA depende dos limites do serviço gratuito.</p>
          </section>
        )}

        {!isEdit && (
          <div className="bg-card rounded-2xl p-6 border border-primary/20 shadow-lg shadow-primary/5 mb-8">
            <div className="flex items-center gap-3 mb-4 text-primary">
              <Sparkles className="w-5 h-5" />
              <h2 className="font-bold">Importar receita de vídeo ou página</h2>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Cole o link do TikTok, Instagram ou da receita…"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                />
              </div>
              <button 
                onClick={handleImport}
                disabled={importRecipe.isPending || generateRecipe.isPending || !importUrl}
                className="bg-primary text-primary-foreground px-6 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {importRecipe.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Importar"}
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-3">Aceita links compartilhados pelo celular e pelo computador. A análise consulta vídeo, descrição e comentários identificáveis quando a plataforma permite.</p>
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer font-semibold">Complementar com descrição ou comentário fixado</summary>
              <label htmlFor="import-complement" className="block my-2">Se a plataforma bloquear algum texto, copie e cole aqui. Identifique a origem do conteúdo.</label>
              <textarea id="import-complement" value={supplementalText} onChange={event => setSupplementalText(event.target.value)} maxLength={6000} rows={4} placeholder="Descrição do vídeo: … Comentário fixado: …" className="w-full px-4 py-3 rounded-xl border border-border bg-background" />
            </details>
            {importRecipe.isPending && <p role="status" className="mt-3 text-sm text-primary">Lendo as fontes e analisando o vídeo. Isso pode levar alguns minutos; mantenha esta página aberta.</p>}
          </div>
        )}

        <ImportEvidence report={form.watch("importAnalysis")} />

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Info */}
          <section className="bg-card rounded-2xl p-6 border border-border space-y-6">
            <h3 className="font-display font-bold text-lg border-b border-border pb-2">Informações Básicas</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold">Título</label>
                <input {...form.register("title")} className="w-full px-4 py-2 rounded-xl border border-border bg-background" />
                {form.formState.errors.title?.message && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
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
                <label className="text-sm font-semibold">Imagem da receita</label>
                {form.watch("imageUrl") && <img src={form.watch("imageUrl") || ""} alt="Prévia da receita" className="w-full max-w-md aspect-[4/3] object-cover rounded-xl border border-border" />}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                  <input {...form.register("imageUrl")} className="flex-1 px-4 py-2 rounded-xl border border-border bg-background min-w-0" placeholder="URL da imagem ou imagem gerada" />
                  <button type="button" onClick={handleGenerateImage} disabled={generateImage.isPending} className="px-4 py-2 bg-accent text-accent-foreground rounded-xl font-bold text-sm hover:bg-accent/80 flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50">
                    {generateImage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    {generateImage.isPending ? "Gerando imagem…" : "Gerar imagem com IA"}
                  </button>
                  {form.watch("imageUrl") && <button type="button" onClick={() => form.setValue("imageUrl", "", { shouldDirty: true })} className="px-4 py-2 rounded-xl border border-border text-sm font-semibold">Remover</button>}
                </div>
                <p className="text-xs text-muted-foreground">Vídeos importados usam a capa quando disponível. A geração gratuita pode ficar temporariamente indisponível.</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold">URL de origem</label>
                <input {...form.register("sourceUrl")} className="w-full px-4 py-2 rounded-xl border border-border bg-background" placeholder="https://…" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold">Notas e ajustes</label>
                <textarea {...form.register("notes")} rows={4} className="w-full px-4 py-2 rounded-xl border border-border bg-background" placeholder="Rendimento, substituições, observações e ajustes pessoais…" />
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
