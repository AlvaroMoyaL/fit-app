import { interpretFoodText } from "./foodInterpreter";
import { estimateMealPortions } from "./portionEstimator";

const mealKeywords = {
  desayuno: "breakfast",
  almuerzo: "lunch",
  comida: "lunch",
  cena: "dinner",
  snack: "snack",
  colacion: "snack",
};

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectMealType(text) {
  const normalized = normalizeText(text);

  for (const [keyword, mealType] of Object.entries(mealKeywords)) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(normalized)) {
      return mealType;
    }
  }

  return "default";
}

export function removeMealKeywords(text) {
  let cleaned = normalizeText(text).replace(/:/g, " ");

  for (const keyword of Object.keys(mealKeywords)) {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    cleaned = cleaned.replace(regex, " ");
  }

  return cleaned.replace(/\s+/g, " ").trim();
}

export function extractQuantities(text) {
  const normalized = normalizeText(text);
  const quantityRegex = /(\d+(?:[.,]\d+)?)\s*(g|gramos)?\s*([a-z]+(?:\s+[a-z]+)?)/gi;
  const matches = normalized.matchAll(quantityRegex);
  const quantitiesByFoodId = new Map();

  for (const match of matches) {
    const rawAmount = Number(String(match[1]).replace(",", "."));
    const unit = (match[2] || "").toLowerCase();
    const rawFoodToken = (match[3] || "").trim();

    if (!Number.isFinite(rawAmount) || rawAmount <= 0 || !rawFoodToken) continue;

    const interpreted = interpretFoodText(rawFoodToken);
    if (!Array.isArray(interpreted) || interpreted.length === 0) continue;

    const foodId = interpreted[0];
    const defaultPortion = estimateMealPortions([foodId])[0]?.grams ?? 100;
    const grams = unit === "g" || unit === "gramos" ? rawAmount : rawAmount * defaultPortion;

    const previous = quantitiesByFoodId.get(foodId) || 0;
    quantitiesByFoodId.set(foodId, Number((previous + grams).toFixed(2)));
  }

  return Array.from(quantitiesByFoodId.entries()).map(([foodId, grams]) => ({ foodId, grams }));
}

export function parseSmartMeal(text) {
  const mealType = detectMealType(text);
  const cleanText = removeMealKeywords(text);
  const extractedQuantities = extractQuantities(cleanText);
  const foodIds = interpretFoodText(cleanText);

  if (!Array.isArray(foodIds) || foodIds.length === 0) {
    return {
      mealType: "default",
      foods: [],
    };
  }

  const estimatedFoods = estimateMealPortions(foodIds);
  const quantityMap = new Map(extractedQuantities.map((item) => [item.foodId, item.grams]));
  const foods = estimatedFoods.map((item) => {
    if (quantityMap.has(item.foodId)) {
      return {
        ...item,
        grams: quantityMap.get(item.foodId),
      };
    }
    return item;
  });

  // If quantity extraction detects an item not present in estimated list, append it.
  for (const item of extractedQuantities) {
    if (!foods.some((food) => food.foodId === item.foodId)) {
      foods.push(item);
    }
  }

  return {
    mealType,
    foods,
  };
}

export { mealKeywords };
