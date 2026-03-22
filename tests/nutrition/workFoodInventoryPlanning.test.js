import test from "node:test";
import assert from "node:assert/strict";

import {
  buildInventoryRequirementsFromLoggedMeals,
  buildInventoryRequirementsFromMeal,
  buildWorkWeekPrepSummary,
  consumeInventoryForShoppingList,
  reconcileShoppingListWithInventory,
  restoreConsumedInventoryItems,
} from "../../src/utils/workFoodInventoryPlanning.js";

test("reconcileShoppingListWithInventory detecta cobertura completa y parcial por ubicacion", () => {
  const result = reconcileShoppingListWithInventory(
    [
      { id: "yogurt_griego", quantity: 3, unit: "unidad", checked: false },
      { id: "tortilla_de_trigo", quantity: 5, unit: "unidad", checked: false },
      { id: "atun_en_lata", quantity: 2, unit: "lata", checked: false },
    ],
    [
      { id: "yogurt-oficina", name: "Yogurt", quantity: 2, unit: "envase", location: "Oficina" },
      { id: "tortilla-pieza", name: "Tortilla", quantity: 4, unit: "unidad", location: "Pieza" },
      { id: "atun-oficina", name: "Atun", quantity: 3, unit: "lata", location: "Oficina" },
    ]
  );

  assert.equal(result.summary.totalItems, 3);
  assert.equal(result.summary.coveredItems, 1);
  assert.equal(result.summary.partialItems, 2);
  assert.equal(result.summary.missingItems, 0);

  assert.deepEqual(
    result.items.map((item) => ({
      id: item.id,
      availableQuantity: item.availableQuantity,
      missingQuantity: item.missingQuantity,
      fullyCovered: item.fullyCovered,
      partiallyCovered: item.partiallyCovered,
      locations: item.inventoryMatches.map((match) => match.location),
    })),
    [
      {
        id: "yogurt_griego",
        availableQuantity: 2,
        missingQuantity: 1,
        fullyCovered: false,
        partiallyCovered: true,
        locations: ["Oficina"],
      },
      {
        id: "tortilla_de_trigo",
        availableQuantity: 4,
        missingQuantity: 1,
        fullyCovered: false,
        partiallyCovered: true,
        locations: ["Pieza"],
      },
      {
        id: "atun_en_lata",
        availableQuantity: 3,
        missingQuantity: 0,
        fullyCovered: true,
        partiallyCovered: false,
        locations: ["Oficina"],
      },
    ]
  );
});

test("reconcileShoppingListWithInventory deja item como faltante cuando no encuentra match", () => {
  const result = reconcileShoppingListWithInventory(
    [{ id: "pan_pita", quantity: 2, unit: "paquete", checked: false }],
    [{ id: "yogurt-oficina", name: "Yogurt", quantity: 2, unit: "envase", location: "Oficina" }]
  );

  assert.equal(result.summary.missingItems, 1);
  assert.equal(result.items[0].availableQuantity, 0);
  assert.equal(result.items[0].missingQuantity, 2);
  assert.equal(result.items[0].inventoryMatches.length, 0);
});

test("buildWorkWeekPrepSummary resume lo que ya esta listo por ubicacion y lo que falta comprar", () => {
  const result = buildWorkWeekPrepSummary(
    [
      { id: "yogurt_griego", quantity: 3, unit: "unidad", checked: false },
      { id: "tortilla_de_trigo", quantity: 5, unit: "unidad", checked: false },
      { id: "atun_en_lata", quantity: 2, unit: "lata", checked: false },
    ],
    [
      { id: "yogurt-oficina", name: "Yogurt", quantity: 2, unit: "envase", location: "Oficina" },
      { id: "tortilla-pieza", name: "Tortilla", quantity: 4, unit: "unidad", location: "Pieza" },
      { id: "atun-oficina", name: "Atun", quantity: 3, unit: "lata", location: "Oficina" },
    ]
  );

  assert.equal(result.prep.isReady, false);
  assert.deepEqual(
    result.prep.readyLocations.map((group) => ({
      location: group.location,
      itemCount: group.items.length,
      totalQuantity: group.totalQuantity,
    })),
    [
      { location: "Oficina", itemCount: 2, totalQuantity: 5 },
      { location: "Pieza", itemCount: 1, totalQuantity: 4 },
    ]
  );
  assert.deepEqual(
    result.prep.missingPurchases.map((item) => ({
      id: item.id,
      quantity: item.quantity,
    })),
    [
      { id: "tortilla_de_trigo", quantity: 1 },
      { id: "yogurt_griego", quantity: 1 },
    ]
  );
});

