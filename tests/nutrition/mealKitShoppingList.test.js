import test from "node:test";
import assert from "node:assert/strict";

import {
  buildShoppingListFromMealPlanDays,
  getCampMealKitDayKey,
  getPendingCampMealKitDays,
  restoreShoppingListFromSavedKit,
} from "../../src/utils/mealKitShoppingList.js";

function createLocalStorageMock() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

test.beforeEach(() => {
  globalThis.localStorage = createLocalStorageMock();
});

test.afterEach(() => {
  delete globalThis.localStorage;
});

test("getPendingCampMealKitDays excluye dias ya cubiertos desde inventario", () => {
  const days = [
    { day: 1, breakfast: { foods: ["yogurt"] } },
    { day: 2, breakfast: { foods: ["atun_en_lata"] } },
    { day: 3, breakfast: { foods: ["tortilla_de_trigo"] } },
  ];

  const pendingDays = getPendingCampMealKitDays({
    mealPlan: { days },
    consumedDayKeys: [getCampMealKitDayKey(days[1], 1)],
  });

  assert.deepEqual(
    pendingDays.map((day) => day.day),
    [1, 3]
  );
});

test("restoreShoppingListFromSavedKit reconstruye la lista solo con dias pendientes", () => {
  const profileId = "ana";
  const key = `fitapp_camp_meal_kit_${profileId}`;

  globalThis.localStorage.setItem(
    key,
    JSON.stringify({
      mealPlan: {
        days: [
          {
            day: 1,
            breakfast: { id: "day1-breakfast", foods: ["yogurt"] },
            snack: { id: "day1-snack", foods: ["tortilla_de_trigo"] },
          },
          {
            day: 2,
            breakfast: { id: "day2-breakfast", foods: ["atun_en_lata"] },
          },
        ],
      },
      consumedDayKeys: ["day_1"],
    })
  );

  const list = restoreShoppingListFromSavedKit(profileId);

  assert.deepEqual(list, [
    { id: "atun_en_lata", quantity: 1, unit: "lata", checked: false },
  ]);
});

test("buildShoppingListFromMealPlanDays agrega alimentos repetidos de dias pendientes", () => {
  const list = buildShoppingListFromMealPlanDays([
    {
      day: 1,
      breakfast: { foods: ["yogurt", "avena"] },
      snack: { foods: ["yogurt"] },
    },
    {
      day: 2,
      dinner: { foods: ["avena"] },
    },
  ]);

  assert.deepEqual(list, [
    { id: "avena", quantity: 2, unit: "paquete", checked: false },
    { id: "yogurt", quantity: 2, unit: "unidad", checked: false },
  ]);
});
