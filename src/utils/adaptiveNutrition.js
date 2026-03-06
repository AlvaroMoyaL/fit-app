const KCAL_PER_KG = 7700;
const MIN_ANALYSIS_DAYS = 7;
const STALL_WEIGHT_THRESHOLD = 0.2;
const STALL_MIN_DAYS = 10;
const MAX_CALORIE_ADJUSTMENT = 250;
const MIN_DEFICIT_FOR_ADJUSTMENT = 200;
const PROJECTION_DAYS_DEFAULT = 30;
const MIN_WEIGHT_DATA_FOR_PROJECTION = 7;

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function sortByDateAsc(items) {
  const safe = Array.isArray(items) ? [...items] : [];
  return safe.sort((a, b) => new Date(a?.date).getTime() - new Date(b?.date).getTime());
}

export function calcularDeficitEsperado(calorieHistory) {
  const safeHistory = Array.isArray(calorieHistory) ? calorieHistory : [];
  const deficitTotal = safeHistory.reduce((acc, row) => {
    const caloriesConsumed = toNumber(row?.caloriesConsumed);
    const tdee = toNumber(row?.tdee);
    return acc + (tdee - caloriesConsumed);
  }, 0);

  const expectedWeightLoss = deficitTotal / KCAL_PER_KG;

  return {
    deficitTotal,
    expectedWeightLoss,
  };
}

export function calcularCambioPesoReal(weightHistory) {
  const sorted = sortByDateAsc(weightHistory).filter((row) => Number.isFinite(Number(row?.weight)));
  const startWeight = sorted.length ? toNumber(sorted[0].weight) : 0;
  const endWeight = sorted.length ? toNumber(sorted[sorted.length - 1].weight) : 0;
  const realWeightChange = startWeight - endWeight;

  return {
    startWeight,
    endWeight,
    realWeightChange,
  };
}

export function calcularEficienciaDeficit(calorieHistory, weightHistory) {
  const { deficitTotal, expectedWeightLoss } = calcularDeficitEsperado(calorieHistory);
  const { realWeightChange } = calcularCambioPesoReal(weightHistory);
  const efficiencyRatio = expectedWeightLoss !== 0 ? realWeightChange / expectedWeightLoss : 0;

  return {
    deficitTotal,
    expectedWeightLoss,
    realWeightChange,
    efficiencyRatio,
  };
}

function interpretarEficiencia(efficiencyRatio) {
  if (efficiencyRatio > 1.2) return "progreso más rápido de lo esperado";
  if (efficiencyRatio >= 0.8) return "progreso normal";
  if (efficiencyRatio >= 0.4) return "progreso lento";
  return "posible estancamiento";
}

export function analizarProgresoPeso({ calorieHistory, weightHistory }) {
  const safeWeightHistory = Array.isArray(weightHistory) ? weightHistory : [];

  if (safeWeightHistory.length < MIN_ANALYSIS_DAYS) {
    return {
      analysisAvailable: false,
    };
  }

  const { deficitTotal, expectedWeightLoss, realWeightChange, efficiencyRatio } =
    calcularEficienciaDeficit(calorieHistory, safeWeightHistory);

  return {
    analysisAvailable: true,
    deficitTotal,
    expectedWeightLoss,
    realWeightChange,
    efficiencyRatio,
    interpretation: interpretarEficiencia(efficiencyRatio),
  };
}

export function detectarEstancamientoPeso({ calorieHistory, weightHistory }) {
  const sortedWeights = sortByDateAsc(weightHistory).filter((row) =>
    Number.isFinite(Number(row?.weight))
  );

  if (sortedWeights.length < STALL_MIN_DAYS) {
    return {
      stallDetected: false,
      reason: "not_enough_data",
    };
  }

  const daysAnalyzed = Math.min(STALL_MIN_DAYS, sortedWeights.length);
  const recentWeights = sortedWeights.slice(-daysAnalyzed);
  const startWeight = toNumber(recentWeights[0]?.weight);
  const endWeight = toNumber(recentWeights[recentWeights.length - 1]?.weight);
  const weightChange = startWeight - endWeight;

  const sortedCalories = sortByDateAsc(calorieHistory).filter(
    (row) => Number.isFinite(Number(row?.caloriesConsumed)) && Number.isFinite(Number(row?.tdee))
  );
  const recentCalories = sortedCalories.slice(-daysAnalyzed);
  const deficitTotal = recentCalories.reduce((acc, row) => {
    return acc + (toNumber(row?.tdee) - toNumber(row?.caloriesConsumed));
  }, 0);
  const averageDeficit = recentCalories.length ? deficitTotal / recentCalories.length : 0;

  const stallDetected =
    averageDeficit > MIN_DEFICIT_FOR_ADJUSTMENT &&
    Math.abs(weightChange) < STALL_WEIGHT_THRESHOLD;

  return {
    stallDetected,
    weightChange,
    averageDeficit,
    daysAnalyzed,
  };
}

