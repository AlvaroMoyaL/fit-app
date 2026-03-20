import { matchRecoveryMealsForPlan } from "./recoveryMealMatcher.js";

const DEFAULT_TARGETS = {
  calories: 2200,
  protein: 140,
  carbs: 220,
  fat: 70,
  vegetables: 3,
};

function getTemplateKeyFromRecoveryType(recoveryType) {
  if (recoveryType === "protein") return "high_protein";
  if (recoveryType === "vegetables") return "vegetable_recovery";
  if (recoveryType === "post_excess") return "post_excess";
  if (recoveryType === "balanced") return "balanced";
  return "balanced";
}

function safeNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function roundNumber(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(safeNumber(value) * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toWholeServing(value) {
  const next = Math.max(0, safeNumber(value));
  return Math.ceil(next);
}

function uniqueStrings(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));
}

function hasOwnNumber(source, key) {
  if (!source || typeof source !== "object") return false;
  return Number.isFinite(Number(source[key]));
}

function sumMealHistory(mealHistory = []) {
  const safeHistory = Array.isArray(mealHistory) ? mealHistory.filter(Boolean) : [];

  return safeHistory.reduce(
    (acc, meal) => {
      const slot = String(meal?.type || "").trim().toLowerCase();

      acc.calories += safeNumber(meal?.calories);
      acc.protein += safeNumber(meal?.protein);
      acc.carbs += safeNumber(meal?.carbs);
      acc.fat += safeNumber(meal?.fat);
      acc.vegetableServings += Math.max(0, safeNumber(meal?.vegetableServings));

      if (slot) {
        acc.slots[slot] = (acc.slots[slot] || 0) + 1;
      }

      acc.mealCount += 1;
      return acc;
    },
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      vegetableServings: 0,
      mealCount: 0,
      slots: {},
    }
  );
}

function hasMealSlot(mealHistory, slot) {
  const safeSlot = String(slot || "").trim().toLowerCase();
  if (!safeSlot) return false;

  return (Array.isArray(mealHistory) ? mealHistory : []).some(
    (meal) => String(meal?.type || "").trim().toLowerCase() === safeSlot
  );
}

function getRemainingCalories(target, consumed) {
  return Math.max(0, roundNumber(safeNumber(target) - safeNumber(consumed)));
}

function getRemainingProtein(target, consumed) {
  return Math.max(0, roundNumber(safeNumber(target) - safeNumber(consumed)));
}

function getRemainingVegetables(target, consumed) {
  return Math.max(0, roundNumber(safeNumber(target) - safeNumber(consumed), 1));
}

function hasStrongInput(input, mealTotals) {
  if (!input || typeof input !== "object") return false;
  if (Object.keys(input).length === 0) return false;
  if (mealTotals.mealCount > 0) return true;

  const numberKeys = [
    "dailyTargetCalories",
    "dailyTargetProtein",
    "dailyTargetCarbs",
    "dailyTargetFat",
    "consumedCalories",
    "consumedProtein",
    "consumedCarbs",
    "consumedFat",
    "vegetableServings",
  ];

  if (numberKeys.some((key) => hasOwnNumber(input, key))) return true;

  const deficits = input?.deficits;
  if (deficits && typeof deficits === "object") {
    return Object.values(deficits).some(Boolean);
  }

  return false;
}

function detectPoorMacroBalance(targets, consumed) {
  const targetProtein = safeNumber(targets.protein);
  const targetCarbs = safeNumber(targets.carbs);
  const targetFat = safeNumber(targets.fat);

  const proteinGapRatio =
    targetProtein > 0
      ? Math.max(0, targetProtein - safeNumber(consumed.protein)) / targetProtein
      : 0;
  const carbsHigh =
    targetCarbs > 0 ? safeNumber(consumed.carbs) > targetCarbs * 1.2 : false;
  const fatHigh = targetFat > 0 ? safeNumber(consumed.fat) > targetFat * 1.2 : false;

  return proteinGapRatio >= 0.35 || carbsHigh || fatHigh;
}

