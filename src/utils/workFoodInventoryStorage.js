const STORAGE_NAMESPACE = "fit-app:work-food-inventory";
const FALLBACK_PROFILE_ID = "default";
const MAX_ACTIVITY_ITEMS = 20;

export const WORK_FOOD_INVENTORY_LOCATION_OPTIONS = Object.freeze([
  "Oficina",
  "Pieza",
  "Casa",
  "Refrigerador trabajo",
  "Cajon oficina",
]);

export const WORK_FOOD_INVENTORY_UNIT_OPTIONS = Object.freeze([
  "unidad",
  "envase",
  "paquete",
  "lata",
  "botella",
  "porcion",
]);

function safeString(value, fallback = "") {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function safeNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function safeDateTimeString(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function normalizeText(value) {
  return safeString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toTitleCase(value) {
  return safeString(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function safeProfileSegment(profileId) {
  return safeString(profileId, FALLBACK_PROFILE_ID) || FALLBACK_PROFILE_ID;
}

function buildDefaultInventoryState() {
  return {
    items: [],
    activity: [],
    lastUpdatedAt: "",
  };
}

function buildItemSignature(item) {
  return [
    normalizeText(item?.name),
    normalizeText(item?.location),
    normalizeText(item?.unit || "unidad"),
  ].join("::");
}

function normalizeInventoryItem(item) {
  const safeItem = item && typeof item === "object" ? item : {};
  const name = safeString(safeItem.name);
  if (!name) return null;

  const location = toTitleCase(safeItem.location || "Sin ubicacion");
  const unit = normalizeText(safeItem.unit || "unidad") || "unidad";
  const quantity = Math.max(0, Math.round(safeNumber(safeItem.quantity, 0)));
  if (quantity <= 0) return null;

  return {
    id: safeString(safeItem.id) || buildItemSignature({ name, location, unit }),
    name,
    location,
    quantity,
    unit,
    updatedAt: safeDateTimeString(safeItem.updatedAt),
  };
}

function buildMovementId(entry) {
  return [
    normalizeText(entry?.type),
    normalizeText(entry?.name),
    normalizeText(entry?.location),
    safeDateTimeString(entry?.createdAt),
  ].join("::");
}

function normalizeInventoryActivityEntry(entry) {
  const safeEntry = entry && typeof entry === "object" ? entry : {};
  const name = safeString(safeEntry.name);
  const location = toTitleCase(safeEntry.location || "Sin ubicacion");
  const unit = normalizeText(safeEntry.unit || "unidad") || "unidad";
  const quantity = Math.max(0, Math.round(safeNumber(safeEntry.quantity, 0)));
  const type = normalizeText(safeEntry.type || "adjust") || "adjust";
  if (!name || quantity <= 0) return null;

  return {
    id: safeString(safeEntry.id) || buildMovementId(safeEntry),
    type,
    name,
    location,
    unit,
    quantity,
    source: normalizeText(safeEntry.source || "manual") || "manual",
    detail: safeString(safeEntry.detail),
    createdAt: safeDateTimeString(safeEntry.createdAt),
  };
}

function mergeInventoryActivity(existingActivity, movements) {
  const safeExisting = Array.isArray(existingActivity)
    ? existingActivity.map(normalizeInventoryActivityEntry).filter(Boolean)
    : [];
  const safeMovements = (Array.isArray(movements) ? movements : [movements])
    .map(normalizeInventoryActivityEntry)
    .filter(Boolean);

  return [...safeMovements, ...safeExisting]
    .sort((left, right) => safeDateTimeString(right.createdAt).localeCompare(safeDateTimeString(left.createdAt)))
    .slice(0, MAX_ACTIVITY_ITEMS);
}

function safeParseState(raw) {
  if (!raw) return buildDefaultInventoryState();

  try {
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items) ? parsed.items.map(normalizeInventoryItem).filter(Boolean) : [];
    const activity = Array.isArray(parsed?.activity)
      ? parsed.activity.map(normalizeInventoryActivityEntry).filter(Boolean)
      : [];
    return {
      items,
      activity,
      lastUpdatedAt: safeString(parsed?.lastUpdatedAt),
    };
  } catch {
    return buildDefaultInventoryState();
  }
}

function safeWriteStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function sortInventoryItems(items) {
  return [...(Array.isArray(items) ? items : [])].sort((left, right) => {
    const locationCompare = safeString(left?.location).localeCompare(safeString(right?.location));
    if (locationCompare !== 0) return locationCompare;
    return safeString(left?.name).localeCompare(safeString(right?.name));
  });
}

function persistInventoryState(profileId, items, options = {}) {
  const previousState =
    options && typeof options === "object" && options.previousState
      ? options.previousState
      : loadWorkFoodInventory(profileId);
  const nextState = {
    items: sortInventoryItems(items.map(normalizeInventoryItem).filter(Boolean)),
    activity: mergeInventoryActivity(previousState?.activity, options?.movements),
    lastUpdatedAt: safeDateTimeString(),
  };
  safeWriteStorage(getWorkFoodInventoryKey(profileId), nextState);
  return nextState;
}

export function getWorkFoodInventoryKey(profileId) {
  return `${STORAGE_NAMESPACE}:${safeProfileSegment(profileId)}`;
}

export function loadWorkFoodInventory(profileId) {
  const key = getWorkFoodInventoryKey(profileId);
  if (!key) return buildDefaultInventoryState();

  try {
    return safeParseState(localStorage.getItem(key));
  } catch {
    return buildDefaultInventoryState();
  }
}

export function saveWorkFoodInventory(profileId, state, options = {}) {
  const safeState = state && typeof state === "object" ? state : buildDefaultInventoryState();
  const items = Array.isArray(safeState.items) ? safeState.items : [];
  return persistInventoryState(profileId, items, {
    previousState: loadWorkFoodInventory(profileId),
    movements: options?.movements,
  });
}

export function addWorkFoodInventoryItem(profileId, item, options = {}) {
  const normalizedItem = normalizeInventoryItem(item);
  if (!normalizedItem) return loadWorkFoodInventory(profileId);

  const currentState = loadWorkFoodInventory(profileId);
  const signature = buildItemSignature(normalizedItem);
  const currentItems = Array.isArray(currentState.items) ? currentState.items : [];
  const existing = currentItems.find((entry) => buildItemSignature(entry) === signature);

  if (!existing) {
    return persistInventoryState(profileId, [...currentItems, normalizedItem], {
      previousState: currentState,
      movements: [
        {
          type: options?.type || "add",
          name: normalizedItem.name,
          location: normalizedItem.location,
          quantity: normalizedItem.quantity,
          unit: normalizedItem.unit,
          source: options?.source || "manual",
          detail: options?.detail || "",
        },
      ],
    });
  }

  const nextItems = currentItems.map((entry) =>
    buildItemSignature(entry) === signature
      ? {
          ...entry,
          quantity: Math.max(1, entry.quantity + normalizedItem.quantity),
          updatedAt: safeDateTimeString(),
        }
      : entry
  );

  return persistInventoryState(profileId, nextItems, {
    previousState: currentState,
    movements: [
      {
        type: options?.type || "add",
        name: existing.name,
        location: existing.location,
        quantity: normalizedItem.quantity,
        unit: existing.unit,
        source: options?.source || "manual",
        detail: options?.detail || "",
      },
    ],
  });
}

export function adjustWorkFoodInventoryQuantity(profileId, itemId, delta, options = {}) {
  const targetId = safeString(itemId);
  if (!targetId) return loadWorkFoodInventory(profileId);

  const currentState = loadWorkFoodInventory(profileId);
  const nextItems = [];
  let adjustedEntry = null;
  const safeDelta = Math.round(safeNumber(delta, 0));

  (Array.isArray(currentState.items) ? currentState.items : []).forEach((entry) => {
    if (safeString(entry?.id) !== targetId) {
      nextItems.push(entry);
      return;
    }

    adjustedEntry = entry;
    const nextQuantity = Math.round(safeNumber(entry?.quantity, 0) + safeDelta);
    if (nextQuantity <= 0) return;

    nextItems.push({
      ...entry,
      quantity: nextQuantity,
      updatedAt: safeDateTimeString(),
    });
  });

  return persistInventoryState(profileId, nextItems, {
    previousState: currentState,
    movements:
      adjustedEntry && safeDelta !== 0
        ? [
            {
              type: options?.type || (safeDelta > 0 ? "adjust_up" : "adjust_down"),
              name: adjustedEntry.name,
              location: adjustedEntry.location,
              quantity: Math.abs(safeDelta),
              unit: adjustedEntry.unit,
              source: options?.source || "manual",
              detail: options?.detail || "",
            },
          ]
        : [],
  });
}

export function removeWorkFoodInventoryItem(profileId, itemId, options = {}) {
  const targetId = safeString(itemId);
  if (!targetId) return loadWorkFoodInventory(profileId);

  const currentState = loadWorkFoodInventory(profileId);
  const removedEntry = (Array.isArray(currentState.items) ? currentState.items : []).find(
    (entry) => safeString(entry?.id) === targetId
  );
  const nextItems = (Array.isArray(currentState.items) ? currentState.items : []).filter(
    (entry) => safeString(entry?.id) !== targetId
  );
  return persistInventoryState(profileId, nextItems, {
    previousState: currentState,
    movements: removedEntry
      ? [
          {
            type: options?.type || "remove",
            name: removedEntry.name,
            location: removedEntry.location,
            quantity: removedEntry.quantity,
            unit: removedEntry.unit,
            source: options?.source || "manual",
            detail: options?.detail || "",
          },
        ]
      : [],
  });
}

export function summarizeWorkFoodInventory(items) {
  const safeItems = sortInventoryItems((Array.isArray(items) ? items : []).map(normalizeInventoryItem).filter(Boolean));
  const byLocationMap = new Map();

  safeItems.forEach((item) => {
    const location = safeString(item.location, "Sin ubicacion");
    const current = byLocationMap.get(location) || {
      location,
      totalQuantity: 0,
      itemCount: 0,
      items: [],
    };

    current.totalQuantity += Math.max(0, safeNumber(item.quantity, 0));
    current.itemCount += 1;
    current.items.push(item);
    byLocationMap.set(location, current);
  });

  return {
    totalItems: safeItems.length,
    totalQuantity: safeItems.reduce((sum, item) => sum + Math.max(0, safeNumber(item.quantity, 0)), 0),
    locations: Array.from(byLocationMap.values()).sort((left, right) => left.location.localeCompare(right.location)),
  };
}
