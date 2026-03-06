import foodCatalog from "../data/foodCatalog";

const STOP_WORDS = new Set(["con", "y", "de", "a", "al", "del", "el", "la", "un", "una"]);

const connectors = ["con", "y", "de", "a", "al", "del"];

const foodSynonyms = {
  arroz: "rice",
  pollo: "chicken",
  huevo: "egg",
  huevos: "egg",
  "huevos revueltos": "egg",
  palta: "avocado",
  ensalada: "salad",
  tomate: "tomato",
  pan: "bread",
  carne: "beef",
  atun: "tuna",
  yogurt: "yogurt",
  leche: "milk",
  queso: "cheese",
  papa: "potato",
  papas: "potato",
  "papas fritas": "potato",
  lechuga: "lettuce",
  manzana: "apple",
  platano: "banana",
};

const compositeMeals = {
  completo: ["bread", "sausage", "tomato", "avocado", "mayonnaise"],
  "porotos con rienda": ["beans", "pasta"],
  charquican: ["beef", "potato", "pumpkin"],
  cazuela: ["chicken", "potato", "corn", "pumpkin"],
  "pan con huevo": ["bread", "egg"],
};

function toCatalogId(food) {
  const rawId = food?.id || food?.name || "";
  return normalizeFoodText(rawId).replace(/\s+/g, "_");
}

function removeCommonPlural(word) {
  if (word.endsWith("es") && word.length > 3) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 2) return word.slice(0, -1);
  return word;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeFoodText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitFoodPhrases(text) {
  const normalized = normalizeFoodText(text);
  if (!normalized) return [];

  const connectorsPattern = connectors.map(escapeRegex).join("|");
  return normalized
    .replace(new RegExp(`\\b(${connectorsPattern})\\b`, "gi"), "|")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function cleanFoodToken(token) {
  const normalized = normalizeFoodText(token);
  if (!normalized) return "";

  if (STOP_WORDS.has(normalized)) return "";
  if (foodSynonyms[normalized]) return normalized;

  const words = normalized.split(/\s+/).filter((word) => !STOP_WORDS.has(word));
  if (words.length === 0) return "";

  const singularWords = words.map(removeCommonPlural);
  const compact = singularWords.join(" ").trim();
  if (foodSynonyms[compact]) return compact;

  const firstWord = singularWords[0];
  if (foodSynonyms[firstWord]) return firstWord;

  return compact;
}

export function tokenizeFoodText(text) {
  return splitFoodPhrases(text)
    .map(cleanFoodToken)
    .filter(Boolean);
}

export function interpretFoodText(text) {
  const normalizedInput = normalizeFoodText(text);

  // Detect common composite meals before token-level parsing.
  for (const [mealName, ingredients] of Object.entries(compositeMeals)) {
    const normalizedMealName = normalizeFoodText(mealName);
    const regex = new RegExp(`(^|\\s)${escapeRegex(normalizedMealName)}($|\\s)`, "i");
    if (regex.test(normalizedInput)) {
      return Array.from(new Set(ingredients));
    }
  }

  const tokens = tokenizeFoodText(normalizedInput);
  if (tokens.length === 0) return [];

  const safeCatalog = Array.isArray(foodCatalog) ? foodCatalog : [];
  const found = new Set();

  const catalogByExact = new Map();
  const catalogNames = [];
  for (const food of safeCatalog) {
    const nameKey = normalizeFoodText(food?.name || "");
    const idKey = normalizeFoodText(food?.id || "");
    const fallbackId = toCatalogId(food);

    if (nameKey) {
      catalogByExact.set(nameKey, fallbackId);
      catalogNames.push({ key: nameKey, id: fallbackId });
    }
    if (idKey) catalogByExact.set(idKey, fallbackId);
  }

  // Detect direct matches from complete catalog names inside the whole sentence.
  for (const entry of catalogNames) {
    const regex = new RegExp(`(^|\\s)${escapeRegex(entry.key)}($|\\s)`, "i");
    if (regex.test(normalizedInput)) {
      found.add(entry.id);
    }
  }

  for (const token of tokens) {
    const candidates = [token, removeCommonPlural(token)];
    const firstWord = token.split(" ")[0];
    if (firstWord) candidates.push(removeCommonPlural(firstWord));

    let matched = false;
    for (const candidate of candidates) {
      const mappedToken = foodSynonyms[candidate];
      if (mappedToken) {
        found.add(mappedToken);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    for (const candidate of candidates) {
      if (catalogByExact.has(candidate)) {
        found.add(catalogByExact.get(candidate));
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Partial fallback: match token inside catalog names for robust phrase parsing.
    for (const entry of catalogNames) {
      const regex = new RegExp(`(^|\\s)${escapeRegex(token)}($|\\s)`, "i");
      if (regex.test(entry.key)) {
        found.add(entry.id);
        matched = true;
      }
    }
    if (matched) {
      continue;
    }
  }

  return Array.from(found);
}

export { foodSynonyms, connectors, compositeMeals };
