import { evaluateMealSatiety } from "./satietyFoods";
import { interpretFoodText } from "./foodInterpreter";
import foodCatalog from "../data/foodCatalog";

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

const ID_ALIASES = {
  chicken: "pollo",
  rice: "arroz",
  salad: "ensalada_chilena",
  tuna: "atun",
  bread: "pan_integral",
  egg: "huevo",
  oats: "avena",
  yogurt: "yogurt",
  avocado: "palta",
  cheese: "queso",
  nuts: "nuez",
  wholegrain_crackers: "galleta_de_soda",
};

function buildFoodIndex(catalog) {
  const index = new Map();
  const safeCatalog = Array.isArray(catalog) ? catalog : [];
  safeCatalog.forEach((food) => {
    const nameKey = normalizeId(food?.name);
    const idKey = normalizeId(food?.id);
    if (nameKey) index.set(nameKey, food);
    if (idKey) index.set(idKey, food);
  });
  return index;
}

function resolveFood(foodId, foodIndex) {
  const key = normalizeId(foodId);
  const alias = ID_ALIASES[key] ? normalizeId(ID_ALIASES[key]) : "";
  return foodIndex.get(key) || (alias ? foodIndex.get(alias) : null) || null;
}

function getFoodId(foodId, foodIndex) {
  const food = resolveFood(foodId, foodIndex);
  if (!food) return "";
  return normalizeId(food.id || food.name);
}

function buildMealLabel(items) {
  return items.join(" + ");
}

function uniqueItems(items = []) {
  return Array.from(new Set(items.filter(Boolean)));
}

export function parseCasinoOptions(text = "") {
  const interpreted = interpretFoodText(text);
  return uniqueItems(Array.isArray(interpreted) ? interpreted : []);
}

export function classifyFood(foodId) {
  const foodIndex = buildFoodIndex(foodCatalog);
  const food = resolveFood(foodId, foodIndex);
  const normalizedCategory = normalizeId(food?.category || "");

  if (normalizedCategory === "protein") return "protein";
  if (normalizedCategory === "carbs") return "carb";
  if (normalizedCategory === "vegetable") return "vegetable";
  if (normalizedCategory === "fat") return "fat";
  return "other";
}

export function generateCasinoMeals(foods = []) {
  const safeFoods = uniqueItems(Array.isArray(foods) ? foods : []);
  const foodIndex = buildFoodIndex(foodCatalog);

  const classified = safeFoods.map((foodId) => ({
    inputId: foodId,
    resolvedId: getFoodId(foodId, foodIndex),
    type: classifyFood(foodId),
  }));

  const bases = classified.filter((item) => item.type === "carb").map((item) => item.resolvedId);
  const proteins = classified.filter((item) => item.type === "protein").map((item) => item.resolvedId);
  const vegetables = classified
    .filter((item) => item.type === "vegetable")
    .map((item) => item.resolvedId);

  const meals = [];
  const seen = new Set();

  bases.forEach((base) => {
    proteins.forEach((protein) => {
      vegetables.forEach((vegetable) => {
        const items = uniqueItems([base, protein, vegetable]);
        const key = items.join("|");
        if (!seen.has(key)) {
          seen.add(key);
          meals.push({ items, label: buildMealLabel(items) });
        }
      });
    });
  });

  bases.forEach((base) => {
    vegetables.forEach((vegetable) => {
      const items = uniqueItems([base, vegetable]);
      const key = items.join("|");
      if (!seen.has(key)) {
        seen.add(key);
        meals.push({ items, label: buildMealLabel(items) });
      }
    });
  });

  // Fallback combos when there are no vegetables or no proteins available.
  if (meals.length === 0 && bases.length > 0 && proteins.length > 0) {
    bases.forEach((base) => {
      proteins.forEach((protein) => {
        const items = uniqueItems([base, protein]);
        const key = items.join("|");
        if (!seen.has(key)) {
          seen.add(key);
          meals.push({ items, label: buildMealLabel(items) });
        }
      });
    });
  }

  return meals;
}

