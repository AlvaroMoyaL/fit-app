export function calculateDailyTotals(meals) {
  const safeMeals = Array.isArray(meals) ? meals : [];
  return safeMeals.reduce(
    (acc, meal) => {
      acc.calories += Number(meal?.calories || 0);
      acc.protein += Number(meal?.protein || 0);
      acc.carbs += Number(meal?.carbs || 0);
      acc.fat += Number(meal?.fat || 0);
      acc.mealsCount += 1;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, mealsCount: 0 }
  );
}

export function getMealsForDate(meals, date) {
  const safeMeals = Array.isArray(meals) ? meals : [];
  if (!date) return [];
  return safeMeals.filter((meal) => meal?.date === date);
}
