import { calculateRecipeMacros } from "./recipes";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const CALORIE_MARGIN = 0.2;

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

function enrichRecipes(recipes, foodCatalog) {
  const safeRecipes = Array.isArray(recipes) ? recipes : [];
  return safeRecipes.map((recipe) => {
    const macros = calculateRecipeMacros(recipe, foodCatalog);
    return {
      ...recipe,
      calories: toNumber(macros?.calories),
    };
  });
}

function pickRandom(items) {
  if (!Array.isArray(items) || !items.length) return null;
  const idx = Math.floor(Math.random() * items.length);
  return items[idx] || null;
}

function toMealSuggestion(recipe) {
  if (!recipe) return null;
  return {
    type: "recipe",
    id: recipe.id,
    name: recipe.name,
    calories: Math.round(toNumber(recipe.calories)),
  };
}

function selectBestCandidates(recipes, targetCalories) {
  const target = Math.max(0, toNumber(targetCalories));
  const filtered = filtrarRecetasPorCalorias(recipes, target);
  if (filtered.length) return filtered;
  return [...(Array.isArray(recipes) ? recipes : [])].sort(
    (a, b) => Math.abs(toNumber(a.calories) - target) - Math.abs(toNumber(b.calories) - target)
  );
}

function getTypePool(recipes, mealType) {
  const typed = recipes.filter((recipe) => recipe?.mealType === mealType);
  return typed.length ? typed : recipes;
}

function buildDayPlan(recipesWithCalories, caloriesByMeal, lastByMealType) {
  const mealTypes = ["breakfast", "lunch", "dinner", "snack"];
  const dayPlan = {
    breakfast: null,
    lunch: null,
    dinner: null,
    snack: null,
  };

  mealTypes.forEach((mealType) => {
    const basePool = getTypePool(recipesWithCalories, mealType);
    const candidates = selectBestCandidates(basePool, caloriesByMeal[mealType] || 0);
    const selected = seleccionarReceta(candidates, lastByMealType[mealType] || null);
    dayPlan[mealType] = toMealSuggestion(selected);
    lastByMealType[mealType] = selected ? normalizeId(selected.id || selected.name) : "";
  });

  return dayPlan;
}

export function distribuirCaloriasDiarias(totalCalories) {
  const total = Math.max(0, toNumber(totalCalories));
  return {
    breakfast: Math.round(total * 0.25),
    lunch: Math.round(total * 0.35),
    dinner: Math.round(total * 0.25),
    snack: Math.round(total * 0.15),
  };
}

export function filtrarRecetasPorCalorias(recipes, targetCalories) {
  const safeRecipes = Array.isArray(recipes) ? recipes : [];
  const target = Math.max(0, toNumber(targetCalories));
  const min = target * (1 - CALORIE_MARGIN);
  const max = target * (1 + CALORIE_MARGIN);
  return safeRecipes.filter((recipe) => {
    const calories = toNumber(recipe?.calories);
    return calories >= min && calories <= max;
  });
}

export function seleccionarReceta(recipes, lastRecipe) {
  const safeRecipes = Array.isArray(recipes) ? recipes : [];
  if (!safeRecipes.length) return null;
  const lastId =
    typeof lastRecipe === "string"
      ? normalizeId(lastRecipe)
      : normalizeId(lastRecipe?.id || lastRecipe?.name);
  const different = safeRecipes.filter(
    (recipe) => normalizeId(recipe?.id || recipe?.name) !== lastId
  );
  const pool = different.length ? different : safeRecipes;
  return pickRandom(pool);
}

export function generateDailyMealPlan(dailyCaloriesTarget, recipes, foodCatalog) {
  const recipesWithCalories = enrichRecipes(recipes, foodCatalog);
  if (!recipesWithCalories.length) {
    return {
      breakfast: null,
      lunch: null,
      dinner: null,
      snack: null,
    };
  }
  const caloriesByMeal = distribuirCaloriasDiarias(dailyCaloriesTarget);
  return buildDayPlan(recipesWithCalories, caloriesByMeal, {});
}

export function generateWeeklyMealPlan(dailyCaloriesTarget, recipes, foodCatalog) {
  const recipesWithCalories = enrichRecipes(recipes, foodCatalog);
  const caloriesByMeal = distribuirCaloriasDiarias(dailyCaloriesTarget);
  const lastByMealType = {
    breakfast: "",
    lunch: "",
    dinner: "",
    snack: "",
  };

  return DAYS.map((day) => ({
    day,
    ...buildDayPlan(recipesWithCalories, caloriesByMeal, lastByMealType),
  }));
}
