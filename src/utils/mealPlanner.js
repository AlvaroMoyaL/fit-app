import { getMealSuggestions } from "./mealSuggestions";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const MEAL_DISTRIBUTION = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.1,
};

export function generateDailyMealPlan(dailyCaloriesTarget, recipes, foodCatalog) {
  const target = Math.max(0, toNumber(dailyCaloriesTarget));

  const mealTypes = ["breakfast", "lunch", "dinner", "snack"];
  const plan = {
    breakfast: null,
    lunch: null,
    dinner: null,
    snack: null,
  };

  mealTypes.forEach((mealType) => {
    const mealCalories = target * (MEAL_DISTRIBUTION[mealType] || 0);
    const suggestions = getMealSuggestions(mealCalories, recipes, foodCatalog, mealType);
    plan[mealType] = suggestions.length > 0 ? suggestions[0] : null;
  });

  return plan;
}

export function generateWeeklyMealPlan(dailyCaloriesTarget, recipes, foodCatalog) {
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  return days.reduce((acc, day) => {
    acc[day] = generateDailyMealPlan(dailyCaloriesTarget, recipes, foodCatalog);
    return acc;
  }, {});
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
  const safePlan = weeklyMealPlan && typeof weeklyMealPlan === "object" ? weeklyMealPlan : {};
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

  Object.keys(safePlan).forEach((dayKey) => {
    const dayPlan = safePlan?.[dayKey] || {};
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
