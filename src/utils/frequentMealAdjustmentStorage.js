const STORAGE_NAMESPACE = "fitapp_frequent_meal_adjustments";
const FALLBACK_PROFILE_ID = "default";

function safeString(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function safeNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function safeDate(value) {
  const parsed = new Date(value || "");
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
}

function roundNumber(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(safeNumber(value) * factor) / factor;
}

function buildDefaultState() {
  return {
    bySignature: {},
    byMealType: {},
    lastUpdatedAt: "",
  };
}

function safeProfileSegment(profileId) {
  return safeString(profileId, FALLBACK_PROFILE_ID);
}

function safeParseState(raw) {
  if (!raw) return buildDefaultState();

  try {
    const parsed = JSON.parse(raw);
    return {
      bySignature: parsed?.bySignature && typeof parsed.bySignature === "object" ? parsed.bySignature : {},
      byMealType: parsed?.byMealType && typeof parsed.byMealType === "object" ? parsed.byMealType : {},
      lastUpdatedAt: safeString(parsed?.lastUpdatedAt),
    };
  } catch {
    return buildDefaultState();
  }
}

function safeWriteStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore localStorage write failures to keep UX stable.
  }
}

function buildMergedPreference(previousEntry, nextEntry) {
  const previousCount = Math.max(0, safeNumber(previousEntry?.acceptedCount, 0));
  const nextCount = previousCount + 1;
  const blendNumber = (previousValue, nextValue, decimals = 0) => {
    const safeNextValue = safeNumber(nextValue, 0);
    if (!safeNextValue) return roundNumber(previousValue, decimals);
    if (previousCount <= 0) return roundNumber(safeNextValue, decimals);
    return roundNumber((safeNumber(previousValue, 0) * previousCount + safeNextValue) / nextCount, decimals);
  };

  return {
    selectedFoodIdentity:
      safeString(nextEntry?.selectedFoodIdentity) || safeString(previousEntry?.selectedFoodIdentity),
    sourceName: safeString(nextEntry?.sourceName) || safeString(previousEntry?.sourceName),
    targetGrams: blendNumber(previousEntry?.targetGrams, nextEntry?.targetGrams, 0),
    ratio: blendNumber(previousEntry?.ratio, nextEntry?.ratio, 2),
    acceptedCount: nextCount,
    updatedAt: safeDate(nextEntry?.updatedAt),
  };
}

function extractActionPreferences(actionPlan) {
  const additions = Array.isArray(actionPlan?.additions) ? actionPlan.additions : [];
  const reductions = Array.isArray(actionPlan?.reductions) ? actionPlan.reductions : [];

  const protein = additions.find((item) => item?.targetCategory === "protein");
  const vegetable = additions.find((item) => item?.targetCategory === "vegetable");
  const lighter = reductions[0] || null;

  return {
    protein: protein
      ? {
          selectedFoodIdentity: safeString(protein?.selectedFoodIdentity),
          targetGrams: safeNumber(protein?.targetGrams, 0),
          updatedAt: new Date().toISOString(),
        }
      : null,
    vegetable: vegetable
      ? {
          selectedFoodIdentity: safeString(vegetable?.selectedFoodIdentity),
          targetGrams: safeNumber(vegetable?.targetGrams, 0),
          updatedAt: new Date().toISOString(),
        }
      : null,
    lighter: lighter
      ? {
          sourceName: safeString(lighter?.sourceName),
          targetGrams: safeNumber(lighter?.trimGrams, 0),
          ratio: safeNumber(lighter?.ratio, 0),
          updatedAt: new Date().toISOString(),
        }
      : null,
  };
}

export function getFrequentMealAdjustmentStorageKey(profileId) {
  return `${STORAGE_NAMESPACE}_${safeProfileSegment(profileId)}`;
}

export function loadFrequentMealAdjustmentPreferences(profileId) {
  const key = getFrequentMealAdjustmentStorageKey(profileId);
  if (!key) return buildDefaultState();

  try {
    return safeParseState(localStorage.getItem(key));
  } catch {
    return buildDefaultState();
  }
}

export function saveFrequentMealAdjustmentPreferences(profileId, state) {
  const key = getFrequentMealAdjustmentStorageKey(profileId);
  if (!key) return buildDefaultState();

  const nextState = {
    bySignature: state?.bySignature && typeof state.bySignature === "object" ? state.bySignature : {},
    byMealType: state?.byMealType && typeof state.byMealType === "object" ? state.byMealType : {},
    lastUpdatedAt: safeDate(state?.lastUpdatedAt),
  };
  safeWriteStorage(key, nextState);
  return nextState;
}

