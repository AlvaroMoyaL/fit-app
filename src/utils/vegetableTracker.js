const VEGETABLES = [
  "lechuga",
  "tomate",
  "espinaca",
  "brocoli",
  "zanahoria",
  "pepino",
  "repollo",
  "coliflor",
  "pimenton",
  "champinones",
  "zapallo italiano",
  "berenjena",
  "cebolla",
  "ajo",
];

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isVegetableName(name) {
  const normalizedName = normalizeText(name);
  if (!normalizedName) return false;

  return VEGETABLES.some((vegetable) => normalizedName.includes(vegetable));
}

function getVegetableStatus(servings) {
  if (servings >= 4) return "excellent";
  if (servings >= 3) return "good";
  if (servings >= 2) return "acceptable";
  if (servings >= 1) return "low";
  return "very_low";
}

export function trackVegetableIntake(meals = []) {
  const safeMeals = Array.isArray(meals) ? meals : [];

  const totalVegetableGrams = safeMeals.reduce((sum, meal) => {
    if (!isVegetableName(meal?.name)) return sum;
    return sum + toNumber(meal?.grams);
  }, 0);

  const servings = Number((totalVegetableGrams / 80).toFixed(1));

  return {
    totalVegetableGrams,
    servings,
    status: getVegetableStatus(servings),
  };
}

export default trackVegetableIntake;
