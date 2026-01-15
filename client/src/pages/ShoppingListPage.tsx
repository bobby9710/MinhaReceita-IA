import { PageLayout } from "@/components/PageLayout";
import { useShoppingList, useAddShoppingItem, useUpdateShoppingItem, useDeleteShoppingItem, useClearShoppingList } from "@/hooks/use-shopping-list";
import { useState } from "react";
import { Plus, Trash2, Check, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ShoppingListPage() {
  const { data: items, isLoading } = useShoppingList();
  const addItem = useAddShoppingItem();
  const updateItem = useUpdateShoppingItem();
  const deleteItem = useDeleteShoppingItem();
  const clearList = useClearShoppingList();

  const [newItemName, setNewItemName] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    addItem.mutate({ name: newItemName, quantity: "1", unit: "pc" });
    setNewItemName("");
  };

  const pendingItems = items?.filter(i => !i.isBought) || [];
  const boughtItems = items?.filter(i => i.isBought) || [];

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-display font-bold">Lista de Compras</h1>
          <button 
            onClick={() => { if(confirm("Limpar toda a lista?")) clearList.mutate() }}
            className="text-muted-foreground hover:text-destructive text-sm font-medium transition-colors"
          >
            Limpar Lista
          </button>
        </header>

        <form onSubmit={handleAdd} className="flex gap-2 mb-8">
          <input 
            type="text"
            placeholder="Adicionar novo item..."
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
          />
          <button type="submit" className="bg-primary text-primary-foreground px-6 rounded-xl font-bold hover:bg-primary/90 transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        </form>

        <div className="space-y-8">
          {/* Pending */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="bg-accent/30 px-6 py-3 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-lg">Para Comprar ({pendingItems.length})</h2>
              <ShoppingCart className="w-5 h-5 text-accent-foreground/50" />
            </div>
            <div className="divide-y divide-border">
              {pendingItems.map(item => (
                <div key={item.id} className="flex items-center p-4 hover:bg-muted/30 transition-colors group">
                  <button 
                    onClick={() => updateItem.mutate({ id: item.id, data: { isBought: true } })}
                    className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 mr-4 hover:border-primary transition-colors"
                  />
                  <div className="flex-1">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">{item.quantity} {item.unit}</span>
                  </div>
                  <button 
                    onClick={() => deleteItem.mutate(item.id)}
                    className="text-destructive/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {pendingItems.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  Seu carrinho está vazio! Hora de planejar algumas refeições?
                </div>
              )}
            </div>
          </div>

          {/* Bought */}
          {boughtItems.length > 0 && (
            <div className="opacity-60">
              <h2 className="font-bold text-lg mb-3 px-2">Comprado</h2>
              <div className="bg-card rounded-2xl border border-border divide-y divide-border">
                {boughtItems.map(item => (
                  <div key={item.id} className="flex items-center p-4 bg-muted/20">
                    <button 
                      onClick={() => updateItem.mutate({ id: item.id, data: { isBought: false } })}
                      className="w-6 h-6 rounded-full bg-emerald-500 border-none mr-4 flex items-center justify-center text-white"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <div className="flex-1 line-through text-muted-foreground">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm ml-2">{item.quantity} {item.unit}</span>
                    </div>
                    <button 
                      onClick={() => deleteItem.mutate(item.id)}
                      className="text-destructive/50 hover:text-destructive transition-colors p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