function normalizeDeficits(rawDeficits, targets, consumed, remaining, mealTotals) {
  const safeDeficits = rawDeficits && typeof rawDeficits === "object" ? rawDeficits : {};
  const targetCalories = safeNumber(targets.calories);
  const targetProtein = safeNumber(targets.protein);

  const inferredLowProtein =
    targetProtein > 0
      ? remaining.proteinToRecover >= Math.max(18, targetProtein * 0.18)
      : remaining.proteinToRecover >= 24;
  const inferredLowVegetables = remaining.vegetablesToRecover >= 1;
  const inferredExcessCalories =
    targetCalories > 0 && safeNumber(consumed.calories) > targetCalories * 1.08;
  const inferredLowCalories =
    !inferredExcessCalories &&
    remaining.caloriesToUse >= Math.max(280, targetCalories * 0.18) &&
    mealTotals.mealCount < 4;

  return {
    lowProtein: Boolean(safeDeficits.lowProtein) || inferredLowProtein,
    lowVegetables: Boolean(safeDeficits.lowVegetables) || inferredLowVegetables,
    lowCalories: Boolean(safeDeficits.lowCalories) || inferredLowCalories,
    excessCalories: Boolean(safeDeficits.excessCalories) || inferredExcessCalories,
    poorMacroBalance:
      Boolean(safeDeficits.poorMacroBalance) || detectPoorMacroBalance(targets, consumed),
    lowSatiety: Boolean(safeDeficits.lowSatiety),
  };
}

function resolveRecoveryType(deficits, remainingData) {
  if (deficits.excessCalories) return "post_excess";
  if (deficits.lowProtein && deficits.lowVegetables) return "balanced";
  if (deficits.lowProtein && !deficits.excessCalories) return "protein";
  if (deficits.lowVegetables && !deficits.lowProtein) return "vegetables";

  if (remainingData.proteinToRecover > 0 && remainingData.vegetablesToRecover > 0) {
    return "balanced";
  }

  if (remainingData.proteinToRecover > 0) return "protein";
  if (remainingData.vegetablesToRecover > 0) return "vegetables";
  return "light";
}

function getBaseGoals(targets, consumed, vegetableServings) {
  return {
    caloriesToUse: getRemainingCalories(targets.calories, consumed.calories),
    proteinToRecover: getRemainingProtein(targets.protein, consumed.protein),
    vegetablesToRecover: getRemainingVegetables(
      DEFAULT_TARGETS.vegetables,
      vegetableServings
    ),
  };
}

function shouldAddSnack(recoveryType, goals, dinnerExists, deficits) {
  if (dinnerExists) {
    return (
      goals.proteinToRecover > 12 ||
      goals.vegetablesToRecover > 0 ||
      (recoveryType === "light" && goals.caloriesToUse > 120)
    );
  }

  if (recoveryType === "post_excess") return false;
  if (recoveryType === "balanced" && goals.proteinToRecover > 35) return true;
  if (recoveryType === "protein" && goals.proteinToRecover > 45) return true;
  if (deficits.lowCalories && goals.caloriesToUse > 700) return true;
  return false;
}

function resolveMealSlots(mealHistory, recoveryType, goals, deficits) {
  const dinnerExists = hasMealSlot(mealHistory, "dinner");
  const slots = [];

  if (!dinnerExists) {
    slots.push("dinner");
  }

  if (shouldAddSnack(recoveryType, goals, dinnerExists, deficits)) {
    slots.push("snack");
  }

  if (slots.length === 0 && (goals.proteinToRecover > 0 || goals.vegetablesToRecover > 0)) {
    slots.push("snack");
  }

  return uniqueStrings(slots).slice(0, 2);
}

function getCaloriesCap(slot, recoveryType, goals) {
  if (recoveryType === "post_excess") {
    return slot === "dinner" ? 320 : 220;
  }

  const baseCap = slot === "dinner" ? 820 : 360;

  if (recoveryType === "light") return slot === "dinner" ? 520 : 260;
  if (recoveryType === "vegetables") return slot === "dinner" ? 640 : 280;
  if (goals.caloriesToUse > 1000 && slot === "dinner") return 920;
  return baseCap;
}

