import {
  NUTRITION_RECOVERY_TEMPLATE_KEYS,
  getNutritionRecoveryTemplate,
  resolveSuggestedTemplateFromSignals,
} from "./nutritionRecoveryTemplates.js";
import { buildMealSlotPlan, summarizeMealSlotPlan } from "./mealSlotPlanner.js";
import { matchRecoveryMealsForPlan } from "./recoveryMealMatcher.js";

const DEFAULT_TEMPLATE_KEY = NUTRITION_RECOVERY_TEMPLATE_KEYS.BALANCED;

function safeNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function roundNumber(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(safeNumber(value) * factor) / factor;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getSafeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function uniqueStrings(values = []) {
  return Array.from(
    new Set(getSafeArray(values).map((value) => String(value || "").trim()).filter(Boolean))
  );
}

function getNutritionScoreValue(day) {
  if (isObject(day?.nutritionScore)) {
    return safeNumber(day.nutritionScore.score);
  }
  return safeNumber(day?.nutritionScore);
}

function getAlertEntries(day) {
  return getSafeArray(day?.alerts);
}

function getAlertText(alert) {
  if (typeof alert === "string") return alert.toLowerCase();
  if (isObject(alert)) {
    return `${String(alert.type || "")} ${String(alert.message || "")}`.trim().toLowerCase();
  }
  return "";
}

function hasAlertMatch(day, patterns = []) {
  const normalizedPatterns = getSafeArray(patterns).map((pattern) =>
    String(pattern || "").toLowerCase()
  );

  return getAlertEntries(day).some((alert) => {
    const text = getAlertText(alert);
    return normalizedPatterns.some((pattern) => text.includes(pattern));
  });
}

function getDayInsights(day = {}) {
  const rawInsights = isObject(day?.insights) ? day.insights : {};

  return {
    lowProtein:
      Boolean(rawInsights.lowProtein) ||
      hasAlertMatch(day, ["protein", "proteina", "tu porcentaje de proteina es bajo"]),
    lowVegetables:
      Boolean(rawInsights.lowVegetables) ||
      hasAlertMatch(day, ["vegetales", "vegetable", "pocos vegetales"]),
    excessCalories:
      Boolean(rawInsights.excessCalories) ||
      hasAlertMatch(day, ["exceso calor", "sobreingesta", "overeat"]),
    poorMacroBalance:
      Boolean(rawInsights.poorMacroBalance) ||
      hasAlertMatch(day, ["alto consumo de carbohidratos", "alto consumo de grasas", "macros"]),
    lowSatiety:
      Boolean(rawInsights.lowSatiety) ||
      hasAlertMatch(day, ["baja saciedad", "poca saciedad", "hambre"]),
  };
}

function calculateAverage(sum, count, decimals = 1) {
  if (count <= 0) return 0;
  return roundNumber(sum / count, decimals);
}

function calculateAverages(days = []) {
  const totals = days.reduce(
    (acc, day) => {
      const calories = Number(day?.calories);
      if (Number.isFinite(calories)) {
        acc.calories.sum += calories;
        acc.calories.count += 1;
      }

      const protein = Number(day?.protein);
      if (Number.isFinite(protein)) {
        acc.protein.sum += protein;
        acc.protein.count += 1;
      }

      const vegetables = Number(day?.vegetableServings);
      if (Number.isFinite(vegetables)) {
        acc.vegetableServings.sum += vegetables;
        acc.vegetableServings.count += 1;
      }

      const nutritionScore = getNutritionScoreValue(day);
      if (Number.isFinite(nutritionScore) && nutritionScore > 0) {
        acc.nutritionScore.sum += nutritionScore;
        acc.nutritionScore.count += 1;
      }

      return acc;
    },
    {
      calories: { sum: 0, count: 0 },
      protein: { sum: 0, count: 0 },
      vegetableServings: { sum: 0, count: 0 },
      nutritionScore: { sum: 0, count: 0 },
    }
  );

  return {
    calories: calculateAverage(totals.calories.sum, totals.calories.count, 0),
    protein: calculateAverage(totals.protein.sum, totals.protein.count, 0),
    vegetableServings: calculateAverage(
      totals.vegetableServings.sum,
      totals.vegetableServings.count,
      1
    ),
    nutritionScore: calculateAverage(
      totals.nutritionScore.sum,
      totals.nutritionScore.count,
      0
    ),
  };
}

function countPatternDays(days = [], key) {
  return days.reduce((count, day) => {
    return getDayInsights(day)[key] ? count + 1 : count;
  }, 0);
}

function resolveDominantRecoveryNeed(issues, trends) {
  if (trends.repeatedExcessCalories) {
    return NUTRITION_RECOVERY_TEMPLATE_KEYS.POST_EXCESS;
  }

  if (trends.repeatedLowProtein && trends.repeatedLowVegetables) {
    return NUTRITION_RECOVERY_TEMPLATE_KEYS.BALANCED;
  }

  if (trends.repeatedLowProtein) {
    return NUTRITION_RECOVERY_TEMPLATE_KEYS.HIGH_PROTEIN;
  }

  if (trends.repeatedLowVegetables) {
    return NUTRITION_RECOVERY_TEMPLATE_KEYS.VEGETABLE_RECOVERY;
  }

  if (trends.repeatedPoorBalance || safeNumber(issues.lowSatietyDays) >= 2) {
    return NUTRITION_RECOVERY_TEMPLATE_KEYS.BALANCED;
  }

  return DEFAULT_TEMPLATE_KEY;
}

function buildPatternReasoning(daysAnalyzed, issues, trends, dominantRecoveryNeed) {
  const reasoning = [];

  if (daysAnalyzed <= 0) {
    reasoning.push(
      "No hay suficientes dias recientes para detectar un patron claro de recuperacion."
    );
    return reasoning;
  }

  reasoning.push(`Se analizaron ${daysAnalyzed} dias recientes para detectar patrones repetidos.`);

  if (trends.repeatedExcessCalories) {
    reasoning.push("Se detecto exceso calorico repetido, asi que la prioridad pasa a correccion post exceso.");
  } else if (trends.repeatedLowProtein && trends.repeatedLowVegetables) {
    reasoning.push("Se repiten baja proteina y baja presencia de vegetales, por eso la prioridad es equilibrada.");
  } else if (trends.repeatedLowProtein) {
    reasoning.push("La proteina baja aparece de forma repetida y empuja una recuperacion alta en proteina.");
  } else if (trends.repeatedLowVegetables) {
    reasoning.push("Los vegetales bajos se repiten y justifican una recuperacion vegetal especifica.");
  } else if (trends.repeatedPoorBalance) {
    reasoning.push("El desbalance de macros aparece varias veces y conviene ordenar el dia siguiente.");
  } else {
    reasoning.push("No se observa un patron dominante, asi que se propone una base equilibrada.");
  }

  if (safeNumber(issues.lowSatietyDays) >= 2) {
    reasoning.push("La baja saciedad aparece con frecuencia y conviene reforzar orden y adherencia.");
  }

  reasoning.push(`La necesidad dominante se resolvio como ${dominantRecoveryNeed}.`);
  return uniqueStrings(reasoning);
}

function createEmptyPatterns() {
  const issues = {
    lowProteinDays: 0,
    lowVegetableDays: 0,
    excessCalorieDays: 0,
    poorBalanceDays: 0,
    lowSatietyDays: 0,
  };

  const trends = {
    repeatedLowProtein: false,
    repeatedLowVegetables: false,
    repeatedExcessCalories: false,
    repeatedPoorBalance: false,
  };

  return {
    daysAnalyzed: 0,
    averages: {
      calories: 0,
      protein: 0,
      vegetableServings: 0,
      nutritionScore: 0,
    },
    issues,
    trends,
    dominantRecoveryNeed: DEFAULT_TEMPLATE_KEY,
    reasoning: buildPatternReasoning(0, issues, trends, DEFAULT_TEMPLATE_KEY),
  };
}

export function analyzeRecentNutritionPatterns(days = []) {
  const safeDays = getSafeArray(days).filter(isObject);

  if (safeDays.length === 0) {
    return createEmptyPatterns();
  }

  const issues = {
    lowProteinDays: countPatternDays(safeDays, "lowProtein"),
    lowVegetableDays: countPatternDays(safeDays, "lowVegetables"),
    excessCalorieDays: countPatternDays(safeDays, "excessCalories"),
    poorBalanceDays: countPatternDays(safeDays, "poorMacroBalance"),
    lowSatietyDays: countPatternDays(safeDays, "lowSatiety"),
  };

  const trends = {
    repeatedLowProtein: issues.lowProteinDays >= 2,
    repeatedLowVegetables: issues.lowVegetableDays >= 2,
    repeatedExcessCalories: issues.excessCalorieDays >= 2,
    repeatedPoorBalance: issues.poorBalanceDays >= 2,
  };

  const dominantRecoveryNeed = resolveDominantRecoveryNeed(issues, trends);

  return {
    daysAnalyzed: safeDays.length,
    averages: calculateAverages(safeDays),
    issues,
    trends,
    dominantRecoveryNeed,
    reasoning: buildPatternReasoning(
      safeDays.length,
      issues,
      trends,
      dominantRecoveryNeed
    ),
  };
}

export function getRecoveryPriority(patterns) {
  const safePatterns = isObject(patterns) ? patterns : {};
  const trends = isObject(safePatterns.trends) ? safePatterns.trends : {};

  if (trends.repeatedExcessCalories) {
    return NUTRITION_RECOVERY_TEMPLATE_KEYS.POST_EXCESS;
  }

  if (trends.repeatedLowProtein && trends.repeatedLowVegetables) {
    return NUTRITION_RECOVERY_TEMPLATE_KEYS.BALANCED;
  }

  if (trends.repeatedLowProtein) {
    return NUTRITION_RECOVERY_TEMPLATE_KEYS.HIGH_PROTEIN;
  }

  if (trends.repeatedLowVegetables) {
    return NUTRITION_RECOVERY_TEMPLATE_KEYS.VEGETABLE_RECOVERY;
  }

  if (trends.repeatedPoorBalance) {
    return NUTRITION_RECOVERY_TEMPLATE_KEYS.BALANCED;
  }

  if (
    Object.values(NUTRITION_RECOVERY_TEMPLATE_KEYS).includes(
      safePatterns.dominantRecoveryNeed
    )
  ) {
    return safePatterns.dominantRecoveryNeed;
  }

  return DEFAULT_TEMPLATE_KEY;
}

export function summarizeRecentNutritionPatterns(patterns) {
  const safePatterns = isObject(patterns) ? patterns : createEmptyPatterns();
  const trends = isObject(safePatterns.trends) ? safePatterns.trends : {};

  if (safeNumber(safePatterns.daysAnalyzed) <= 0) {
    return "No hay suficientes datos recientes para detectar un patron claro.";
  }

  if (trends.repeatedExcessCalories) {
    return "El patron reciente muestra exceso calorico repetido.";
  }

  if (trends.repeatedLowProtein && trends.repeatedLowVegetables) {
    return "En los ultimos dias se repiten baja proteina y baja presencia de vegetales.";
  }

  if (trends.repeatedLowProtein) {
    return "En los ultimos dias se repite una baja ingesta de proteina.";
  }

  if (trends.repeatedLowVegetables) {
    return "Se detecta una baja frecuencia de vegetales en dias recientes.";
  }

  if (trends.repeatedPoorBalance) {
    return "El patron reciente muestra un desbalance de macros repetido.";
  }

  return "No se observan problemas marcados; conviene sostener un dia equilibrado.";
}

function hasStrongRecoverySignal(patterns) {
  const trends = isObject(patterns?.trends) ? patterns.trends : {};
  return Boolean(
    trends.repeatedExcessCalories ||
      trends.repeatedLowProtein ||
      trends.repeatedLowVegetables ||
      trends.repeatedPoorBalance
  );
}

function shouldUsePortableTemplate(patterns, options = {}) {
  return Boolean(options?.isWorkday) && !hasStrongRecoverySignal(patterns);
}

function buildNextDaySignals(patterns, options = {}) {
  const daysAnalyzed = safeNumber(patterns?.daysAnalyzed);
  const issues = isObject(patterns?.issues) ? patterns.issues : {};
  const trends = isObject(patterns?.trends) ? patterns.trends : {};

  const singleDayOverride = daysAnalyzed === 1;

  return {
    lowProtein: Boolean(trends.repeatedLowProtein) || (singleDayOverride && issues.lowProteinDays >= 1),
    lowVegetables:
      Boolean(trends.repeatedLowVegetables) ||
      (singleDayOverride && issues.lowVegetableDays >= 1),
    excessCalories:
      Boolean(trends.repeatedExcessCalories) ||
      (singleDayOverride && issues.excessCalorieDays >= 1),
    needsPortableMeals: shouldUsePortableTemplate(patterns, options),
    poorBalance:
      Boolean(trends.repeatedPoorBalance) ||
      (singleDayOverride && issues.poorBalanceDays >= 1),
    recentOvereating: safeNumber(issues.excessCalorieDays) >= 1,
  };
}

function buildPlannerReasoning({
  patterns,
  templateKey,
  templateName,
  options,
  plan,
  portableOverride,
  signalTemplateKey,
}) {
  const reasoning = [
    ...getSafeArray(patterns?.reasoning),
    summarizeRecentNutritionPatterns(patterns),
  ];

  if (portableOverride) {
    reasoning.push(
      "Como el dia siguiente cae en jornada de trabajo y no hay una correccion dominante fuerte, se priorizo portable_workday."
    );
  } else if (templateKey === NUTRITION_RECOVERY_TEMPLATE_KEYS.POST_EXCESS) {
    reasoning.push("La prioridad principal del dia siguiente es ordenar calorias sin volverlo extremo.");
  } else if (templateKey === NUTRITION_RECOVERY_TEMPLATE_KEYS.HIGH_PROTEIN) {
    reasoning.push("La propuesta del dia siguiente empuja proteina util en los bloques principales.");
  } else if (templateKey === NUTRITION_RECOVERY_TEMPLATE_KEYS.VEGETABLE_RECOVERY) {
    reasoning.push("La propuesta del dia siguiente sube vegetales visibles para recuperar fibra y volumen.");
  } else {
    reasoning.push(`Se propuso ${templateName} como base estable para manana.`);
  }

  if (!portableOverride && signalTemplateKey !== templateKey) {
    reasoning.push(
      "La plantilla final respeta la prioridad historica por encima de senales suaves del ultimo dia."
    );
  }

  if (Boolean(options?.isWorkday) && !portableOverride) {
    reasoning.push("Aunque es un dia laboral, se mantuvo la prioridad nutricional principal por encima del formato portable.");
  }

  reasoning.push(plan?.uiSummary || summarizeMealSlotPlan(plan));
  return uniqueStrings(reasoning);
}

function describeTemplateIntent(templateKey) {
  switch (templateKey) {
    case NUTRITION_RECOVERY_TEMPLATE_KEYS.HIGH_PROTEIN:
      return "un dia alto en proteina";
    case NUTRITION_RECOVERY_TEMPLATE_KEYS.VEGETABLE_RECOVERY:
      return "un dia de recuperacion vegetal";
    case NUTRITION_RECOVERY_TEMPLATE_KEYS.POST_EXCESS:
      return "un dia correctivo post exceso";
    case NUTRITION_RECOVERY_TEMPLATE_KEYS.PORTABLE_WORKDAY:
      return "un dia portable y ordenado";
    case NUTRITION_RECOVERY_TEMPLATE_KEYS.BALANCED:
    default:
      return "un dia equilibrado";
  }
}

function getRecoveryTypeFromTemplateKey(templateKey) {
  switch (templateKey) {
    case NUTRITION_RECOVERY_TEMPLATE_KEYS.HIGH_PROTEIN:
      return "protein";
    case NUTRITION_RECOVERY_TEMPLATE_KEYS.VEGETABLE_RECOVERY:
      return "vegetables";
    case NUTRITION_RECOVERY_TEMPLATE_KEYS.POST_EXCESS:
      return "post_excess";
    case NUTRITION_RECOVERY_TEMPLATE_KEYS.PORTABLE_WORKDAY:
      return "portable_workday";
    case NUTRITION_RECOVERY_TEMPLATE_KEYS.BALANCED:
    default:
      return "balanced";
  }
}

function buildMealMatchingOptions(templateKey, nextDaySignals, options = {}) {
  return {
    preferPortable:
      Boolean(options?.preferPortable) ||
      templateKey === NUTRITION_RECOVERY_TEMPLATE_KEYS.PORTABLE_WORKDAY,
    preferHighProtein:
      Boolean(options?.preferHighProtein) ||
      templateKey === NUTRITION_RECOVERY_TEMPLATE_KEYS.HIGH_PROTEIN ||
      templateKey === NUTRITION_RECOVERY_TEMPLATE_KEYS.BALANCED ||
      Boolean(nextDaySignals?.lowProtein),
    preferVegetables:
      Boolean(options?.preferVegetables) ||
      templateKey === NUTRITION_RECOVERY_TEMPLATE_KEYS.VEGETABLE_RECOVERY ||
      templateKey === NUTRITION_RECOVERY_TEMPLATE_KEYS.BALANCED ||
      templateKey === NUTRITION_RECOVERY_TEMPLATE_KEYS.POST_EXCESS ||
      Boolean(nextDaySignals?.lowVegetables),
    moderateCalories:
      Boolean(options?.moderateCalories) ||
      templateKey === NUTRITION_RECOVERY_TEMPLATE_KEYS.POST_EXCESS,
    maxResults: safeNumber(options?.maxResults, 3),
  };
}

function buildSummary(status, patterns, plan, portableOverride) {
  const patternSummary = summarizeRecentNutritionPatterns(patterns);
  const planSummary = plan?.uiSummary || summarizeMealSlotPlan(plan);
  const templateIntent = describeTemplateIntent(plan?.templateKey);

  if (status === "insufficient_data") {
    return `No hay suficientes datos recientes; se propone un dia base para manana. ${planSummary}`;
  }

  if (portableOverride) {
    return `${patternSummary} Manana conviene un formato portable y ordenado. ${planSummary}`;
  }

  return `${patternSummary} Manana se propone ${templateIntent}. ${planSummary}`;
}

export function buildNextDayRecoveryPlan(input = {}) {
  const safeInput = isObject(input) ? input : {};
  const recentDays = getSafeArray(safeInput.recentDays).filter(isObject);
  const options = isObject(safeInput.options) ? safeInput.options : {};
  const context = isObject(safeInput.context) ? safeInput.context : {};

  const patterns = analyzeRecentNutritionPatterns(recentDays);
  const priorityTemplateKey = getRecoveryPriority(patterns);
  const nextDaySignals = buildNextDaySignals(patterns, options);
  const signalTemplateKey = resolveSuggestedTemplateFromSignals(nextDaySignals);

  let templateKey = priorityTemplateKey;
  if (templateKey === DEFAULT_TEMPLATE_KEY && signalTemplateKey !== DEFAULT_TEMPLATE_KEY) {
    templateKey = signalTemplateKey;
  }

  const portableOverride = shouldUsePortableTemplate(patterns, options);
  if (portableOverride) {
    templateKey = NUTRITION_RECOVERY_TEMPLATE_KEYS.PORTABLE_WORKDAY;
  }

  const template = getNutritionRecoveryTemplate(templateKey, options);
  const plan = buildMealSlotPlan({
    templateKey,
    signals: nextDaySignals,
    options,
    mode: "full_day",
  });
  const mealMatches = matchRecoveryMealsForPlan({
    plan,
    context,
    options: buildMealMatchingOptions(template.key, nextDaySignals, options),
  });

  const normalizedPlan = {
    ...plan,
    templateKey: template.key,
    templateName: template.name,
    recoveryType: getRecoveryTypeFromTemplateKey(template.key),
    uiSummary: summarizeMealSlotPlan(plan),
    mealMatches,
    slotMatches: mealMatches?.slotMatches || {},
    mealOptionsBySlot: mealMatches?.mealOptionsBySlot || mealMatches?.slotMatches || {},
  };

  const status = patterns.daysAnalyzed > 0 ? "ok" : "insufficient_data";

  return {
    status,
    templateKey: template.key,
    templateName: template.name,
    recoveryType: getRecoveryTypeFromTemplateKey(template.key),
    patterns,
    nextDaySignals,
    plan: normalizedPlan,
    mealMatches,
    slotMatches: mealMatches?.slotMatches || {},
    mealOptionsBySlot: mealMatches?.mealOptionsBySlot || mealMatches?.slotMatches || {},
    summary: buildSummary(status, patterns, normalizedPlan, portableOverride),
    reasoning: buildPlannerReasoning({
      patterns,
      templateKey: template.key,
      templateName: template.name,
      options,
      plan: normalizedPlan,
      portableOverride,
      signalTemplateKey,
    }),
  };
}
