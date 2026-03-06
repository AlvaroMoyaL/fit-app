import { useEffect, useMemo, useState } from "react";

import {
  loadShoppingList,
  restoreShoppingListFromSavedKit,
  toggleShoppingItem,
} from "../../utils/mealKitShoppingList";

import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  Checkbox,
  ListItemText,
  Paper,
  Button,
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

export default function ShoppingList({ profileId, isActive = false }) {
  const [shoppingList, setShoppingList] = useState([]);
  const [hideChecked, setHideChecked] = useState(false);

  useEffect(() => {
    const list = loadShoppingList(profileId);
    if (Array.isArray(list) && list.length > 0) {
      setShoppingList(list);
      return;
    }

    const restored = restoreShoppingListFromSavedKit(profileId);
    setShoppingList(Array.isArray(restored) ? restored : []);
  }, [profileId, isActive]);

  const handleToggle = (id) => {
    toggleShoppingItem(profileId, id);
    setShoppingList(loadShoppingList(profileId));
  };

  const visibleItems = useMemo(() => {
    if (!hideChecked) return shoppingList;
    return shoppingList.filter((item) => !item?.checked);
  }, [shoppingList, hideChecked]);

  const allChecked = shoppingList.length > 0 && shoppingList.every((item) => item?.checked);

  return (
    <Paper sx={{ p: 2.5 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h6">Lista de compras</Typography>

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
                    secondary={`Comprar: ${formatQuantity(item.quantity, item.unit)}`}
                    sx={{
                      textDecoration: item.checked ? "line-through" : "none",
                      opacity: item.checked ? 0.65 : 1,
                    }}
                  />
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
