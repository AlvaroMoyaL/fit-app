import { Suspense, lazy, useState } from "react";

import { Box, Tabs, Tab, Typography } from "@mui/material";

import NutritionDashboard from "./NutritionDashboard";
import NutritionSectionNav from "./NutritionSectionNav";

const SmartFoodInput = lazy(() => import("./SmartFoodInput"));
const CookWithWhatIHave = lazy(() => import("./CookWithWhatIHave"));
const CasinoMealEvaluator = lazy(() => import("./CasinoMealEvaluator"));
const ShoppingList = lazy(() => import("./ShoppingList"));

export default function NutritionHomePage({
  activeSection = "home",
  onChangeActiveSection,
}) {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box
        sx={{
          display: "grid",
          gap: 1.4,
          p: { xs: 2.2, md: 2.8 },
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 4,
          bgcolor: "background.paper",
          backgroundImage:
            "linear-gradient(140deg, rgba(15, 118, 110, 0.18) 0%, rgba(255,255,255,0) 42%), radial-gradient(circle at top right, rgba(15, 118, 110, 0.12), rgba(255,255,255,0) 34%)",
          boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)",
        }}
      >
        <Typography
          variant="overline"
          sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: "0.14em" }}
        >
          Hub nutricional
        </Typography>
        <Typography variant="h4" sx={{ lineHeight: 1 }}>
          Inicio de nutrición
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 720, lineHeight: 1.5 }}
        >
          Dashboard, captura rápida y herramientas para decidir qué comer durante el día.
        </Typography>
      </Box>

      <NutritionSectionNav
        activeSection={activeSection}
        onChangeSection={onChangeActiveSection}
        note="Usa Inicio para el dashboard y luego salta a registro, estado diario o planificación."
      />

      <NutritionDashboard
        dailyCalories={1850}
        targetCalories={2200}
        protein={92}
        carbs={210}
        fat={65}
        nutritionScore={78}
      />

      <Tabs value={tab} onChange={(_event, value) => setTab(value)}>
        <Tab label="Registrar comida" />
        <Tab label="Qué puedo cocinar" />
        <Tab label="Casino / Restaurante" />
        <Tab label="Lista de compras" />
      </Tabs>

      <Box>
        <Suspense fallback={<Typography variant="body2" color="text.secondary">Cargando herramienta...</Typography>}>
          {tab === 0 && <SmartFoodInput />}
          {tab === 1 && <CookWithWhatIHave />}
          {tab === 2 && <CasinoMealEvaluator />}
          {tab === 3 && <ShoppingList profileId="default" />}
        </Suspense>
      </Box>
    </Box>
  );
}
