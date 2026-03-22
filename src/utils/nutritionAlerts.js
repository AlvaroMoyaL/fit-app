import analyzeMacroBalance from "./macroAnalyzer";
import analyzeProteinIntake from "./proteinAnalyzer";
import trackVegetableIntake from "./vegetableTracker";

function buildAlert(type, message) {
  return { type, message };
}

function addUniqueAlert(target, seen, type, message) {
  const key = `${type}:${message}`;
  if (seen.has(key)) return;
  seen.add(key);
  target.push(buildAlert(type, message));
}

function addProteinAlerts(alerts, seen, proteinAnalysis, macroAnalysis) {
  if (!proteinAnalysis || proteinAnalysis.status === "optimal") return;

  if (proteinAnalysis.missingProtein > 0) {
    addUniqueAlert(
      alerts,
      seen,
      "protein",
      `Te faltan ${proteinAnalysis.missingProtein} g de proteína hoy`
    );
  }

  if (macroAnalysis?.protein?.status === "low") {
    addUniqueAlert(alerts, seen, "macros", "Tu porcentaje de proteína es bajo hoy");
  }
}

function addVegetableAlerts(alerts, seen, vegetableAnalysis) {
  if (!vegetableAnalysis) return;
  if (!["low", "very_low"].includes(vegetableAnalysis.status)) return;

  addUniqueAlert(alerts, seen, "vegetables", "Pocos vegetales hoy");
}

function addMacroAlerts(alerts, seen, macroAnalysis) {
  if (!macroAnalysis) return;

  if (macroAnalysis.carbs?.status === "high") {
    addUniqueAlert(alerts, seen, "macros", "Alto consumo de carbohidratos hoy");
  }

  if (macroAnalysis.fats?.status === "high") {
    addUniqueAlert(alerts, seen, "macros", "Alto consumo de grasas hoy");
  }
}

export function generateNutritionAlerts({
  proteinConsumedGrams = 0,
  bodyWeightKg = 0,
  profile = null,
  proteinCalories = 0,
  carbCalories = 0,
  fatCalories = 0,
  totalCalories = 0,
  meals = [],
} = {}) {
  const macroAnalysis = analyzeMacroBalance({
    proteinCalories,
    carbCalories,
    fatCalories,
    totalCalories,
  });

  const proteinAnalysis = analyzeProteinIntake({
    proteinConsumedGrams,
    bodyWeightKg,
    profile,
  });

  const vegetableAnalysis = trackVegetableIntake(meals);

  const alerts = [];
  const seen = new Set();

  addProteinAlerts(alerts, seen, proteinAnalysis, macroAnalysis);
  addVegetableAlerts(alerts, seen, vegetableAnalysis);
  addMacroAlerts(alerts, seen, macroAnalysis);

  return alerts;
}

export default generateNutritionAlerts;
