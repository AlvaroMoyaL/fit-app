const SATIETY_BY_FOOD = {
  huevo: 8.5,
  chicken: 8.5,
  pollo: 8.5,
  atun: 8,
  tuna: 8,
  yogurt: 6.8,
  yogurt_griego: 7.2,
  avena: 7.5,
  oats: 7.5,
  manzana: 6.8,
  apple: 6.8,
  platano: 6.4,
  banana: 6.4,
  ensalada: 6,
  salad: 6,
  arroz: 5,
  rice: 5,
  pan: 4.8,
  bread: 4.8,
};

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function classifySatiety(score) {
  if (score >= 7) return "high";
  if (score >= 5) return "medium";
  return "low";
}

export function evaluateMealSatiety(foodIds = []) {
  const safeIds = Array.isArray(foodIds) ? foodIds : [];
  const scores = safeIds
    .map((id) => SATIETY_BY_FOOD[normalizeId(id)])
    .filter((v) => Number.isFinite(v));

  const score = scores.length
    ? Number((scores.reduce((acc, n) => acc + n, 0) / scores.length).toFixed(2))
    : 0;

  return {
    score,
    classification: classifySatiety(score),
  };
}

