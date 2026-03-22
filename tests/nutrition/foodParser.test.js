import test from "node:test";
import assert from "node:assert/strict";

import { parseFoodText } from "../../src/utils/foodParser.js";

const catalog = [
  { id: "huevo", name: "Huevo", calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  { id: "pan_marraqueta", name: "Pan marraqueta", calories: 270, protein: 8, carbs: 55, fat: 2.5 },
  { id: "jamon_cocido", name: "Jamon cocido", calories: 110, protein: 18, carbs: 2, fat: 3 },
  { id: "queso_gauda", name: "Queso gauda", calories: 356, protein: 25, carbs: 2.2, fat: 27 },
  { id: "yogurt_griego", name: "Yogurt griego", calories: 80, protein: 10, carbs: 4, fat: 1, servingSize: "1 envase (150 g)" },
];

const recipes = [
  {
    id: "overnight_oats",
    name: "Overnight oats",
    ingredients: [
      { foodId: "yogurt_griego", grams: 150 },
      { foodId: "pan_marraqueta", grams: 60 },
    ],
  },
];

test("parseFoodText reconoce alimentos por unidad usando porcion conocida", () => {
  const result = parseFoodText("2 huevos", recipes, catalog);

  assert.equal(result.length, 1);
  assert.equal(result[0].foodId, "huevo");
  assert.equal(result[0].grams, 100);
  assert.equal(result[0].quantity, 2);
  assert.equal(result[0].quantityMode, "portion");
});

test("parseFoodText interpreta frases compuestas y cantidades naturales", () => {
  const result = parseFoodText("media marraqueta con jamon y queso gauda", recipes, catalog);

  assert.equal(result.length, 3);
  assert.deepEqual(
    result.map((item) => ({ foodId: item.foodId, grams: item.grams })),
    [
      { foodId: "pan_marraqueta", grams: 50 },
      { foodId: "jamon_cocido", grams: 25 },
      { foodId: "queso_gauda", grams: 20 },
    ]
  );
});

test("parseFoodText expande recetas y respeta el factor de cantidad", () => {
  const result = parseFoodText("2 overnight oats", recipes, catalog);

  assert.equal(result.length, 2);
  assert.deepEqual(
    result.map((item) => ({ foodId: item.foodId, grams: item.grams })),
    [
      { foodId: "yogurt_griego", grams: 300 },
      { foodId: "pan_marraqueta", grams: 120 },
    ]
  );
});