function getCaloriesFloor(slot, recoveryType, goals) {
  if (recoveryType === "post_excess") return slot === "dinner" ? 160 : 120;
  if (goals.caloriesToUse <= 0) return slot === "dinner" ? 220 : 140;
  if (recoveryType === "balanced") return slot === "dinner" ? 320 : 160;
  if (recoveryType === "protein") return slot === "dinner" ? 280 : 150;
  if (recoveryType === "vegetables") return slot === "dinner" ? 240 : 120;
  return slot === "dinner" ? 260 : 140;
}

function getCalorieShare(slot, recoveryType, slotCount) {
  if (slotCount <= 1) return 1;
  if (slot === "dinner") {
    if (recoveryType === "balanced") return 0.72;
    if (recoveryType === "protein") return 0.68;
    return 0.7;
  }
  return 0.32;
}

function buildMealCaloriesTarget(slot, recoveryType, goals, slotCount) {
  if (recoveryType === "post_excess") {
    const base = slot === "dinner" ? 220 : 160;
    return clamp(base, 120, getCaloriesCap(slot, recoveryType, goals));
  }

  const available = Math.max(0, safeNumber(goals.caloriesToUse));
  const share = getCalorieShare(slot, recoveryType, slotCount);
  const floor = getCaloriesFloor(slot, recoveryType, goals);
  const cap = getCaloriesCap(slot, recoveryType, goals);
  const proposed = available > 0 ? available * share : floor;

  return clamp(roundNumber(proposed), floor, cap);
}

function getProteinFloor(slot, recoveryType, proteinGap) {
  if (recoveryType === "post_excess") return slot === "dinner" ? 24 : 18;
  if (proteinGap <= 0) return 0;
  if (recoveryType === "balanced") return slot === "dinner" ? 26 : 12;
  if (recoveryType === "protein") return slot === "dinner" ? 28 : 14;
  if (recoveryType === "vegetables") return slot === "dinner" ? 14 : 8;
  return slot === "dinner" ? 18 : 10;
}

function getProteinCap(slot, recoveryType) {
  if (recoveryType === "post_excess") return slot === "dinner" ? 34 : 26;
  if (recoveryType === "protein") return slot === "dinner" ? 50 : 28;
  if (recoveryType === "balanced") return slot === "dinner" ? 42 : 24;
  if (recoveryType === "vegetables") return slot === "dinner" ? 28 : 18;
  return slot === "dinner" ? 32 : 18;
}

function getProteinShare(slot, recoveryType, slotCount) {
  if (slotCount <= 1) return 1;
  if (slot === "dinner") {
    if (recoveryType === "protein") return 0.7;
    if (recoveryType === "balanced") return 0.65;
    return 0.6;
  }
  return 0.35;
}

function buildMealProteinTarget(slot, recoveryType, goals, slotCount) {
  const proteinGap = Math.max(0, safeNumber(goals.proteinToRecover));

  if (proteinGap <= 0 && recoveryType !== "post_excess") return 0;

  const share = getProteinShare(slot, recoveryType, slotCount);
  const floor = getProteinFloor(slot, recoveryType, proteinGap);
  const cap = getProteinCap(slot, recoveryType);
  const proposed = proteinGap > 0 ? proteinGap * share : floor;

  return clamp(roundNumber(proposed), floor, cap);
}

function buildMealVegetableTarget(slot, recoveryType, goals, slotCount, deficits) {
  const vegetableGap = Math.max(0, safeNumber(goals.vegetablesToRecover));

  if (recoveryType === "post_excess") {
    return deficits.lowVegetables ? 1 : 0;
  }

  if (vegetableGap <= 0 && recoveryType !== "balanced" && recoveryType !== "vegetables") {
    return 0;
  }

  if (slotCount <= 1) {
    if (recoveryType === "vegetables") return Math.max(1, toWholeServing(vegetableGap));
    if (recoveryType === "balanced") return Math.max(1, toWholeServing(vegetableGap));
    return toWholeServing(vegetableGap);
  }

  if (slot === "dinner") {
    return recoveryType === "vegetables"
      ? Math.max(1, toWholeServing(vegetableGap * 0.75))
      : Math.max(1, toWholeServing(vegetableGap * 0.65));
  }

  return vegetableGap > 0 ? Math.max(1, toWholeServing(vegetableGap * 0.35)) : 0;
}

