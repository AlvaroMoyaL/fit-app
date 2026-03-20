const DEFAULT_OPTIONS = {
  dailyTargetCalories: 2200,
  dailyTargetProtein: 140,
  preferredMealsPerDay: 4,
};

const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"];

const BASE_SLOT_LIMITS = {
  breakfast: {
    calories: { min: 220, max: 560 },
    protein: { min: 18, max: 40 },
  },
  lunch: {
    calories: { min: 320, max: 760 },
    protein: { min: 24, max: 52 },
  },
  dinner: {
    calories: { min: 320, max: 780 },
    protein: { min: 24, max: 54 },
  },
  snack: {
    calories: { min: 110, max: 320 },
    protein: { min: 10, max: 28 },
  },
};

export const NUTRITION_RECOVERY_TEMPLATE_KEYS = Object.freeze({
  HIGH_PROTEIN: "high_protein",
  VEGETABLE_RECOVERY: "vegetable_recovery",
  BALANCED: "balanced",
  PORTABLE_WORKDAY: "portable_workday",
  POST_EXCESS: "post_excess",
});

const TEMPLATE_ORDER = [
  NUTRITION_RECOVERY_TEMPLATE_KEYS.HIGH_PROTEIN,
  NUTRITION_RECOVERY_TEMPLATE_KEYS.VEGETABLE_RECOVERY,
  NUTRITION_RECOVERY_TEMPLATE_KEYS.BALANCED,
  NUTRITION_RECOVERY_TEMPLATE_KEYS.PORTABLE_WORKDAY,
  NUTRITION_RECOVERY_TEMPLATE_KEYS.POST_EXCESS,
];

