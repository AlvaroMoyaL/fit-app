function buildNutritionKey(profileId) {
  if (!profileId) return "";
  return `nutrition_log_${profileId}`;
}

export function getMeals(profileId) {
  const key = buildNutritionKey(profileId);
  if (!key) return [];

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMeals(profileId, meals) {
  const key = buildNutritionKey(profileId);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(Array.isArray(meals) ? meals : []));
}

export function addMeal(profileId, meal) {
  const currentMeals = getMeals(profileId);
  const nextMeals = [...currentMeals, meal];
  saveMeals(profileId, nextMeals);
}
