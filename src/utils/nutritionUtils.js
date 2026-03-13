function getMealTimestamp(meal) {
  const consumedAt = Number(meal?.consumedAt || 0);
  if (Number.isFinite(consumedAt) && consumedAt > 0) return consumedAt;

  const mealDate = String(meal?.date || "").trim();
  const mealTime = String(meal?.time || "").trim();
  if (mealDate) {
    const parsed = new Date(`${mealDate}T${mealTime || "12:00"}:00`).getTime();
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const rawId = String(meal?.id || "");
  const prefix = rawId.split("-")[0];
  const ts = Number(prefix);
  return Number.isFinite(ts) && ts > 0 ? ts : 0;
}

function countMealEvents(meals) {
  const safeMeals = Array.isArray(meals) ? meals : [];
  if (!safeMeals.length) return 0;

  const explicitGroups = new Set(
    safeMeals.map((meal) => String(meal?.mealGroupId || "").trim()).filter(Boolean)
  );
  if (explicitGroups.size > 0) return explicitGroups.size;

  const sorted = [...safeMeals].sort((a, b) => getMealTimestamp(a) - getMealTimestamp(b));
  const THIRTY_MINUTES = 30 * 60 * 1000;

  let count = 0;
  let lastEvent = null;

  sorted.forEach((meal) => {
    const mealType = String(meal?.mealType || "snack");
    const timestamp = getMealTimestamp(meal);

    if (!lastEvent) {
      count += 1;
      lastEvent = { mealType, timestamp };
      return;
    }

    const sameMealType = lastEvent.mealType === mealType;
    const closeInTime =
      timestamp > 0 && lastEvent.timestamp > 0 && timestamp - lastEvent.timestamp <= THIRTY_MINUTES;

    if (sameMealType && closeInTime) {
      lastEvent = { mealType, timestamp };
      return;
    }

    if (sameMealType && (!timestamp || !lastEvent.timestamp)) {
      return;
    }

    count += 1;
    lastEvent = { mealType, timestamp };
  });

  return count;
}

export function calculateDailyTotals(meals) {
  const safeMeals = Array.isArray(meals) ? meals : [];
  return safeMeals.reduce(
    (acc, meal) => {
      acc.calories += Number(meal?.calories || 0);
      acc.protein += Number(meal?.protein || 0);
      acc.carbs += Number(meal?.carbs || 0);
      acc.fat += Number(meal?.fat || 0);
      acc.sodium += Number(meal?.sodium || 0);
      acc.sugars += Number(meal?.sugars || 0);
      acc.fiber += Number(meal?.fiber || 0);
      acc.saturatedFat += Number(meal?.saturatedFat || 0);
      acc.transFat += Number(meal?.transFat || 0);
      acc.cholesterol += Number(meal?.cholesterol || 0);
      return acc;
    },
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      sodium: 0,
      sugars: 0,
      fiber: 0,
      saturatedFat: 0,
      transFat: 0,
      cholesterol: 0,
      mealsCount: countMealEvents(safeMeals),
    }
  );
}

export function getMealsForDate(meals, date) {
  const safeMeals = Array.isArray(meals) ? meals : [];
  if (!date) return [];
  return safeMeals.filter((meal) => meal?.date === date);
}
