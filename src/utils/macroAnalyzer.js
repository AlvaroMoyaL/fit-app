function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toPercent(macroCalories, totalCalories) {
  const macro = toNumber(macroCalories);
  const total = toNumber(totalCalories);
  if (total <= 0) return 0;
  return Number(((macro / total) * 100).toFixed(1));
}

// Evaluates whether a macro percentage is below, within, or above the target range.
function evaluateMacro(percent, min, max) {
  const value = toNumber(percent);
  if (value < min) return "low";
  if (value > max) return "high";
  return "good";
}

function buildMacroResult(percent, min, max) {
  return {
    percent,
    status: evaluateMacro(percent, min, max),
  };
}

export function analyzeMacroBalance({
  proteinCalories = 0,
  carbCalories = 0,
  fatCalories = 0,
  totalCalories = 0,
} = {}) {
  const proteinPercent = toPercent(proteinCalories, totalCalories);
  const carbPercent = toPercent(carbCalories, totalCalories);
  const fatPercent = toPercent(fatCalories, totalCalories);

  return {
    protein: buildMacroResult(proteinPercent, 25, 35),
    carbs: buildMacroResult(carbPercent, 35, 50),
    fats: buildMacroResult(fatPercent, 20, 35),
  };
}

export default analyzeMacroBalance;