test("buildInventoryRequirementsFromMeal aproxima unidades desde gramos y porciones conocidas", () => {
  const result = buildInventoryRequirementsFromMeal(
    {
      foods: [
        { foodId: "yogurt_griego", grams: 300 },
        { foodId: "tortilla_de_trigo", grams: 50 },
        { foodId: "atun_en_lata", grams: 240 },
      ],
    },
    [
      { id: "yogurt_griego", name: "Yogurt griego", servingSize: "1 envase (150 g)" },
      { id: "tortilla_de_trigo", name: "Tortilla de trigo", servingSize: "1 unidad (50 g)" },
      { id: "atun_en_lata", name: "Atun en lata", servingSize: "1 lata drenada (120 g)" },
    ]
  );

  assert.deepEqual(result, [
    { id: "atun_en_lata", quantity: 2, unit: "lata", checked: false },
    { id: "tortilla_de_trigo", quantity: 1, unit: "unidad", checked: false },
    { id: "yogurt_griego", quantity: 2, unit: "envase", checked: false },
  ]);
});

test("buildInventoryRequirementsFromLoggedMeals aproxima unidades desde comidas registradas por grupo", () => {
  const result = buildInventoryRequirementsFromLoggedMeals(
    [
      {
        name: "Yogurt griego",
        quantity: 1,
        quantityMode: "portion",
        portionLabel: "envase",
        baseServingGrams: 150,
        grams: 150,
      },
      {
        name: "Tortilla de trigo",
        quantity: 1,
        quantityMode: "portion",
        portionLabel: "unidad",
        baseServingGrams: 50,
        grams: 50,
      },
      {
        name: "Atun en lata",
        quantity: 240,
        unit: "ml",
        quantityMode: "ml",
        grams: 240,
      },
    ],
    [
      { id: "yogurt_griego", name: "Yogurt griego", servingSize: "1 envase (150 g)" },
      { id: "tortilla_de_trigo", name: "Tortilla de trigo", servingSize: "1 unidad (50 g)" },
      { id: "atun_en_lata", name: "Atun en lata", servingSize: "1 lata drenada (120 g)" },
    ]
  );

  assert.deepEqual(result, [
    { id: "atun_en_lata", quantity: 2, unit: "lata", checked: false },
    { id: "tortilla_de_trigo", quantity: 1, unit: "unidad", checked: false },
    { id: "yogurt_griego", quantity: 1, unit: "envase", checked: false },
  ]);
});

test("consumeInventoryForShoppingList descuenta stock priorizando oficina y deja faltantes si no alcanza", () => {
  const result = consumeInventoryForShoppingList(
    [
      { id: "yogurt_griego", quantity: 3, unit: "unidad", checked: false },
      { id: "tortilla_de_trigo", quantity: 2, unit: "unidad", checked: false },
    ],
    [
      { id: "yogurt-oficina", name: "Yogurt", quantity: 2, unit: "envase", location: "Oficina" },
      { id: "yogurt-casa", name: "Yogurt", quantity: 2, unit: "envase", location: "Casa" },
      { id: "tortilla-pieza", name: "Tortilla", quantity: 1, unit: "unidad", location: "Pieza" },
    ]
  );

  assert.equal(result.summary.fullyConsumedItems, 1);
  assert.equal(result.summary.partiallyConsumedItems, 1);
  assert.equal(result.summary.totalConsumedQuantity, 4);
  assert.equal(result.summary.totalMissingQuantity, 1);

  assert.deepEqual(
    result.items.map((item) => ({
      id: item.id,
      consumedQuantity: item.consumedQuantity,
      missingAfterConsumption: item.missingAfterConsumption,
      consumedFrom: item.consumedFrom.map((entry) => `${entry.location}:${entry.quantity}`),
    })),
    [
      {
        id: "yogurt_griego",
        consumedQuantity: 3,
        missingAfterConsumption: 0,
        consumedFrom: ["Oficina:2", "Casa:1"],
      },
      {
        id: "tortilla_de_trigo",
        consumedQuantity: 1,
        missingAfterConsumption: 1,
        consumedFrom: ["Pieza:1"],
      },
    ]
  );

  assert.deepEqual(
    result.inventoryItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      location: item.location,
    })),
    [
      { id: "yogurt-casa", quantity: 1, location: "Casa" },
    ]
  );
});

test("restoreConsumedInventoryItems repone stock consumido mezclando por nombre, ubicacion y unidad", () => {
  const result = restoreConsumedInventoryItems(
    [
      { id: "yogurt-casa", name: "Yogurt", quantity: 1, unit: "envase", location: "Casa" },
      { id: "tortilla-pieza", name: "Tortilla", quantity: 2, unit: "unidad", location: "Pieza" },
    ],
    [
      { id: "yogurt-casa", name: "Yogurt", quantity: 2, unit: "envase", location: "Casa" },
      { id: "atun-oficina", name: "Atun", quantity: 1, unit: "lata", location: "Oficina" },
    ]
  );

  assert.deepEqual(
    result.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      location: item.location,
    })),
    [
      { name: "Yogurt", quantity: 3, unit: "envase", location: "Casa" },
      { name: "Tortilla", quantity: 2, unit: "unidad", location: "Pieza" },
      { name: "Atun", quantity: 1, unit: "lata", location: "Oficina" },
    ]
  );
});
