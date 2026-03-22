import test from "node:test";
import assert from "node:assert/strict";

import { buildAdjustedRepeatedMeals } from "../../src/utils/repeatedMealAdjustments.js";

test("buildAdjustedRepeatedMeals agrega una opcion concreta de proteina al repetir con ajuste", () => {
  const created = buildAdjustedRepeatedMeals({
    templateItems: [
      {
        id: "m1",
        name: "Granola",
        grams: 55,
        quantity: 1,
        calories: 220,
        protein: 5,
        carbs: 32,
        fat: 9,
      },
    ],
    adjustment: {
      actionPlan: {
        reductions: [],
        additions: [
          {
            type: "add_food",
            targetCategory: "protein",
            preferredFoodNames: ["yogurt griego"],
            targetGrams: 120,
          },
        ],
      },
    },
    adjustmentMode: "protein",
    foodOptions: [
      {
        id: "yogurt_griego",
        name: "Yogurt griego",
        calories: 80,
        protein: 10,
        carbs: 4,
        fat: 1,
        servingSize: "1 envase (150 g)",
      },
    ],
    mealType: "snack",
    targetDate: "2026-03-21",
    targetTime: "18:30",
    consumedAt: 123456,
    baseId: "repeat-1",
    mealGroupId: "meal-repeat-1",
  });

  assert.equal(created.length, 2);
  assert.equal(created[1].name, "Yogurt griego");
  assert.equal(created[1].grams, 120);
  assert.equal(created[1].protein, 12);
  assert.equal(created[1].mealGroupId, "meal-repeat-1");
});

test("buildAdjustedRepeatedMeals reduce el item objetivo sin romper el grupo repetido", () => {
  const created = buildAdjustedRepeatedMeals({
    templateItems: [
      {
        id: "m1",
        name: "Arroz",
        grams: 100,
        quantity: 1,
        calories: 130,
        protein: 2.4,
        carbs: 28,
        fat: 0.3,
      },
    ],
    adjustment: {
      actionPlan: {
        reductions: [{ type: "reduce_item", sourceName: "Arroz", trimGrams: 40 }],
        additions: [],
      },
    },
    adjustmentMode: "lighter",
    foodOptions: [],
    mealType: "almuerzo",
    targetDate: "2026-03-21",
    targetTime: "14:00",
    consumedAt: 456789,
    baseId: "repeat-2",
    mealGroupId: "meal-repeat-2",
  });

  assert.equal(created.length, 1);
  assert.equal(created[0].grams, 60);
  assert.equal(created[0].quantity, 0.6);
  assert.equal(created[0].calories, 78);
  assert.equal(created[0].mealGroupId, "meal-repeat-2");
});
