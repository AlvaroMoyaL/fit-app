import { getFoodPortionOption } from "./foodPortions.js";

function safeString(value, fallback = "") {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function safeNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function normalizeText(value) {
  return safeString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCanonicalHint(text) {
  const normalized = normalizeText(text);
  if (!normalized) return "";

  if (normalized.includes("yogurt") || normalized.includes("yogur")) return "yogurt";
  if (normalized.includes("tortilla")) return "tortilla";
  if (normalized.includes("atun")) return "atun";
  if (normalized.includes("huevo")) return "huevo";
  if (normalized.includes("avena")) return "avena";
  if (normalized.includes("granola")) return "granola";
  if (normalized.includes("pollo")) return "pollo";
  return "";
}

function isInventoryMatch(shoppingItem, inventoryItem) {
  const shoppingName = normalizeText(shoppingItem?.id || shoppingItem?.name);
  const inventoryName = normalizeText(inventoryItem?.name);
  if (!shoppingName || !inventoryName) return false;

  if (shoppingName === inventoryName) return true;

  const shoppingHint = buildCanonicalHint(shoppingName);
  const inventoryHint = buildCanonicalHint(inventoryName);
  if (shoppingHint && shoppingHint === inventoryHint) return true;

  const shorter = shoppingName.length <= inventoryName.length ? shoppingName : inventoryName;
  const longer = shorter === shoppingName ? inventoryName : shoppingName;
  if (shorter.length >= 6 && longer.includes(shorter)) return true;

  return false;
}

function sortLocations(locations) {
  return [...locations].sort((left, right) => safeString(left.location).localeCompare(safeString(right.location)));
}

function sortByName(items) {
  return [...items].sort((left, right) => safeString(left.name || left.id).localeCompare(safeString(right.name || right.id)));
}

function getLocationPriority(location) {
  const normalized = normalizeText(location);
  if (normalized === "oficina") return 0;
  if (normalized === "refrigerador trabajo") return 1;
  if (normalized === "cajon oficina") return 2;
  if (normalized === "pieza") return 3;
  if (normalized === "casa") return 4;
  return 10;
}

function sortMatchesForConsumption(matches) {
  return [...matches].sort((left, right) => {
    const locationCompare = getLocationPriority(left.location) - getLocationPriority(right.location);
    if (locationCompare !== 0) return locationCompare;
    return safeString(left.name).localeCompare(safeString(right.name));
  });
}

function normalizeId(value) {
  return normalizeText(value).replace(/\s+/g, "_");
}

function normalizeInventoryUnitLabel(label) {
  const normalized = normalizeText(label);
  if (!normalized) return "unidad";
  if (normalized.includes("envase")) return "envase";
  if (normalized.includes("lata")) return "lata";
  if (normalized.includes("botella")) return "botella";
  if (normalized.includes("paquete")) return "paquete";
  if (normalized.includes("porcion")) return "porcion";
  return "unidad";
}

function buildCatalogMap(catalog) {
  const safeCatalog = Array.isArray(catalog) ? catalog : [];
  const entries = safeCatalog.flatMap((item) => {
    const idKey = normalizeId(item?.id);
    const nameKey = normalizeId(item?.name);
    return [
      idKey ? [idKey, item] : null,
      nameKey ? [nameKey, item] : null,
    ].filter(Boolean);
  });

  return new Map(entries);
}

function resolveInventoryQuantityFromMealItem(item, catalogItem) {
  const explicitQuantity = safeNumber(item?.quantity, 0);
  if (explicitQuantity > 0) {
    return Math.max(1, Math.round(explicitQuantity));
  }

  const grams = Math.max(0, safeNumber(item?.grams, 0));
  const portion = getFoodPortionOption(catalogItem, "snack");
  const basePortionGrams = Math.max(0, safeNumber(portion?.grams, 0));
  if (grams > 0 && basePortionGrams > 0) {
    // Give a small slack so 130 g on a 125 g yogurt still counts as 1, but 190 g counts as 2.
    return Math.max(1, Math.ceil(grams / basePortionGrams - 0.15));
  }

  return 1;
}

function buildInventorySignature(item) {
  return [normalizeText(item?.name), normalizeText(item?.location), normalizeText(item?.unit || "unidad")].join("::");
}

export function buildInventoryRequirementsFromMeal(meal, catalog) {
  const safeFoods = Array.isArray(meal?.foods) ? meal.foods : [];
  const catalogMap = buildCatalogMap(catalog);
  const counts = new Map();

  safeFoods.forEach((item) => {
    const foodId = normalizeId(item?.foodId || item?.id || item?.name);
    if (!foodId) return;

    const catalogItem = catalogMap.get(foodId) || null;
    const quantity = resolveInventoryQuantityFromMealItem(item, catalogItem);
    const portion = getFoodPortionOption(catalogItem, "snack");
    const unit = normalizeInventoryUnitLabel(portion?.label);
    const current = counts.get(foodId) || {
      id: foodId,
      quantity: 0,
      unit,
      checked: false,
    };

    counts.set(foodId, {
      ...current,
      quantity: current.quantity + quantity,
      unit,
    });
  });

  return sortByName(Array.from(counts.values()));
}

function resolveCatalogItemForLoggedMeal(meal, catalogMap) {
  const nameKey = normalizeId(meal?.name);
  const idKey = normalizeId(meal?.id);
  return catalogMap.get(nameKey) || catalogMap.get(idKey) || null;
}

function resolveInventoryQuantityFromLoggedMeal(meal, catalogItem) {
  const explicitQuantity = safeNumber(meal?.quantity, 0);
  const grams = Math.max(0, safeNumber(meal?.grams, 0));
  const baseServingGrams = Math.max(0, safeNumber(meal?.baseServingGrams, 0));
  const portion = getFoodPortionOption(catalogItem, "snack");
  const portionGrams = baseServingGrams || Math.max(0, safeNumber(portion?.grams, 0));

  if (String(meal?.quantityMode || "").trim().toLowerCase() === "portion" && explicitQuantity > 0) {
    return Math.max(1, Math.ceil(explicitQuantity - 0.15));
  }

  if (grams > 0 && portionGrams > 0) {
    return Math.max(1, Math.ceil(grams / portionGrams - 0.15));
  }

  if (explicitQuantity > 0 && portionGrams > 0 && String(meal?.unit || "").trim().toLowerCase() === "ml") {
    return Math.max(1, Math.ceil(explicitQuantity / portionGrams - 0.15));
  }

  if (explicitQuantity > 0) {
    return Math.max(1, Math.ceil(explicitQuantity - 0.15));
  }

  return 1;
}

export function buildInventoryRequirementsFromLoggedMeals(meals, catalog) {
  const safeMeals = Array.isArray(meals) ? meals : [];
  const catalogMap = buildCatalogMap(catalog);
  const counts = new Map();

  safeMeals.forEach((meal) => {
    const catalogItem = resolveCatalogItemForLoggedMeal(meal, catalogMap);
    const id = normalizeId(catalogItem?.id || catalogItem?.name || meal?.name);
    if (!id) return;

    const quantity = resolveInventoryQuantityFromLoggedMeal(meal, catalogItem);
    const mealUnit = safeString(meal?.unit);
    const unitSource =
      meal?.portionLabel ||
      getFoodPortionOption(catalogItem, "snack")?.label ||
      (mealUnit && mealUnit !== "x100g" && mealUnit !== "ml" ? mealUnit : "");
    const unit = normalizeInventoryUnitLabel(unitSource);
    const current = counts.get(id) || {
      id,
      quantity: 0,
      unit,
      checked: false,
    };

    counts.set(id, {
      ...current,
      quantity: current.quantity + quantity,
      unit,
    });
  });

  return sortByName(Array.from(counts.values()));
}

export function restoreConsumedInventoryItems(inventoryItems, consumedItems) {
  const nextInventory = (Array.isArray(inventoryItems) ? inventoryItems : []).map((item) => ({ ...item }));
  const indexBySignature = new Map(
    nextInventory.map((item, index) => [buildInventorySignature(item), index]).filter(([signature]) => signature)
  );

  (Array.isArray(consumedItems) ? consumedItems : []).forEach((item) => {
    const quantity = Math.max(0, safeNumber(item?.quantity, 0));
    if (quantity <= 0) return;

    const normalizedItem = {
      id: safeString(item?.id),
      name: safeString(item?.name || item?.id),
      location: safeString(item?.location),
      unit: safeString(item?.unit, "unidad") || "unidad",
      quantity,
    };
    const signature = buildInventorySignature(normalizedItem);
    if (!signature) return;

    const existingIndex = indexBySignature.get(signature);
    if (Number.isInteger(existingIndex) && existingIndex >= 0) {
      nextInventory[existingIndex] = {
        ...nextInventory[existingIndex],
        quantity: Math.max(0, safeNumber(nextInventory[existingIndex]?.quantity, 0)) + quantity,
      };
      return;
    }

    nextInventory.push(normalizedItem);
    indexBySignature.set(signature, nextInventory.length - 1);
  });

  return nextInventory;
}

export function reconcileShoppingListWithInventory(shoppingList, inventoryItems) {
  const safeShoppingList = Array.isArray(shoppingList) ? shoppingList : [];
  const safeInventory = Array.isArray(inventoryItems) ? inventoryItems : [];

  const items = safeShoppingList.map((item) => {
    const matches = safeInventory.filter((inventoryItem) => isInventoryMatch(item, inventoryItem));
    const availableQuantity = matches.reduce((sum, match) => sum + Math.max(0, safeNumber(match?.quantity, 0)), 0);
    const requiredQuantity = Math.max(0, safeNumber(item?.quantity, 0));
    const coveredQuantity = Math.min(requiredQuantity, availableQuantity);
    const missingQuantity = Math.max(0, requiredQuantity - availableQuantity);
    const coverageRatio = requiredQuantity > 0 ? coveredQuantity / requiredQuantity : 0;

    return {
      ...item,
      inventoryMatches: sortLocations(
        matches.map((match) => ({
          id: safeString(match?.id),
          name: safeString(match?.name),
          location: safeString(match?.location),
          quantity: Math.max(0, safeNumber(match?.quantity, 0)),
          unit: safeString(match?.unit, "unidad"),
        }))
      ),
      requiredQuantity,
      availableQuantity,
      coveredQuantity,
      missingQuantity,
      coverageRatio,
      fullyCovered: requiredQuantity > 0 && missingQuantity === 0,
      partiallyCovered: coveredQuantity > 0 && missingQuantity > 0,
    };
  });

  return {
    items,
    summary: {
      totalItems: items.length,
      coveredItems: items.filter((item) => item.fullyCovered).length,
      partialItems: items.filter((item) => item.partiallyCovered).length,
      missingItems: items.filter((item) => item.coveredQuantity <= 0).length,
      totalRequiredQuantity: items.reduce((sum, item) => sum + item.requiredQuantity, 0),
      totalCoveredQuantity: items.reduce((sum, item) => sum + item.coveredQuantity, 0),
      totalMissingQuantity: items.reduce((sum, item) => sum + item.missingQuantity, 0),
    },
  };
}

export function buildWorkWeekPrepSummary(shoppingList, inventoryItems) {
  const coverage = reconcileShoppingListWithInventory(shoppingList, inventoryItems);
  const locationsMap = new Map();

  coverage.items.forEach((item) => {
    item.inventoryMatches.forEach((match) => {
      const current = locationsMap.get(match.location) || {
        location: match.location,
        totalQuantity: 0,
        items: [],
      };

      current.totalQuantity += Math.max(0, safeNumber(match.quantity, 0));
      current.items.push({
        id: item.id,
        name: safeString(item.name || item.id),
        quantity: Math.max(0, safeNumber(match.quantity, 0)),
        unit: safeString(item.unit || match.unit, "unidad"),
      });
      locationsMap.set(match.location, current);
    });
  });

  const missingPurchases = sortByName(
    coverage.items
      .filter((item) => item.missingQuantity > 0)
      .map((item) => ({
        id: item.id,
        name: safeString(item.name || item.id),
        quantity: item.missingQuantity,
        unit: safeString(item.unit, "unidad"),
        availableQuantity: item.availableQuantity,
      }))
  );

  const coveredItems = sortByName(
    coverage.items
      .filter((item) => item.coveredQuantity > 0)
      .map((item) => ({
        id: item.id,
        name: safeString(item.name || item.id),
        quantity: item.coveredQuantity,
        unit: safeString(item.unit, "unidad"),
      }))
  );

  return {
    ...coverage,
    prep: {
      readyLocations: sortLocations(
        Array.from(locationsMap.values()).map((group) => ({
          location: group.location,
          totalQuantity: group.totalQuantity,
          items: sortByName(group.items),
        }))
      ),
      missingPurchases,
      coveredItems,
      isReady: coverage.summary.totalItems > 0 && missingPurchases.length === 0,
    },
  };
}

export function consumeInventoryForShoppingList(shoppingList, inventoryItems) {
  const coverage = reconcileShoppingListWithInventory(shoppingList, inventoryItems);
  const nextInventory = (Array.isArray(inventoryItems) ? inventoryItems : []).map((item) => ({ ...item }));
  const consumptionItems = coverage.items.map((item) => {
    let remaining = Math.max(0, safeNumber(item.requiredQuantity, 0));
    const consumedFrom = [];

    sortMatchesForConsumption(item.inventoryMatches).forEach((match) => {
      if (remaining <= 0) return;

      const inventoryIndex = nextInventory.findIndex((entry) => safeString(entry?.id) === safeString(match.id));
      if (inventoryIndex < 0) return;

      const available = Math.max(0, safeNumber(nextInventory[inventoryIndex]?.quantity, 0));
      if (available <= 0) return;

      const consumedQuantity = Math.min(available, remaining);
      if (consumedQuantity <= 0) return;

      remaining -= consumedQuantity;
      nextInventory[inventoryIndex] = {
        ...nextInventory[inventoryIndex],
        quantity: available - consumedQuantity,
      };
      consumedFrom.push({
        ...match,
        quantity: consumedQuantity,
      });
    });

    return {
      ...item,
      consumedQuantity: item.requiredQuantity - remaining,
      missingAfterConsumption: remaining,
      consumedFrom,
      fullyConsumed: remaining === 0,
    };
  });

  return {
    items: consumptionItems,
    inventoryItems: nextInventory.filter((item) => Math.max(0, safeNumber(item?.quantity, 0)) > 0),
    summary: {
      totalItems: consumptionItems.length,
      fullyConsumedItems: consumptionItems.filter((item) => item.fullyConsumed).length,
      partiallyConsumedItems: consumptionItems.filter((item) => item.consumedQuantity > 0 && !item.fullyConsumed).length,
      totalConsumedQuantity: consumptionItems.reduce((sum, item) => sum + Math.max(0, safeNumber(item.consumedQuantity, 0)), 0),
      totalMissingQuantity: consumptionItems.reduce((sum, item) => sum + Math.max(0, safeNumber(item.missingAfterConsumption, 0)), 0),
    },
  };
}
