import { startTransition, useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { foodCatalog } from "../../data/foodCatalog";
import { getCustomFoods } from "../../utils/customFoodsStorage";
import {
  addWorkFoodInventoryItem,
  adjustWorkFoodInventoryQuantity,
  loadWorkFoodInventory,
  removeWorkFoodInventoryItem,
  summarizeWorkFoodInventory,
  WORK_FOOD_INVENTORY_LOCATION_OPTIONS,
  WORK_FOOD_INVENTORY_UNIT_OPTIONS,
} from "../../utils/workFoodInventoryStorage";

const STARTER_PRESETS = Object.freeze([
  { name: "Yogurt", quantity: 2, unit: "envase", location: "Oficina" },
  { name: "Tortilla", quantity: 4, unit: "unidad", location: "Pieza" },
  { name: "Atun en lata", quantity: 3, unit: "lata", location: "Oficina" },
]);

function buildInventoryForm() {
  return {
    name: "",
    quantity: "1",
    unit: "unidad",
    location: "Oficina",
  };
}

function formatInventoryQuantity(item) {
  const quantity = Number(item?.quantity || 0);
  const unit = String(item?.unit || "unidad");
  return `${quantity} ${quantity === 1 ? unit : `${unit}s`}`;
}

function formatMovementTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isTodayMovement(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function formatMovementLabel(entry) {
  const quantity = Number(entry?.quantity || 0);
  const unit = String(entry?.unit || "unidad");
  const quantityLabel = `${quantity} ${quantity === 1 ? unit : `${unit}s`}`;
  const location = String(entry?.location || "Sin ubicación");
  const name = String(entry?.name || "Item");
  const type = String(entry?.type || "");

  if (type === "consume") return `-${quantityLabel} de ${name} · ${location}`;
  if (type === "restore") return `+${quantityLabel} devueltos a ${location}`;
  if (type === "remove") return `${name} quitado de ${location}`;
  if (type === "adjust_down") return `-${quantityLabel} de ${name} · ${location}`;
  if (type === "adjust_up") return `+${quantityLabel} a ${name} · ${location}`;
  return `+${quantityLabel} a ${name} · ${location}`;
}

function getMovementTone(type) {
  if (type === "consume" || type === "adjust_down" || type === "remove") return "warning.main";
  if (type === "restore") return "info.main";
  return "success.main";
}

function buildFoodOptions(profileId) {
  const customFoods = profileId ? getCustomFoods(profileId) : [];
  const names = [...foodCatalog, ...customFoods].map((food) => String(food?.name || "").trim()).filter(Boolean);
  return [...new Set(names)].sort((left, right) => left.localeCompare(right));
}

export default function WorkFoodInventory({ profileId }) {
  const [inventoryState, setInventoryState] = useState(() => loadWorkFoodInventory(profileId));
  const [form, setForm] = useState(() => buildInventoryForm());
  const [feedback, setFeedback] = useState("");

  const foodOptions = useMemo(() => buildFoodOptions(profileId), [profileId]);
  const inventorySummary = useMemo(
    () => summarizeWorkFoodInventory(inventoryState.items),
    [inventoryState.items]
  );
  const recentActivity = useMemo(
    () => (Array.isArray(inventoryState.activity) ? inventoryState.activity.slice(0, 6) : []),
    [inventoryState.activity]
  );
  const todayActivityCount = useMemo(
    () => (Array.isArray(inventoryState.activity) ? inventoryState.activity.filter((entry) => isTodayMovement(entry?.createdAt)).length : 0),
    [inventoryState.activity]
  );

  useEffect(() => {
    startTransition(() => {
      setInventoryState(loadWorkFoodInventory(profileId));
    });
  }, [profileId]);

  const handleSaveItem = () => {
    const name = String(form.name || "").trim();
    const quantity = Number(form.quantity || 0);
    if (!name || !Number.isFinite(quantity) || quantity <= 0) return;

    const nextState = addWorkFoodInventoryItem(profileId, {
      name,
      quantity,
      unit: form.unit,
      location: form.location,
    }, {
      source: "inventario_manual",
      type: "add",
      detail: "Stock agregado manualmente",
    });

    setInventoryState(nextState);
    setFeedback(`${quantity} ${quantity === 1 ? form.unit : `${form.unit}s`} de ${name} guardados en ${form.location}.`);
    setForm((prev) => ({ ...buildInventoryForm(), unit: prev.unit, location: prev.location }));
  };

  const handleApplyPreset = (preset) => {
    setForm({
      name: preset.name,
      quantity: String(preset.quantity),
      unit: preset.unit,
      location: preset.location,
    });
    setFeedback("");
  };

  const handleAdjust = (itemId, delta) => {
    const nextState = adjustWorkFoodInventoryQuantity(profileId, itemId, delta, {
      source: "inventario_manual",
      type: delta > 0 ? "adjust_up" : "adjust_down",
      detail: "Ajuste manual desde inventario",
    });
    setInventoryState(nextState);
    setFeedback(delta > 0 ? "Inventario actualizado." : "Stock ajustado.");
  };

  const handleRemove = (itemId) => {
    const nextState = removeWorkFoodInventoryItem(profileId, itemId, {
      source: "inventario_manual",
      type: "remove",
      detail: "Item eliminado manualmente",
    });
    setInventoryState(nextState);
    setFeedback("Item eliminado del inventario.");
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: "grid", gap: 0.55 }}>
            <Typography variant="h6">Inventario por ubicación</Typography>
            <Typography variant="body2" color="text.secondary">
              Guarda con qué cuentas antes de empezar la semana. Ejemplo: 2 yogures en oficina o 4 tortillas en pieza.
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {STARTER_PRESETS.map((preset) => (
              <Chip
                key={`${preset.name}-${preset.location}`}
                size="small"
                variant="outlined"
                label={`${preset.quantity} ${preset.name} · ${preset.location}`}
                onClick={() => handleApplyPreset(preset)}
              />
            ))}
          </Box>

          <Stack spacing={1.2}>
            <Autocomplete
              freeSolo
              options={foodOptions}
              value={form.name}
              onChange={(_, value) => setForm((prev) => ({ ...prev, name: String(value || "") }))}
              onInputChange={(_, value) => setForm((prev) => ({ ...prev, name: value }))}
              renderInput={(params) => <TextField {...params} label="Alimento o item" fullWidth />}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
              <TextField
                label="Cantidad"
                type="number"
                value={form.quantity}
                onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
                inputProps={{ min: 1, step: 1 }}
                fullWidth
              />
              <TextField
                select
                label="Unidad"
                value={form.unit}
                onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))}
                fullWidth
              >
                {WORK_FOOD_INVENTORY_UNIT_OPTIONS.map((unit) => (
                  <MenuItem key={unit} value={unit}>
                    {unit}
                  </MenuItem>
                ))}
              </TextField>
              <Autocomplete
                freeSolo
                options={WORK_FOOD_INVENTORY_LOCATION_OPTIONS}
                value={form.location}
                onChange={(_, value) => setForm((prev) => ({ ...prev, location: String(value || "") }))}
                onInputChange={(_, value) => setForm((prev) => ({ ...prev, location: value }))}
                renderInput={(params) => <TextField {...params} label="Ubicación" fullWidth />}
                sx={{ minWidth: { sm: 220 } }}
              />
            </Stack>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, flexWrap: "wrap" }}>
              <Button type="button" variant="outlined" onClick={() => setForm(buildInventoryForm())}>
                Limpiar
              </Button>
              <Button type="button" variant="contained" onClick={handleSaveItem}>
                Guardar stock
              </Button>
            </Box>
            {feedback ? (
              <Typography variant="caption" sx={{ color: "success.dark", fontWeight: 600 }}>
                {feedback}
              </Typography>
            ) : null}
          </Stack>

          <Divider />

          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            <Chip size="small" color="primary" label={`${inventorySummary.totalItems} items`} />
            <Chip size="small" variant="outlined" label={`${inventorySummary.totalQuantity} unidades registradas`} />
            {todayActivityCount > 0 ? (
              <Chip size="small" color="info" variant="outlined" label={`${todayActivityCount} movimientos hoy`} />
            ) : null}
          </Box>

          {recentActivity.length > 0 ? (
            <Box
              sx={{
                display: "grid",
                gap: 0.75,
                p: 1,
                borderRadius: 1.8,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.default",
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Últimos movimientos
              </Typography>
              <Stack spacing={0.65}>
                {recentActivity.map((entry) => (
                  <Box
                    key={entry.id}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <Typography variant="caption" sx={{ color: getMovementTone(entry.type), fontWeight: 600 }}>
                      {formatMovementLabel(entry)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatMovementTime(entry.createdAt)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          ) : null}

          {inventorySummary.locations.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Todavía no hay stock guardado. Empieza con lo que ya tienes en oficina, pieza o casa.
            </Typography>
          ) : (
            <Stack spacing={1.25}>
              {inventorySummary.locations.map((group) => (
                <Box
                  key={group.location}
                  sx={{
                    display: "grid",
                    gap: 0.9,
                    p: 1.15,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                    <Box sx={{ display: "grid", gap: 0.2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {group.location}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {group.itemCount} {group.itemCount === 1 ? "item" : "items"} · {group.totalQuantity} en stock
                      </Typography>
                    </Box>
                    <Chip size="small" variant="outlined" label={`${group.totalQuantity} disponibles`} />
                  </Box>

                  <Stack spacing={0.85}>
                    {group.items.map((item) => (
                      <Box
                        key={item.id}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 1,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <Box sx={{ display: "grid", gap: 0.15 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatInventoryQuantity(item)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", gap: 0.6, flexWrap: "wrap" }}>
                          <Button size="small" variant="outlined" onClick={() => handleAdjust(item.id, -1)}>
                            -1
                          </Button>
                          <Button size="small" variant="outlined" onClick={() => handleAdjust(item.id, 1)}>
                            +1
                          </Button>
                          <Button size="small" color="error" variant="text" onClick={() => handleRemove(item.id)}>
                            Quitar
                          </Button>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