export function scoreCasinoMeal(meal) {
  const items = Array.isArray(meal?.items) ? meal.items : [];
  if (items.length === 0) {
    return {
      ...meal,
      score: 0,
      onlyCarbs: false,
      hasUltraProcessed: false,
    };
  }

  const foodIndex = buildFoodIndex(foodCatalog);
  const classes = items.map((foodId) => classifyFood(foodId));
  const foods = items.map((foodId) => resolveFood(foodId, foodIndex)).filter(Boolean);

  const hasProtein = classes.includes("protein");
  const hasVegetable = classes.includes("vegetable");
  const onlyCarbs = classes.every((type) => type === "carb");
  const hasUltraProcessed = foods.some((food) => normalizeId(food?.category) === "processed");
  const highSatiety = hasProtein || foods.some((food) => {
    const id = normalizeId(food?.id || food?.name);
    return id.includes("lentejas") || id.includes("quinoa") || id.includes("avena");
  });

  let score = 0;
  if (hasProtein) score += 30;
  if (hasVegetable) score += 20;
  if (highSatiety) score += 10;
  if (onlyCarbs) score -= 25;
  if (hasUltraProcessed) score -= 10;

  return {
    ...meal,
    score,
    onlyCarbs,
    hasUltraProcessed,
  };
}

export function evaluateCasinoOptions(text = "") {
  const parsedFoods = parseCasinoOptions(text);
  const meals = generateCasinoMeals(parsedFoods).map(scoreCasinoMeal);
  const ranked = [...meals].sort((a, b) => b.score - a.score);

  const avoidMeals = ranked.filter((meal) => meal.score <= 0 || meal.onlyCarbs);
  const validMeals = ranked.filter((meal) => !avoidMeals.includes(meal));

  const bestOption = validMeals[0]?.label || null;
  const alternatives = validMeals.slice(1, 4).map((meal) => meal.label);
  const avoid = avoidMeals.map((meal) => meal.label);

  return {
    bestOption,
    alternatives,
    avoid,
  };
}

export function createNutritionTotals(foodIds = []) {
  const safeIds = Array.isArray(foodIds) ? foodIds : [];
  const foodIndex = buildFoodIndex(foodCatalog);
  return safeIds.reduce(
    (acc, foodId) => {
      const food = resolveFood(foodId, foodIndex);
      if (!food) return acc;
      acc.calories += toNumber(food.calories);
      acc.protein += toNumber(food.protein);
      acc.carbs += toNumber(food.carbs);
      acc.fat += toNumber(food.fat);
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function getEvaluation(totals, satietyClassification) {
  if (totals.protein < 20) {
    return {
      evaluation: "Comida baja en proteína",
      recommendation: "Agregar una fuente de proteína como huevo, pollo o atún",
    };
  }

  if (totals.calories > 900) {
    return {
      evaluation: "Comida alta en calorías",
      recommendation: "Reducir carbohidratos refinados o frituras",
    };
  }

  if (satietyClassification === "low") {
    return {
      evaluation: "Comida poco saciante",
      recommendation: "Agregar proteína o fibra",
    };
  }

  return {
    evaluation: "Comida relativamente balanceada",
    recommendation: "Buena elección para mantener energía",
  };
}

export function evaluateCasinoMeal(foodIds = []) {
  const totals = createNutritionTotals(foodIds);
  const satiety = evaluateMealSatiety(foodIds);
  const nutritionReview = getEvaluation(totals, satiety.classification);

  return {
    calories: Number(totals.calories.toFixed(2)),
    protein: Number(totals.protein.toFixed(2)),
    carbs: Number(totals.carbs.toFixed(2)),
    fat: Number(totals.fat.toFixed(2)),
    satietyScore: satiety.score,
    satietyLevel: satiety.classification,
    evaluation: nutritionReview.evaluation,
    recommendation: nutritionReview.recommendation,
  };
}
