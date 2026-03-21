const STORAGE_NAMESPACE = "fit-app:nutrition-recovery";
const FALLBACK_PROFILE_ID = "anonymous";

export const NUTRITION_RECOVERY_PLAN_TYPES = Object.freeze({
  CURRENT_DAY: "current_day",
  NEXT_DAY: "next_day",
});

export const NUTRITION_RECOVERY_PLAN_STATE_KEYS = Object.freeze({
  [NUTRITION_RECOVERY_PLAN_TYPES.CURRENT_DAY]: "currentDayPlan",
  [NUTRITION_RECOVERY_PLAN_TYPES.NEXT_DAY]: "nextDayPlan",
});

export const NUTRITION_RECOVERY_STATUSES = Object.freeze({
  GENERATED: "generated",
  VIEWED: "viewed",
  ACCEPTED: "accepted",
  DISMISSED: "dismissed",
  SAVED_FOR_LATER: "saved_for_later",
  PARTIAL: "partial",
});

const DEFAULT_STATUS = NUTRITION_RECOVERY_STATUSES.GENERATED;
const PLAN_STATUSES = new Set(Object.values(NUTRITION_RECOVERY_STATUSES));
const STATUS_TIMESTAMP_FIELDS = {
  [NUTRITION_RECOVERY_STATUSES.VIEWED]: "viewedAt",
  [NUTRITION_RECOVERY_STATUSES.ACCEPTED]: "acceptedAt",
  [NUTRITION_RECOVERY_STATUSES.DISMISSED]: "dismissedAt",
  [NUTRITION_RECOVERY_STATUSES.SAVED_FOR_LATER]: "savedAt",
  [NUTRITION_RECOVERY_STATUSES.PARTIAL]: "partialAt",
};

