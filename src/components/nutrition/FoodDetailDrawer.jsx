import React from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

function mealTypeLabel(type) {
  if (type === "desayuno") return "Desayuno";
  if (type === "almuerzo") return "Almuerzo";
  if (type === "cena") return "Cena";
  if (type === "snack") return "Snack";
  if (type === "bebida") return "Bebida";
  return type || "Sin tipo";
}

function beverageTypeLabel(type) {
  if (type === "agua") return "Agua";
  if (type === "cafe_te") return "Café / Té";
  if (type === "sin_calorias") return "Sin calorías";
  if (type === "calorica") return "Calórica";
  if (type === "alcohol") return "Alcohol";
  return type || "";
}

function num(value, digits = 1) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(digits) : "0";
}

export default function FoodDetailDrawer({ open, onClose, meal }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Drawer
      anchor={isMobile ? "bottom" : "right"}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 390 },
          maxHeight: { xs: "82vh", sm: "100%" },
        },
      }}
    >
      <Box sx={{ width: "100%", p: { xs: 1.6, sm: 2.2 }, display: "grid", gap: 1.3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" useFlexGap flexWrap="wrap" gap={1}>
          <Typography variant="h6">Detalle de alimento</Typography>
          <Button size="small" onClick={onClose}>
            Cerrar
          </Button>
        </Stack>

        {!meal ? (
          <Typography variant="body2" color="text.secondary">
            Selecciona un registro para ver su detalle.
          </Typography>
        ) : (
          <>
            <Typography variant="h5" sx={{ lineHeight: 1.2, fontSize: { xs: "1.3rem", sm: "1.5rem" } }}>
              {meal.name}
              {meal?.brand ? ` · ${meal.brand}` : ""}
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip size="small" label={mealTypeLabel(meal.mealType)} />
              {meal?.mealType === "bebida" && meal?.beverageType && (
                <Chip size="small" color="info" label={beverageTypeLabel(meal.beverageType)} />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Cantidad: {meal?.quantity ?? 0} {meal?.unit || ""}
            </Typography>
            <Divider />
            <Box sx={{ display: "grid", gap: 0.6 }}>
              <Typography variant="subtitle2">Aporte nutricional</Typography>
              <Typography variant="body2">Calorías: {num(meal?.calories, 0)} kcal</Typography>
              <Typography variant="body2">Proteína: {num(meal?.protein)} g</Typography>
              <Typography variant="body2">Carbohidratos: {num(meal?.carbs)} g</Typography>
              <Typography variant="body2">Grasas: {num(meal?.fat)} g</Typography>
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}