function buildNutritionalFocus(recoveryType, deficits, mealTarget) {
  const focus = [];

  if (mealTarget.targetProtein > 0) focus.push("protein");
  if (mealTarget.targetVegetables > 0) focus.push("vegetables");
  if (deficits.lowSatiety && recoveryType !== "post_excess") focus.push("satiety");
  if (recoveryType === "post_excess") focus.push("low_calorie");
  if (deficits.poorMacroBalance) focus.push("macro_balance");
  if (deficits.lowCalories && recoveryType !== "post_excess") focus.push("energy_recovery");

  return uniqueStrings(focus);
}

function buildStrategyLabel(slot, recoveryType) {
  if (recoveryType === "post_excess") {
    return slot === "dinner"
      ? "Cena liviana alta en proteina"
      : "Snack liviano alto en proteina";
  }

  if (recoveryType === "balanced") {
    return slot === "dinner"
      ? "Cena correctiva equilibrada"
      : "Snack complementario de apoyo";
  }

  if (recoveryType === "protein") {
    return slot === "dinner"
      ? "Cena correctiva alta en proteina"
      : "Snack correctivo alto en proteina";
  }

  if (recoveryType === "vegetables") {
    return slot === "dinner"
      ? "Cena correctiva con vegetales"
      : "Snack o acompanamiento vegetal";
  }

  return slot === "dinner"
    ? "Cena ligera de cierre"
    : "Snack ligero de cierre";
}

function buildMealSuggestions({ mealHistory, deficits, goals, recoveryType }) {
  const slots = resolveMealSlots(mealHistory, recoveryType, goals, deficits);
  const slotCount = slots.length;
  let caloriesBudget = Math.max(0, safeNumber(goals.caloriesToUse));
  let proteinBudget = Math.max(0, safeNumber(goals.proteinToRecover));
  let vegetableBudget = Math.max(0, safeNumber(goals.vegetablesToRecover));

  return slots.map((slot, index) => {
    const slotsLeft = Math.max(1, slotCount - index);
    const scopedGoals = {
      caloriesToUse: caloriesBudget,
      proteinToRecover: proteinBudget,
      vegetablesToRecover: vegetableBudget,
    };

    const targetCalories = buildMealCaloriesTarget(
      slot,
      recoveryType,
      scopedGoals,
      slotsLeft
    );
    const targetProtein = buildMealProteinTarget(
      slot,
      recoveryType,
      scopedGoals,
      slotsLeft
    );
    const targetVegetables = buildMealVegetableTarget(
      slot,
      recoveryType,
      scopedGoals,
      slotsLeft,
      deficits
    );

    caloriesBudget = Math.max(0, caloriesBudget - targetCalories);
    proteinBudget = Math.max(0, proteinBudget - targetProtein);
    vegetableBudget = Math.max(0, vegetableBudget - targetVegetables);

    const mealTarget = {
      targetCalories,
      targetProtein,
      targetVegetables,
    };

    return {
      slot,
      strategy: buildStrategyLabel(slot, recoveryType),
      nutritionalFocus: buildNutritionalFocus(recoveryType, deficits, mealTarget),
      targetCalories,
      targetProtein,
      targetVegetables,
    };
  });
}

