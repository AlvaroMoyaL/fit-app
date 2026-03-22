import { startTransition, useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import { generateCampMealKit } from "../../utils/campMealKit";
import { getPortableMealsByType } from "../../utils/portableMeals";
import {
  buildShoppingListFromMealPlanDays,
  getCampMealKitDayKey,
  getPendingCampMealKitDays,
  generateShoppingListFromKit,
  loadShoppingList,
  saveShoppingList,
} from "../../utils/mealKitShoppingList";
import {
  loadWorkFoodInventory,
  saveWorkFoodInventory,
} from "../../utils/workFoodInventoryStorage";
import { consumeInventoryForShoppingList } from "../../utils/workFoodInventoryPlanning";

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function getCampMealKitKey(profileId) {
  if (!profileId) return "";
  return `fitapp_camp_meal_kit_${profileId}`;
}

function buildFoodCountsFromMealPlan(mealPlan) {
  const counts = {};
  const days = Array.isArray(mealPlan?.days) ? mealPlan.days : [];
  days.forEach((day) => {
    [day?.breakfast, day?.snack, day?.dinner].filter(Boolean).forEach((meal) => {
      (Array.isArray(meal?.foods) ? meal.foods : []).forEach((food) => {
        const id = normalizeId(food);
        if (!id) return;
        counts[id] = (counts[id] || 0) + 1;
      });
    });
  });
  return counts;
}

function buildShoppingListView(foodCounts) {
  return Object.entries(foodCounts || {})
    .map(([food, quantity]) => ({ food, quantity }))
    .sort((a, b) => a.food.localeCompare(b.food));
}

function buildPrepSuggestions(foodCounts) {
  const suggestions = new Set();
  Object.keys(foodCounts || {}).forEach((food) => {
    const key = normalizeId(food);
    if (key === "huevo") suggestions.add("Hervir huevos antes de salir");
    if (key === "avena") suggestions.add("Preparar porciones de avena");
    if (key === "atun" || key === "atun_en_lata")
      suggestions.add("Llevar latas individuales de atún");
    if (key === "manzana") suggestions.add("Llevar frutas lavadas");
    if (
      key === "pan" ||
      key === "pan_integral" ||
      key === "pan_pita" ||
      key === "pan_pita_integral"
    ) {
      suggestions.add("Llevar pan porcionado");
    }
  });
  return Array.from(suggestions);
}

function normalizeConsumedDayKeys(consumedDayKeys) {
  return Array.from(
    new Set(
      (Array.isArray(consumedDayKeys) ? consumedDayKeys : [])
        .map((entry) => normalizeId(entry))
        .filter(Boolean)
    )
  );
}

function buildDerivedKitData(mealPlan, consumedDayKeys) {
  const safeMealPlan = mealPlan && typeof mealPlan === "object" ? mealPlan : { days: [] };
  const pendingDays = getPendingCampMealKitDays({
    mealPlan: safeMealPlan,
    consumedDayKeys: normalizeConsumedDayKeys(consumedDayKeys),
  });
  const foodCounts = buildFoodCountsFromMealPlan({ days: pendingDays });

  return {
    mealPlan: safeMealPlan,
    consumedDayKeys: normalizeConsumedDayKeys(consumedDayKeys),
    shoppingList: buildShoppingListView(foodCounts),
    prepSuggestions: buildPrepSuggestions(foodCounts),
  };
}

function buildNormalizedKit(rawKit) {
  if (!rawKit || typeof rawKit !== "object") return null;
  return {
    ...rawKit,
    ...buildDerivedKitData(rawKit.mealPlan, rawKit.consumedDayKeys),
  };
}

function loadStoredCampMealKit(profileId) {
  const key = getCampMealKitKey(profileId);
  if (!key) return null;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return buildNormalizedKit(parsed);
  } catch {
    return null;
  }
}

