function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toNumber(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function roundNumber(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(toNumber(value) * factor) / factor;
}

const FOOD_PORTION_EQUIVALENTS = Object.freeze({
  platano: { label: "unidad", grams: 120 },
  banana: { label: "unidad", grams: 120 },
  manzana: { label: "unidad", grams: 180 },
  pera: { label: "unidad", grams: 180 },
  naranja: { label: "unidad", grams: 130 },
  mandarina: { label: "unidad", grams: 90 },
  kiwi: { label: "unidad", grams: 75 },
  durazno: { label: "unidad", grams: 150 },
  damasco: { label: "unidad", grams: 35 },
  mango: { label: "unidad", grams: 200 },
  huevo: { label: "unidad", grams: 50 },
  "pan blanco": { label: "rebanada", grams: 30 },
  "pan integral": { label: "rebanada", grams: 32 },
  "pan marraqueta": { label: "unidad", grams: 100 },
  "pan hallulla": { label: "unidad", grams: 90 },
  "pan pita": { label: "unidad", grams: 60 },
  "pan pita integral": { label: "unidad", grams: 60 },
  arepa: { label: "unidad", grams: 90 },
  "tortilla de trigo": { label: "unidad", grams: 50 },
  "tortilla de maiz": { label: "unidad", grams: 28 },
  yogurt: { label: "envase", grams: 125 },
  "yogurt natural": { label: "envase", grams: 125 },
  "yogurt griego": { label: "envase", grams: 150 },
  kefir: { label: "envase", grams: 200 },
  "barrita de cereal": { label: "unidad", grams: 23 },
  "cereal de desayuno": { label: "taza", grams: 30 },
  granola: { label: "taza", grams: 55 },
  "queso gauda": { label: "lamina", grams: 20 },
  "queso mantecoso": { label: "lamina", grams: 25 },
  quesillo: { label: "porción", grams: 60 },
  "queso cottage": { label: "porción", grams: 110 },
  "jamon de pavo": { label: "lamina", grams: 25 },
  "jamon cocido": { label: "lamina", grams: 25 },
});

function normalizePortionLabel(label) {
  const normalized = normalizeText(label);
  if (normalized === "porcion") return "porción";
  return normalized || "";
}

function formatGramsLabel(grams) {
  const rounded = roundNumber(grams, grams >= 100 ? 0 : 1);
  return Number.isInteger(rounded) ? `${rounded} g` : `${rounded.toFixed(1)} g`;
}

function buildPortionDescription(label, grams) {
  const safeLabel = normalizePortionLabel(label) || "porción";
  if (toNumber(grams) > 0) {
    return `1 ${safeLabel} (${formatGramsLabel(grams)})`;
  }
  return `1 ${safeLabel}`;
}

function extractLabelFromServingSize(rawServingSize) {
  const normalized = normalizeText(rawServingSize)
    .replace(/\((.*?)\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "";

  const withoutCount = normalized.replace(/^\d+(?:[.,]\d+)?\s*/, "");
  const withoutGrams = withoutCount.replace(/(\d+(?:[.,]\d+)?)\s*g\b/, "").trim();
  return normalizePortionLabel(withoutGrams);
}

export function parseServingSize(servingSize) {
  const raw = String(servingSize || "").trim();
  if (!raw) return null;

  const normalizedRaw = normalizeText(raw);
  const gramsMatch = normalizedRaw.match(/(\d+(?:[.,]\d+)?)\s*g\b/);
  const grams = gramsMatch ? Number(String(gramsMatch[1]).replace(",", ".")) : 0;
  const label = extractLabelFromServingSize(raw) || (grams > 0 ? "porción" : "");

  if (!label && grams <= 0) return null;

  const directServing = grams <= 0 && Boolean(label);
  const hasExplicitLabel = Boolean(extractLabelFromServingSize(raw));
  const description = hasExplicitLabel || directServing ? raw : buildPortionDescription(label, grams);

  return {
    label: label || "porción",
    grams: grams > 0 ? roundNumber(grams, 2) : 0,
    directServing,
    description: String(description || buildPortionDescription(label, grams)).trim(),
  };
}

export function getFoodPortionOption(food, mealType) {
  if (!food || mealType === "bebida") return null;

  const fromServing = parseServingSize(food?.servingSize);
  if (fromServing) return fromServing;

  const fallback = FOOD_PORTION_EQUIVALENTS[normalizeText(food?.name)];
  if (!fallback) return null;

  return {
    label: fallback.label,
    grams: fallback.grams,
    directServing: false,
    description: buildPortionDescription(fallback.label, fallback.grams),
  };
}

export function formatMealPortionMeta(meal) {
  const portionDescription = String(meal?.portionDescription || "").trim();
  if (portionDescription) return portionDescription;

  const servingSize = String(meal?.servingSize || "").trim();
  if (servingSize) return servingSize;

  const unit = normalizePortionLabel(meal?.unit);
  if (!unit || unit === "x100g" || unit === "ml") return "";

  const baseServingGrams = toNumber(meal?.baseServingGrams);
  return buildPortionDescription(unit, baseServingGrams);
}
