import test from "node:test";
import assert from "node:assert/strict";

import {
  addWorkFoodInventoryItem,
  adjustWorkFoodInventoryQuantity,
  loadWorkFoodInventory,
  saveWorkFoodInventory,
  summarizeWorkFoodInventory,
} from "../../src/utils/workFoodInventoryStorage.js";

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

test("addWorkFoodInventoryItem mezcla stock repetido por nombre, ubicacion y unidad", () => {
  addWorkFoodInventoryItem("ana", {
    name: "Yogurt",
    quantity: 2,
    unit: "envase",
    location: "oficina",
  });

  const nextState = addWorkFoodInventoryItem("ana", {
    name: "Yogurt",
    quantity: 1,
    unit: "envase",
    location: "Oficina",
  });

  assert.equal(nextState.items.length, 1);
  assert.equal(nextState.items[0].quantity, 3);
  assert.equal(nextState.items[0].location, "Oficina");
});

test("adjustWorkFoodInventoryQuantity resta stock y elimina el item al llegar a cero", () => {
  const created = addWorkFoodInventoryItem("ana", {
    name: "Tortilla",
    quantity: 2,
    unit: "unidad",
    location: "Pieza",
  });

  const afterOne = adjustWorkFoodInventoryQuantity("ana", created.items[0].id, -1);
  assert.equal(afterOne.items[0].quantity, 1);

  const afterTwo = adjustWorkFoodInventoryQuantity("ana", created.items[0].id, -1);
  assert.equal(afterTwo.items.length, 0);
});

test("summarizeWorkFoodInventory agrupa por ubicacion", () => {
  addWorkFoodInventoryItem("ana", { name: "Yogurt", quantity: 2, unit: "envase", location: "Oficina" });
  addWorkFoodInventoryItem("ana", { name: "Tortilla", quantity: 4, unit: "unidad", location: "Pieza" });
  addWorkFoodInventoryItem("ana", { name: "Atun", quantity: 3, unit: "lata", location: "Oficina" });

  const summary = summarizeWorkFoodInventory(loadWorkFoodInventory("ana").items);

  assert.equal(summary.totalItems, 3);
  assert.equal(summary.totalQuantity, 9);
  assert.deepEqual(
    summary.locations.map((group) => ({
      location: group.location,
      itemCount: group.itemCount,
      totalQuantity: group.totalQuantity,
    })),
    [
      { location: "Oficina", itemCount: 2, totalQuantity: 5 },
      { location: "Pieza", itemCount: 1, totalQuantity: 4 },
    ]
  );
});

test("addWorkFoodInventoryItem permite guardar un faltante comprado en una ubicacion elegida", () => {
  const nextState = addWorkFoodInventoryItem("ana", {
    name: "Pan pita",
    quantity: 2,
    unit: "paquete",
    location: "Casa",
  });

  assert.equal(nextState.items.length, 1);
  assert.equal(nextState.items[0].name, "Pan pita");
  assert.equal(nextState.items[0].quantity, 2);
  assert.equal(nextState.items[0].location, "Casa");
});

test("workFoodInventoryStorage guarda ultimos movimientos de stock", () => {
  addWorkFoodInventoryItem(
    "ana",
    { name: "Yogurt", quantity: 2, unit: "envase", location: "Oficina" },
    { source: "inventario_manual", type: "add" }
  );
  adjustWorkFoodInventoryQuantity("ana", "yogurt::oficina::envase", -1, {
    source: "inventario_manual",
    type: "adjust_down",
  });

  const state = loadWorkFoodInventory("ana");

  assert.equal(state.activity.length, 2);
  assert.deepEqual(
    state.activity.map((entry) => ({
      type: entry.type,
      source: entry.source,
      quantity: entry.quantity,
      location: entry.location,
    })),
    [
      { type: "adjust_down", source: "inventario_manual", quantity: 1, location: "Oficina" },
      { type: "add", source: "inventario_manual", quantity: 2, location: "Oficina" },
    ]
  );
});

test("saveWorkFoodInventory permite anexar movimientos externos como consumo y restauracion", () => {
  const created = addWorkFoodInventoryItem("ana", {
    name: "Atun",
    quantity: 3,
    unit: "lata",
    location: "Oficina",
  });

  const consumed = saveWorkFoodInventory(
    "ana",
    {
      items: [{ ...created.items[0], quantity: 2 }],
    },
    {
      movements: [
        {
          type: "consume",
          source: "kit_trabajo",
          name: "Atun",
          quantity: 1,
          unit: "lata",
          location: "Oficina",
        },
      ],
    }
  );

  const restored = saveWorkFoodInventory(
    "ana",
    {
      items: [{ ...created.items[0], quantity: 3 }],
    },
    {
      movements: [
        {
          type: "restore",
          source: "comidas_de_hoy",
          name: "Atun",
          quantity: 1,
          unit: "lata",
          location: "Oficina",
        },
      ],
    }
  );

  assert.equal(consumed.activity[0].type, "consume");
  assert.equal(restored.activity[0].type, "restore");
  assert.equal(restored.activity[1].type, "consume");
});
