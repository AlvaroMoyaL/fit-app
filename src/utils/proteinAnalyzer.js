import {
  buildProteinTargetDetails,
} from "./nutritionTargets"

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
  heightCm = 0,
  objective = "",
  activityFactor = 0,
  trainDays = 0,
  profile = null,
} = {}) {
  const proteinConsumed = toNumber(proteinConsumedGrams);
  const baseProfile =
    profile && typeof profile === "object" && !Array.isArray(profile) ? profile : {};
  const resolvedWeight = toNumber(bodyWeightKg) || toNumber(baseProfile?.weight ?? baseProfile?.peso)
  const resolvedHeight = toNumber(heightCm) || toNumber(baseProfile?.height ?? baseProfile?.altura)
  const targetProfile = {
    ...baseProfile,
    weight: resolvedWeight,
    peso: resolvedWeight,
    height: resolvedHeight || baseProfile?.height,
    altura: resolvedHeight || baseProfile?.altura,
    objetivo: objective || baseProfile?.objetivo,
    actividadFactor: activityFactor || baseProfile?.actividadFactor,
    trainDays:
      (Array.isArray(trainDays) && trainDays.length) || toNumber(trainDays) > 0
        ? trainDays
        : baseProfile?.trainDays,
  }
  const proteinTargetDetails = buildProteinTargetDetails(targetProfile)
  const proteinTarget = toNumber(proteinTargetDetails.proteinTarget)

  if (proteinTarget <= 0) {
    return {
      proteinConsumed: Math.round(proteinConsumed),
      proteinTarget: 0,
      ratio: 0,
      missingProtein: 0,
      status: "very_low",
    };
  }

  const rawRatio = proteinTarget > 0 ? proteinConsumed / proteinTarget : 0;
  const rawMissingProtein = Math.max(0, proteinTarget - proteinConsumed);

  return {
    proteinConsumed: Math.round(proteinConsumed),
    proteinTarget: Math.round(proteinTarget),
    ratio: Number(rawRatio.toFixed(2)),
    missingProtein: Math.round(rawMissingProtein),
    status: getProteinStatus(rawRatio),
    objectiveKey: proteinTargetDetails.objectiveKey,
    objectiveLabel: proteinTargetDetails.objectiveLabel,
    actualWeightKg: proteinTargetDetails.actualWeightKg,
    effectiveWeightKg: proteinTargetDetails.effectiveWeightKg,
    healthyUpperWeightKg: proteinTargetDetails.healthyUpperWeightKg,
    usedAdjustedWeight: proteinTargetDetails.usedAdjustedWeight,
    proteinPerKg: proteinTargetDetails.proteinPerKg,
    targetBasisShort: proteinTargetDetails.basisShort,
    targetBasisHint: proteinTargetDetails.basisHint,
  };
}

export default analyzeProteinIntake;