export default function CampMealKit({ profileId }) {
  const [days, setDays] = useState(4);
  const [hasFridge, setHasFridge] = useState(false);
  const [includeBreakfast, setIncludeBreakfast] = useState(true);
  const [includeSnacks, setIncludeSnacks] = useState(true);
  const [includeDinner, setIncludeDinner] = useState(true);
  const [kit, setKit] = useState(() => loadStoredCampMealKit(profileId));
  const [inventoryState, setInventoryState] = useState(() => loadWorkFoodInventory(profileId));
  const [statusMessage, setStatusMessage] = useState("");

  const getMealOptionsByType = (mealType) => {
    const type = String(mealType || "").toLowerCase();
    const options = getPortableMealsByType(type);
    if (type === "dinner") {
      return options.filter((meal) => !meal.requiresRefrigeration);
    }
    return hasFridge ? options : options.filter((meal) => !meal.requiresRefrigeration);
  };

  const persistKit = (nextKit) => {
    const normalizedKit = buildNormalizedKit(nextKit);
    setKit(normalizedKit);
    const key = getCampMealKitKey(profileId);
    if (key && normalizedKit) {
      localStorage.setItem(key, JSON.stringify(normalizedKit));
    }

    if (profileId && normalizedKit) {
      const previousById = new Map(
        loadShoppingList(profileId).map((item) => [normalizeId(item?.id), Boolean(item?.checked)])
      );
      const checklist = buildShoppingListFromMealPlanDays(
        getPendingCampMealKitDays(normalizedKit)
      ).map((item) => ({
        ...item,
        checked: previousById.get(normalizeId(item?.id)) || false,
      }));
      saveShoppingList(profileId, checklist);
    }
  };

  useEffect(() => {
    startTransition(() => {
      setKit(loadStoredCampMealKit(profileId));
      setInventoryState(loadWorkFoodInventory(profileId));
      setStatusMessage("");
    });
  }, [profileId]);

  const dayCoverage = useMemo(() => {
    const days = Array.isArray(kit?.mealPlan?.days) ? kit.mealPlan.days : [];
    return days.map((dayItem, index) => {
      const dayKey = normalizeId(getCampMealKitDayKey(dayItem, index));
      const meals = [dayItem?.breakfast, dayItem?.snack, dayItem?.dinner].filter(Boolean);
      const shoppingList = generateShoppingListFromKit(meals);
      const consumption = consumeInventoryForShoppingList(shoppingList, inventoryState.items);
      const totalMissing = consumption.summary.totalMissingQuantity;

      return {
        dayKey,
        shoppingList,
        canConsumeFromInventory: shoppingList.length > 0 && totalMissing === 0,
        totalMissing,
        summary: consumption.summary,
      };
    });
  }, [inventoryState.items, kit]);

  const handleGenerate = () => {
    const result = generateCampMealKit({
      days: Number(days || 0),
      hasFridge,
      includeBreakfast,
      includeSnacks,
      includeDinner,
    });
    persistKit(result);
    setStatusMessage("");
  };

  const handleReset = () => {
    setDays(4);
    setHasFridge(false);
    setIncludeBreakfast(true);
    setIncludeSnacks(true);
    setIncludeDinner(true);
    setKit(null);

    const key = getCampMealKitKey(profileId);
    if (key) {
      localStorage.removeItem(key);
    }

    if (profileId) {
      saveShoppingList(profileId, []);
    }
    setStatusMessage("");
  };

  const handleChangeMeal = (dayIndex, mealKey, nextMealId) => {
    if (!kit || !nextMealId) return;
    const dayKey = normalizeId(getCampMealKitDayKey(kit?.mealPlan?.days?.[dayIndex], dayIndex));
    if (normalizeConsumedDayKeys(kit?.consumedDayKeys).includes(dayKey)) return;

    const mealType =
      mealKey === "breakfast" ? "breakfast" : mealKey === "snack" ? "snack" : "dinner";
    const replacement = getMealOptionsByType(mealType).find(
      (meal) => normalizeId(meal?.id) === normalizeId(nextMealId)
    );
    if (!replacement) return;

    const nextDays = (Array.isArray(kit?.mealPlan?.days) ? kit.mealPlan.days : []).map((day, idx) =>
      idx === dayIndex ? { ...day, [mealKey]: replacement } : day
    );
    const nextMealPlan = { ...(kit?.mealPlan || {}), days: nextDays };
    const foodCounts = buildFoodCountsFromMealPlan(nextMealPlan);
    const nextKit = {
      ...kit,
      mealPlan: nextMealPlan,
      shoppingList: buildShoppingListView(foodCounts),
      prepSuggestions: buildPrepSuggestions(foodCounts),
    };
    persistKit(nextKit);
  };

  const handleConsumeDayFromInventory = (dayItem, dayIndex) => {
    if (!kit) return;

    const coverage = dayCoverage[dayIndex];
    if (!coverage?.canConsumeFromInventory) {
      const missing = Math.max(0, Number(coverage?.totalMissing || 0));
      setStatusMessage(
        missing > 0
          ? `Día ${dayItem?.day || dayIndex + 1}: faltan ${missing} unidades para cubrirlo desde inventario.`
          : "No hay stock suficiente para consumir este día desde inventario."
      );
      return;
    }

    const consumption = consumeInventoryForShoppingList(coverage.shoppingList, inventoryState.items);
    const nextInventoryState = saveWorkFoodInventory(profileId, {
      items: consumption.inventoryItems,
    }, {
      movements: (Array.isArray(consumption.items) ? consumption.items : []).flatMap((item) =>
        (Array.isArray(item?.consumedFrom) ? item.consumedFrom : []).map((entry) => ({
          type: "consume",
          source: "kit_trabajo",
          detail: `Consumo desde kit día ${dayItem?.day || dayIndex + 1}`,
          name: entry.name || item.id,
          location: entry.location,
          quantity: entry.quantity,
          unit: entry.unit || item.unit || "unidad",
        }))
      ),
    });
    const nextConsumedDayKeys = normalizeConsumedDayKeys([
      ...(Array.isArray(kit?.consumedDayKeys) ? kit.consumedDayKeys : []),
      getCampMealKitDayKey(dayItem, dayIndex),
    ]);

    setInventoryState(nextInventoryState);
    persistKit({
      ...kit,
      consumedDayKeys: nextConsumedDayKeys,
    });
    setStatusMessage(`Día ${dayItem?.day || dayIndex + 1} marcado como cubierto desde inventario.`);
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h5">Kit de comida para trabajo</Typography>

          <TextField
            label="Días de trabajo"
            type="number"
            value={days}
            onChange={(event) => setDays(event.target.value)}
            inputProps={{ min: 1, max: 14, step: 1 }}
            fullWidth
          />

          <FormControlLabel
            control={<Switch checked={hasFridge} onChange={(e) => setHasFridge(e.target.checked)} />}
            label="Tengo refrigerador disponible"
          />
          <FormControlLabel
            control={
              <Switch
                checked={includeBreakfast}
                onChange={(e) => setIncludeBreakfast(e.target.checked)}
              />
            }
            label="Incluir desayuno"
          />
          <FormControlLabel
            control={
              <Switch checked={includeSnacks} onChange={(e) => setIncludeSnacks(e.target.checked)} />
            }
            label="Incluir snacks"
          />
          <FormControlLabel
            control={
              <Switch checked={includeDinner} onChange={(e) => setIncludeDinner(e.target.checked)} />
            }
            label="Incluir cena"
          />

          <Box>
            <Button variant="contained" onClick={handleGenerate}>
              Generar kit de comida
            </Button>
            <Button variant="text" color="error" onClick={handleReset} sx={{ ml: 1 }}>
              Resetear kit
            </Button>
          </Box>

          {kit && (
            <Stack spacing={2}>
              <Divider />

              {statusMessage ? (
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: "background.default",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {statusMessage}
                  </Typography>
                </Box>
              ) : null}

              <Box>
                <Typography variant="h6">Plan de comidas</Typography>
                <Stack spacing={1.2} sx={{ mt: 1 }}>
                  {(kit?.mealPlan?.days || []).map((dayItem, index) => (
                    <Box
                      key={`kit-day-${dayItem.day}-${index}`}
                      sx={{
                        display: "grid",
                        gap: 1,
                        p: 1.1,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.default",
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                        <Typography variant="h6">Día {dayItem.day}</Typography>
                        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
                          {normalizeConsumedDayKeys(kit?.consumedDayKeys).includes(
                            normalizeId(getCampMealKitDayKey(dayItem, index))
                          ) ? (
                            <Chip size="small" color="success" variant="filled" label="Cubierto desde inventario" />
                          ) : dayCoverage[index]?.canConsumeFromInventory ? (
                            <Chip size="small" color="success" variant="outlined" label="Stock listo" />
                          ) : dayCoverage[index]?.summary?.totalItems ? (
                            <Chip
                              size="small"
                              color="warning"
                              variant="outlined"
                              label={`Faltan ${dayCoverage[index].totalMissing}`}
                            />
                          ) : null}
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleConsumeDayFromInventory(dayItem, index)}
                            disabled={
                              normalizeConsumedDayKeys(kit?.consumedDayKeys).includes(
                                normalizeId(getCampMealKitDayKey(dayItem, index))
                              ) || !dayCoverage[index]?.canConsumeFromInventory
                            }
                          >
                            Usar desde inventario
                          </Button>
                        </Box>
                      </Box>

                      {dayItem.breakfast && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Desayuno
                          </Typography>
                          <Typography variant="body1">{dayItem.breakfast.name}</Typography>
                          <FormControl fullWidth size="small" sx={{ mt: 0.8 }}>
                            <InputLabel id={`kit-breakfast-${index}`}>Cambiar desayuno</InputLabel>
                            <Select
                              labelId={`kit-breakfast-${index}`}
                              label="Cambiar desayuno"
                              value={dayItem.breakfast.id || ""}
                              onChange={(event) =>
                                handleChangeMeal(index, "breakfast", event.target.value)
                              }
                              disabled={normalizeConsumedDayKeys(kit?.consumedDayKeys).includes(
                                normalizeId(getCampMealKitDayKey(dayItem, index))
                              )}
                            >
                              {getMealOptionsByType("breakfast").map((option) => (
                                <MenuItem key={`breakfast-option-${option.id}`} value={option.id}>
                                  {option.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <Typography variant="body2" color="text.secondary">
                            Saciedad: {dayItem.breakfast.satietyLevel || "—"}
                          </Typography>
                        </Box>
                      )}

                      {dayItem.snack && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Snack
                          </Typography>
                          <Typography variant="body1">{dayItem.snack.name}</Typography>
                          <FormControl fullWidth size="small" sx={{ mt: 0.8 }}>
                            <InputLabel id={`kit-snack-${index}`}>Cambiar snack</InputLabel>
                            <Select
                              labelId={`kit-snack-${index}`}
                              label="Cambiar snack"
                              value={dayItem.snack.id || ""}
                              onChange={(event) => handleChangeMeal(index, "snack", event.target.value)}
                              disabled={normalizeConsumedDayKeys(kit?.consumedDayKeys).includes(
                                normalizeId(getCampMealKitDayKey(dayItem, index))
                              )}
                            >
                              {getMealOptionsByType("snack").map((option) => (
                                <MenuItem key={`snack-option-${option.id}`} value={option.id}>
                                  {option.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <Typography variant="body2" color="text.secondary">
                            Saciedad: {dayItem.snack.satietyLevel || "—"}
                          </Typography>
                        </Box>
                      )}

                      {dayItem.dinner && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Cena
                          </Typography>
                          <Typography variant="body1">{dayItem.dinner.name}</Typography>
                          <FormControl fullWidth size="small" sx={{ mt: 0.8 }}>
                            <InputLabel id={`kit-dinner-${index}`}>Cambiar cena</InputLabel>
                            <Select
                              labelId={`kit-dinner-${index}`}
                              label="Cambiar cena"
                              value={dayItem.dinner.id || ""}
                              onChange={(event) => handleChangeMeal(index, "dinner", event.target.value)}
                              disabled={normalizeConsumedDayKeys(kit?.consumedDayKeys).includes(
                                normalizeId(getCampMealKitDayKey(dayItem, index))
                              )}
                            >
                              {getMealOptionsByType("dinner").map((option) => (
                                <MenuItem key={`dinner-option-${option.id}`} value={option.id}>
                                  {option.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <Typography variant="body2" color="text.secondary">
                            Saciedad: {dayItem.dinner.satietyLevel || "—"}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6">Lista de alimentos pendientes</Typography>
                <Stack spacing={0.6} sx={{ mt: 1 }}>
                  {(kit?.shoppingList || []).length ? (
                    (kit?.shoppingList || []).map((item) => (
                      <Typography key={`shopping-${item.food}`} variant="body1">
                        {item.food} × {item.quantity}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="body2" color="success.main">
                      No quedan alimentos pendientes para el kit actual.
                    </Typography>
                  )}
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6">Preparación antes de salir</Typography>
                <Stack spacing={0.6} sx={{ mt: 1 }}>
                  {(kit?.prepSuggestions || []).map((suggestion, index) => (
                    <Typography key={`prep-${index}`} variant="body1">
                      • {suggestion}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
