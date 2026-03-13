import { evaluateMealSatiety } from "./satietyFoods";

function toTimestampFromMeal(meal) {
  const consumedAt = Number(meal?.consumedAt || 0);
  if (Number.isFinite(consumedAt) && consumedAt > 0) return consumedAt;

  const mealDate = String(meal?.date || "").trim();
  const mealTime = String(meal?.time || "").trim();
  if (mealDate) {
    const parsed = new Date(`${mealDate}T${mealTime || "12:00"}:00`).getTime();
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const rawId = String(meal?.id || "");
  if (!rawId) return 0;
  const base = rawId.includes("-") ? rawId.split("-")[0] : rawId;
  const ts = Number(base);
  return Number.isFinite(ts) ? ts : 0;
}

function toHm(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "--:--";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function satietyConfig(level) {
  if (level === "high") {
    return { hungerLevel: "baja", minHours: 4, maxHours: 6 };
  }
  if (level === "medium") {
    return { hungerLevel: "media", minHours: 2, maxHours: 4 };
  }
  return { hungerLevel: "alta", minHours: 1, maxHours: 2 };
}

export function estimateHungerFromMeals(meals = []) {
  const safeMeals = Array.isArray(meals) ? meals : [];
  if (!safeMeals.length) {
    return {
      hasData: false,
      satietyScore: 0,
      satietyLevel: "low",
      hungerLevel: "alta",
      windowText: "1-2 horas",
      nextHungerText: "--:-- a --:--",
      lastMealTimeText: "--:--",
    };
  }

  const foodIds = safeMeals.map((meal) => meal?.foodId || meal?.name).filter(Boolean);
  const satiety = evaluateMealSatiety(foodIds);
  const cfg = satietyConfig(satiety.classification);

  const mostRecent = [...safeMeals].sort((a, b) => toTimestampFromMeal(b) - toTimestampFromMeal(a))[0];
  const baseTimestamp = toTimestampFromMeal(mostRecent) || Date.now();
  const startWindow = new Date(baseTimestamp + cfg.minHours * 60 * 60 * 1000);
  const endWindow = new Date(baseTimestamp + cfg.maxHours * 60 * 60 * 1000);

  return {
    hasData: true,
    satietyScore: Number(satiety.score || 0),
    satietyLevel: satiety.classification || "low",
    hungerLevel: cfg.hungerLevel,
    windowText: `${cfg.minHours}-${cfg.maxHours} horas`,
    nextHungerText: `${toHm(startWindow)} a ${toHm(endWindow)}`,
    lastMealTimeText: toHm(baseTimestamp),
  };
}
