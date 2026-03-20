import { calculateRecipeMacros } from "./recipes.js";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeId(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

export function getMealSuggestions(caloriesRemaining, recipes, foodCatalog, mealType) {
  const remaining = toNumber(caloriesRemaining);
  if (remaining <= 0) return [];

  const safeRecipes = Array.isArray(recipes) ? recipes : [];
  const safeFoods = Array.isArray(foodCatalog) ? foodCatalog : [];

  // Very low budget: suggest light single foods first.
  if (remaining < 150) {
    return safeFoods
      .map((food) => {
        const calories = toNumber(food?.calories);
        return {
          type: "food",
          id: food?.id || normalizeId(food?.name),
          name: food?.name || "Food",
          calories: Math.round(calories),
          score: remaining - calories,
        };
      })
      .filter((item) => item.calories > 0 && item.calories <= remaining)
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map(({ type, id, name, calories }) => ({ type, id, name, calories }));
  }

  return safeRecipes
    .filter((recipe) => {
      if (!mealType) return true;
      // Keep backward compatibility: recipes without mealType remain eligible.
      if (!recipe?.mealType) return true;
      return String(recipe.mealType).toLowerCase() === String(mealType).toLowerCase();
    })
    .map((recipe) => {
      const macros = calculateRecipeMacros(recipe, safeFoods);
      const calories = toNumber(macros?.calories);
      return {
        type: "recipe",
        id: recipe?.id || normalizeId(recipe?.name),
        name: recipe?.name || "Recipe",
        calories: Math.round(calories),
        score: remaining - calories,
      };
    })
    .filter((item) => item.calories > 0 && item.calories <= remaining)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map(({ type, id, name, calories }) => ({ type, id, name, calories }));
}
