function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function inferPurchaseUnit(foodId) {
  const id = normalizeId(foodId);
  if (!id) return "unidad";

  if (id.includes("huevo")) return "unidad";
  if (id.includes("leche") || id.includes("jugo") || id.includes("bebida")) return "botella";
  if (id.includes("atun")) return "lata";
  if (id.includes("yogurt")) return "unidad";
  if (
    id.includes("pan") ||
    id.includes("arroz") ||
    id.includes("fideos") ||
    id.includes("pasta") ||
    id.includes("avena") ||
    id.includes("galleta")
  ) {
    return "paquete";
  }

  return "unidad";
}

export function getShoppingListKey(profileId) {
  if (!profileId) return "";
  return `fitapp_shopping_list_${profileId}`;
}

function getCampMealKitKey(profileId) {
  if (!profileId) return "";
  return `fitapp_camp_meal_kit_${profileId}`;
}

export function generateShoppingListFromKit(kitMeals) {
  const safeMeals = Array.isArray(kitMeals) ? kitMeals : [];
  const counts = new Map();

  safeMeals.forEach((meal) => {
    const foods = Array.isArray(meal)
      ? meal
      : Array.isArray(meal?.foods)
      ? meal.foods
      : [];

    foods.forEach((food) => {
      const foodId = normalizeId(food?.id || food?.foodId || food);
      if (!foodId) return;
      counts.set(foodId, (counts.get(foodId) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([id, quantity]) => ({
      id,
      quantity,
      unit: inferPurchaseUnit(id),
      checked: false,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function saveShoppingList(profileId, list) {
  const key = getShoppingListKey(profileId);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(Array.isArray(list) ? list : []));
}

export function loadShoppingList(profileId) {
  const key = getShoppingListKey(profileId);
  if (!key) return [];

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      id: normalizeId(item?.id),
      quantity: Number(item?.quantity || 0),
      unit: item?.unit || inferPurchaseUnit(item?.id),
      checked: Boolean(item?.checked),
    }));
  } catch {
    return [];
  }
}

export function restoreShoppingListFromSavedKit(profileId) {
  const kitKey = getCampMealKitKey(profileId);
  if (!kitKey) return [];

  try {
    const raw = localStorage.getItem(kitKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const days = Array.isArray(parsed?.mealPlan?.days) ? parsed.mealPlan.days : [];
    const flatMeals = days.flatMap((day) => [day?.breakfast, day?.snack, day?.dinner].filter(Boolean));
    if (!flatMeals.length) return [];

    const list = generateShoppingListFromKit(flatMeals);
    if (list.length) {
      saveShoppingList(profileId, list);
    }
    return list;
  } catch {
    return [];
  }
}

export function toggleShoppingItem(profileId, itemId) {
  const key = getShoppingListKey(profileId);
  if (!key) return [];

  const normalizedItemId = normalizeId(itemId);
  const currentList = loadShoppingList(profileId);
  const nextList = currentList.map((item) => {
    if (normalizeId(item?.id) !== normalizedItemId) return item;
    return {
      ...item,
      checked: !item?.checked,
    };
  });

  saveShoppingList(profileId, nextList);
  return nextList;
}
