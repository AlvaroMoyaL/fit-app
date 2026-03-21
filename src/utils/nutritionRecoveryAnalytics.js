import { NUTRITION_RECOVERY_PLAN_TYPES } from "./nutritionRecoveryStorage.js";

const STORAGE_NAMESPACE = "fit-app:nutrition-recovery-analytics";
const FALLBACK_PROFILE_ID = "anonymous";

export const NUTRITION_RECOVERY_ACTIONS = Object.freeze({
  GENERATED: "generated",
  VIEWED: "viewed",
  ACCEPTED: "accepted",
  DISMISSED: "dismissed",
  SAVED_FOR_LATER: "saved_for_later",
  PARTIAL: "partial",
});

const PLAN_TYPES = new Set(Object.values(NUTRITION_RECOVERY_PLAN_TYPES));
const ACTIONS = new Set(Object.values(NUTRITION_RECOVERY_ACTIONS));
const COUNTER_KEYS = {
  [NUTRITION_RECOVERY_ACTIONS.GENERATED]: "generated",
  [NUTRITION_RECOVERY_ACTIONS.VIEWED]: "viewed",
  [NUTRITION_RECOVERY_ACTIONS.ACCEPTED]: "accepted",
  [NUTRITION_RECOVERY_ACTIONS.DISMISSED]: "dismissed",
  [NUTRITION_RECOVERY_ACTIONS.SAVED_FOR_LATER]: "savedForLater",
  [NUTRITION_RECOVERY_ACTIONS.PARTIAL]: "partial",
};

