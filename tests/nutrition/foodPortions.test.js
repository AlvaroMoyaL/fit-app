import test from "node:test";
import assert from "node:assert/strict";

import { formatMealPortionMeta, getFoodPortionOption, parseServingSize } from "../../src/utils/foodPortions.js";

test("parseServingSize interpreta label y gramos desde un envase explicito", () => {
  const serving = parseServingSize("1 envase (150 g)");

  assert.deepEqual(serving, {
    label: "envase",
    grams: 150,
    directServing: false,
    description: "1 envase (150 g)",
  });
});

test("getFoodPortionOption prioriza servingSize del alimento antes que equivalencias genericas", () => {
  const portion = getFoodPortionOption(
    {
      id: "yogurt_griego_pro",
      name: "Yogurt griego",
      servingSize: "1 pote (170 g)",
    },
    "snack"
  );

  assert.equal(portion.label, "pote");
  assert.equal(portion.grams, 170);
  assert.equal(portion.description, "1 pote (170 g)");
});

test("formatMealPortionMeta muestra la porcion persistida cuando existe", () => {
  const meta = formatMealPortionMeta({
    quantityMode: "portion",
    portionDescription: "1 unidad (60 g)",
    unit: "unidad",
    baseServingGrams: 60,
  });

  assert.equal(meta, "1 unidad (60 g)");
});