export function resolveFrequentMealAdjustmentPreferences(state, signature, mealType) {
  const safeState = state && typeof state === "object" ? state : buildDefaultState();
  const signatureKey = safeString(signature);
  const mealTypeKey = safeString(mealType);
  const signaturePreferences = safeState.bySignature?.[signatureKey] || {};
  const mealTypePreferences = safeState.byMealType?.[mealTypeKey] || {};
  const proteinPreference = signaturePreferences.protein || mealTypePreferences.protein || null;
  const vegetablePreference = signaturePreferences.vegetable || mealTypePreferences.vegetable || null;
  const lighterPreference = signaturePreferences.lighter || mealTypePreferences.lighter || null;

  return {
    protein: proteinPreference,
    vegetable: vegetablePreference,
    lighter: lighterPreference,
    sources: {
      protein: signaturePreferences.protein ? "signature" : mealTypePreferences.protein ? "mealType" : null,
      vegetable: signaturePreferences.vegetable ? "signature" : mealTypePreferences.vegetable ? "mealType" : null,
      lighter: signaturePreferences.lighter ? "signature" : mealTypePreferences.lighter ? "mealType" : null,
    },
    hasLearnedPreference: Boolean(proteinPreference || vegetablePreference || lighterPreference),
  };
}

export function clearFrequentMealAdjustmentPreference(profileId, payload) {
  const signature = safeString(payload?.signature);
  const mealType = safeString(payload?.mealType);
  const scope = safeString(payload?.scope);
  const sourceHints = Array.isArray(payload?.sources)
    ? [...new Set(payload.sources.map((value) => safeString(value)).filter(Boolean))]
    : [];
  const currentState = loadFrequentMealAdjustmentPreferences(profileId);
  const nextState = {
    ...currentState,
    bySignature: { ...currentState.bySignature },
    byMealType: { ...currentState.byMealType },
    lastUpdatedAt: new Date().toISOString(),
  };

  const shouldClearSignature =
    Boolean(signature) &&
    (scope === "all" || scope === "signature" || (!scope && (sourceHints.includes("signature") || !sourceHints.length)));
  const shouldClearMealType =
    Boolean(mealType) &&
    (scope === "all" || scope === "mealType" || (!scope && sourceHints.includes("mealType")));

  if (shouldClearSignature) {
    delete nextState.bySignature[signature];
  }
  if (shouldClearMealType) {
    delete nextState.byMealType[mealType];
  }

  if (!shouldClearSignature && !shouldClearMealType) {
    return currentState;
  }

  return saveFrequentMealAdjustmentPreferences(profileId, nextState);
}

export function recordFrequentMealAdjustmentAcceptance(profileId, payload) {
  const signature = safeString(payload?.signature);
  const mealType = safeString(payload?.mealType);
  const actionPlan = payload?.actionPlan;

  if (!signature || !mealType || !actionPlan) {
    return loadFrequentMealAdjustmentPreferences(profileId);
  }

  const currentState = loadFrequentMealAdjustmentPreferences(profileId);
  const nextState = {
    ...currentState,
    bySignature: { ...currentState.bySignature },
    byMealType: { ...currentState.byMealType },
    lastUpdatedAt: new Date().toISOString(),
  };

  const extracted = extractActionPreferences(actionPlan);

  const mergePreferenceSet = (previousSet) => {
    const safePrevious = previousSet && typeof previousSet === "object" ? previousSet : {};
    const nextSet = { ...safePrevious };

    if (extracted.protein) {
      nextSet.protein = buildMergedPreference(safePrevious.protein, extracted.protein);
    }
    if (extracted.vegetable) {
      nextSet.vegetable = buildMergedPreference(safePrevious.vegetable, extracted.vegetable);
    }
    if (extracted.lighter) {
      nextSet.lighter = buildMergedPreference(safePrevious.lighter, extracted.lighter);
    }

    return nextSet;
  };

  nextState.bySignature[signature] = mergePreferenceSet(currentState.bySignature?.[signature]);
  nextState.byMealType[mealType] = mergePreferenceSet(currentState.byMealType?.[mealType]);

  return saveFrequentMealAdjustmentPreferences(profileId, nextState);
}