function safeString(value, fallback = "") {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function safeDateTimeString(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function safeOptionalDateTimeString(value) {
  if (value === null || value === undefined || value === "") return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function safeParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeProfileSegment(profileId) {
  const segment = safeString(profileId, FALLBACK_PROFILE_ID);
  return segment || FALLBACK_PROFILE_ID;
}

function buildDefaultCounters() {
  return {
    generated: 0,
    viewed: 0,
    accepted: 0,
    dismissed: 0,
    savedForLater: 0,
    partial: 0,
  };
}

function safeCount(value) {
  const next = Number(value);
  if (!Number.isFinite(next) || next < 0) return 0;
  return Math.round(next);
}

function sanitizeCounters(value) {
  const safeValue = isObject(value) ? value : {};
  const defaults = buildDefaultCounters();
  return {
    generated: safeCount(safeValue.generated ?? defaults.generated),
    viewed: safeCount(safeValue.viewed ?? defaults.viewed),
    accepted: safeCount(safeValue.accepted ?? defaults.accepted),
    dismissed: safeCount(safeValue.dismissed ?? defaults.dismissed),
    savedForLater: safeCount(safeValue.savedForLater ?? defaults.savedForLater),
    partial: safeCount(safeValue.partial ?? defaults.partial),
  };
}

function sanitizeCounterMap(value) {
  const safeValue = isObject(value) ? value : {};
  return Object.keys(safeValue).reduce((accumulator, key) => {
    const normalizedKey = safeString(key);
    if (!normalizedKey) return accumulator;

    accumulator[normalizedKey] = sanitizeCounters(safeValue[key]);
    return accumulator;
  }, {});
}

function buildDefaultAnalytics() {
  return {
    totals: buildDefaultCounters(),
    byPlanType: {
      [NUTRITION_RECOVERY_PLAN_TYPES.CURRENT_DAY]: buildDefaultCounters(),
      [NUTRITION_RECOVERY_PLAN_TYPES.NEXT_DAY]: buildDefaultCounters(),
    },
    byTemplateKey: {},
    byRecoveryType: {},
    lastUpdatedAt: "",
  };
}

function sanitizeAnalytics(value) {
  const safeValue = isObject(value) ? value : {};
  const safePlanTypes = isObject(safeValue.byPlanType) ? safeValue.byPlanType : {};

  return {
    totals: sanitizeCounters(safeValue.totals),
    byPlanType: {
      [NUTRITION_RECOVERY_PLAN_TYPES.CURRENT_DAY]: sanitizeCounters(
        safePlanTypes[NUTRITION_RECOVERY_PLAN_TYPES.CURRENT_DAY]
      ),
      [NUTRITION_RECOVERY_PLAN_TYPES.NEXT_DAY]: sanitizeCounters(
        safePlanTypes[NUTRITION_RECOVERY_PLAN_TYPES.NEXT_DAY]
      ),
    },
    byTemplateKey: sanitizeCounterMap(safeValue.byTemplateKey),
    byRecoveryType: sanitizeCounterMap(safeValue.byRecoveryType),
    lastUpdatedAt: safeOptionalDateTimeString(safeValue.lastUpdatedAt),
  };
}

function normalizeAction(action) {
  const next = safeString(action).toLowerCase();
  return ACTIONS.has(next) ? next : "";
}

function normalizePlanType(planType) {
  const next = safeString(planType).toLowerCase();
  return PLAN_TYPES.has(next) ? next : "";
}

function bumpCounter(counterState, action) {
  const counterKey = COUNTER_KEYS[action];
  if (!counterKey) return sanitizeCounters(counterState);

  const next = sanitizeCounters(counterState);
  next[counterKey] += 1;
  return next;
}

function mergeCounterMaps(previousMap, nextMap) {
  const previous = sanitizeCounterMap(previousMap);
  const incoming = sanitizeCounterMap(nextMap);
  const keys = new Set([...Object.keys(previous), ...Object.keys(incoming)]);
  const merged = {};

  keys.forEach((key) => {
    merged[key] = key in incoming ? incoming[key] : previous[key];
  });

  return merged;
}

function safeWriteStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function getTopBucketKey(counterMap, counterKey) {
  let selectedKey = null;
  let selectedValue = 0;

  Object.entries(sanitizeCounterMap(counterMap)).forEach(([key, counters]) => {
    const value = safeCount(counters?.[counterKey]);
    if (value > selectedValue) {
      selectedValue = value;
      selectedKey = key;
    }
  });

  return selectedKey;
}

export function getNutritionRecoveryAnalyticsKey(profileId) {
  return `${STORAGE_NAMESPACE}:${safeProfileSegment(profileId)}`;
}

export function loadNutritionRecoveryAnalytics(profileId) {
  const fallback = buildDefaultAnalytics();

  try {
    const raw = localStorage.getItem(getNutritionRecoveryAnalyticsKey(profileId));
    if (!raw) return fallback;

    return sanitizeAnalytics(safeParse(raw, fallback));
  } catch {
    return fallback;
  }
}

export function saveNutritionRecoveryAnalytics(profileId, analytics) {
  const previousAnalytics = loadNutritionRecoveryAnalytics(profileId);
  const safeAnalytics = isObject(analytics) ? analytics : {};

  const nextAnalytics = sanitizeAnalytics({
    totals:
      Object.prototype.hasOwnProperty.call(safeAnalytics, "totals")
        ? safeAnalytics.totals
        : previousAnalytics.totals,
    byPlanType: {
      [NUTRITION_RECOVERY_PLAN_TYPES.CURRENT_DAY]:
        safeAnalytics?.byPlanType &&
        Object.prototype.hasOwnProperty.call(
          safeAnalytics.byPlanType,
          NUTRITION_RECOVERY_PLAN_TYPES.CURRENT_DAY
        )
          ? safeAnalytics.byPlanType[NUTRITION_RECOVERY_PLAN_TYPES.CURRENT_DAY]
          : previousAnalytics.byPlanType[NUTRITION_RECOVERY_PLAN_TYPES.CURRENT_DAY],
      [NUTRITION_RECOVERY_PLAN_TYPES.NEXT_DAY]:
        safeAnalytics?.byPlanType &&
        Object.prototype.hasOwnProperty.call(
          safeAnalytics.byPlanType,
          NUTRITION_RECOVERY_PLAN_TYPES.NEXT_DAY
        )
          ? safeAnalytics.byPlanType[NUTRITION_RECOVERY_PLAN_TYPES.NEXT_DAY]
          : previousAnalytics.byPlanType[NUTRITION_RECOVERY_PLAN_TYPES.NEXT_DAY],
    },
    byTemplateKey: mergeCounterMaps(previousAnalytics.byTemplateKey, safeAnalytics.byTemplateKey),
    byRecoveryType: mergeCounterMaps(previousAnalytics.byRecoveryType, safeAnalytics.byRecoveryType),
    lastUpdatedAt: safeDateTimeString(safeAnalytics.lastUpdatedAt),
  });

  safeWriteStorage(getNutritionRecoveryAnalyticsKey(profileId), nextAnalytics);
  return nextAnalytics;
}

export function trackRecoveryPlanEvent(profileId, eventPayload) {
  const action = normalizeAction(eventPayload?.action);
  if (!action) return loadNutritionRecoveryAnalytics(profileId);

  const planType = normalizePlanType(eventPayload?.planType);
  const templateKey = safeString(eventPayload?.templateKey);
  const recoveryType = safeString(eventPayload?.recoveryType);
  const previousAnalytics = loadNutritionRecoveryAnalytics(profileId);

  const nextAnalytics = {
    totals: bumpCounter(previousAnalytics.totals, action),
    byPlanType: {
      ...previousAnalytics.byPlanType,
      ...(planType
        ? {
            [planType]: bumpCounter(previousAnalytics.byPlanType?.[planType], action),
          }
        : {}),
    },
    byTemplateKey: templateKey
      ? {
          ...previousAnalytics.byTemplateKey,
          [templateKey]: bumpCounter(previousAnalytics.byTemplateKey?.[templateKey], action),
        }
      : previousAnalytics.byTemplateKey,
    byRecoveryType: recoveryType
      ? {
          ...previousAnalytics.byRecoveryType,
          [recoveryType]: bumpCounter(previousAnalytics.byRecoveryType?.[recoveryType], action),
        }
      : previousAnalytics.byRecoveryType,
    lastUpdatedAt: safeDateTimeString(),
  };

  return saveNutritionRecoveryAnalytics(profileId, nextAnalytics);
}

export function getRecoveryPlanAnalyticsSummary(profileId) {
  const analytics = loadNutritionRecoveryAnalytics(profileId);
  const generated = safeCount(analytics.totals.generated);
  const accepted = safeCount(analytics.totals.accepted);
  const dismissed = safeCount(analytics.totals.dismissed);

  return {
    totals: analytics.totals,
    mostAcceptedTemplate: getTopBucketKey(analytics.byTemplateKey, "accepted"),
    mostGeneratedTemplate: getTopBucketKey(analytics.byTemplateKey, "generated"),
    mostAcceptedRecoveryType: getTopBucketKey(analytics.byRecoveryType, "accepted"),
    mostUsedRecoveryType:
      getTopBucketKey(analytics.byRecoveryType, "accepted") ||
      getTopBucketKey(analytics.byRecoveryType, "generated"),
    acceptanceRate: generated > 0 ? Number((accepted / generated).toFixed(2)) : 0,
    dismissalRate: generated > 0 ? Number((dismissed / generated).toFixed(2)) : 0,
  };
}
