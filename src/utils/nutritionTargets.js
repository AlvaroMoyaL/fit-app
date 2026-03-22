import { calculateTDEEDynamic } from "./metabolism"

const DEFAULT_FIBER_TARGET = 28
const DEFAULT_SODIUM_TARGET = 2300
const DEFAULT_CHOLESTEROL_TARGET = 300
const DEFAULT_SUGAR_RATIO = 0.15
const DEFAULT_SATURATED_FAT_RATIO = 0.1

const OBJECTIVE_KEYS = Object.freeze({
  HEALTH: "health",
  FAT_LOSS: "fat_loss",
  MUSCLE_GAIN: "muscle_gain",
  ENDURANCE: "endurance",
  MOBILITY: "mobility",
})

function toNumber(value, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function roundNumber(value, decimals = 0) {
  const factor = 10 ** decimals
  return Math.round(toNumber(value) * factor) / factor
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function countTrainDays(value) {
  if (Array.isArray(value)) return value.filter(Boolean).length
  return Math.max(0, Math.round(toNumber(value)))
}

function resolveProfileWeightKg(profile = {}, options = {}) {
  const explicitWeight = toNumber(options.weightKg, 0)
  if (explicitWeight > 0) return explicitWeight

  const profileWeight = toNumber(profile?.weight ?? profile?.peso, 0)
  return profileWeight > 0 ? profileWeight : 0
}

function resolveProfileHeightCm(profile = {}, options = {}) {
  const explicitHeight = toNumber(options.heightCm, 0)
  if (explicitHeight > 0) return explicitHeight

  const profileHeight = toNumber(profile?.height ?? profile?.altura, 0)
  return profileHeight > 0 ? profileHeight : 0
}

export function normalizeNutritionObjective(value) {
  const normalized = normalizeText(value)

  if (
    normalized === "perder grasa" ||
    normalized === "perdida de grasa" ||
    normalized === "fat_loss"
  ) {
    return OBJECTIVE_KEYS.FAT_LOSS
  }

  if (
    normalized === "ganar musculo" ||
    normalized === "ganar músculo" ||
    normalized === "muscle_gain"
  ) {
    return OBJECTIVE_KEYS.MUSCLE_GAIN
  }

  if (normalized === "resistencia" || normalized === "endurance") {
    return OBJECTIVE_KEYS.ENDURANCE
  }

  if (normalized === "movilidad" || normalized === "mobility") {
    return OBJECTIVE_KEYS.MOBILITY
  }

  return OBJECTIVE_KEYS.HEALTH
}

export function getNutritionObjectiveLabel(value) {
  const objective = normalizeNutritionObjective(value)

  if (objective === OBJECTIVE_KEYS.FAT_LOSS) return "Perder grasa"
  if (objective === OBJECTIVE_KEYS.MUSCLE_GAIN) return "Ganar músculo"
  if (objective === OBJECTIVE_KEYS.ENDURANCE) return "Resistencia"
  if (objective === OBJECTIVE_KEYS.MOBILITY) return "Movilidad"
  return "Salud"
}

export function getNutritionEffectiveWeightKg(profile = {}, options = {}) {
  const actualWeightKg = resolveProfileWeightKg(profile, options)
  const heightCm = resolveProfileHeightCm(profile, options)

  if (actualWeightKg <= 0 || heightCm <= 0) {
    return {
      actualWeightKg,
      effectiveWeightKg: actualWeightKg,
      healthyUpperWeightKg: 0,
      usedAdjustedWeight: false,
    }
  }

  const heightMeters = heightCm / 100
  const healthyUpperWeightKg = 24.9 * heightMeters * heightMeters

  if (actualWeightKg <= healthyUpperWeightKg * 1.1) {
    return {
      actualWeightKg,
      effectiveWeightKg: actualWeightKg,
      healthyUpperWeightKg: roundNumber(healthyUpperWeightKg, 1),
      usedAdjustedWeight: false,
    }
  }

  const adjustedWeightKg =
    healthyUpperWeightKg + (actualWeightKg - healthyUpperWeightKg) * 0.25

  return {
    actualWeightKg,
    effectiveWeightKg: roundNumber(adjustedWeightKg, 1),
    healthyUpperWeightKg: roundNumber(healthyUpperWeightKg, 1),
    usedAdjustedWeight: true,
  }
}

function resolveProteinMultiplier(profile = {}, options = {}) {
  const objective = normalizeNutritionObjective(
    options.objective ?? profile?.objetivo
  )
  const trainDays = countTrainDays(options.trainDays ?? profile?.trainDays)
  const activityFactor = toNumber(
    options.activityFactor ?? profile?.actividadFactor,
    0
  )

  let factor = 1.05

  if (objective === OBJECTIVE_KEYS.FAT_LOSS) factor = 1.15
  if (objective === OBJECTIVE_KEYS.MUSCLE_GAIN) factor = 1.35
  if (objective === OBJECTIVE_KEYS.ENDURANCE) factor = 1.1
  if (objective === OBJECTIVE_KEYS.MOBILITY) factor = 0.95

  if (trainDays >= 5) factor += 0.07
  else if (trainDays >= 3) factor += 0.04

  if (activityFactor >= 1.7) factor += 0.04
  else if (activityFactor >= 1.55) factor += 0.02

  return clamp(roundNumber(factor, 2), 0.95, 1.45)
}

function resolveFatMultiplier(profile = {}, options = {}) {
  const objective = normalizeNutritionObjective(
    options.objective ?? profile?.objetivo
  )
  const trainDays = countTrainDays(options.trainDays ?? profile?.trainDays)

  let factor = 0.8

  if (objective === OBJECTIVE_KEYS.FAT_LOSS) factor = 0.7
  if (objective === OBJECTIVE_KEYS.MUSCLE_GAIN) factor = 0.85
  if (objective === OBJECTIVE_KEYS.ENDURANCE) factor = 0.75
  if (objective === OBJECTIVE_KEYS.MOBILITY) factor = 0.72

  if (trainDays >= 5 && objective !== OBJECTIVE_KEYS.FAT_LOSS) {
    factor += 0.05
  }

  return clamp(roundNumber(factor, 2), 0.6, 0.95)
}

function resolveDailyCalories(profile = {}, options = {}) {
  const explicitCalories = toNumber(options.dailyCalories ?? options.tdee, 0)
  if (explicitCalories > 0) return explicitCalories

  const activityMetrics =
    options.activityMetrics && typeof options.activityMetrics === "object"
      ? options.activityMetrics
      : {}

  return toNumber(calculateTDEEDynamic(profile, activityMetrics), 0)
}

export function buildProteinTargetDetails(profile = {}, options = {}) {
  const objectiveKey = normalizeNutritionObjective(
    options.objective ?? profile?.objetivo
  )
  const objectiveLabel = getNutritionObjectiveLabel(objectiveKey)
  const weightContext = getNutritionEffectiveWeightKg(profile, options)
  const proteinPerKg = resolveProteinMultiplier(profile, options)
  const effectiveWeightKg = toNumber(weightContext.effectiveWeightKg, 0)
  const actualWeightKg = toNumber(weightContext.actualWeightKg, 0)
  const proteinTarget = effectiveWeightKg
    ? Math.max(0, Math.round(effectiveWeightKg * proteinPerKg))
    : 0
  const weightLabel = weightContext.usedAdjustedWeight
    ? `${roundNumber(effectiveWeightKg, 1)} kg efectivos`
    : `${roundNumber(actualWeightKg, 1)} kg`
  const basisShort = proteinTarget
    ? `${weightLabel} × ${roundNumber(proteinPerKg, 2).toFixed(2).replace(/\.00$/, "")} g/kg`
    : ""
  const basisHint = proteinTarget
    ? weightContext.usedAdjustedWeight
      ? `Objetivo ${objectiveLabel.toLowerCase()}: se usa peso efectivo para no inflar proteína.`
      : `Objetivo ${objectiveLabel.toLowerCase()}: cálculo directo sobre tu peso actual.`
    : ""

  return {
    proteinTarget,
    proteinPerKg,
    objectiveKey,
    objectiveLabel,
    actualWeightKg,
    effectiveWeightKg,
    healthyUpperWeightKg: toNumber(weightContext.healthyUpperWeightKg, 0),
    usedAdjustedWeight: Boolean(weightContext.usedAdjustedWeight),
    basisShort,
    basisHint,
  }
}

export function calculateNutritionTargets(profile = {}, options = {}) {
  const calories = Math.max(0, Math.round(resolveDailyCalories(profile, options)))
  const objectiveKey = normalizeNutritionObjective(
    options.objective ?? profile?.objetivo
  )
  const proteinDetails = buildProteinTargetDetails(profile, options)
  const effectiveWeightKg = toNumber(proteinDetails.effectiveWeightKg, 0)
  const fatPerKg = resolveFatMultiplier(profile, options)

  const protein = proteinDetails.proteinTarget

  let fat = effectiveWeightKg
    ? Math.max(0, Math.round(effectiveWeightKg * fatPerKg))
    : 0

  if (calories > 0 && protein * 4 + fat * 9 > calories) {
    fat = Math.max(0, Math.floor((calories - protein * 4) / 9))
  }

  const carbs = calories > 0
    ? Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4))
    : 0

  const fiber = calories > 0
    ? Math.round(clamp((calories / 1000) * 14, 22, 38))
    : DEFAULT_FIBER_TARGET

  const sugars = calories > 0
    ? Math.round((calories * DEFAULT_SUGAR_RATIO) / 4)
    : 0

  const saturatedFat = calories > 0
    ? Math.round((calories * DEFAULT_SATURATED_FAT_RATIO) / 9)
    : 0

  return {
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sodium: DEFAULT_SODIUM_TARGET,
    cholesterol: DEFAULT_CHOLESTEROL_TARGET,
    sugars,
    saturatedFat,
    objectiveKey,
    objectiveLabel: proteinDetails.objectiveLabel,
    actualWeightKg: proteinDetails.actualWeightKg,
    effectiveWeightKg,
    healthyUpperWeightKg: proteinDetails.healthyUpperWeightKg,
    usedAdjustedWeight: proteinDetails.usedAdjustedWeight,
    proteinPerKg: proteinDetails.proteinPerKg,
    fatPerKg,
    proteinBasisShort: proteinDetails.basisShort,
    proteinBasisHint: proteinDetails.basisHint,
  }
}

