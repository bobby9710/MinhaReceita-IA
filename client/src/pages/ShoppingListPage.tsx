import { PageLayout } from "@/components/PageLayout";
import { useShoppingList, useAddShoppingItem, useUpdateShoppingItem, useDeleteShoppingItem, useClearShoppingList } from "@/hooks/use-shopping-list";
import { useMemo, useState } from "react";
import { Plus, Trash2, Check, ShoppingCart, Share2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { getIngredientIcon } from "@/lib/ingredient-icons";
import { getShoppingCategory, shoppingCategoryOrder } from "@/lib/shopping-categories";
import type { ShoppingItem } from "@shared/routes";

export default function ShoppingListPage() {
  const { data: items, isLoading } = useShoppingList();
  const addItem = useAddShoppingItem();
  const updateItem = useUpdateShoppingItem();
  const deleteItem = useDeleteShoppingItem();
  const clearList = useClearShoppingList();

  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemUnit, setNewItemUnit] = useState("un");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState({
    name: "",
    quantity: "",
    unit: "",
    price: "",
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const priceValue = newItemPrice.trim();
    addItem.mutate({
      name: newItemName,
      quantity: newItemQty,
      unit: newItemUnit,
      price: priceValue || undefined,
    });
    setNewItemName("");
    setNewItemQty("1");
    setNewItemUnit("un");
    setNewItemPrice("");
  };

  const shareOnWhatsApp = () => {
    if (!items || items.length === 0) return;
    const pending = items.filter(i => !i.isBought);
    if (pending.length === 0) return;

    const grouped = groupItemsByCategory(pending);
    let text = "*🛒 Minha Lista de Compras - MinhaReceita*\n\n";
    shoppingCategoryOrder.forEach((category) => {
      const categoryItems = grouped[category];
      if (!categoryItems?.length) return;
      text += `*${category}*\n`;
      categoryItems.forEach((item) => {
        text += `✅ ${formatItemDetails(item)}\n`;
      });
      text += "\n";
    });
    text = text.trim();

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const pendingItems = items?.filter(i => !i.isBought) || [];
  const boughtItems = items?.filter(i => i.isBought) || [];

  const groupedPendingItems = useMemo(() => groupItemsByCategory(pendingItems), [pendingItems]);

  const startEditing = (item: ShoppingItem) => {
    setEditingItemId(item.id);
    setEditValues({
      name: item.name ?? "",
      quantity: item.quantity ?? "",
      unit: item.unit ?? "",
      price: item.price ?? "",
    });
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditValues({ name: "", quantity: "", unit: "", price: "" });
  };

  const saveEditing = (itemId: number) => {
    const priceValue = editValues.price.trim();
    updateItem.mutate({
      id: itemId,
      data: {
        name: editValues.name,
        quantity: editValues.quantity,
        unit: editValues.unit,
        price: priceValue || null,
      },
    });
    cancelEditing();
  };

  const renderItem = (item: ShoppingItem, isBought: boolean) => {
    const Icon = getIngredientIcon(item.name);
    const isEditing = editingItemId === item.id;
    const showEditButton = activeItemId === item.id;
    const quantityDisplay = formatQuantityUnit(item);

    return (
      <div
        key={item.id}
        className={cn(
          "flex items-center p-4 transition-colors group",
          isBought ? "bg-muted/20" : "hover:bg-muted/30"
        )}
        onClick={() => setActiveItemId((prev) => (prev === item.id ? null : item.id))}
      >
        <button
          onClick={(event) => {
            event.stopPropagation();
            updateItem.mutate({ id: item.id, data: { isBought: !isBought } });
          }}
          className={cn(
            "w-6 h-6 rounded-full mr-4 flex items-center justify-center transition-colors",
            isBought
              ? "bg-emerald-500 border-none text-white"
              : "border-2 border-muted-foreground/30 hover:border-primary"
          )}
        >
          {isBought && <Check className="w-3 h-3" />}
        </button>
        <div className={cn("p-2 rounded-lg mr-3", isBought ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
          <Icon className={cn("w-4 h-4", isBought && "opacity-50")} />
        </div>
        <div className={cn("flex-1", isBought && "line-through text-muted-foreground")}>
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={editValues.name}
                onChange={(event) => setEditValues((prev) => ({ ...prev, name: event.target.value }))}
                className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={editValues.quantity}
                  onChange={(event) => setEditValues((prev) => ({ ...prev, quantity: event.target.value }))}
                  placeholder="Qtd"
                  className="w-20 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <input
                  type="text"
                  value={editValues.unit}
                  onChange={(event) => setEditValues((prev) => ({ ...prev, unit: event.target.value }))}
                  placeholder="Un"
                  className="w-20 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={editValues.price}
                  onChange={(event) => setEditValues((prev) => ({ ...prev, price: event.target.value }))}
                  placeholder="R$"
                  className="w-24 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{item.name}</span>
              {quantityDisplay && <span className="text-sm text-muted-foreground">{quantityDisplay}</span>}
              {item.price && <span className="text-sm text-muted-foreground">R$ {item.price}</span>}
            </div>
          )}
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={(event) => {
                event.stopPropagation();
                saveEditing(item.id);
              }}
              className="text-primary text-sm font-semibold"
            >
              Salvar
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                cancelEditing();
              }}
              className="text-muted-foreground text-sm font-semibold"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={(event) => {
                event.stopPropagation();
                startEditing(item);
              }}
              className={cn(
                "text-muted-foreground/60 hover:text-primary transition-opacity p-2",
                showEditButton ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                deleteItem.mutate(item.id);
              }}
              className={cn(
                "text-destructive/50 hover:text-destructive transition-all p-2",
                isBought ? "" : "opacity-0 group-hover:opacity-100",
                showEditButton && "opacity-100"
              )}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const pendingCategories = shoppingCategoryOrder.filter(
    (category) => groupedPendingItems[category]?.length
  );

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-display font-bold">Lista de Compras</h1>
          <div className="flex gap-4">
            <button 
              onClick={shareOnWhatsApp}
              className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-sm"
            >
              <Share2 className="w-4 h-4" /> Compartilhar
            </button>
            <button 
              onClick={() => { if(confirm("Limpar toda a lista?")) clearList.mutate() }}
              className="text-muted-foreground hover:text-destructive text-sm font-medium transition-colors"
            >
              Limpar Lista
            </button>
          </div>
        </header>

        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 mb-8 bg-card p-4 rounded-2xl border border-border shadow-sm">
          <input 
            type="text"
            placeholder="Nome do item..."
            className="flex-[2] px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
          />
          <div className="flex flex-1 gap-2">
            <input 
              type="text"
              placeholder="Qtd"
              className="w-20 px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={newItemQty}
              onChange={(e) => setNewItemQty(e.target.value)}
            />
            <input 
              type="text"
              placeholder="Un"
              className="w-20 px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={newItemUnit}
              onChange={(e) => setNewItemUnit(e.target.value)}
            />
            <input
              type="text"
              inputMode="decimal"
              placeholder="R$"
              className="w-24 px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
            />
          </div>
          <button type="submit" className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center justify-center">
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
              {pendingCategories.map((category, index) => (
                <div key={category} className={cn(index > 0 && "border-t border-border")}>
                  <div className="px-6 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30">
                    {category}
                  </div>
                  <div className="divide-y divide-border">
                    {groupedPendingItems[category].map((item) => renderItem(item, false))}
                  </div>
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
                {boughtItems.map((item) => renderItem(item, true))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

function formatQuantityUnit(item: ShoppingItem) {
  const quantity = item.quantity?.trim();
  const unit = item.unit?.trim();
  const details = [quantity, unit].filter(Boolean).join(" ");
  return details;
}

function formatItemDetails(item: ShoppingItem) {
  const details = formatQuantityUnit(item);
  return details ? `${item.name} (${details})` : item.name;
}

function groupItemsByCategory(items: ShoppingItem[]) {
  return items.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    const category = getShoppingCategory(item.name);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});
}
