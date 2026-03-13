function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getProteinStatus(ratio) {
  if (ratio >= 1) return "optimal";
  if (ratio >= 0.8) return "slightly_low";
  if (ratio >= 0.6) return "low";
  return "very_low";
}

export function analyzeProteinIntake({
  proteinConsumedGrams = 0,
  bodyWeightKg = 0,
} = {}) {
  const proteinConsumed = toNumber(proteinConsumedGrams);
  const bodyWeight = toNumber(bodyWeightKg);

  if (bodyWeight <= 0) {
    return {
      proteinConsumed: Math.round(proteinConsumed),
      proteinTarget: 0,
      ratio: 0,
      missingProtein: 0,
      status: "very_low",
    };
  }

  const rawProteinTarget = bodyWeight * 1.6;
  const rawRatio = rawProteinTarget > 0 ? proteinConsumed / rawProteinTarget : 0;
  const rawMissingProtein = Math.max(0, rawProteinTarget - proteinConsumed);

  return {
    proteinConsumed: Math.round(proteinConsumed),
    proteinTarget: Math.round(rawProteinTarget),
    ratio: Number(rawRatio.toFixed(2)),
    missingProtein: Math.round(rawMissingProtein),
    status: getProteinStatus(rawRatio),
  };
}

export default analyzeProteinIntake;
