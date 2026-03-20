import {
  NUTRITION_RECOVERY_TEMPLATE_KEYS,
  getNutritionRecoveryTemplate,
  resolveSuggestedTemplateFromSignals,
} from "./nutritionRecoveryTemplates.js";

const SLOT_ORDER = ["breakfast", "lunch", "dinner", "snack"];

const SLOT_LABELS = {
  breakfast: "desayuno",
  lunch: "almuerzo",
  dinner: "cena",
  snack: "snack",
};

const PRIORITY_SCORES = {
  low: 1,
  medium: 2,
  high: 3,
};

const SLOT_STABILITY_SCORES = {
  breakfast: 2,
  lunch: 4,
  dinner: 3,
  snack: 1,
};

const DEFAULT_SLOT_VALUES = {
  breakfast: {
    enabled: true,
    targetCalories: 340,
    targetProtein: 24,
    targetVegetables: 0,
    strategy: "Desayuno base con energia estable y una fuente proteica clara.",
    priority: "medium",
  },
  lunch: {
    enabled: true,
    targetCalories: 560,
    targetProtein: 34,
    targetVegetables: 1,
    strategy: "Almuerzo estructurado con proteina clara y acompanamiento util.",
    priority: "high",
  },
  dinner: {
    enabled: true,
    targetCalories: 560,
    targetProtein: 36,
    targetVegetables: 1,
    strategy: "Cena base de cierre con buena saciedad y orden nutricional.",
    priority: "high",
  },
  snack: {
    enabled: false,
    targetCalories: 180,
    targetProtein: 14,
    targetVegetables: 0,
    strategy: "Snack corto y funcional para completar objetivos sin desordenar el dia.",
    priority: "low",
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

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getSafeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizePriority(priority, fallback = "medium") {
  const normalized = String(priority || "").trim().toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized;
  }
  return fallback;
}

function normalizeMode(mode) {
  const normalized = String(mode || "").trim().toLowerCase();
  if (normalized === "fill_missing" || normalized === "recovery") {
    return normalized;
  }
  return "full_day";
}

function normalizePreferredMealsPerDay(value) {
  const next = Math.round(safeNumber(value, 4));
  return clamp(next, 2, 4);
}

function uniqueStrings(values = []) {
  return Array.from(
    new Set(getSafeArray(values).map((value) => String(value || "").trim()).filter(Boolean))
  );
}

function buildDefaultSlot(slot) {
  const definition = DEFAULT_SLOT_VALUES[slot] || DEFAULT_SLOT_VALUES.snack;
  return {
    enabled: Boolean(definition.enabled),
    slot,
    targetCalories: Math.max(0, Math.round(safeNumber(definition.targetCalories))),
    targetProtein: Math.max(0, Math.round(safeNumber(definition.targetProtein))),
    targetVegetables: roundNumber(Math.max(0, safeNumber(definition.targetVegetables)), 1),
    strategy: definition.strategy,
    priority: normalizePriority(definition.priority, "medium"),
    source: "default",
  };
}

function mergeSource(source, token) {
  const base = String(source || "").trim();
  const nextToken = String(token || "").trim();

  if (!base) return nextToken || "default";
  if (!nextToken || base.includes(nextToken)) return base;
  return `${base}+${nextToken}`;
}

function appendStrategy(strategy, note) {
  const base = String(strategy || "").trim();
  const addition = String(note || "").trim();
  if (!addition) return base;
  if (!base) return addition;
  if (base.includes(addition)) return base;
  return `${base} ${addition}`;
}

function bumpPriority(priority, steps = 1) {
  const order = ["low", "medium", "high"];
  const currentIndex = order.indexOf(normalizePriority(priority, "medium"));
  const nextIndex = clamp(currentIndex + steps, 0, order.length - 1);
  return order[nextIndex];
}

function resolveSlotPriority(templateKey, slot) {
  const normalizedTemplateKey = String(templateKey || "").trim().toLowerCase();

  const priorityMap = {
    [NUTRITION_RECOVERY_TEMPLATE_KEYS.HIGH_PROTEIN]: {
      breakfast: "medium",
      lunch: "high",
      dinner: "high",
      snack: "medium",
    },
    [NUTRITION_RECOVERY_TEMPLATE_KEYS.VEGETABLE_RECOVERY]: {
      breakfast: "medium",
      lunch: "high",
      dinner: "high",
      snack: "low",
    },
    [NUTRITION_RECOVERY_TEMPLATE_KEYS.BALANCED]: {
      breakfast: "medium",
      lunch: "high",
      dinner: "high",
      snack: "medium",
    },
    [NUTRITION_RECOVERY_TEMPLATE_KEYS.PORTABLE_WORKDAY]: {
      breakfast: "medium",
      lunch: "high",
      dinner: "medium",
      snack: "high",
    },
    [NUTRITION_RECOVERY_TEMPLATE_KEYS.POST_EXCESS]: {
      breakfast: "medium",
      lunch: "high",
      dinner: "high",
      snack: "low",
    },
  };

  return priorityMap[normalizedTemplateKey]?.[slot] || buildDefaultSlot(slot).priority;
}

function buildSlotsFromTemplate(template) {
  const mealDistribution = isObject(template?.mealDistribution)
    ? template.mealDistribution
    : {};

  const slotMap = SLOT_ORDER.reduce((acc, slot) => {
    const templateSlot = isObject(mealDistribution[slot]) ? mealDistribution[slot] : {};
    acc[slot] = {
      enabled:
        typeof templateSlot.enabled === "boolean"
          ? templateSlot.enabled
          : buildDefaultSlot(slot).enabled,
      slot,
      targetCalories: safeNumber(
        templateSlot.targetCalories,
        buildDefaultSlot(slot).targetCalories
      ),
      targetProtein: safeNumber(
        templateSlot.targetProtein,
        buildDefaultSlot(slot).targetProtein
      ),
      targetVegetables: safeNumber(
        templateSlot.targetVegetables,
        buildDefaultSlot(slot).targetVegetables
      ),
      strategy: templateSlot.strategy || buildDefaultSlot(slot).strategy,
      priority: resolveSlotPriority(template?.key, slot),
      source: `template:${template?.key || "balanced"}`,
    };
    return acc;
  }, {});

  return normalizeMealSlots(slotMap);
}

function hasExistingMeal(existingMeals, slot) {
  return getSafeArray(existingMeals).some(
    (meal) => String(meal?.type || "").trim().toLowerCase() === slot
  );
}

function getExistingMealSlots(existingMeals) {
  return SLOT_ORDER.filter((slot) => hasExistingMeal(existingMeals, slot));
}

function calculatePlanTotals(slots) {
  const normalizedSlots = normalizeMealSlots(slots);

  return SLOT_ORDER.reduce(
    (totals, slot) => {
      const currentSlot = normalizedSlots[slot];
      if (!currentSlot.enabled) return totals;

      totals.enabledSlots += 1;
      totals.plannedCalories += safeNumber(currentSlot.targetCalories);
      totals.plannedProtein += safeNumber(currentSlot.targetProtein);
      totals.plannedVegetables += safeNumber(currentSlot.targetVegetables);
      return totals;
    },
    {
      enabledSlots: 0,
      plannedCalories: 0,
      plannedProtein: 0,
      plannedVegetables: 0,
    }
  );
}

function getEnabledSlotNames(slots) {
  const normalizedSlots = normalizeMealSlots(slots);
  return SLOT_ORDER.filter((slot) => normalizedSlots[slot].enabled);
}

function disableSlot(slotData, source, note) {
  return {
    ...slotData,
    enabled: false,
    targetCalories: 0,
    targetProtein: 0,
    targetVegetables: 0,
    strategy: note ? appendStrategy(slotData.strategy, note) : slotData.strategy,
    source: source || slotData.source,
  };
}

function getSlotScore(slot, slotData) {
  const priorityScore = PRIORITY_SCORES[normalizePriority(slotData?.priority, "medium")] || 0;
  const stabilityScore = SLOT_STABILITY_SCORES[slot] || 0;
  return priorityScore * 10 + stabilityScore;
}

function limitSlotsForMealCount(slots, preferredMealsPerDay) {
  const normalizedSlots = normalizeMealSlots(slots);
  const enabledSlots = getEnabledSlotNames(normalizedSlots);

  if (preferredMealsPerDay >= 3 || enabledSlots.length <= preferredMealsPerDay) {
    return normalizedSlots;
  }

  const keep = new Set(
    [...enabledSlots]
      .sort((left, right) => {
        return getSlotScore(right, normalizedSlots[right]) - getSlotScore(left, normalizedSlots[left]);
      })
      .slice(0, preferredMealsPerDay)
  );

  return normalizeMealSlots(
    SLOT_ORDER.reduce((acc, slot) => {
      const currentSlot = { ...normalizedSlots[slot] };
      if (currentSlot.enabled && !keep.has(slot)) {
        acc[slot] = disableSlot(
          currentSlot,
          "meal_count_preference",
          `Este slot queda fuera en la version compacta de ${preferredMealsPerDay} comidas.`
        );
      } else {
        acc[slot] = currentSlot;
      }
      return acc;
    }, {})
  );
}

function adjustSlotTargets(slotData, adjustments = {}) {
  if (!slotData.enabled) return slotData;

  const nextCalories = Math.max(
    0,
    Math.round(safeNumber(slotData.targetCalories) + safeNumber(adjustments.calories))
  );
  const nextProtein = Math.max(
    0,
    Math.round(safeNumber(slotData.targetProtein) + safeNumber(adjustments.protein))
  );
  const nextVegetables = roundNumber(
    Math.max(0, safeNumber(slotData.targetVegetables) + safeNumber(adjustments.vegetables)),
    1
  );

  return {
    ...slotData,
    targetCalories: nextCalories,
    targetProtein: nextProtein,
    targetVegetables: nextVegetables,
  };
}

function moderateCalories(slots, intensity = 1) {
  const floorBySlot = {
    breakfast: 180,
    lunch: 280,
    dinner: 280,
    snack: 110,
  };

  return normalizeMealSlots(
    SLOT_ORDER.reduce((acc, slot) => {
      const currentSlot = { ...slots[slot] };
      if (!currentSlot.enabled) {
        acc[slot] = currentSlot;
        return acc;
      }

      const factor = slot === "snack" ? 0.88 - (intensity - 1) * 0.04 : 0.92 - (intensity - 1) * 0.03;
      const moderatedCalories = Math.max(
        floorBySlot[slot] || 0,
        Math.round(safeNumber(currentSlot.targetCalories) * Math.max(0.78, factor))
      );

      acc[slot] = {
        ...currentSlot,
        targetCalories: moderatedCalories,
        strategy: appendStrategy(
          currentSlot.strategy,
          "Mantener densidad calorica moderada y buen volumen."
        ),
        source: mergeSource(currentSlot.source, "calorie_control"),
      };
      return acc;
    }, {})
  );
}

function enhancePortableSlots(slots) {
  return normalizeMealSlots(
    SLOT_ORDER.reduce((acc, slot) => {
      const currentSlot = { ...slots[slot] };
      if (!currentSlot.enabled) {
        acc[slot] = currentSlot;
        return acc;
      }

      if (slot === "lunch" || slot === "snack") {
        acc[slot] = {
          ...currentSlot,
          priority: "high",
          strategy: appendStrategy(
            currentSlot.strategy,
            "Resolver con opciones faciles de transportar o comer en movimiento."
          ),
          source: mergeSource(currentSlot.source, "portable"),
        };
        return acc;
      }

      acc[slot] = {
        ...currentSlot,
        priority: normalizePriority(
          currentSlot.priority === "low" ? "medium" : currentSlot.priority,
          "medium"
        ),
        strategy: appendStrategy(
          currentSlot.strategy,
          "Evitar una preparacion que dependa de cocina compleja."
        ),
        source: mergeSource(currentSlot.source, "portable"),
      };
      return acc;
    }, {})
  );
}

function enhanceRecoverySlots(slots, signals = {}, mode = "full_day") {
  const intensity = mode === "recovery" ? 1.5 : 1;
  const safeSignals = isObject(signals) ? signals : {};

  let nextSlots = normalizeMealSlots(slots);

  if (safeSignals.lowProtein) {
    nextSlots = normalizeMealSlots(
      SLOT_ORDER.reduce((acc, slot) => {
        const currentSlot = { ...nextSlots[slot] };
        let updatedSlot = currentSlot;

        if (slot === "lunch" || slot === "dinner") {
          updatedSlot = adjustSlotTargets(updatedSlot, {
            protein: 6 * intensity,
          });
          updatedSlot.priority = "high";
          updatedSlot.strategy = appendStrategy(
            updatedSlot.strategy,
            "Reforzar una fuente proteica principal en este slot."
          );
          updatedSlot.source = mergeSource(updatedSlot.source, "protein_recovery");
        } else if (slot === "snack" && updatedSlot.enabled) {
          updatedSlot = adjustSlotTargets(updatedSlot, {
            protein: 3 * intensity,
          });
          updatedSlot.priority = bumpPriority(updatedSlot.priority, 1);
          updatedSlot.strategy = appendStrategy(
            updatedSlot.strategy,
            "Usar este slot como refuerzo proteico corto si hace falta."
          );
          updatedSlot.source = mergeSource(updatedSlot.source, "protein_recovery");
        }

        acc[slot] = updatedSlot;
        return acc;
      }, {})
    );
  }

  if (safeSignals.lowVegetables) {
    nextSlots = normalizeMealSlots(
      SLOT_ORDER.reduce((acc, slot) => {
        const currentSlot = { ...nextSlots[slot] };
        let updatedSlot = currentSlot;

        if (slot === "lunch" || slot === "dinner") {
          updatedSlot = adjustSlotTargets(updatedSlot, {
            vegetables: 0.5 * intensity,
          });
          updatedSlot.priority = "high";
          updatedSlot.strategy = appendStrategy(
            updatedSlot.strategy,
            "Asegurar vegetales visibles y utiles en este bloque."
          );
          updatedSlot.source = mergeSource(updatedSlot.source, "vegetable_recovery");
        } else if (slot === "breakfast" && updatedSlot.enabled && updatedSlot.targetVegetables > 0) {
          updatedSlot = adjustSlotTargets(updatedSlot, {
            vegetables: 0.5,
          });
          updatedSlot.source = mergeSource(updatedSlot.source, "vegetable_recovery");
        }

        acc[slot] = updatedSlot;
        return acc;
      }, {})
    );
  }

  if (safeSignals.poorBalance && mode === "recovery") {
    nextSlots = normalizeMealSlots(
      SLOT_ORDER.reduce((acc, slot) => {
        const currentSlot = { ...nextSlots[slot] };
        if (slot === "lunch" || slot === "dinner") {
          acc[slot] = {
            ...currentSlot,
            priority: "high",
            strategy: appendStrategy(
              currentSlot.strategy,
              "Mantener una estructura clara de proteina, vegetales y energia estable."
            ),
            source: mergeSource(currentSlot.source, "macro_balance"),
          };
          return acc;
        }

        acc[slot] = currentSlot;
        return acc;
      }, {})
    );
  }

  if (safeSignals.needsPortableMeals) {
    nextSlots = enhancePortableSlots(nextSlots);
  }

  if (safeSignals.excessCalories || safeSignals.recentOvereating) {
    nextSlots = moderateCalories(nextSlots, intensity);
  }

  return nextSlots;
}

function disableExistingMealSlots(slots, existingMeals = []) {
  const normalizedSlots = normalizeMealSlots(slots);

  return normalizeMealSlots(
    SLOT_ORDER.reduce((acc, slot) => {
      const currentSlot = { ...normalizedSlots[slot] };
      if (hasExistingMeal(existingMeals, slot)) {
        acc[slot] = disableSlot(
          currentSlot,
          "existing_meal",
          "Ya existe una comida registrada en este slot."
        );
      } else {
        acc[slot] = currentSlot;
      }
      return acc;
    }, {})
  );
}

function formatSlotNames(slots = []) {
  const labels = uniqueStrings(
    getSafeArray(slots).map((slot) => SLOT_LABELS[slot] || String(slot))
  );

  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} y ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;
}