export function analizarEstancamiento({ calorieHistory, weightHistory }) {
  const progreso = analizarProgresoPeso({ calorieHistory, weightHistory });
  const estancamiento = detectarEstancamientoPeso({ calorieHistory, weightHistory });

  let interpretation = progreso.analysisAvailable
    ? progreso.interpretation
    : "analisis no disponible";

  if (estancamiento.stallDetected) {
    interpretation = "posible estancamiento";
  }

  return {
    stallDetected: Boolean(estancamiento.stallDetected),
    efficiencyRatio: Number(progreso.efficiencyRatio || 0),
    realWeightChange: Number(progreso.realWeightChange || 0),
    expectedWeightLoss: Number(progreso.expectedWeightLoss || 0),
    interpretation,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function diffDays(startDate, endDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const diff = (end - start) / msPerDay;
  return Number.isFinite(diff) ? diff : 0;
}

export function calcularAjusteCalorico({ calorieHistory, weightHistory }) {
  const progress = analizarProgresoPeso({ calorieHistory, weightHistory });
  const combined = analizarEstancamiento({ calorieHistory, weightHistory });
  const stall = detectarEstancamientoPeso({ calorieHistory, weightHistory });

  if (!progress.analysisAvailable) {
    return {
      adjustmentNeeded: false,
      reason: "not_enough_data",
    };
  }

  let recommendedAdjustment = 0;
  let explanation = "mantener_calorias";
  const efficiencyRatio = Number(progress.efficiencyRatio || 0);
  const averageDeficit = Number(stall.averageDeficit || 0);

  if (stall.stallDetected) {
    recommendedAdjustment = -200;
    explanation = "possible_plateau_detected";
  } else if (efficiencyRatio > 1.2) {
    recommendedAdjustment = 150;
    explanation = "weight_loss_too_fast";
  } else if (efficiencyRatio >= 0.8 && efficiencyRatio <= 1.2) {
    recommendedAdjustment = 0;
    explanation = "mantener_calorias";
  } else if (efficiencyRatio >= 0.4 && efficiencyRatio < 0.8) {
    recommendedAdjustment = averageDeficit >= MIN_DEFICIT_FOR_ADJUSTMENT ? -150 : 0;
    explanation =
      recommendedAdjustment === 0 ? "deficit_below_threshold" : "slow_progress_adjustment";
  } else {
    recommendedAdjustment = averageDeficit >= MIN_DEFICIT_FOR_ADJUSTMENT ? -200 : 0;
    explanation = recommendedAdjustment === 0 ? "deficit_below_threshold" : "possible_plateau";
  }

  recommendedAdjustment = clamp(
    recommendedAdjustment,
    -MAX_CALORIE_ADJUSTMENT,
    MAX_CALORIE_ADJUSTMENT
  );

  return {
    adjustmentNeeded: recommendedAdjustment !== 0,
    recommendedAdjustment,
    efficiencyRatio,
    stallDetected: Boolean(combined.stallDetected),
    explanation,
  };
}

export function calcularNuevoObjetivoCalorico({ currentTargetCalories, adjustment }) {
  const base = toNumber(currentTargetCalories);
  const delta = toNumber(adjustment);

  return {
    newTargetCalories: base + delta,
  };
}

export function calcularTasaCambioPeso(weightHistory) {
  const sorted = sortByDateAsc(weightHistory).filter((row) => Number.isFinite(Number(row?.weight)));

  if (sorted.length < 2) {
    return {
      startWeight: 0,
      endWeight: 0,
      days: 0,
      dailyWeightChange: 0,
    };
  }

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const startWeight = toNumber(first?.weight);
  const endWeight = toNumber(last?.weight);
  const days = Math.max(0, diffDays(first?.date, last?.date));
  const dailyWeightChange = days > 0 ? (endWeight - startWeight) / days : 0;

  return {
    startWeight,
    endWeight,
    days,
    dailyWeightChange,
  };
}

export function proyectarPesoFuturo({
  weightHistory,
  projectionDays = PROJECTION_DAYS_DEFAULT,
}) {
  const sorted = sortByDateAsc(weightHistory).filter((row) => Number.isFinite(Number(row?.weight)));
  if (sorted.length < MIN_WEIGHT_DATA_FOR_PROJECTION) {
    return {
      projectionAvailable: false,
    };
  }

  const trend = calcularTasaCambioPeso(sorted);
  const currentWeight = toNumber(sorted[sorted.length - 1]?.weight);
  const safeProjectionDays = Math.max(1, Math.floor(toNumber(projectionDays)));
  const projection = Array.from({ length: safeProjectionDays }, (_, index) => {
    const day = index + 1;
    const projectedWeight = currentWeight + trend.dailyWeightChange * day;
    return { day, projectedWeight };
  });
  const finalProjectedWeight = projection.length
    ? projection[projection.length - 1].projectedWeight
    : currentWeight;

  return {
    projectionAvailable: true,
    currentWeight,
    dailyWeightChange: trend.dailyWeightChange,
    projectionDays: safeProjectionDays,
    finalProjectedWeight,
    projection,
  };
}

export function proyectarFechaObjetivoPeso({ weightHistory, targetWeight }) {
  const sorted = sortByDateAsc(weightHistory).filter((row) => Number.isFinite(Number(row?.weight)));
  const trend = calcularTasaCambioPeso(sorted);
  const currentWeight = sorted.length ? toNumber(sorted[sorted.length - 1]?.weight) : 0;
  const safeTargetWeight = toNumber(targetWeight);
  const weightDifference = currentWeight - safeTargetWeight;
  const rate = Math.abs(trend.dailyWeightChange);
  const estimatedDaysToGoal = rate > 0 ? weightDifference / rate : Infinity;

  return {
    targetWeight: safeTargetWeight,
    currentWeight,
    dailyWeightChange: trend.dailyWeightChange,
    estimatedDaysToGoal,
  };
}

export {
  KCAL_PER_KG,
  MIN_ANALYSIS_DAYS,
  STALL_WEIGHT_THRESHOLD,
  STALL_MIN_DAYS,
  MAX_CALORIE_ADJUSTMENT,
  MIN_DEFICIT_FOR_ADJUSTMENT,
  PROJECTION_DAYS_DEFAULT,
  MIN_WEIGHT_DATA_FOR_PROJECTION,
};
