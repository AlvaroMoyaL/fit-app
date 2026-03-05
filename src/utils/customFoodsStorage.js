function buildCustomFoodsKey(profileId) {
  if (!profileId) return "";
  return `custom_foods_${profileId}`;
}

export function getCustomFoods(profileId) {
  const key = buildCustomFoodsKey(profileId);
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

export function saveCustomFood(profileId, food) {
  const key = buildCustomFoodsKey(profileId);
  if (!key || !food) return [];

  const current = getCustomFoods(profileId);
  const next = [...current, food];
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}