const TEMPLATE_DEFINITIONS = {
  [NUTRITION_RECOVERY_TEMPLATE_KEYS.HIGH_PROTEIN]: {
    key: NUTRITION_RECOVERY_TEMPLATE_KEYS.HIGH_PROTEIN,
    name: "High Protein Day",
    description:
      "Plantilla para empujar la proteina diaria con comidas saciantes y energia controlada.",
    recoveryFocus: ["protein", "satiety", "calorie_control"],
    dayGoal:
      "Subir la proteina del dia sin disparar calorias y manteniendo una estructura facil de repetir.",
    recommendedFor: [
      "dias bajos en proteina",
      "cierres de dia con hambre o baja saciedad",
      "recuperacion proteica post entrenamiento",
    ],
    constraints: {
      prioritizeProtein: true,
      prioritizeVegetables: false,
      moderateCalories: true,
      portableMeals: false,
      lowCalorieDensity: false,
    },
    calorieFactor: 0.98,
    proteinFactor: 1.08,
    snackBehaviorOnThreeMeals: "reduce",
    rules: [
      "Cada slot debe tener una fuente proteica clara.",
      "Lunch o dinner deben incluir vegetales visibles aunque no sean el foco principal.",
      "Evitar que la energia extra venga de snacks poco saciantes.",
    ],
    uiSummary: "Dia alto en proteina con energia medida y foco en saciedad.",
    mealBlueprints: {
      breakfast: {
        enabled: true,
        calorieWeight: 0.24,
        proteinWeight: 0.24,
        targetVegetables: 0,
        strategy: "Desayuno simple con una fuente proteica clara y saciante.",
      },
      lunch: {
        enabled: true,
        calorieWeight: 0.31,
        proteinWeight: 0.3,
        targetVegetables: 1,
        strategy: "Almuerzo con proteina protagonista y un acompanamiento vegetal util.",
      },
      dinner: {
        enabled: true,
        calorieWeight: 0.31,
        proteinWeight: 0.31,
        targetVegetables: 1,
        strategy: "Cena alta en proteina para cerrar el dia con control y saciedad.",
      },
      snack: {
        enabled: true,
        calorieWeight: 0.14,
        proteinWeight: 0.15,
        targetVegetables: 0,
        strategy: "Snack proteico corto para completar sin subir demasiado la energia.",
      },
    },
  },
  [NUTRITION_RECOVERY_TEMPLATE_KEYS.VEGETABLE_RECOVERY]: {
    key: NUTRITION_RECOVERY_TEMPLATE_KEYS.VEGETABLE_RECOVERY,
    name: "Vegetable Recovery Day",
    description:
      "Plantilla para recuperar fibra, volumen y presencia vegetal sin romper la estructura del dia.",
    recoveryFocus: ["vegetables", "fiber", "volume"],
    dayGoal:
      "Recuperar vegetales con una distribucion equilibrada y facil de sostener en la practica.",
    recommendedFor: [
      "dias con baja ingesta de vegetales",
      "dias con poca fibra y poco volumen",
      "dias donde conviene ordenar mejor lunch y dinner",
    ],
    constraints: {
      prioritizeProtein: false,
      prioritizeVegetables: true,
      moderateCalories: false,
      portableMeals: false,
      lowCalorieDensity: true,
    },
    calorieFactor: 1,
    proteinFactor: 0.95,
    snackBehaviorOnThreeMeals: "disable",
    rules: [
      "Lunch y dinner deben mostrar vegetales de forma visible y util.",
      "El snack puede incluir fruta o una alternativa vegetal simple si hace falta sumar volumen.",
      "La proteina se mantiene moderada para no desplazar el foco vegetal del dia.",
    ],
    uiSummary: "Dia para recuperar vegetales, fibra y volumen sin caer en una dieta rigida.",
    mealBlueprints: {
      breakfast: {
        enabled: true,
        calorieWeight: 0.24,
        proteinWeight: 0.22,
        targetVegetables: 0,
        strategy: "Desayuno equilibrado con proteina moderada y facil de repetir.",
      },
      lunch: {
        enabled: true,
        calorieWeight: 0.31,
        proteinWeight: 0.29,
        targetVegetables: 1.5,
        strategy: "Almuerzo con vegetales visibles, volumen y una proteina moderada.",
      },
      dinner: {
        enabled: true,
        calorieWeight: 0.3,
        proteinWeight: 0.29,
        targetVegetables: 1.5,
        strategy: "Cena con base vegetal clara para cerrar con mas fibra y saciedad.",
      },
      snack: {
        enabled: true,
        calorieWeight: 0.15,
        proteinWeight: 0.2,
        targetVegetables: 0.5,
        strategy: "Snack ligero que puede sumar fruta o una alternativa vegetal util.",
      },
    },
  },
  [NUTRITION_RECOVERY_TEMPLATE_KEYS.BALANCED]: {
    key: NUTRITION_RECOVERY_TEMPLATE_KEYS.BALANCED,
    name: "Balanced Recovery Day",
    description:
      "Plantilla para corregir proteina y vegetales al mismo tiempo con una estructura realista.",
    recoveryFocus: ["protein", "vegetables", "consistency"],
    dayGoal:
      "Ordenar el dia con una recuperacion equilibrada, sostenible y facil de convertir en habito.",
    recommendedFor: [
      "dias bajos en proteina y vegetales",
      "dias desordenados que necesitan una base estable",
      "correcciones suaves pero completas",
    ],
    constraints: {
      prioritizeProtein: true,
      prioritizeVegetables: true,
      moderateCalories: false,
      portableMeals: false,
      lowCalorieDensity: false,
    },
    calorieFactor: 1,
    proteinFactor: 1,
    snackBehaviorOnThreeMeals: "disable",
    rules: [
      "El desayuno debe aportar una base proteica util desde temprano.",
      "Lunch y dinner combinan proteina clara con vegetales visibles.",
      "El snack actua como ajuste pequeno, no como una comida desordenada extra.",
    ],
    uiSummary: "Dia equilibrado para corregir proteina y vegetales sin volverlo extremo.",
    mealBlueprints: {
      breakfast: {
        enabled: true,
        calorieWeight: 0.24,
        proteinWeight: 0.22,
        targetVegetables: 0,
        strategy: "Desayuno con proteina util y una energia suficiente para empezar estable.",
      },
      lunch: {
        enabled: true,
        calorieWeight: 0.31,
        proteinWeight: 0.3,
        targetVegetables: 1,
        strategy: "Almuerzo equilibrado con proteina clara y vegetales visibles.",
      },
      dinner: {
        enabled: true,
        calorieWeight: 0.3,
        proteinWeight: 0.3,
        targetVegetables: 1,
        strategy: "Cena de cierre equilibrada con foco en orden y buena adherencia.",
      },
      snack: {
        enabled: true,
        calorieWeight: 0.15,
        proteinWeight: 0.18,
        targetVegetables: 0,
        strategy: "Snack complementario corto para apoyar el cierre del dia.",
      },
    },
  },
  [NUTRITION_RECOVERY_TEMPLATE_KEYS.PORTABLE_WORKDAY]: {
    key: NUTRITION_RECOVERY_TEMPLATE_KEYS.PORTABLE_WORKDAY,
    name: "Portable Workday",
    description:
      "Plantilla pensada para jornadas de trabajo o traslado con comidas faciles de llevar.",
    recoveryFocus: ["portable_meals", "adherence", "satiety"],
    dayGoal:
      "Sostener un dia practico y portable sin perder proteina util ni una estructura facil de cumplir.",
    recommendedFor: [
      "dias de oficina o traslado",
      "dias con poco acceso a cocina",
      "dias donde la adherencia importa mas que la variedad",
    ],
    constraints: {
      prioritizeProtein: true,
      prioritizeVegetables: false,
      moderateCalories: true,
      portableMeals: true,
      lowCalorieDensity: false,
    },
    calorieFactor: 0.97,
    proteinFactor: 1,
    snackBehaviorOnThreeMeals: "reduce",
    rules: [
      "Evitar preparaciones que dependan de cocina compleja o recalentado obligatorio.",
      "Lunch y snack deben poder viajar bien y resolverse rapido.",
      "La estructura prioriza adherencia y saciedad por encima de la sofisticacion.",
    ],
    uiSummary: "Dia portable y practico para trabajo, con foco en adherencia y saciedad.",
    mealBlueprints: {
      breakfast: {
        enabled: true,
        calorieWeight: 0.23,
        proteinWeight: 0.22,
        targetVegetables: 0,
        strategy: "Desayuno simple, rapido y facil de repetir antes de salir.",
      },
      lunch: {
        enabled: true,
        calorieWeight: 0.31,
        proteinWeight: 0.3,
        targetVegetables: 1,
        strategy: "Almuerzo portable que soporte traslado y requiera poca logistica.",
      },
      dinner: {
        enabled: true,
        calorieWeight: 0.27,
        proteinWeight: 0.26,
        targetVegetables: 1,
        strategy: "Cena simple de cierre que tambien puede resolverse con opciones portables.",
      },
      snack: {
        enabled: true,
        calorieWeight: 0.19,
        proteinWeight: 0.22,
        targetVegetables: 0,
        strategy: "Snack portable para sostener energia y adherencia durante el trabajo.",
      },
    },
  },
  [NUTRITION_RECOVERY_TEMPLATE_KEYS.POST_EXCESS]: {
    key: NUTRITION_RECOVERY_TEMPLATE_KEYS.POST_EXCESS,
    name: "Post Excess Corrective Day",
    description:
      "Plantilla correctiva no punitiva para ordenar el dia despues de un exceso calorico reciente.",
    recoveryFocus: ["protein", "vegetables", "low_calorie_density"],
    dayGoal:
      "Bajar la densidad calorica del dia sin hacer una plantilla extrema, manteniendo proteina y volumen.",
    recommendedFor: [
      "dias posteriores a un exceso calorico",
      "dias con reciente sobreingesta",
      "dias donde conviene volver al orden sin castigo",
    ],
    constraints: {
      prioritizeProtein: true,
      prioritizeVegetables: true,
      moderateCalories: true,
      portableMeals: false,
      lowCalorieDensity: true,
    },
    calorieFactor: 0.88,
    proteinFactor: 1.05,
    snackBehaviorOnThreeMeals: "disable",
    rules: [
      "No convertir el dia en una respuesta punitiva ni absurdamente baja en calorias.",
      "Usar proteina clara, vegetales altos en volumen y densidad calorica moderada.",
      "Mantener orden y regularidad para cortar la inercia del exceso.",
    ],
    uiSummary: "Dia correctivo suave: mas volumen, buena proteina y calorias moderadas.",
    mealBlueprints: {
      breakfast: {
        enabled: true,
        calorieWeight: 0.22,
        proteinWeight: 0.24,
        targetVegetables: 0,
        strategy: "Desayuno limpio y proteico que reordene el inicio del dia.",
      },
      lunch: {
        enabled: true,
        calorieWeight: 0.29,
        proteinWeight: 0.28,
        targetVegetables: 1.5,
        strategy: "Almuerzo de alto volumen con vegetales y proteina clara.",
      },
      dinner: {
        enabled: true,
        calorieWeight: 0.31,
        proteinWeight: 0.3,
        targetVegetables: 1.5,
        strategy: "Cena de alto volumen, proteina util y densidad calorica moderada.",
      },
      snack: {
        enabled: true,
        calorieWeight: 0.18,
        proteinWeight: 0.18,
        targetVegetables: 0.5,
        strategy: "Snack corto y ordenado que no reabra el exceso de energia.",
      },
    },
  },
};

function safeNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundNumber(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(safeNumber(value) * factor) / factor;
}

function normalizeTemplateKey(templateKey) {
  const normalized = String(templateKey || "").trim().toLowerCase();
  return TEMPLATE_ORDER.includes(normalized)
    ? normalized
    : NUTRITION_RECOVERY_TEMPLATE_KEYS.BALANCED;
}

function normalizePreferredMealsPerDay(value) {
  const next = Math.round(
    safeNumber(value, DEFAULT_OPTIONS.preferredMealsPerDay)
  );
  return clamp(next, 3, 4);
}

function scaleCalories(value, definition) {
  const baseCalories = safeNumber(value, DEFAULT_OPTIONS.dailyTargetCalories);
  const scaled = baseCalories * safeNumber(definition?.calorieFactor, 1);
  const min = definition?.key === NUTRITION_RECOVERY_TEMPLATE_KEYS.POST_EXCESS ? 1550 : 1650;
  const max = definition?.key === NUTRITION_RECOVERY_TEMPLATE_KEYS.POST_EXCESS ? 2600 : 3200;
  return Math.round(clamp(scaled, min, max));
}

function scaleProtein(value, definition) {
  const baseProtein = safeNumber(value, DEFAULT_OPTIONS.dailyTargetProtein);
  const scaled = baseProtein * safeNumber(definition?.proteinFactor, 1);
  const min =
    definition?.key === NUTRITION_RECOVERY_TEMPLATE_KEYS.HIGH_PROTEIN ? 125 : 100;
  return Math.round(clamp(scaled, min, 220));
}

