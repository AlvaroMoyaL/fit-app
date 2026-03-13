import { createAdaptiveMealSuggestions } from "./adaptiveMealEngine";
import { getProteinRecoverySuggestions } from "./proteinRecoveryFoods";
import { getVegetableRecoverySuggestions } from "./vegetableRecoveryFoods";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeDailyStatus(dailyStatus) {
  if (!dailyStatus || typeof dailyStatus !== "object") return null;

  const vegetableServings = Math.max(0, toNumber(dailyStatus.vegetableServings));
  const proteinRemaining = Math.max(0, toNumber(dailyStatus.proteinRemaining));
  const caloriesRemaining = Math.max(0, toNumber(dailyStatus.caloriesRemaining));

  return {
    caloriesRemaining,
    proteinRemaining,
    vegetableServings,
    vegetableDeficit: Math.max(0, 3 - vegetableServings),
    macroBalance: {
      protein: normalizeStatus(dailyStatus?.macroBalance?.protein),
      carbs: normalizeStatus(dailyStatus?.macroBalance?.carbs),
      fats: normalizeStatus(dailyStatus?.macroBalance?.fats),
    },
    mealTiming: normalizeStatus(dailyStatus.mealTiming),
  };
}

function getPriority(status) {
  if (!status) return "no-action-needed";

  const needsProtein = status.proteinRemaining > 20 || status.macroBalance.protein === "low";
  const needsVegetables = status.vegetableServings < 2;

  if (needsProtein && needsVegetables) return "protein-and-vegetables";
  if (needsProtein) return "protein";
  if (needsVegetables) return "vegetables";
  if (status.macroBalance.fats === "high" || status.macroBalance.carbs === "low") {
    return "macro-balance";
  }
  if (status.caloriesRemaining > 0) return "light-adjustment";
  return "no-action-needed";
}

function shouldSuggestFullMeal(status, options, priority) {
  const mealType = normalizeStatus(options?.mealType || status?.mealTiming);
  if (mealType === "dinner") return true;
  if (priority === "protein-and-vegetables") return true;
  if (status?.proteinRemaining > 30 && status?.caloriesRemaining >= 280) return true;
  if (status?.vegetableDeficit >= 2 && status?.caloriesRemaining >= 220) return true;
  return false;
}

function buildCorrectionMessages(status, priority, hasMeals) {
  const messages = [];

  if (!status) {
    return ["No hay suficientes datos para generar correcciones nutricionales."];
  }

  if (status.proteinRemaining > 0) {
    messages.push(`Te faltan aproximadamente ${Math.round(status.proteinRemaining)} g de proteína hoy.`);
  }

  if (status.vegetableDeficit > 0) {
    messages.push("Hoy llevas pocas porciones de vegetales.");
  }

  if (status.caloriesRemaining > 0) {
    messages.push("Aún tienes margen calórico para una comida correctiva.");
  }

  if (priority === "protein-and-vegetables") {
    messages.push("Estas opciones pueden ayudarte a corregir proteína y vegetales al mismo tiempo.");
  } else if (priority === "protein") {
    messages.push(
      hasMeals
        ? "Prioriza opciones altas en proteína para cerrar mejor el día."
        : "Un snack o comida alta en proteína puede ayudarte a cerrar el déficit."
    );
  } else if (priority === "vegetables") {
    messages.push("Agregar una porción vegetal a tu próxima comida sería una buena corrección.");
  } else if (priority === "macro-balance") {
    messages.push("Una comida simple y bien balanceada puede ayudarte a ordenar mejor tus macros.");
  } else if (priority === "light-adjustment") {
    messages.push("No hay déficits marcados, pero aún puedes cerrar el día con una opción ligera.");
  } else {
    messages.push("No se detectan correcciones importantes por ahora.");
  }

  return messages;
}

