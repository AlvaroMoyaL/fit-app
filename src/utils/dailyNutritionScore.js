function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clampScore(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizeMacroDistribution(macroDistribution) {
  const protein = toNumber(macroDistribution?.protein);
  const carbs = toNumber(macroDistribution?.carbs);
  const fat = toNumber(macroDistribution?.fat);

  return { protein, carbs, fat };
}

function getCaloriesScore(caloriesConsumed, calorieTarget) {
  const consumed = toNumber(caloriesConsumed);
  const target = toNumber(calorieTarget);
  if (target <= 0) return 5;

  const deviationRatio = Math.abs(consumed - target) / target;

  if (deviationRatio <= 0.1) return 20;
  if (deviationRatio <= 0.2) return 10;
  return 5;
}

function getProteinScore(proteinGrams, proteinTarget) {
  const consumed = toNumber(proteinGrams);
  const target = toNumber(proteinTarget);
  if (target <= 0) return 5;

  const ratio = consumed / target;

  if (ratio >= 1) return 25;
  if (ratio >= 0.8) return 15;
  if (ratio >= 0.6) return 10;
  return 5;
}

function scoreMacroInRange(value, min, max) {
  return value >= min && value <= max ? 6.5 : 0;
}

function getMacrosScore(macroDistribution) {
  const macros = normalizeMacroDistribution(macroDistribution);
  const score =
    scoreMacroInRange(macros.protein, 25, 35) +
    scoreMacroInRange(macros.carbs, 35, 50) +
    scoreMacroInRange(macros.fat, 20, 35);

  return Number(score.toFixed(1));
}

function getVegetablesScore(vegetableServings) {
  const servings = toNumber(vegetableServings);

  if (servings >= 4) return 20;
  if (servings >= 3) return 15;
  if (servings >= 2) return 10;
  if (servings >= 1) return 5;
  return 0;
}

function getSatietyScore(satietyScore) {
  const score = toNumber(satietyScore);

  if (score >= 70) return 15;
  if (score >= 50) return 10;
  if (score >= 30) return 5;
  return 2;
}

export function calculateDailyNutritionScore({
  caloriesConsumed = 0,
  calorieTarget = 0,
  proteinGrams = 0,
  proteinTarget = 0,
  macroDistribution = {},
  vegetableServings = 0,
  satietyScore = 0,
} = {}) {
  const breakdown = {
    calories: getCaloriesScore(caloriesConsumed, calorieTarget),
    protein: getProteinScore(proteinGrams, proteinTarget),
    macros: getMacrosScore(macroDistribution),
    vegetables: getVegetablesScore(vegetableServings),
    satiety: getSatietyScore(satietyScore),
  };

  const score = clampScore(
    Math.round(
      breakdown.calories +
        breakdown.protein +
        breakdown.macros +
        breakdown.vegetables +
        breakdown.satiety
    )
  );

  return {
    score,
    breakdown,
  };
}

export default calculateDailyNutritionScore;
