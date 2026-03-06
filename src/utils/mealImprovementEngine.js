import { interpretFoodText } from "./foodInterpreter";
import { getMealNutritionScore, classifyFood } from "./nutritionScore";

const PROTEIN_SUGGESTIONS = ["huevo", "yogurt", "atun", "pollo"];
const VEGETABLE_SUGGESTIONS = ["tomate", "lechuga", "ensalada"];

function uniqueItems(items = []) {
  return Array.from(new Set((Array.isArray(items) ? items : []).filter(Boolean)));
}

function normalizeLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function analyzeMealText(text) {
  const foods = interpretFoodText(text);
  const safeFoods = Array.isArray(foods) ? foods : [];
  const scoreData = getMealNutritionScore(safeFoods);

  return {
    foods: safeFoods,
    scoreData,
  };
}

export function generateMealImprovements(foods, scoreData) {
  const safeFoods = Array.isArray(foods) ? foods : [];
  const suggestions = [];
  const improvements = [];

  const classes = safeFoods.map((foodId) => classifyFood(foodId));
  const proteinCount = classes.filter((type) => type === "protein").length;
  const vegetableCount = classes.filter((type) => type === "vegetable").length;
  const carbCount = classes.filter((type) => type === "carb").length;
  const onlyCarbs = carbCount > 0 && proteinCount === 0 && vegetableCount === 0;

  if (proteinCount === 0 || normalizeLabel(scoreData?.protein) === "low") {
    suggestions.push("agregar proteína");
    improvements.push(...PROTEIN_SUGGESTIONS);
  }

  if (vegetableCount === 0 || normalizeLabel(scoreData?.vegetables) !== "good") {
    suggestions.push("agregar vegetales");
    improvements.push(...VEGETABLE_SUGGESTIONS);
  }

  if (onlyCarbs) {
    suggestions.push("Tu comida tiene principalmente carbohidratos");
  }

  return {
    suggestions: uniqueItems(suggestions),
    improvements: uniqueItems(improvements),
  };
}

export function improveMeal(text) {
  const { foods, scoreData } = analyzeMealText(text);
  const improvementsData = generateMealImprovements(foods, scoreData);

  return {
    foods,
    score: Number(scoreData?.score || 0),
    suggestions: improvementsData.suggestions,
    improvements: improvementsData.improvements,
  };
}