function getFocusSummary(templateKey) {
  switch (templateKey) {
    case NUTRITION_RECOVERY_TEMPLATE_KEYS.HIGH_PROTEIN:
      return "proteina";
    case NUTRITION_RECOVERY_TEMPLATE_KEYS.VEGETABLE_RECOVERY:
      return "vegetales y fibra";
    case NUTRITION_RECOVERY_TEMPLATE_KEYS.PORTABLE_WORKDAY:
      return "practicidad y adherencia";
    case NUTRITION_RECOVERY_TEMPLATE_KEYS.POST_EXCESS:
      return "volumen, proteina y calorias moderadas";
    case NUTRITION_RECOVERY_TEMPLATE_KEYS.BALANCED:
    default:
      return "proteina y vegetales";
  }
}

function buildReasoning({
  inputTemplateKey,
  template,
  mode,
  signals,
  existingMeals,
  options,
  slots,
}) {
  const safeSignals = isObject(signals) ? signals : {};
  const reasoning = [];
  const enabledSlots = getEnabledSlotNames(slots);
  const existingSlots = getExistingMealSlots(existingMeals);
  const preferredMealsPerDay = normalizePreferredMealsPerDay(options?.preferredMealsPerDay);

  if (inputTemplateKey) {
    if (String(inputTemplateKey).trim().toLowerCase() === template.key) {
      reasoning.push(`Se uso la plantilla ${template.name} por templateKey explicito.`);
    } else {
      reasoning.push(
        `La template solicitada no era valida, asi que se uso ${template.name} como fallback estable.`
      );
    }
  } else {
    reasoning.push(`Se resolvio la plantilla ${template.name} a partir de las senales nutricionales.`);
  }

  if (safeSignals.lowProtein) {
    reasoning.push("La baja proteina empuja lunch y dinner como slots principales de recuperacion.");
  }

  if (safeSignals.lowVegetables) {
    reasoning.push("La baja presencia vegetal refuerza lunch y dinner con mas volumen y fibra.");
  }

  if (safeSignals.needsPortableMeals) {
    reasoning.push("Se priorizaron slots faciles de transportar para proteger adherencia en jornada movil.");
  }

  if (safeSignals.excessCalories || safeSignals.recentOvereating) {
    reasoning.push("El plan modera calorias sin eliminar comidas ni volverlo punitivo.");
  }

  if (mode === "fill_missing") {
    if (existingSlots.length > 0) {
      reasoning.push(
        `Se desactivaron ${formatSlotNames(existingSlots)} porque ya tienen registro y se completan solo los faltantes.`
      );
    } else {
      reasoning.push("No habia comidas registradas, asi que el planner devolvio una estructura completa del dia.");
    }
  }

  if (mode === "recovery") {
    reasoning.push("El modo recovery sube prioridad y vuelve mas utiles los slots clave para corregir el dia.");
  }

  if (preferredMealsPerDay <= 2 && mode !== "fill_missing") {
    reasoning.push("La estructura se compacto para respetar una preferencia de dos comidas principales.");
  } else if (preferredMealsPerDay <= 3 && !slots.snack.enabled && mode !== "fill_missing") {
    reasoning.push("El snack se pudo omitir para sostener una estructura mas compacta.");
  }

  if (enabledSlots.length === 0) {
    reasoning.push("No quedaron slots activos por planificar con la configuracion actual.");
  }

  return uniqueStrings(reasoning);
}

