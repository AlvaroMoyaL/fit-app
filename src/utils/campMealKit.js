import { generateWorkMealPlan } from "./workMealPlanner";

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function extractFoodsFromPlan(mealPlan) {
  const counts = {};
  const days = Array.isArray(mealPlan?.days) ? mealPlan.days : [];

  days.forEach((day) => {
    const meals = [day?.breakfast, day?.snack, day?.dinner].filter(Boolean);
    meals.forEach((meal) => {
      const foods = Array.isArray(meal?.foods) ? meal.foods : [];
      foods.forEach((food) => {
        const key = normalizeId(food);
        if (!key) return;
        counts[key] = (counts[key] || 0) + 1;
      });
    });
  });

  return counts;
}

function buildShoppingList(foodCounts) {
  return Object.entries(foodCounts || {})
    .map(([food, quantity]) => ({ food, quantity }))
    .sort((a, b) => a.food.localeCompare(b.food));
}

function generatePrepSuggestions(foodCounts) {
  const keys = Object.keys(foodCounts || {});
  const suggestions = new Set();

  keys.forEach((food) => {
    const key = normalizeId(food);
    if (key === "huevo") suggestions.add("Hervir huevos antes de salir");
    if (key === "avena") suggestions.add("Preparar porciones de avena");
    if (key === "atun" || key === "atun_en_lata")
      suggestions.add("Llevar latas individuales de atún");
    if (key === "manzana") suggestions.add("Llevar frutas lavadas");
    if (key === "pan" || key === "pan_integral" || key === "pan_pita" || key === "pan_pita_integral")
      suggestions.add("Llevar pan porcionado");
  });

  return Array.from(suggestions);
}

export function generateCampMealKit(options = {}) {
  const mealPlan = generateWorkMealPlan(options);
  const foodCounts = extractFoodsFromPlan(mealPlan);
  const shoppingList = buildShoppingList(foodCounts);
  const prepSuggestions = generatePrepSuggestions(foodCounts);

  return {
    mealPlan,
    shoppingList,
    prepSuggestions,
  };
}

