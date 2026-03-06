import foodCatalog from "../data/foodCatalog";

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
  tuna: "atun",
  egg: "huevo",
  rice: "arroz",
  bread: "pan_blanco",
  pasta: "fideos",
  lettuce: "lechuga",
  tomato: "tomate",
  avocado: "palta",
  milk: "leche",
  yogurt: "yogurt",
  potato: "papa",
  beef: "carne_vacuno",
};

const PROCESSED_IDS = new Set([
  "papas_fritas",
  "hamburguesa_congelada",
  "bebida_azucarada",
  "jugo_en_caja",
  "cereal_azucarado",
  "barrita_de_cereal",
  "salchicha",
]);

function buildFoodIndex() {
  const index = new Map();

  (Array.isArray(foodCatalog) ? foodCatalog : []).forEach((food) => {
    const idKey = normalizeId(food?.id);
    const nameKey = normalizeId(food?.name);
    if (idKey) index.set(idKey, food);
    if (nameKey) index.set(nameKey, food);
  });

  return index;
}

const FOOD_INDEX = buildFoodIndex();

function resolveFood(foodId) {
  const key = normalizeId(foodId);
  const aliasKey = normalizeId(ID_ALIASES[key] || "");
  return FOOD_INDEX.get(key) || (aliasKey ? FOOD_INDEX.get(aliasKey) : null) || null;
}

export function classifyFood(foodId) {
  const food = resolveFood(foodId);
  const normalizedId = normalizeId(foodId);

  if (!food) {
    if (["chicken", "egg", "tuna", "beef"].includes(normalizedId)) return "protein";
    if (["rice", "pasta", "bread", "potato"].includes(normalizedId)) return "carb";
    if (["lettuce", "tomato", "salad"].includes(normalizedId)) return "vegetable";
    return "other";
  }

  const category = normalizeId(food.category);
  const foodInternalId = normalizeId(food.id || food.name);

  if (category === "processed" || PROCESSED_IDS.has(foodInternalId)) return "ultraProcessed";
  if (category === "protein") return "protein";
  if (category === "carbs") return "carb";
  if (category === "vegetable") return "vegetable";
  if (category === "fat") return "fat";

  return "other";
}

export function analyzeMeal(foods = []) {
  const safeFoods = Array.isArray(foods) ? foods : [];
  const counts = {
    protein: 0,
    carb: 0,
    vegetable: 0,
    fat: 0,
    ultraProcessed: 0,
    other: 0,
  };

  safeFoods.forEach((foodId) => {
    const type = classifyFood(foodId);
    counts[type] += 1;
  });

  const hasProtein = counts.protein > 0;
  const hasVegetables = counts.vegetable > 0;
  const hasCarbs = counts.carb > 0;
  const onlyCarbs = counts.carb > 0 && counts.protein === 0 && counts.vegetable === 0;
  const goodDistribution = hasProtein && hasVegetables && hasCarbs;

  let satiety = "low";
  if (hasProtein && hasVegetables) satiety = "high";
  else if (hasProtein || hasVegetables) satiety = "medium";

  return {
    totalFoods: safeFoods.length,
    counts,
    hasProtein,
    hasVegetables,
    hasCarbs,
    onlyCarbs,
    goodDistribution,
    satiety,
  };
}

export function calculateNutritionScore(mealAnalysis) {
  const analysis = mealAnalysis || {};
  const warnings = [];
  let score = 50;

  if (analysis.hasProtein) score += 30;
  else warnings.push("Falta fuente de proteína");

  if (analysis.hasVegetables) score += 20;
  else warnings.push("Faltan vegetales");

  if (analysis.satiety === "high") score += 15;
  else if (analysis.satiety === "medium") score += 8;
  else warnings.push("Saciedad baja");

  if (analysis.goodDistribution) score += 10;

  if (analysis.onlyCarbs) {
    score -= 25;
    warnings.push("Comida basada solo en carbohidratos");
  }

  if ((analysis.counts?.ultraProcessed || 0) > 0) {
    score -= 15;
    warnings.push("Incluye ultraprocesados");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    warnings,
  };
}

export function getMealNutritionScore(foods = []) {
  const analysis = analyzeMeal(foods);
  const scoring = calculateNutritionScore(analysis);

  return {
    score: scoring.score,
    protein: analysis.hasProtein ? "high" : "low",
    vegetables: analysis.hasVegetables ? "good" : "low",
    satiety: analysis.satiety,
    warnings: scoring.warnings,
  };
}
