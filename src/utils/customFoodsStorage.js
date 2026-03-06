function buildCustomFoodsKey(profileId) {
  if (!profileId) return "";
  return `custom_foods_${profileId}`;
}

const SHARED_CUSTOM_FOODS_KEY = "custom_foods_shared_catalog";

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function foodIdentity(food) {
  const safe = food || {};
  return `${normalizeText(safe.name)}::${normalizeText(safe.brand)}`;
}

function normalizeFood(food) {
  const safe = food || {};
  return {
    ...safe,
    name: String(safe.name || "").trim(),
    brand: String(safe.brand || "").trim(),
    category: String(safe.category || "processed"),
    calories: toNumber(safe.calories, 0),
    protein: toNumber(safe.protein, 0),
    carbs: toNumber(safe.carbs, 0),
    fat: toNumber(safe.fat, 0),
    servingSize: String(safe.servingSize || ""),
    servingsPerContainer: toNumber(safe.servingsPerContainer, 0),
    sodium: toNumber(safe.sodium, 0),
    sugars: toNumber(safe.sugars, 0),
    fiber: toNumber(safe.fiber, 0),
    saturatedFat: toNumber(safe.saturatedFat, 0),
    transFat: toNumber(safe.transFat, 0),
    cholesterol: toNumber(safe.cholesterol, 0),
  };
}

function readFoodsByKey(key) {
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeFood) : [];
  } catch {
    return [];
  }
}

function writeFoodsByKey(key, foods) {
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(foods));
}

function mergeUniqueFoods(...lists) {
  const map = new Map();
  lists
    .flat()
    .map(normalizeFood)
    .forEach((food) => {
      const identity = foodIdentity(food);
      if (!identity || identity === "::") return;
      if (!map.has(identity)) map.set(identity, food);
    });
  return Array.from(map.values());
}

function replaceFoodInList(list, identityToReplace, replacementFood) {
  const replacement = normalizeFood(replacementFood);
  const replacementIdentity = foodIdentity(replacement);
  if (!replacementIdentity || replacementIdentity === "::") return Array.isArray(list) ? list : [];

  const safeList = Array.isArray(list) ? list.map(normalizeFood) : [];
  const normalizedTarget = String(identityToReplace || "");

  const filtered = safeList.filter((item) => {
    const itemIdentity = foodIdentity(item);
    if (!itemIdentity || itemIdentity === "::") return false;
    if (itemIdentity === replacementIdentity) return false;
    if (normalizedTarget && itemIdentity === normalizedTarget) return false;
    return true;
  });

  return [...filtered, replacement];
}

export function getCustomFoods(profileId) {
  const key = buildCustomFoodsKey(profileId);
  const profileFoods = key ? readFoodsByKey(key) : [];
  const sharedFoods = readFoodsByKey(SHARED_CUSTOM_FOODS_KEY);
  return mergeUniqueFoods(sharedFoods, profileFoods);
}

export function saveCustomFood(profileId, food) {
  const normalizedFood = normalizeFood(food);
  if (!normalizedFood.name) return getCustomFoods(profileId);

  const key = buildCustomFoodsKey(profileId);
  if (key) {
    const currentProfileFoods = readFoodsByKey(key);
    const nextProfileFoods = mergeUniqueFoods(currentProfileFoods, [normalizedFood]);
    writeFoodsByKey(key, nextProfileFoods);
  }

  const currentSharedFoods = readFoodsByKey(SHARED_CUSTOM_FOODS_KEY);
  const nextSharedFoods = mergeUniqueFoods(currentSharedFoods, [normalizedFood]);
  writeFoodsByKey(SHARED_CUSTOM_FOODS_KEY, nextSharedFoods);

  return getCustomFoods(profileId);
}

export function updateCustomFood(profileId, originalIdentity, food) {
  const normalizedFood = normalizeFood(food);
  if (!normalizedFood.name) return getCustomFoods(profileId);

  const key = buildCustomFoodsKey(profileId);
  if (key) {
    const currentProfileFoods = readFoodsByKey(key);
    const nextProfileFoods = replaceFoodInList(currentProfileFoods, originalIdentity, normalizedFood);
    writeFoodsByKey(key, nextProfileFoods);
  }

  const currentSharedFoods = readFoodsByKey(SHARED_CUSTOM_FOODS_KEY);
  const nextSharedFoods = replaceFoodInList(currentSharedFoods, originalIdentity, normalizedFood);
  writeFoodsByKey(SHARED_CUSTOM_FOODS_KEY, nextSharedFoods);

  return getCustomFoods(profileId);
}