function buildSummary({ recoveryType, suggestedMeals, deficits }) {
  const hasDinner = suggestedMeals.some((meal) => meal.slot === "dinner");
  const hasSnack = suggestedMeals.some((meal) => meal.slot === "snack");

  if (recoveryType === "post_excess") {
    return "Hoy vas pasado en calorias. Conviene cerrar el dia con una opcion liviana y alta en proteina.";
  }

  if (recoveryType === "balanced") {
    if (hasDinner && hasSnack) {
      return "Faltan vegetales y proteina. Se propone una cena equilibrada mas un snack liviano.";
    }
    return "Faltan vegetales y proteina. Conviene una cena correctiva equilibrada.";
  }

  if (recoveryType === "protein") {
    return hasDinner
      ? "Tu dia va bajo en proteina. Conviene una cena correctiva alta en proteina."
      : "Todavia falta proteina. Conviene un snack correctivo alto en proteina.";
  }

  if (recoveryType === "vegetables") {
    return hasDinner
      ? "Faltan vegetales en tu dia. Conviene una cena correctiva con mas volumen vegetal."
      : "Aun faltan vegetales. Conviene cerrar el dia con una opcion ligera que sume vegetales.";
  }

  if (deficits.lowCalories) {
    return "Aun queda margen calorico. Se propone un cierre ligero para completar mejor el dia.";
  }

  if (hasSnack) {
    return "No hay un deficit fuerte, pero un snack liviano puede cerrar el dia de forma mas ordenada.";
  }

  return "No se detecta una correccion fuerte, pero aun puedes cerrar el dia con una opcion ligera y bien distribuida.";
}

function buildReasoning({
  targets,
  consumed,
  goals,
  deficits,
  recoveryType,
  mealHistory,
  suggestedMeals,
}) {
  const reasoning = [];
  const dinnerExists = hasMealSlot(mealHistory, "dinner");

  if (targets.calories > 0 || consumed.calories > 0) {
    reasoning.push(
      `Quedan ${Math.round(goals.caloriesToUse)} kcal utiles segun el balance actual del dia.`
    );
  }

  if (goals.proteinToRecover > 0) {
    reasoning.push(`Aun faltan ${Math.round(goals.proteinToRecover)} g de proteina para el objetivo diario.`);
  }

  if (goals.vegetablesToRecover > 0) {
    reasoning.push(
      `Todavia faltan ${roundNumber(goals.vegetablesToRecover, 1)} porciones de vegetales para cerrar mejor el dia.`
    );
  }

  if (!dinnerExists && suggestedMeals.some((meal) => meal.slot === "dinner")) {
    reasoning.push("No hay una cena registrada, por eso la correccion principal se concentra en dinner.");
  }

  if (dinnerExists && suggestedMeals.some((meal) => meal.slot === "snack")) {
    reasoning.push("Como dinner ya existe, la correccion se desplaza a un snack complementario.");
  }

  if (recoveryType === "post_excess") {
    reasoning.push("Se priorizo una opcion de alta densidad proteica y bajo aporte calorico porque el dia ya va excedido.");
  }

  if (deficits.lowSatiety) {
    reasoning.push("La baja saciedad probable empuja la correccion hacia opciones mas estables y con mejor cierre del dia.");
  }

  if (deficits.poorMacroBalance) {
    reasoning.push("El dia muestra desbalance de macros, asi que la correccion busca ordenar la ultima parte de la jornada.");
  }

  return uniqueStrings(reasoning);
}

function buildInsufficientDataResponse() {
  return {
    status: "insufficient_data",
    summary: "No hay suficientes datos para construir un plan correctivo del resto del dia.",
    goals: {
      caloriesToUse: 0,
      proteinToRecover: 0,
      vegetablesToRecover: 0,
    },
    suggestedMeals: [],
    recoveryType: "light",
    reasoning: [
      "Faltan objetivos, consumos o historial minimo para estimar una correccion del resto del dia.",
    ],
    suggestedMealMatches: null,
    mealOptionsBySlot: {},
  };
}

