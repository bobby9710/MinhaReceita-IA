import { 
  Apple, 
  Beef, 
  Carrot, 
  Egg, 
  Fish, 
  Leaf, 
  Milk, 
  Droplets, 
  Wheat, 
  Soup, 
  Flame, 
  ChefHat,
  Coffee,
  IceCream,
  Utensils,
  Pizza,
  Cake,
  GlassWater,
  Cigarette,
  Grape,
  Cherry,
  Citrus,
  Banana,
  Bean,
  CircleOff,
  Dna
} from "lucide-react";

export const ingredientIcons: Record<string, any> = {
  // Frutas
  "maçã": Apple,
  "maça": Apple,
  "banana": Banana,
  "uva": Grape,
  "cereja": Cherry,
  "limão": Citrus,
  "limao": Citrus,
  "laranja": Citrus,
  "morango": Droplets,
  
  // Vegetais
  "cenoura": Carrot,
  "alface": Leaf,
  "tomate": Soup,
  "cebola": Soup,
  "alho": Soup,
  "batata": Soup,
  "espinafre": Leaf,
  "brocolis": Leaf,
  "brócolis": Leaf,
  
  // Proteínas
  "carne": Beef,
  "frango": Beef,
  "peixe": Fish,
  "ovo": Egg,
  "ovos": Egg,
  "leite": Milk,
  "queijo": Milk,
  "manteiga": Milk,
  "creme de leite": Milk,
  "iogurte": Milk,
  "tofu": Bean,
  "feijão": Bean,
  "feijao": Bean,
  "lentilha": Bean,
  "grão de bico": Bean,
  
  // Grãos e Farinhas
  "arroz": Wheat,
  "trigo": Wheat,
  "farinha": Wheat,
  "pão": Wheat,
  "pao": Wheat,
  "macarrão": Wheat,
  "massa": Wheat,
  "aveia": Wheat,
  
  // Temperos e Outros
  "sal": Soup,
  "açúcar": Soup,
  "acucar": Soup,
  "pimenta": Flame,
  "azeite": Droplets,
  "óleo": Droplets,
  "oleo": Droplets,
  "água": GlassWater,
  "agua": GlassWater,
  "vinho": GlassWater,
  "café": Coffee,
  "cafe": Coffee,
  "chá": Coffee,
  "cha": Coffee,
  "chocolate": Cake,
  "mel": Droplets,
  "canela": Flame,
  "orégano": Leaf,
  "oregano": Leaf,
  "salsa": Leaf,
  "coentro": Leaf,
};

export function getIngredientIcon(name: string) {
  const lowerName = name.toLowerCase();
  for (const [key, icon] of Object.entries(ingredientIcons)) {
    if (lowerName.includes(key)) {
      return icon;
    }
  }
  return Utensils;
}