function getSlotLimits(slot, templateKey) {
  const base = BASE_SLOT_LIMITS[slot] || BASE_SLOT_LIMITS.snack;

  if (templateKey !== NUTRITION_RECOVERY_TEMPLATE_KEYS.POST_EXCESS) {
    return base;
  }

  const calorieMaxBySlot = {
    breakfast: 460,
    lunch: 640,
    dinner: 660,
    snack: 240,
  };

  return {
    calories: {
      min: base.calories.min,
      max: calorieMaxBySlot[slot] || base.calories.max,
    },
    protein: base.protein,
  };
}

function normalizeWeights(slotConfig, weightKey) {
  const total = MEAL_SLOTS.reduce((sum, slot) => {
    if (!slotConfig[slot]?.enabled) return sum;
    return sum + safeNumber(slotConfig[slot][weightKey]);
  }, 0);

  const enabledSlots = MEAL_SLOTS.filter((slot) => slotConfig[slot]?.enabled);
  const fallbackWeight = enabledSlots.length > 0 ? 1 / enabledSlots.length : 0;

  return MEAL_SLOTS.reduce((acc, slot) => {
    if (!slotConfig[slot]?.enabled) {
      acc[slot] = 0;
      return acc;
    }

    acc[slot] = total > 0 ? safeNumber(slotConfig[slot][weightKey]) / total : fallbackWeight;
    return acc;
  }, {});
}

function getSnackBehavior(definition, preferredMealsPerDay) {
  if (preferredMealsPerDay > 3) return "full";
  return definition?.snackBehaviorOnThreeMeals || "disable";
}

function buildSlotStrategy(slot, blueprint, definition, options, snackBehavior) {
  if (slot === "snack" && snackBehavior === "disable") {
    return "Este slot se puede omitir si el dia se resuelve bien con tres comidas principales.";
  }

  if (slot === "snack" && snackBehavior === "reduce") {
    return `${blueprint.strategy} En version compacta, este slot queda mas corto y funcional.`;
  }

  if (
    definition.key === NUTRITION_RECOVERY_TEMPLATE_KEYS.PORTABLE_WORKDAY &&
    Boolean(options?.isWorkday)
  ) {
    return `${blueprint.strategy} Priorizar opciones frias o faciles de transportar.`;
  }

  return blueprint.strategy;
}