export function normalizeMealSlots(slotsConfig) {
  const safeConfig = isObject(slotsConfig) ? slotsConfig : {};

  return SLOT_ORDER.reduce((acc, slot) => {
    const defaults = buildDefaultSlot(slot);
    const rawSlot = isObject(safeConfig[slot]) ? safeConfig[slot] : {};
    const enabled =
      typeof rawSlot.enabled === "boolean" ? rawSlot.enabled : defaults.enabled;

    acc[slot] = {
      enabled,
      slot,
      targetCalories: enabled
        ? Math.max(0, Math.round(safeNumber(rawSlot.targetCalories, defaults.targetCalories)))
        : 0,
      targetProtein: enabled
        ? Math.max(0, Math.round(safeNumber(rawSlot.targetProtein, defaults.targetProtein)))
        : 0,
      targetVegetables: enabled
        ? roundNumber(
            Math.max(0, safeNumber(rawSlot.targetVegetables, defaults.targetVegetables)),
            1
          )
        : 0,
      strategy:
        String(rawSlot.strategy || defaults.strategy).trim() || defaults.strategy,
      priority: normalizePriority(rawSlot.priority, defaults.priority),
      source: String(rawSlot.source || defaults.source).trim() || defaults.source,
    };

    return acc;
  }, {});
}

