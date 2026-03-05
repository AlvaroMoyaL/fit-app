import { expandRecipe } from "./recipes";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toId(value) {
  return normalizeText(value).replace(/\s+/g, "_");
}

function singularize(value) {
  const text = normalizeText(value);
  if (text.endsWith("es")) return text.slice(0, -2);
  if (text.endsWith("s")) return text.slice(0, -1);
  return text;
}

function parseQuantityPrefix(inputText) {
  const raw = normalizeText(inputText);
  const match = raw.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  if (!match) return { factor: 1, text: raw };
  const factor = Number(String(match[1]).replace(",", "."));
  return {
    factor: Number.isFinite(factor) && factor > 0 ? factor : 1,
    text: normalizeText(match[2]),
  };
}

function scaleItems(items, factor) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    grams: Number((Number(item?.grams || 0) * factor).toFixed(2)),
  }));
}

export function parseFoodText(inputText, recipes, foodCatalog) {
  const parsed = parseQuantityPrefix(inputText);
  const needle = parsed.text;
  const quantityFactor = parsed.factor;
  if (!needle) return null;

  const safeRecipes = Array.isArray(recipes) ? recipes : [];
  const safeCatalog = Array.isArray(foodCatalog) ? foodCatalog : [];

  const aliases = {
    pan: "pan_blanco",
    huevos: "huevo",
  };
  const withAlias = aliases[needle] || needle;
  const needleVariants = new Set([needle, withAlias, singularize(needle), singularize(withAlias)]);

  const matchedRecipe = safeRecipes.find((recipe) => {
    const recipeId = toId(recipe?.id);
    const recipeName = normalizeText(recipe?.name);
    return needleVariants.has(recipeId) || needleVariants.has(recipeName);
  });

  if (matchedRecipe) {
    return scaleItems(expandRecipe(matchedRecipe), quantityFactor);
  }

  const matchedFood = safeCatalog.find((food) => {
    const foodId = toId(food?.id);
    const foodName = normalizeText(food?.name);
    const foodIdSingular = singularize(foodId);
    const foodNameSingular = singularize(foodName);
    return (
      needleVariants.has(foodId) ||
      needleVariants.has(foodName) ||
      needleVariants.has(foodIdSingular) ||
      needleVariants.has(foodNameSingular)
    );
  });

  if (matchedFood) {
    return [
      {
        foodId: matchedFood.id || toId(matchedFood.name),
        grams: Number((100 * quantityFactor).toFixed(2)),
      },
    ];
  }

  return null;
}
