const defaultPortions = {
  rice: 150,
  chicken: 120,
  beef: 120,
  fish: 120,
  egg: 60,

  bread: 50,
  avocado: 70,
  cheese: 30,

  potato: 150,
  pasta: 150,

  lettuce: 40,
  tomato: 50,
  salad: 80,

  apple: 150,
  banana: 120,

  yogurt: 125,
  milk: 200,
};

export function estimatePortion(foodId) {
  const normalizedId = String(foodId || "").trim().toLowerCase();
  return defaultPortions[normalizedId] ?? 100;
}

export function estimateMealPortions(foodIds) {
  if (!Array.isArray(foodIds)) return [];

  return foodIds
    .filter(Boolean)
    .map((foodId) => ({
      foodId,
      grams: estimatePortion(foodId),
    }));
}

export { defaultPortions };