export function summarizeMealSlotPlan(plan) {
  const safePlan = isObject(plan) ? plan : {};
  const slots = normalizeMealSlots(safePlan.slots);
  const enabledSlots = getEnabledSlotNames(slots);
  const highPrioritySlots = enabledSlots.filter((slot) => slots[slot].priority === "high");
  const focusSummary = getFocusSummary(safePlan.templateKey);

  if (enabledSlots.length === 0) {
    return safePlan.mode === "fill_missing"
      ? "No quedan slots pendientes por completar."
      : "No hay slots activos para planificar en este momento.";
  }

  if (safePlan.mode === "fill_missing") {
    return `Se propone completar el dia con ${formatSlotNames(enabledSlots)} con foco en ${focusSummary}.`;
  }

  if (safePlan.templateKey === NUTRITION_RECOVERY_TEMPLATE_KEYS.PORTABLE_WORKDAY) {
    return "Se priorizan comidas portables para facilitar adherencia durante el trabajo.";
  }

  if (safePlan.templateKey === NUTRITION_RECOVERY_TEMPLATE_KEYS.POST_EXCESS) {
    return "Se armo un dia correctivo no punitivo con proteina util, volumen y calorias moderadas.";
  }

  if (safePlan.templateKey === NUTRITION_RECOVERY_TEMPLATE_KEYS.VEGETABLE_RECOVERY) {
    return "Se armo un dia para recuperar vegetales, fibra y volumen con almuerzo y cena fuertes.";
  }

  if (
    safePlan.templateKey === NUTRITION_RECOVERY_TEMPLATE_KEYS.HIGH_PROTEIN &&
    highPrioritySlots.includes("lunch") &&
    highPrioritySlots.includes("dinner")
  ) {
    return "Se armo un dia alto en proteina con lunch y dinner como bloques principales.";
  }

  if (safePlan.templateKey === NUTRITION_RECOVERY_TEMPLATE_KEYS.BALANCED) {
    return "Se armo un dia equilibrado con foco en proteina y vegetales.";
  }

  return `Se armo una estructura de slots con foco en ${focusSummary}.`;
}

