import { evaluateMealSatiety } from "./satietyFoods";
import { foodCatalog } from "../data/foodCatalog";

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

