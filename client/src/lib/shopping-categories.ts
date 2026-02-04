export const shoppingCategoryOrder = ["Hortifruti", "Carnes", "Padaria", "Outros"] as const;

const categoryKeywords: Record<(typeof shoppingCategoryOrder)[number], string[]> = {
  Hortifruti: [
    "maçã",
    "maça",
    "banana",
    "uva",
    "cereja",
    "limão",
    "limao",
    "laranja",
    "morango",
    "cenoura",
    "alface",
    "tomate",
    "cebola",
    "alho",
    "batata",
    "batata doce",
    "batata-doce",
    "espinafre",
    "brócolis",
    "brocolis",
    "couve",
    "pepino",
    "abobrinha",
    "pimentão",
    "pimentao",
    "repolho",
    "beterraba",
    "mandioca",
    "salsa",
    "coentro",
  ],
  Carnes: [
    "carne",
    "frango",
    "peixe",
    "bovina",
    "suína",
    "suina",
    "porco",
    "linguiça",
    "linguica",
    "presunto",
    "bacon",
    "costela",
  ],
  Padaria: [
    "pão",
    "pao",
    "bolo",
    "torrada",
    "croissant",
    "biscoito",
    "bolacha",
    "massa",
    "macarrão",
    "macarrao",
    "farinha",
    "trigo",
    "aveia",
  ],
  Outros: [],
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

export function getShoppingCategory(name: string) {
  const normalizedName = normalizeText(name);
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => normalizedName.includes(normalizeText(keyword)))) {
      return category as (typeof shoppingCategoryOrder)[number];
    }
  }
  return "Outros";
}