export function buildMealSlotPlan(input = {}) {
  const safeInput = isObject(input) ? input : {};
  const safeSignals = isObject(safeInput.signals) ? safeInput.signals : {};
  const safeOptions = isObject(safeInput.options) ? safeInput.options : {};
  const existingMeals = getSafeArray(safeInput.existingMeals);
  const mode = normalizeMode(safeInput.mode);

  // Template resolution stays centralized so future planners can share the same signal logic.
  const requestedTemplateKey = String(safeInput.templateKey || "").trim().toLowerCase();
  const resolvedTemplateKey =
    requestedTemplateKey || resolveSuggestedTemplateFromSignals(safeSignals);
  const template = getNutritionRecoveryTemplate(resolvedTemplateKey, safeOptions);

  let slots = buildSlotsFromTemplate(template);
  slots = enhanceRecoverySlots(slots, safeSignals, mode);

  // `fill_missing` keeps the missing slots only; the full-day path still respects compact meal preferences.
  if (mode === "fill_missing" && existingMeals.length > 0) {
    slots = disableExistingMealSlots(slots, existingMeals);
  } else {
    slots = limitSlotsForMealCount(
      slots,
      normalizePreferredMealsPerDay(safeOptions.preferredMealsPerDay)
    );
  }

  const totals = calculatePlanTotals(slots);
  totals.plannedCalories = Math.round(totals.plannedCalories);
  totals.plannedProtein = Math.round(totals.plannedProtein);
  totals.plannedVegetables = roundNumber(totals.plannedVegetables, 1);

  const plan = {
    templateKey: template.key,
    templateName: template.name,
    mode,
    slots,
    totals,
    reasoning: buildReasoning({
      inputTemplateKey: requestedTemplateKey,
      template,
      mode,
      signals: safeSignals,
      existingMeals,
      options: safeOptions,
      slots,
    }),
  };

  return {
    ...plan,
    uiSummary: summarizeMealSlotPlan(plan),
  };
}

export function fillMissingMealSlots(input = {}) {
  const safeInput = isObject(input) ? input : {};
  return buildMealSlotPlan({
    ...safeInput,
    mode: "fill_missing",
  });
}
