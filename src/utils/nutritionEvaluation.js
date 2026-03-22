import { calculateProteinTarget } from "./nutritionTargets"

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function evaluateDailyNutrition(totals, tdee, profile = null) {
  const calories = toNumber(totals?.calories);
  const protein = toNumber(totals?.protein);
  const carbs = toNumber(totals?.carbs);
  const fat = toNumber(totals?.fat);
  const dailyTdee = toNumber(tdee);

  const messages = [];
  let issues = 0;

  const calorieRatio = dailyTdee > 0 ? calories / dailyTdee : 0;
  if (dailyTdee > 0 && calorieRatio < 0.85) {
    messages.push("Deficit calórico alto para el día.");
    issues += 1;
  } else if (dailyTdee > 0 && calorieRatio > 1.05) {
    messages.push("Exceso calórico sobre tu gasto estimado.");
    issues += 1;
  }

  const proteinTarget = calculateProteinTarget(profile || totals, {
    dailyCalories: dailyTdee,
    weightKg: totals?.weight,
  });
  if (proteinTarget > 0 && protein < proteinTarget) {
    messages.push("Aumentar consumo de proteína.");
    issues += 1;
  }

  const baseCalories = calories > 0 ? calories : carbs * 4 + fat * 9 + protein * 4;
  const carbsRatio = baseCalories > 0 ? (carbs * 4) / baseCalories : 0;
  const fatRatio = baseCalories > 0 ? (fat * 9) / baseCalories : 0;

  if (carbsRatio > 0.6) {
    messages.push("Reducir carbohidratos refinados.");
    issues += 1;
  }

  if (fatRatio > 0.35) {
    messages.push("Reducir grasas altas en calorías.");
    issues += 1;
  }

  let score = "excellent";
  if (issues >= 3) score = "improve";
  else if (issues >= 1) score = "acceptable";

  return { score, messages };
}