function chooseBestStrategy(status, priority, suggestions, options) {
  const prefersMeal = shouldSuggestFullMeal(status, options, priority);
  const topMeal = suggestions.meals[0] || null;
  const topProteinFood = suggestions.proteinFoods[0] || null;
  const topVegetableFood = suggestions.vegetableFoods[0] || null;

  if (priority === "no-action-needed") {
    return {
      type: "none",
      label: "No necesitas una corrección importante",
      reason: "Tu día no muestra déficits relevantes por ahora",
    };
  }

  if (prefersMeal && topMeal) {
    if (priority === "protein-and-vegetables") {
      return {
        type: "meal",
        label: "Prioriza una comida alta en proteína con vegetales",
        reason: "Corrige proteína y vegetales al mismo tiempo",
      };
    }

    if (priority === "protein") {
      return {
        type: "meal",
        label: "Prioriza una comida completa alta en proteína",
        reason: "Es la forma más eficiente de cerrar tu déficit proteico",
      };
    }

    if (priority === "vegetables") {
      return {
        type: "meal",
        label: "Agrega una comida o acompañamiento con vegetales",
        reason: "Tu déficit principal hoy está en vegetales",
      };
    }

    return {
      type: "meal",
      label: "Una comida completa sería tu mejor ajuste",
      reason: "Todavía tienes margen calórico y puede ayudarte a cerrar el día mejor",
    };
  }

  if (priority === "protein" && topProteinFood) {
    return {
      type: "protein-snack",
      label: "Un snack proteico puede ser suficiente",
      reason: "El déficit es acotado y no requiere una comida completa",
    };
  }

  if (priority === "vegetables" && topVegetableFood) {
    return {
      type: "vegetable-side",
      label: "Agrega una porción de vegetales a tu próxima comida",
      reason: "Tu déficit principal hoy está en vegetales",
    };
  }

  if (topMeal) {
    return {
      type: "meal",
      label: "Una comida simple puede ayudarte a corregir el día",
      reason: "Es la sugerencia más completa disponible con tu margen actual",
    };
  }

  if (topProteinFood) {
    return {
      type: "protein-snack",
      label: "Empieza por una opción alta en proteína",
      reason: "Es la corrección más disponible con el margen actual",
    };
  }

  if (topVegetableFood) {
    return {
      type: "vegetable-side",
      label: "Suma una opción rica en vegetales",
      reason: "Todavía puedes mejorar el balance del día con un ajuste pequeño",
    };
  }

  return {
    type: "none",
    label: "No hay una corrección clara disponible",
    reason: "Faltan opciones compatibles con el estado actual del día",
  };
}

function getAdaptiveMealStatus(status) {
  return {
    caloriesRemaining: status.caloriesRemaining,
    proteinRemaining: status.proteinRemaining,
    vegetableServings: status.vegetableServings,
    macroBalance: {
      protein: status.macroBalance.protein === "good" ? "ok" : status.macroBalance.protein,
      carbs: status.macroBalance.carbs === "good" ? "ok" : status.macroBalance.carbs,
      fats: status.macroBalance.fats === "good" ? "ok" : status.macroBalance.fats,
    },
  };
}

export function createMealCorrections(dailyStatus, options = {}) {
  const status = normalizeDailyStatus(dailyStatus);

  if (!status) {
    return {
      summary: {
        needsProtein: false,
        needsVegetables: false,
        caloriesRemaining: 0,
        proteinRemaining: 0,
        vegetableDeficit: 0,
        priority: "no-action-needed",
      },
      messages: ["No hay suficientes datos para generar correcciones nutricionales."],
      suggestions: {
        meals: [],
        proteinFoods: [],
        vegetableFoods: [],
      },
      bestStrategy: {
        type: "none",
        label: "Sin datos suficientes",
        reason: "Faltan datos del estado diario para construir una recomendación útil",
      },
    };
  }

  const priority = getPriority(status);
  const mealType = normalizeStatus(options?.mealType || status.mealTiming);
  const engineOptions = {
    portableOnly: Boolean(options?.portableOnly),
    vegetarianOnly: Boolean(options?.vegetarianOnly),
    quickOnly: Boolean(options?.quickOnly),
    mealType: mealType || undefined,
    maxCalories: toNumber(options?.maxCalories) || undefined,
  };

  const meals = createAdaptiveMealSuggestions(getAdaptiveMealStatus(status), engineOptions);
  const proteinFoods = getProteinRecoverySuggestions(status.proteinRemaining, engineOptions);
  const vegetableFoods = getVegetableRecoverySuggestions(status.vegetableServings, engineOptions);

  const messages = buildCorrectionMessages(status, priority, meals.length > 0);
  const bestStrategy = chooseBestStrategy(
    status,
    priority,
    { meals, proteinFoods, vegetableFoods },
    engineOptions
  );

  return {
    summary: {
      needsProtein: status.proteinRemaining > 20 || status.macroBalance.protein === "low",
      needsVegetables: status.vegetableDeficit > 0,
      caloriesRemaining: status.caloriesRemaining,
      proteinRemaining: Math.round(status.proteinRemaining),
      vegetableDeficit: Number(status.vegetableDeficit.toFixed(1)),
      priority,
    },
    messages,
    suggestions: {
      meals,
      proteinFoods,
      vegetableFoods,
    },
    bestStrategy,
  };
}

export default createMealCorrections;
