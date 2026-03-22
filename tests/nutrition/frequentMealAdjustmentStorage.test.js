import test from "node:test";
import assert from "node:assert/strict";

import {
  clearFrequentMealAdjustmentPreference,
  getFrequentMealAdjustmentStorageKey,
  loadFrequentMealAdjustmentPreferences,
  recordFrequentMealAdjustmentAcceptance,
  resolveFrequentMealAdjustmentPreferences,
} from "../../src/utils/frequentMealAdjustmentStorage.js";

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

test("loadFrequentMealAdjustmentPreferences devuelve estado por defecto ante JSON corrupto", () => {
  const key = getFrequentMealAdjustmentStorageKey("ana");
  globalThis.localStorage.setItem(key, "{invalid-json");

  const result = loadFrequentMealAdjustmentPreferences("ana");

  assert.deepEqual(result, {
    bySignature: {},
    byMealType: {},
    lastUpdatedAt: "",
  });
});

test("recordFrequentMealAdjustmentAcceptance mezcla preferencias y promedia gramos aceptados", () => {
  recordFrequentMealAdjustmentAcceptance("ana", {
    signature: "yogurt-granola",
    mealType: "snack",
    actionPlan: {
      reductions: [],
      additions: [
        {
          type: "add_food",
          targetCategory: "protein",
          selectedFoodIdentity: "yogurt griego::",
          targetGrams: 100,
        },
      ],
    },
  });

  const result = recordFrequentMealAdjustmentAcceptance("ana", {
    signature: "yogurt-granola",
    mealType: "snack",
    actionPlan: {
      reductions: [],
      additions: [
        {
          type: "add_food",
          targetCategory: "protein",
          selectedFoodIdentity: "yogurt griego::",
          targetGrams: 140,
        },
      ],
    },
  });

  const proteinPreference = result.bySignature["yogurt-granola"].protein;
  assert.equal(proteinPreference.selectedFoodIdentity, "yogurt griego::");
  assert.equal(proteinPreference.targetGrams, 120);
  assert.equal(proteinPreference.acceptedCount, 2);
  assert.equal(result.byMealType.snack.protein.targetGrams, 120);
});

test("resolveFrequentMealAdjustmentPreferences informa fuente del aprendizaje y permite limpiarlo", () => {
  recordFrequentMealAdjustmentAcceptance("ana", {
    signature: "cena-arroz-pollo",
    mealType: "cena",
    actionPlan: {
      reductions: [{ type: "reduce_item", sourceName: "Arroz", trimGrams: 40, ratio: 0.6 }],
      additions: [],
    },
  });

  const resolved = resolveFrequentMealAdjustmentPreferences(
    loadFrequentMealAdjustmentPreferences("ana"),
    "cena-arroz-pollo",
    "cena"
  );
  assert.equal(resolved.hasLearnedPreference, true);
  assert.equal(resolved.sources.lighter, "signature");

  const cleared = clearFrequentMealAdjustmentPreference("ana", {
    signature: "cena-arroz-pollo",
    mealType: "cena",
    scope: "signature",
  });

  assert.equal(Boolean(cleared.bySignature["cena-arroz-pollo"]), false);
  assert.equal(Boolean(cleared.byMealType.cena), true);
});