function safeString(value, fallback = "") {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeProfileSegment(profileId) {
  const segment = safeString(profileId, FALLBACK_PROFILE_ID);
  return segment || FALLBACK_PROFILE_ID;
}

function formatDateKey(dateLike) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function safeDayString(value, fallback = formatDateKey(new Date())) {
  const explicit = safeString(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(explicit)) return explicit;

  const normalized = formatDateKey(value);
  return normalized || fallback;
}

function safeDateTimeString(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
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

function safeSerialize(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

function buildDefaultRecoveryState() {
  return {
    currentDayPlan: null,
    nextDayPlan: null,
    lastUpdatedAt: "",
  };
}

function normalizeStatus(value, fallback = DEFAULT_STATUS) {
  const next = safeString(value).toLowerCase();
  return PLAN_STATUSES.has(next) ? next : fallback;
}

function buildActionMetadata(entry = null) {
  const safeEntry = isObject(entry) ? entry : {};
  return {
    viewedAt: safeOptionalDateTimeString(safeEntry.viewedAt),
    acceptedAt: safeOptionalDateTimeString(safeEntry.acceptedAt),
    dismissedAt: safeOptionalDateTimeString(safeEntry.dismissedAt),
    savedAt: safeOptionalDateTimeString(safeEntry.savedAt),
    partialAt: safeOptionalDateTimeString(safeEntry.partialAt),
  };
}

export function inferNutritionRecoveryTypeFromTemplateKey(templateKey) {
  const normalized = safeString(templateKey).toLowerCase();
  if (normalized === "high_protein") return "protein";
  if (normalized === "vegetable_recovery") return "vegetables";
  if (normalized === "portable_workday") return "portable_workday";
  if (normalized === "post_excess") return "post_excess";
  if (normalized === "balanced") return "balanced";
  return "";
}

function resolveTemplateKey(payload) {
  const explicitTemplateKey =
    safeString(payload?.templateKey) ||
    safeString(payload?.plan?.templateKey);
  if (explicitTemplateKey) return explicitTemplateKey;

  const recoveryType =
    safeString(payload?.recoveryType) ||
    safeString(payload?.plan?.recoveryType);
  if (recoveryType === "protein") return "high_protein";
  if (recoveryType === "vegetables") return "vegetable_recovery";
  if (recoveryType === "post_excess") return "post_excess";
  if (recoveryType === "balanced") return "balanced";
  return "";
}

function resolveRecoveryType(payload) {
  return (
    safeString(payload?.recoveryType) ||
    safeString(payload?.plan?.recoveryType) ||
    inferNutritionRecoveryTypeFromTemplateKey(resolveTemplateKey(payload))
  );
}

function mergePlanEntries(previousEntry, nextEntry) {
  return {
    ...(isObject(previousEntry) ? previousEntry : {}),
    ...(isObject(nextEntry) ? nextEntry : {}),
  };
}

function buildCurrentDayPlanEntry(payload = {}, previousEntry = null) {
  const safePayload = isObject(payload) ? payload : {};
  const preserveStatus =
    isObject(previousEntry) &&
    previousEntry?.date === safeDayString(safePayload.date) &&
    safeString(previousEntry?.templateKey) === resolveTemplateKey(safePayload) &&
    safeString(previousEntry?.summary) ===
      (safeString(safePayload.summary) || safeString(safePayload?.plan?.summary));
  const nextEntry = {
    generatedAt:
      preserveStatus && !safeOptionalDateTimeString(safePayload.generatedAt)
        ? safeDateTimeString(previousEntry?.generatedAt)
        : safeDateTimeString(safePayload.generatedAt),
    date: safeDayString(safePayload.date),
    templateKey: resolveTemplateKey(safePayload),
    recoveryType: resolveRecoveryType(safePayload),
    summary:
      safeString(safePayload.summary) ||
      safeString(safePayload?.plan?.summary),
    plan: safeSerialize(safePayload, {}),
    status: DEFAULT_STATUS,
    ...buildActionMetadata(preserveStatus ? previousEntry : null),
  };

  if (preserveStatus) {
    nextEntry.status = normalizeStatus(previousEntry?.status, DEFAULT_STATUS);
  }

  return nextEntry;
}

function buildNextDayPlanEntry(payload = {}, previousEntry = null) {
  const safePayload = isObject(payload) ? payload : {};
  const defaultTargetDate = formatDateKey(Date.now() + 24 * 60 * 60 * 1000);
  const preserveStatus =
    isObject(previousEntry) &&
    previousEntry?.targetDate === safeDayString(safePayload.targetDate, defaultTargetDate) &&
    safeString(previousEntry?.templateKey) === resolveTemplateKey(safePayload) &&
    safeString(previousEntry?.summary) ===
      (safeString(safePayload.summary) || safeString(safePayload?.plan?.summary));
  const nextEntry = {
    generatedAt:
      preserveStatus && !safeOptionalDateTimeString(safePayload.generatedAt)
        ? safeDateTimeString(previousEntry?.generatedAt)
        : safeDateTimeString(safePayload.generatedAt),
    targetDate: safeDayString(safePayload.targetDate, defaultTargetDate),
    templateKey: resolveTemplateKey(safePayload),
    recoveryType: resolveRecoveryType(safePayload),
    summary:
      safeString(safePayload.summary) ||
      safeString(safePayload?.plan?.summary),
    plan: safeSerialize(safePayload, {}),
    status: DEFAULT_STATUS,
    ...buildActionMetadata(preserveStatus ? previousEntry : null),
  };

  if (preserveStatus) {
    nextEntry.status = normalizeStatus(previousEntry?.status, DEFAULT_STATUS);
  }

  return nextEntry;
}

function sanitizeStoredPlanEntry(entry, kind) {
  if (!isObject(entry)) return null;

  const base = {
    generatedAt: safeDateTimeString(entry.generatedAt),
    templateKey: safeString(entry.templateKey),
    recoveryType: safeString(entry.recoveryType),
    summary: safeString(entry.summary),
    plan: safeSerialize(entry.plan, {}),
    status: normalizeStatus(entry.status, DEFAULT_STATUS),
    ...buildActionMetadata(entry),
  };

  if (kind === "current") {
    return {
      ...base,
      date: safeDayString(entry.date),
    };
  }

  return {
    ...base,
    targetDate: safeDayString(entry.targetDate, formatDateKey(Date.now() + 24 * 60 * 60 * 1000)),
  };
}

function safeWriteStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getNutritionRecoveryStorageKey(profileId) {
  return `${STORAGE_NAMESPACE}:${safeProfileSegment(profileId)}`;
}

export function getNutritionRecoveryStateEntryKey(planType) {
  const normalizedPlanType = safeString(planType).toLowerCase();
  return (
    NUTRITION_RECOVERY_PLAN_STATE_KEYS[normalizedPlanType] ||
    NUTRITION_RECOVERY_PLAN_STATE_KEYS[NUTRITION_RECOVERY_PLAN_TYPES.CURRENT_DAY]
  );
}

export function loadNutritionRecoveryState(profileId) {
  const key = getNutritionRecoveryStorageKey(profileId);
  const fallback = buildDefaultRecoveryState();

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    const parsed = safeParse(raw, fallback);
    return {
      currentDayPlan: sanitizeStoredPlanEntry(parsed?.currentDayPlan, "current"),
      nextDayPlan: sanitizeStoredPlanEntry(parsed?.nextDayPlan, "next"),
      lastUpdatedAt: safeOptionalDateTimeString(parsed?.lastUpdatedAt),
    };
  } catch {
    return fallback;
  }
}

export function saveNutritionRecoveryState(profileId, state) {
  const previousState = loadNutritionRecoveryState(profileId);
  const nextState = {
    currentDayPlan:
      state && Object.prototype.hasOwnProperty.call(state, "currentDayPlan")
        ? state.currentDayPlan === null
          ? null
          : sanitizeStoredPlanEntry(
              mergePlanEntries(previousState.currentDayPlan, state.currentDayPlan),
              "current"
            )
        : previousState.currentDayPlan,
    nextDayPlan:
      state && Object.prototype.hasOwnProperty.call(state, "nextDayPlan")
        ? state.nextDayPlan === null
          ? null
          : sanitizeStoredPlanEntry(
              mergePlanEntries(previousState.nextDayPlan, state.nextDayPlan),
              "next"
            )
        : previousState.nextDayPlan,
    lastUpdatedAt: safeDateTimeString(state?.lastUpdatedAt),
  };

  safeWriteStorage(getNutritionRecoveryStorageKey(profileId), nextState);
  return nextState;
}

export function saveCurrentDayRecoveryPlan(profileId, planPayload) {
  const previousState = loadNutritionRecoveryState(profileId);
  const nextEntry = buildCurrentDayPlanEntry(planPayload, previousState.currentDayPlan);
  return saveNutritionRecoveryState(profileId, {
    currentDayPlan: nextEntry,
  });
}

export function saveNextDayRecoveryPlan(profileId, planPayload) {
  const previousState = loadNutritionRecoveryState(profileId);
  const nextEntry = buildNextDayPlanEntry(planPayload, previousState.nextDayPlan);
  return saveNutritionRecoveryState(profileId, {
    nextDayPlan: nextEntry,
  });
}

export function updateRecoveryPlanStatus(profileId, updates) {
  const previousState = loadNutritionRecoveryState(profileId);
  const nextState = {};

  if (isObject(updates?.currentDayPlan) && previousState.currentDayPlan) {
    const nextStatus = normalizeStatus(
      updates.currentDayPlan.status,
      previousState.currentDayPlan.status
    );
    const timestampField = STATUS_TIMESTAMP_FIELDS[nextStatus];
    nextState.currentDayPlan = {
      ...previousState.currentDayPlan,
      ...updates.currentDayPlan,
      ...buildActionMetadata({
        ...previousState.currentDayPlan,
        ...updates.currentDayPlan,
      }),
      status: nextStatus,
    };

    if (
      timestampField &&
      !safeOptionalDateTimeString(nextState.currentDayPlan[timestampField])
    ) {
      nextState.currentDayPlan[timestampField] = safeDateTimeString();
    }
  }

  if (isObject(updates?.nextDayPlan) && previousState.nextDayPlan) {
    const nextStatus = normalizeStatus(
      updates.nextDayPlan.status,
      previousState.nextDayPlan.status
    );
    const timestampField = STATUS_TIMESTAMP_FIELDS[nextStatus];
    nextState.nextDayPlan = {
      ...previousState.nextDayPlan,
      ...updates.nextDayPlan,
      ...buildActionMetadata({
        ...previousState.nextDayPlan,
        ...updates.nextDayPlan,
      }),
      status: nextStatus,
    };

    if (
      timestampField &&
      !safeOptionalDateTimeString(nextState.nextDayPlan[timestampField])
    ) {
      nextState.nextDayPlan[timestampField] = safeDateTimeString();
    }
  }

  return saveNutritionRecoveryState(profileId, nextState);
}

export function clearNutritionRecoveryState(profileId) {
  try {
    localStorage.removeItem(getNutritionRecoveryStorageKey(profileId));
  } catch {
    // Ignore storage clear errors to keep recovery flows non-blocking.
  }
}