function buildSlotConfig(definition, options = {}) {
  const preferredMealsPerDay = normalizePreferredMealsPerDay(
    options?.preferredMealsPerDay
  );
  const snackBehavior = getSnackBehavior(definition, preferredMealsPerDay);

  return MEAL_SLOTS.reduce((acc, slot) => {
    const blueprint = definition.mealBlueprints[slot];
    const slotConfig = {
      enabled: Boolean(blueprint?.enabled),
      calorieWeight: safeNumber(blueprint?.calorieWeight),
      proteinWeight: safeNumber(blueprint?.proteinWeight),
      targetVegetables: Math.max(0, safeNumber(blueprint?.targetVegetables)),
      strategy: buildSlotStrategy(
        slot,
        blueprint,
        definition,
        options,
        snackBehavior
      ),
    };

    if (slot === "snack" && snackBehavior === "disable") {
      slotConfig.enabled = false;
      slotConfig.calorieWeight = 0;
      slotConfig.proteinWeight = 0;
      slotConfig.targetVegetables = 0;
    }

    if (slot === "snack" && snackBehavior === "reduce") {
      slotConfig.calorieWeight *= 0.58;
      slotConfig.proteinWeight *= 0.62;
      slotConfig.targetVegetables = Math.min(slotConfig.targetVegetables, 0.5);
      slotConfig.maxCalories = 210;
      slotConfig.maxProtein = 22;
    }

    acc[slot] = slotConfig;
    return acc;
  }, {});
}

function normalizeMealTargets(slot, rawTargets, templateKey, enabled, slotConfig = {}) {
  if (!enabled) {
    return {
      targetCalories: 0,
      targetProtein: 0,
      targetVegetables: 0,
    };
  }

  const limits = getSlotLimits(slot, templateKey);
  const calorieMax = slotConfig.maxCalories
    ? Math.min(limits.calories.max, safeNumber(slotConfig.maxCalories))
    : limits.calories.max;
  const proteinMax = slotConfig.maxProtein
    ? Math.min(limits.protein.max, safeNumber(slotConfig.maxProtein))
    : limits.protein.max;
  const targetCalories = Math.round(
    clamp(
      safeNumber(rawTargets?.targetCalories),
      limits.calories.min,
      calorieMax
    )
  );
  const targetProtein = Math.round(
    clamp(
      safeNumber(rawTargets?.targetProtein),
      limits.protein.min,
      proteinMax
    )
  );
  const maxVegetables = slot === "snack" ? 1 : 2.5;
  const targetVegetables = roundNumber(
    clamp(safeNumber(rawTargets?.targetVegetables), 0, maxVegetables),
    1
  );

  return {
    targetCalories,
    targetProtein,
    targetVegetables,
  };
}

function buildMealDistribution(definition, options = {}) {
  const totalCalories = scaleCalories(options?.dailyTargetCalories, definition);
  const totalProtein = scaleProtein(options?.dailyTargetProtein, definition);
  const slotConfig = buildSlotConfig(definition, options);
  const calorieWeights = normalizeWeights(slotConfig, "calorieWeight");
  const proteinWeights = normalizeWeights(slotConfig, "proteinWeight");

  return MEAL_SLOTS.reduce((distribution, slot) => {
    const currentSlot = slotConfig[slot];
    const normalizedTargets = normalizeMealTargets(
      slot,
      {
        targetCalories: totalCalories * calorieWeights[slot],
        targetProtein: totalProtein * proteinWeights[slot],
        targetVegetables: currentSlot.targetVegetables,
      },
      definition.key,
      currentSlot.enabled,
      currentSlot
    );

    distribution[slot] = {
      enabled: currentSlot.enabled,
      targetCalories: normalizedTargets.targetCalories,
      targetProtein: normalizedTargets.targetProtein,
      targetVegetables: normalizedTargets.targetVegetables,
      strategy: currentSlot.strategy,
    };

    return distribution;
  }, {});
}

