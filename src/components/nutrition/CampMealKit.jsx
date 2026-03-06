import { useEffect, useState } from "react";
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
} from "@mui/material";
import { generateCampMealKit } from "../../utils/campMealKit";
import { getPortableMealsByType } from "../../utils/portableMeals";
import {
  generateShoppingListFromKit,
  loadShoppingList,
  saveShoppingList,
} from "../../utils/mealKitShoppingList";

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

export default function CampMealKit({ profileId }) {
  const [days, setDays] = useState(4);
  const [hasFridge, setHasFridge] = useState(false);
  const [includeBreakfast, setIncludeBreakfast] = useState(true);
  const [includeSnacks, setIncludeSnacks] = useState(true);
  const [includeDinner, setIncludeDinner] = useState(true);
  const [kit, setKit] = useState(null);

  const getMealOptionsByType = (mealType) => {
    const type = String(mealType || "").toLowerCase();
    const options = getPortableMealsByType(type);
    if (type === "dinner") {
      return options.filter((meal) => !meal.requiresRefrigeration);
    }
    return hasFridge ? options : options.filter((meal) => !meal.requiresRefrigeration);
  };

  const persistKit = (nextKit) => {
    setKit(nextKit);
    const key = getCampMealKitKey(profileId);
    if (key) {
      localStorage.setItem(key, JSON.stringify(nextKit));
    }

    if (profileId) {
      const previousById = new Map(
        loadShoppingList(profileId).map((item) => [normalizeId(item?.id), Boolean(item?.checked)])
      );
      const flatMeals = (Array.isArray(nextKit?.mealPlan?.days) ? nextKit.mealPlan.days : []).flatMap(
        (day) => [day?.breakfast, day?.snack, day?.dinner].filter(Boolean)
      );
      const checklist = generateShoppingListFromKit(flatMeals).map((item) => ({
        ...item,
        checked: previousById.get(normalizeId(item?.id)) || false,
      }));
      saveShoppingList(profileId, checklist);
    }
  };

  useEffect(() => {
    const key = getCampMealKitKey(profileId);
    if (!key) {
      setKit(null);
      return;
    }

    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        setKit(null);
        return;
      }
      const parsed = JSON.parse(raw);
      setKit(parsed && typeof parsed === "object" ? parsed : null);
    } catch {
      setKit(null);
    }
  }, [profileId]);

  const handleGenerate = () => {
    const result = generateCampMealKit({
      days: Number(days || 0),
      hasFridge,
      includeBreakfast,
      includeSnacks,
      includeDinner,
    });
    persistKit(result);
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
  };

  const handleChangeMeal = (dayIndex, mealKey, nextMealId) => {
    if (!kit || !nextMealId) return;
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

              <Box>
                <Typography variant="h6">Plan de comidas</Typography>
                <Stack spacing={1.2} sx={{ mt: 1 }}>
                  {(kit?.mealPlan?.days || []).map((dayItem, index) => (
                    <Box key={`kit-day-${dayItem.day}-${index}`}>
                      <Typography variant="h6">Día {dayItem.day}</Typography>

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
                <Typography variant="h6">Lista de alimentos</Typography>
                <Stack spacing={0.6} sx={{ mt: 1 }}>
                  {(kit?.shoppingList || []).map((item) => (
                    <Typography key={`shopping-${item.food}`} variant="body1">
                      {item.food} × {item.quantity}
                    </Typography>
                  ))}
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