function buildCorrectiveMealMatchPlan(recoveryType, suggestedMeals = []) {
  return {
    templateKey: getTemplateKeyFromRecoveryType(recoveryType),
    templateName: recoveryType,
    slots: uniqueStrings((Array.isArray(suggestedMeals) ? suggestedMeals : []).map((meal) => meal?.slot)).reduce(
      (acc, slot) => {
        const meal = (Array.isArray(suggestedMeals) ? suggestedMeals : []).find(
          (candidate) => candidate?.slot === slot
        );
        if (!meal) return acc;

        acc[slot] = {
          enabled: true,
          slot,
          targetCalories: safeNumber(meal?.targetCalories),
          targetProtein: safeNumber(meal?.targetProtein),
          targetVegetables: safeNumber(meal?.targetVegetables),
          strategy: meal?.strategy || "",
          priority: slot === "dinner" ? "high" : "medium",
          source: "corrective_day_builder",
        };

        return acc;
      },
      {}
    ),
  };
}

// Build a correction plan for the remaining part of the day.
export function buildCorrectiveDayPlan(input = {}) {
  const mealTotals = sumMealHistory(input?.mealHistory);

  if (!hasStrongInput(input, mealTotals)) {
    return buildInsufficientDataResponse();
  }

  const targets = {
    calories: hasOwnNumber(input, "dailyTargetCalories")
      ? safeNumber(input.dailyTargetCalories)
      : DEFAULT_TARGETS.calories,
    protein: hasOwnNumber(input, "dailyTargetProtein")
      ? safeNumber(input.dailyTargetProtein)
      : DEFAULT_TARGETS.protein,
    carbs: hasOwnNumber(input, "dailyTargetCarbs")
      ? safeNumber(input.dailyTargetCarbs)
      : DEFAULT_TARGETS.carbs,
    fat: hasOwnNumber(input, "dailyTargetFat")
      ? safeNumber(input.dailyTargetFat)
      : DEFAULT_TARGETS.fat,
  };

  const consumed = {
    calories: hasOwnNumber(input, "consumedCalories")
      ? safeNumber(input.consumedCalories)
      : mealTotals.calories,
    protein: hasOwnNumber(input, "consumedProtein")
      ? safeNumber(input.consumedProtein)
      : mealTotals.protein,
    carbs: hasOwnNumber(input, "consumedCarbs")
      ? safeNumber(input.consumedCarbs)
      : mealTotals.carbs,
    fat: hasOwnNumber(input, "consumedFat")
      ? safeNumber(input.consumedFat)
      : mealTotals.fat,
  };

  const vegetableServings = hasOwnNumber(input, "vegetableServings")
    ? safeNumber(input.vegetableServings)
    : mealTotals.vegetableServings;

  const goals = getBaseGoals(targets, consumed, vegetableServings);
  const deficits = normalizeDeficits(
    input?.deficits,
    targets,
    consumed,
    goals,
    mealTotals
  );
  const recoveryType = resolveRecoveryType(deficits, goals);
  const suggestedMeals = buildMealSuggestions({
    mealHistory: input?.mealHistory,
    deficits,
    goals,
    recoveryType,
  });
  const suggestedMealMatches = suggestedMeals.length
    ? matchRecoveryMealsForPlan({
        plan: buildCorrectiveMealMatchPlan(recoveryType, suggestedMeals),
        context: input?.context,
        options: {
          preferHighProtein: recoveryType === "protein" || recoveryType === "balanced",
          preferVegetables:
            recoveryType === "vegetables" ||
            recoveryType === "balanced" ||
            recoveryType === "post_excess",
          moderateCalories: recoveryType === "post_excess",
          ...(input?.mealMatchingOptions || {}),
        },
      })
    : null;

  return {
    status: "ok",
    summary: buildSummary({
      recoveryType,
      suggestedMeals,
      deficits,
    }),
    goals: {
      caloriesToUse: Math.max(0, Math.round(goals.caloriesToUse)),
      proteinToRecover: Math.max(0, Math.round(goals.proteinToRecover)),
      vegetablesToRecover: Math.max(0, roundNumber(goals.vegetablesToRecover, 1)),
    },
    suggestedMeals,
    suggestedMealMatches,
    mealOptionsBySlot: suggestedMealMatches?.slotMatches || {},
    recoveryType,
    reasoning: buildReasoning({
      targets,
      consumed,
      goals,
      deficits,
      recoveryType,
      mealHistory: input?.mealHistory,
      suggestedMeals,
    }),
  };
}