function buildTemplateRules(definition, options, mealDistribution) {
  const rules = [...definition.rules];
  const preferredMealsPerDay = normalizePreferredMealsPerDay(
    options?.preferredMealsPerDay
  );

  if (preferredMealsPerDay <= 3 && mealDistribution.snack.enabled) {
    rules.push(
      "En la version compacta de 3 comidas, el snack se mantiene corto y con funcion concreta."
    );
  } else if (preferredMealsPerDay <= 3 && !mealDistribution.snack.enabled) {
    rules.push(
      "En la version compacta de 3 comidas, el snack puede omitirse sin perder la estructura base."
    );
  }

  if (
    definition.key === NUTRITION_RECOVERY_TEMPLATE_KEYS.PORTABLE_WORKDAY &&
    Boolean(options?.isWorkday)
  ) {
    rules.push(
      "Priorizar alimentos frios o de transporte simple para no depender de cocina compleja."
    );
  }

  return rules;
}

function buildDayGoal(definition, options, mealDistribution) {
  const preferredMealsPerDay = normalizePreferredMealsPerDay(
    options?.preferredMealsPerDay
  );

  if (preferredMealsPerDay <= 3 && !mealDistribution.snack.enabled) {
    return `${definition.dayGoal} En esta version compacta, el plan se concentra en tres momentos fuertes.`;
  }

  if (preferredMealsPerDay <= 3 && mealDistribution.snack.enabled) {
    return `${definition.dayGoal} En esta version compacta, el snack queda reducido y funcional.`;
  }

  return definition.dayGoal;
}

function buildUiSummary(definition, options, mealDistribution) {
  const preferredMealsPerDay = normalizePreferredMealsPerDay(
    options?.preferredMealsPerDay
  );

  if (preferredMealsPerDay <= 3 && !mealDistribution.snack.enabled) {
    return `${definition.uiSummary} Version compacta de 3 comidas.`;
  }

  if (preferredMealsPerDay <= 3 && mealDistribution.snack.enabled) {
    return `${definition.uiSummary} Snack reducido para una estructura mas compacta.`;
  }

  return definition.uiSummary;
}

function buildTemplateBase(definition, options = {}) {
  const mealDistribution = buildMealDistribution(definition, options);

  return {
    key: definition.key,
    name: definition.name,
    description: definition.description,
    recoveryFocus: [...definition.recoveryFocus],
    dayGoal: buildDayGoal(definition, options, mealDistribution),
    recommendedFor: [...definition.recommendedFor],
    constraints: { ...definition.constraints },
    mealDistribution,
    rules: buildTemplateRules(definition, options, mealDistribution),
    uiSummary: buildUiSummary(definition, options, mealDistribution),
  };
}

export function getNutritionRecoveryTemplate(templateKey, options = {}) {
  const resolvedKey = normalizeTemplateKey(templateKey);
  const definition = TEMPLATE_DEFINITIONS[resolvedKey];
  return buildTemplateBase(definition, options);
}

export function getAllNutritionRecoveryTemplates(options = {}) {
  return TEMPLATE_ORDER.map((templateKey) =>
    getNutritionRecoveryTemplate(templateKey, options)
  );
}

export function resolveSuggestedTemplateFromSignals(signals = {}) {
  if (signals?.needsPortableMeals) {
    return NUTRITION_RECOVERY_TEMPLATE_KEYS.PORTABLE_WORKDAY;
  }

  if (signals?.excessCalories || signals?.recentOvereating) {
    return NUTRITION_RECOVERY_TEMPLATE_KEYS.POST_EXCESS;
  }

  if (signals?.lowProtein && signals?.lowVegetables) {
    return NUTRITION_RECOVERY_TEMPLATE_KEYS.BALANCED;
  }

  if (signals?.lowProtein && !signals?.lowVegetables) {
    return NUTRITION_RECOVERY_TEMPLATE_KEYS.HIGH_PROTEIN;
  }

  if (signals?.lowVegetables && !signals?.lowProtein) {
    return NUTRITION_RECOVERY_TEMPLATE_KEYS.VEGETABLE_RECOVERY;
  }

  return NUTRITION_RECOVERY_TEMPLATE_KEYS.BALANCED;
}
