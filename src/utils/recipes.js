import { recipes } from "../data/recipes.js";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function buildFoodIndex(foodCatalog) {
  const index = new Map();
  const safeCatalog = Array.isArray(foodCatalog) ? foodCatalog : [];

  safeCatalog.forEach((food) => {
    if (!food) return;
    const idKey = normalizeId(food.id);
    const nameKey = normalizeId(food.name);
    if (idKey) index.set(idKey, food);
    if (nameKey) index.set(nameKey, food);
  });

  return index;
}

export function getRecipeById(id) {
  if (!id) return null;
  const needle = normalizeId(id);
  return recipes.find((recipe) => normalizeId(recipe.id) === needle) || null;
}

export function calculateRecipeMacros(recipe, foodCatalog) {
  const emptyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  if (!recipe || !Array.isArray(recipe.ingredients)) return emptyTotals;

  const foodIndex = buildFoodIndex(foodCatalog);

  const totals = recipe.ingredients.reduce((acc, ingredient) => {
    const foodKey = normalizeId(ingredient?.foodId);
    const food = foodIndex.get(foodKey);
    if (!food) return acc;

    const grams = toNumber(ingredient?.grams);
    if (grams <= 0) return acc;

    const ratio = grams / 100;
    acc.calories += toNumber(food.calories) * ratio;
    acc.protein += toNumber(food.protein) * ratio;
    acc.carbs += toNumber(food.carbs) * ratio;
    acc.fat += toNumber(food.fat) * ratio;
    return acc;
  }, emptyTotals);

  return {
    calories: Number(totals.calories.toFixed(2)),
    protein: Number(totals.protein.toFixed(2)),
    carbs: Number(totals.carbs.toFixed(2)),
    fat: Number(totals.fat.toFixed(2)),
  };
}

export function expandRecipe(recipe) {
  if (!recipe || !Array.isArray(recipe.ingredients)) return [];
  return recipe.ingredients.map((ingredient) => ({
    foodId: ingredient.foodId,
    grams: toNumber(ingredient.grams),
  }));
}
