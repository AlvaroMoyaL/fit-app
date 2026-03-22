import { startTransition, useEffect, useMemo, useState } from "react";

import {
  loadShoppingList,
  restoreShoppingListFromSavedKit,
  saveShoppingList,
  toggleShoppingItem,
} from "../../utils/mealKitShoppingList";
import {
  addWorkFoodInventoryItem,
  loadWorkFoodInventory,
  WORK_FOOD_INVENTORY_LOCATION_OPTIONS,
} from "../../utils/workFoodInventoryStorage";
import {
  buildWorkWeekPrepSummary,
  reconcileShoppingListWithInventory,
} from "../../utils/workFoodInventoryPlanning";

import {
  Box,
  Chip,
  Typography,
  List,
  ListItem,
  ListItemButton,
  Checkbox,
  ListItemText,
  Paper,
  Button,
  MenuItem,
  TextField,
} from "@mui/material";

function formatFoodName(id) {
  return String(id || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatQuantity(quantity, unit) {
  const safeQuantity = Number(quantity || 0);
  const safeUnit = String(unit || "unidad");
  const plural = safeQuantity === 1 ? safeUnit : `${safeUnit}s`;
  return `${safeQuantity} ${plural}`;
}

function loadShoppingListState(profileId) {
  const list = loadShoppingList(profileId);
  if (Array.isArray(list) && list.length > 0) {
    return list;
  }

  const restored = restoreShoppingListFromSavedKit(profileId);
  return Array.isArray(restored) ? restored : [];
}

export default function ShoppingList({ profileId, isActive = false }) {
  const [shoppingList, setShoppingList] = useState(() => loadShoppingListState(profileId));
  const [inventoryState, setInventoryState] = useState(() => loadWorkFoodInventory(profileId));
  const [hideChecked, setHideChecked] = useState(false);
  const [purchaseTargets, setPurchaseTargets] = useState({});

  useEffect(() => {
    startTransition(() => {
      setShoppingList(loadShoppingListState(profileId));
      setInventoryState(loadWorkFoodInventory(profileId));
    });
  }, [profileId, isActive]);

  const handleToggle = (id) => {
    toggleShoppingItem(profileId, id);
    setShoppingList(loadShoppingList(profileId));
  };

  const shoppingCoverage = useMemo(
    () => reconcileShoppingListWithInventory(shoppingList, inventoryState.items),
    [inventoryState.items, shoppingList]
  );
  const workWeekPrep = useMemo(
    () => buildWorkWeekPrepSummary(shoppingList, inventoryState.items),
    [inventoryState.items, shoppingList]
  );

  const visibleItems = useMemo(() => {
    if (!hideChecked) return shoppingCoverage.items;
    return shoppingCoverage.items.filter((item) => !item?.checked);
  }, [shoppingCoverage.items, hideChecked]);

  const allChecked = shoppingList.length > 0 && shoppingList.every((item) => item?.checked);

  const getPurchaseTarget = (itemId) => purchaseTargets[itemId] || "Oficina";

  const handleChangePurchaseTarget = (itemId, location) => {
    setPurchaseTargets((prev) => ({
      ...prev,
      [itemId]: location,
    }));
  };

  const handlePurchaseAndStore = (item) => {
    const missingQuantity = Math.max(0, Number(item?.missingQuantity || 0));
    if (!profileId || missingQuantity <= 0) return;

    const location = getPurchaseTarget(item.id);
    const nextInventory = addWorkFoodInventoryItem(profileId, {
      name: formatFoodName(item.name || item.id),
      quantity: missingQuantity,
      unit: item.unit,
      location,
    }, {
      source: "compra_fin_de_semana",
      type: "add",
      detail: "Comprado y guardado desde lista de compras",
    });

    const nextShoppingList = shoppingList.map((entry) =>
      entry?.id === item.id
        ? {
            ...entry,
            checked: true,
          }
        : entry
    );

    saveShoppingList(profileId, nextShoppingList);
    setInventoryState(nextInventory);
    setShoppingList(nextShoppingList);
  };

  return (
    <Paper sx={{ p: 2.5 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h6">Lista de compras</Typography>
        <Typography variant="body2" color="text.secondary">
          Cruza tu lista con el inventario guardado en oficina, pieza o casa para saber qué ya tienes y qué realmente falta comprar.
        </Typography>

        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
          <Chip size="small" color="success" variant="outlined" label={`${shoppingCoverage.summary.coveredItems} cubiertos`} />
          <Chip size="small" color="warning" variant="outlined" label={`${shoppingCoverage.summary.partialItems} parciales`} />
          <Chip size="small" color="error" variant="outlined" label={`${shoppingCoverage.summary.missingItems} faltantes`} />
          <Chip
            size="small"
            variant="outlined"
            label={`${shoppingCoverage.summary.totalMissingQuantity} por comprar`}
          />
        </Box>

        {shoppingList.length > 0 ? (
          <Box
            sx={{
              display: "grid",
              gap: 1.1,
              p: 1.25,
              borderRadius: 2.2,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.default",
            }}
          >
            <Box sx={{ display: "grid", gap: 0.35 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Prep antes del lunes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {workWeekPrep.prep.isReady
                  ? "Con tu inventario actual ya cubres la semana de trabajo."
                  : `Ya tienes ${workWeekPrep.summary.totalCoveredQuantity} unidades cubiertas y te faltan ${workWeekPrep.summary.totalMissingQuantity} para cerrar la semana.`}
              </Typography>
            </Box>

            {workWeekPrep.prep.readyLocations.length > 0 ? (
              <Box sx={{ display: "grid", gap: 0.8 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Ya tienes guardado
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 0.9 }}>
                  {workWeekPrep.prep.readyLocations.map((group) => (
                    <Box
                      key={group.location}
                      sx={{
                        display: "grid",
                        gap: 0.55,
                        p: 0.95,
                        borderRadius: 1.6,
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {group.location}
                        </Typography>
                        <Chip size="small" variant="outlined" color="success" label={`${group.totalQuantity} disponibles`} />
                      </Box>
                      <Box sx={{ display: "flex", gap: 0.55, flexWrap: "wrap" }}>
                        {group.items.slice(0, 4).map((item) => (
                          <Chip
                            key={`${group.location}-${item.id}`}
                            size="small"
                            variant="outlined"
                            label={`${formatFoodName(item.name || item.id)} · ${formatQuantity(item.quantity, item.unit)}`}
                          />
                        ))}
                        {group.items.length > 4 ? (
                          <Chip size="small" variant="outlined" label={`+${group.items.length - 4} mas`} />
                        ) : null}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : null}

            <Box sx={{ display: "grid", gap: 0.8 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Comprar este fin de semana
              </Typography>
              {workWeekPrep.prep.missingPurchases.length === 0 ? (
                <Typography variant="body2" color="success.main">
                  No hace falta comprar nada extra para arrancar la semana.
                </Typography>
              ) : (
                <Box sx={{ display: "grid", gap: 0.85 }}>
                  {workWeekPrep.prep.missingPurchases.map((item) => (
                    <Box
                      key={`missing-${item.id}`}
                      sx={{
                        display: "grid",
                        gap: 0.7,
                        p: 0.85,
                        borderRadius: 1.6,
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {formatFoodName(item.name || item.id)}
                        </Typography>
                        <Chip
                          size="small"
                          color="warning"
                          variant="outlined"
                          label={formatQuantity(item.quantity, item.unit)}
                        />
                      </Box>
                      <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap", alignItems: "center" }}>
                        <TextField
                          select
                          size="small"
                          label="Guardar en"
                          value={getPurchaseTarget(item.id)}
                          onChange={(event) => handleChangePurchaseTarget(item.id, event.target.value)}
                          sx={{ minWidth: { xs: "100%", sm: 220 } }}
                        >
                          {WORK_FOOD_INVENTORY_LOCATION_OPTIONS.map((location) => (
                            <MenuItem key={location} value={location}>
                              {location}
                            </MenuItem>
                          ))}
                        </TextField>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handlePurchaseAndStore(item)}
                        >
                          Comprado y guardar
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        ) : null}

        <Box>
          <Button variant="outlined" onClick={() => setHideChecked((prev) => !prev)}>
            {hideChecked ? "Mostrar comprados" : "Ocultar comprados"}
          </Button>
        </Box>

        {visibleItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {shoppingList.length === 0
              ? "No hay items en la lista de compras"
              : "No hay items pendientes por mostrar"}
          </Typography>
        ) : (
          <List>
            {visibleItems.map((item) => (
              <ListItem key={item.id} disablePadding>
                <ListItemButton onClick={() => handleToggle(item.id)}>
                  <Checkbox
                    checked={Boolean(item.checked)}
                    onChange={() => handleToggle(item.id)}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <ListItemText
                    primary={formatFoodName(item.id)}
                    secondary={
                      item.fullyCovered
                        ? `Ya tienes ${formatQuantity(item.availableQuantity, item.unit)}${item.inventoryMatches.length ? ` · ${item.inventoryMatches.map((match) => `${match.quantity} en ${match.location}`).join(", ")}` : ""}`
                        : item.partiallyCovered
                        ? `Tienes ${formatQuantity(item.availableQuantity, item.unit)}${item.inventoryMatches.length ? ` · ${item.inventoryMatches.map((match) => `${match.quantity} en ${match.location}`).join(", ")}` : ""} · Comprar: ${formatQuantity(item.missingQuantity, item.unit)}`
                        : `Comprar: ${formatQuantity(item.missingQuantity || item.quantity, item.unit)}`
                    }
                    sx={{
                      textDecoration: item.checked ? "line-through" : "none",
                      opacity: item.checked ? 0.65 : 1,
                    }}
                  />
                  {!item.checked ? (
                    item.fullyCovered ? (
                      <Chip size="small" color="success" variant="filled" label="Cubierto" />
                    ) : item.partiallyCovered ? (
                      <Chip size="small" color="warning" variant="outlined" label={`Faltan ${item.missingQuantity}`} />
                    ) : (
                      <Chip size="small" color="error" variant="outlined" label="Comprar" />
                    )
                  ) : null}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}

        {allChecked && (
          <Typography variant="body1" color="success.main">
            ✔ Todo comprado — Kit listo para la semana
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
