import {
  getPortableMeals,
  getPortableMealsByType,
  getNoFridgeMeals,
} from "./portableMeals";

function toPositiveInt(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(1, Math.floor(n));
}

function getRandomMeal(meals) {
  const safeMeals = Array.isArray(meals) ? meals : [];
  if (!safeMeals.length) return null;
  const index = Math.floor(Math.random() * safeMeals.length);
  return safeMeals[index] || null;
}

function getMealsByType(meals, type) {
  const safeMeals = Array.isArray(meals) ? meals : [];
  const mealType = String(type || "").trim().toLowerCase();
  return safeMeals.filter((meal) => String(meal?.mealType || "").toLowerCase() === mealType);
}

function pickMealAvoidingPrevious(meals, previousMealId) {
  const safeMeals = Array.isArray(meals) ? meals : [];
  if (!safeMeals.length) return null;
  const alternatives = safeMeals.filter((meal) => String(meal?.id || "") !== previousMealId);
  const pool = alternatives.length ? alternatives : safeMeals;
  return getRandomMeal(pool);
}

export function generateWorkMealPlan(options = {}) {
  const daysCount = toPositiveInt(options.days, 1);
  const hasFridge = Boolean(options.hasFridge);
  const includeBreakfast = options.includeBreakfast !== false;
  const includeSnacks = options.includeSnacks !== false;
  const includeDinner = options.includeDinner !== false;

  const allPortableMeals = getPortableMeals();
  const noFridgeMeals = getNoFridgeMeals();

  // El refrigerador impacta solo desayuno y snack.
  const breakfastSource = hasFridge ? allPortableMeals : noFridgeMeals;
  const snackSource = hasFridge ? allPortableMeals : noFridgeMeals;
  // Cena se mantiene siempre con opciones sin refrigeración.
  const dinnerSource = noFridgeMeals;

  const breakfastMeals = getMealsByType(breakfastSource, "breakfast").length
    ? getMealsByType(breakfastSource, "breakfast")
    : hasFridge
    ? getPortableMealsByType("breakfast")
    : getPortableMealsByType("breakfast").filter((meal) => !meal.requiresRefrigeration);
  const snackMeals = getMealsByType(snackSource, "snack").length
    ? getMealsByType(snackSource, "snack")
    : hasFridge
    ? getPortableMealsByType("snack")
    : getPortableMealsByType("snack").filter((meal) => !meal.requiresRefrigeration);
  const dinnerMeals = getMealsByType(dinnerSource, "dinner").length
    ? getMealsByType(dinnerSource, "dinner")
    : getPortableMealsByType("dinner").filter((meal) => !meal.requiresRefrigeration);

  let lastBreakfastId = "";
  let lastSnackId = "";
  let lastDinnerId = "";

  const days = Array.from({ length: daysCount }, (_, index) => {
    const breakfast = includeBreakfast
      ? pickMealAvoidingPrevious(breakfastMeals, lastBreakfastId)
      : null;
    const snack = includeSnacks ? pickMealAvoidingPrevious(snackMeals, lastSnackId) : null;
    const dinner = includeDinner ? pickMealAvoidingPrevious(dinnerMeals, lastDinnerId) : null;

    lastBreakfastId = breakfast?.id || lastBreakfastId;
    lastSnackId = snack?.id || lastSnackId;
    lastDinnerId = dinner?.id || lastDinnerId;

    return {
      day: index + 1,
      breakfast,
      snack,
      dinner,
    };
  });

  return { days };
}
