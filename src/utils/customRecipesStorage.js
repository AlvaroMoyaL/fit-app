function buildCustomRecipesKey(profileId) {
  if (!profileId) return "";
  return `custom_recipes_${profileId}`;
}

export function getCustomRecipes(profileId) {
  const key = buildCustomRecipesKey(profileId);
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

export function saveCustomRecipe(profileId, recipe) {
  const key = buildCustomRecipesKey(profileId);
  if (!key || !recipe) return [];

  const current = getCustomRecipes(profileId);
  const next = [...current, recipe];
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}
