function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function calculateBMR(profile) {
  const age = toNumber(profile?.age ?? profile?.edad);
  const weight = toNumber(profile?.weight ?? profile?.peso);
  const height = toNumber(profile?.height ?? profile?.altura);
  const sexRaw = String(profile?.sex ?? profile?.sexo ?? "").toLowerCase();
  const isFemale = sexRaw === "mujer" || sexRaw === "female";

  if (!age || !weight || !height) return 0;

  if (isFemale) {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
  return 10 * weight + 6.25 * height - 5 * age + 5;
}

export function calculateTDEE(profile) {
  const bmr = calculateBMR(profile);
  if (!bmr) return 0;
  return bmr * 1.4;
}

export function calculateActivityFactor(activityMetrics = {}) {
  const steps = toNumber(activityMetrics?.steps);
  const activeKcal = toNumber(activityMetrics?.activeKcal);

  // Base actual del proyecto: actividad ligera.
  let factor = 1.4;

  // Ajuste por pasos respecto a referencia de 7k pasos.
  if (steps > 0) {
    const stepDelta = (steps - 7000) / 10000;
    factor += clamp(stepDelta, -0.1, 0.15);
  }

  // Ajuste adicional por kcal activas (cuando existen en stats).
  if (activeKcal > 0) {
    const kcalDelta = activeKcal / 2000;
    factor += clamp(kcalDelta, 0, 0.12);
  }

  return clamp(factor, 1.25, 1.65);
}

export function calculateTDEEDynamic(profile, activityMetrics = {}) {
  const bmr = calculateBMR(profile);
  if (!bmr) return 0;
  return bmr * calculateActivityFactor(activityMetrics);
}

export function calculateCalorieBalance(caloriesConsumed, tdee) {
  const consumed = toNumber(caloriesConsumed);
  const dailyTdee = toNumber(tdee);
  const balance = consumed - dailyTdee;

  if (balance < -200) {
    return { balance, status: "deficit" };
  }
  if (balance > 200) {
    return { balance, status: "surplus" };
  }
  return { balance, status: "maintenance" };
}
