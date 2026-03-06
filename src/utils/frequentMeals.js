function getFrequentMealsKey(profileId) {
  if (!profileId) return "";
  return `fitapp_frequent_meals_${profileId}`;
}

export function getFrequentMeals(profileId) {
  const key = getFrequentMealsKey(profileId);
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

export function saveFrequentMeal(profileId, text) {
  const key = getFrequentMealsKey(profileId);
  const normalizedText = String(text || "").trim();
  if (!key || !normalizedText) return;

  const current = getFrequentMeals(profileId);
  const next = [...current];
  const existingIndex = next.findIndex((item) => item?.text === normalizedText);

  if (existingIndex >= 0) {
    const previousCount = Number(next[existingIndex]?.count || 0);
    next[existingIndex] = {
      text: normalizedText,
      count: previousCount + 1,
    };
  } else {
    next.push({
      text: normalizedText,
      count: 1,
    });
  }

  localStorage.setItem(key, JSON.stringify(next));
}

export function getTopFrequentMeals(profileId, limit = 5) {
  const meals = getFrequentMeals(profileId);
  const safeLimit = Math.max(1, Number(limit) || 5);

  return [...meals]
    .sort((a, b) => Number(b?.count || 0) - Number(a?.count || 0))
    .slice(0, safeLimit);
}

export { getFrequentMealsKey };