export function calculateProteinTarget(profile = {}, options = {}) {
  return calculateNutritionTargets(profile, options).protein
}

export function calculateMicroTargets(profile = {}, options = {}) {
  const targets = calculateNutritionTargets(profile, options)

  return {
    fiber: targets.fiber,
    sodium: targets.sodium,
    cholesterol: targets.cholesterol,
    sugars: targets.sugars,
    saturatedFat: targets.saturatedFat,
  }
}

export function buildNutritionTargetExplanations(targets = {}) {
  const calories = Math.round(toNumber(targets?.calories, 0))
  const protein = Math.round(toNumber(targets?.protein, 0))
  const carbs = Math.round(toNumber(targets?.carbs, 0))
  const fat = Math.round(toNumber(targets?.fat, 0))
  const fiber = Math.round(toNumber(targets?.fiber, 0))
  const sodium = Math.round(toNumber(targets?.sodium, DEFAULT_SODIUM_TARGET))
  const sugars = Math.round(toNumber(targets?.sugars, 0))
  const saturatedFat = Math.round(toNumber(targets?.saturatedFat, 0))
  const cholesterol = Math.round(
    toNumber(targets?.cholesterol, DEFAULT_CHOLESTEROL_TARGET)
  )
  const proteinBasisShort = String(targets?.proteinBasisShort || "").trim()
  const proteinBasisHint = String(targets?.proteinBasisHint || "").trim()
  const objectiveLabel = String(
    targets?.objectiveLabel || getNutritionObjectiveLabel(targets?.objectiveKey)
  ).trim()
  const fatPerKg = roundNumber(targets?.fatPerKg, 2)
  const effectiveWeightKg = roundNumber(targets?.effectiveWeightKg, 1)
  const usedAdjustedWeight = Boolean(targets?.usedAdjustedWeight)

  return {
    calories: calories
      ? `Objetivo energetico basado en tu TDEE dinamico estimado. Hoy la referencia es ${calories} kcal.`
      : "Objetivo energetico basado en TDEE dinamico cuando hay suficientes datos.",
    protein: protein
      ? [
          proteinBasisShort ? `Proteina objetivo: ${proteinBasisShort}.` : "",
          proteinBasisHint || "",
          objectiveLabel ? `Enfoque actual: ${objectiveLabel}.` : "",
          `Referencia final de hoy: ${protein} g.`,
        ]
          .filter(Boolean)
          .join(" ")
      : "La proteina se calcula segun objetivo, actividad y peso efectivo cuando hace falta moderarla.",
    carbs: calories
      ? `Carbohidratos objetivo calculados por diferencia: calorias totales menos proteina y grasas. Hoy quedan ${carbs} g.`
      : "Los carbohidratos se calculan con las calorias restantes despues de fijar proteina y grasas.",
    fat:
      fat && fatPerKg > 0 && effectiveWeightKg > 0
        ? `Grasas objetivo: ${effectiveWeightKg} kg × ${fatPerKg.toFixed(2).replace(/\.00$/, "")} g/kg. Referencia de hoy: ${fat} g.${usedAdjustedWeight ? " Se usa peso efectivo para no inflar el objetivo." : ""}`
        : "Las grasas se calculan con un factor por kg ajustado al objetivo y al contexto.",
    fiber: fiber
      ? `Fibra orientativa: 14 g por cada 1000 kcal, acotada entre 22 y 38 g. Hoy la referencia es ${fiber} g.`
      : "La fibra se estima a partir de las calorias del dia.",
    sodium: `Referencia general diaria: ${sodium} mg.`,
    sugars: sugars
      ? `Referencia flexible: hasta el 15% de las calorias del dia. Hoy equivale a ${sugars} g.`
      : "La referencia de azucares usa el 15% de las calorias del dia.",
    saturatedFat: saturatedFat
      ? `Limite orientativo: alrededor del 10% de las calorias del dia. Hoy equivale a ${saturatedFat} g.`
      : "La grasa saturada se estima como ~10% de las calorias del dia.",
    cholesterol: `Referencia clasica informativa: ${cholesterol} mg.`,
  }
}
