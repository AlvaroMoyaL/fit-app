import { recipes } from "../data/recipes";
import { foodCatalog } from "../data/foodCatalog";
import { calculateRecipeMacros } from "./recipes";

const VEGETABLE_TERMS = [
  "tomate",
  "lechuga",
  "espinaca",
  "brocoli",
  "zanahoria",
  "pimenton",
  "cebolla",
  "pepino",
  "acelga",
  "repollo",
];

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildFoodIndex(items) {
  const index = new Map();
  (Array.isArray(items) ? items : []).forEach((food) => {
    const idKey = normalizeText(food?.id);
    const nameKey = normalizeText(food?.name);
    if (idKey) index.set(idKey, food);
    if (nameKey && !index.has(nameKey)) index.set(nameKey, food);
  });
  return index;
}

function getRecipeNutrition(recipe) {
  if (!recipe || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) return null;

  const macros = calculateRecipeMacros(recipe, foodCatalog);
  const calories = toNumber(macros?.calories);
  const protein = toNumber(macros?.protein);
  const carbs = toNumber(macros?.carbs);
  const fats = toNumber(macros?.fat);

  if (calories <= 0) return null;

  return {
    calories,
    protein,
    carbs,
    fats,
  };
}

function hasVegetables(recipe, foodIndex) {
  if (!recipe || !Array.isArray(recipe.ingredients)) return false;

  return recipe.ingredients.some((ingredient) => {
    const ingredientId = normalizeText(ingredient?.foodId);
    const food = foodIndex.get(ingredientId) || null;
    const haystack = `${ingredientId} ${normalizeText(food?.name)}`;
    return VEGETABLE_TERMS.some((term) => haystack.includes(term));
  });
}

function matchesMealType(recipe, wantedMealType) {
  const recipeMealType = normalizeText(recipe?.mealType);
  const expectedMealType = normalizeText(wantedMealType);
  if (!expectedMealType) return true;
  return recipeMealType === expectedMealType;
}

function isRecipeVegetarian(recipe, foodIndex) {
  if (!recipe || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    return false;
  }

  const NON_VEGETARIAN_TERMS = [
    "pollo",
    "atun",
    "sardina",
    "salchicha",
    "vienesa",
    "jamon",
    "pavo",
    "carne",
    "vacuno",
    "cerdo",
    "pescado",
    "marisco",
  ];

  return recipe.ingredients.every((ingredient) => {
    const ingredientId = normalizeText(ingredient?.foodId);
    const food = foodIndex.get(ingredientId) || null;
    const haystack = `${ingredientId} ${normalizeText(food?.name)}`;
    return !NON_VEGETARIAN_TERMS.some((term) => haystack.includes(term));
  });
}

function passesRecipeFilters(recipe, recipeNutrition, options, foodIndex) {
  const maxCalories = toNumber(options?.maxCalories);
  if (maxCalories > 0 && recipeNutrition.calories > maxCalories) return false;

  if (!matchesMealType(recipe, options?.mealType)) return false;

  if (options?.vegetarianOnly && !isRecipeVegetarian(recipe, foodIndex)) return false;

  // Not every recipe has explicit quick/portable metadata yet.
  if (options?.quickOnly && recipe?.quick === false) return false;
  if (options?.portableOnly && recipe?.portable === false) return false;

  return true;
}

function addReason(reasons, reason) {
  if (!reasons.includes(reason)) reasons.push(reason);
}

function scoreRecipeForCorrection(recipeNutrition, dailyStatus, includesVegetables) {
  const reasons = [];
  let score = 0;

  const caloriesRemaining = toNumber(dailyStatus?.caloriesRemaining);
  const proteinRemaining = Math.max(0, toNumber(dailyStatus?.proteinRemaining));
  const vegetableServings = toNumber(dailyStatus?.vegetableServings);
  const macroBalance = dailyStatus?.macroBalance || {};
  const proteinStatus = normalizeText(macroBalance?.protein);
  const carbsStatus = normalizeText(macroBalance?.carbs);
  const fatsStatus = normalizeText(macroBalance?.fats);

  const proteinDensity = recipeNutrition.calories > 0
    ? recipeNutrition.protein / (recipeNutrition.calories / 100)
    : 0;
  const proteinCoverage = proteinRemaining > 0
    ? Math.min(1, recipeNutrition.protein / proteinRemaining)
    : 0;

  if (proteinRemaining > 0 && recipeNutrition.protein >= 15) {
    score += 3 + proteinCoverage;
    addReason(reasons, "high-protein");
  }

  if (proteinStatus === "low" && recipeNutrition.protein >= 18) {
    score += 1;
    addReason(reasons, "supports-macro-balance");
  }

  if (vegetableServings < 2 && includesVegetables) {
    score += 2;
    addReason(reasons, "includes-vegetables");
  }

  if (carbsStatus === "low" && recipeNutrition.carbs >= 15 && recipeNutrition.carbs <= 55) {
    score += 1;
    addReason(reasons, "supports-macro-balance");
  }

  if (proteinDensity >= 8) {
    score += 1;
    addReason(reasons, "protein-dense");
  }

  if (fatsStatus === "high" && recipeNutrition.fats >= 18) {
    score -= 1.5;
  }

  if (proteinRemaining > 0 && recipeNutrition.protein < 10) {
    score -= 1;
  }

  if (recipeNutrition.calories > caloriesRemaining * 0.92 && recipeNutrition.protein < Math.max(12, proteinRemaining * 0.35)) {
    score -= 1;
  }

  if (!reasons.length) {
    score -= 0.5;
    addReason(reasons, "fits-calories");
  }

  return {
    score: Number(score.toFixed(2)),
    reasons,
  };
}

export function createAdaptiveMealSuggestions(dailyStatus, options = {}) {
  const caloriesRemaining = toNumber(dailyStatus?.caloriesRemaining);
  if (!dailyStatus || caloriesRemaining <= 0) return [];

  const safeRecipes = Array.isArray(recipes) ? recipes : [];
  if (!safeRecipes.length) return [];

  const foodIndex = buildFoodIndex(foodCatalog);

  return safeRecipes
    .map((recipe) => {
      const nutrition = getRecipeNutrition(recipe);
      if (!nutrition) return null;
      if (nutrition.calories > caloriesRemaining) return null;
      if (!passesRecipeFilters(recipe, nutrition, options, foodIndex)) return null;

      const vegetables = hasVegetables(recipe, foodIndex);
      const scored = scoreRecipeForCorrection(nutrition, dailyStatus, vegetables);

      return {
        recipe,
        score: scored.score,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fats: nutrition.fats,
        vegetables,
        mealType: recipe?.mealType,
        tags: scored.reasons,
        reasons: scored.reasons,
      };
    })
    .filter((item) => item && item.score > -1.5)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.protein !== a.protein) return b.protein - a.protein;
      return a.calories - b.calories;
    })
    .slice(0, 5);
}

export default createAdaptiveMealSuggestions;
