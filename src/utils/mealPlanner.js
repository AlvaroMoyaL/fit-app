import { generateDailyMealPlan, generateWeeklyMealPlan } from "./weeklyMealPlan";
export { generateDailyMealPlan, generateWeeklyMealPlan };

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

function resolveIngredientMeasure(ingredient) {
  const unit = ingredient?.unit || "g";
  if (unit === "unit") {
    return {
      unit,
      quantity: toNumber(ingredient?.quantity ?? ingredient?.amount ?? 0),
    };
  }
  return {
    unit: "g",
    quantity: toNumber(ingredient?.grams ?? ingredient?.quantity ?? ingredient?.amount ?? 0),
  };
}

export function generateShoppingList(weeklyMealPlan, recipes, foodCatalog) {
  const safePlan = Array.isArray(weeklyMealPlan)
    ? weeklyMealPlan
    : weeklyMealPlan && typeof weeklyMealPlan === "object"
    ? Object.entries(weeklyMealPlan).map(([day, value]) => ({ day, ...(value || {}) }))
    : [];
  const safeRecipes = Array.isArray(recipes) ? recipes : [];
  const safeFoods = Array.isArray(foodCatalog) ? foodCatalog : [];

  const recipeIndex = new Map();
  safeRecipes.forEach((recipe) => {
    const idKey = normalizeId(recipe?.id || recipe?.name);
    if (idKey) recipeIndex.set(idKey, recipe);
  });

  const foodIndex = new Map();
  safeFoods.forEach((food) => {
    const idKey = normalizeId(food?.id || food?.name);
    if (idKey) foodIndex.set(idKey, food);
  });

  const shoppingMap = new Map();
  const mealTypes = ["breakfast", "lunch", "dinner", "snack"];

  safePlan.forEach((dayPlan) => {
    mealTypes.forEach((mealType) => {
      const plannedMeal = dayPlan?.[mealType];
      if (!plannedMeal) return;

      const recipeKey = normalizeId(plannedMeal?.id || plannedMeal?.name);
      const recipe = recipeIndex.get(recipeKey);
      if (!recipe || !Array.isArray(recipe.ingredients)) return;

      recipe.ingredients.forEach((ingredient) => {
        const ingredientId = normalizeId(ingredient?.foodId || ingredient?.id || ingredient?.name);
        if (!ingredientId) return;

        const measure = resolveIngredientMeasure(ingredient);
        if (!measure.quantity) return;

        const food = foodIndex.get(ingredientId);
        const name = food?.name || ingredient?.foodId || ingredientId;

        const current = shoppingMap.get(ingredientId);
        if (!current) {
          shoppingMap.set(ingredientId, {
            id: ingredientId,
            name,
            quantity: measure.quantity,
            unit: measure.unit,
          });
          return;
        }

        // If units differ, keep grams as default fallback for consistency.
        if (current.unit !== measure.unit) {
          if (current.unit !== "g") current.unit = "g";
        }
        current.quantity += measure.quantity;
      });
    });
  });

  return Array.from(shoppingMap.values())
    .map((item) => ({
      ...item,
      quantity: Number(item.quantity.toFixed(2)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
