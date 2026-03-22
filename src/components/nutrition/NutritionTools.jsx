import { useState } from "react";

import { Tabs, Tab, Box, Typography } from "@mui/material";

import SmartFoodInput from "./SmartFoodInput";
import CookWithWhatIHave from "./CookWithWhatIHave";
import CasinoMealEvaluator from "./CasinoMealEvaluator";
import WorkMealPlanner from "./WorkMealPlanner";
import CampMealKit from "./CampMealKit";
import WorkFoodInventory from "./WorkFoodInventory";
import ShoppingList from "./ShoppingList";
import {
  nutritionCompactTabsSx,
  nutritionSurfaceSx,
  nutritionTabLabelDot,
  nutritionTabsRailSx,
} from "./nutritionUi";

export default function NutritionTools({ profileId, onMealParsed }) {
  const [tab, setTab] = useState(0);
  const panelSx = (theme) => ({
    ...nutritionSurfaceSx(theme),
    p: { xs: 1.1, sm: 1.2 },
  });
  const tabsPanelSx = nutritionTabsRailSx;
  const compactTabsSx = (theme) => nutritionCompactTabsSx(theme);
  const contentFrameSx = {
    width: "100%",
    maxWidth: "100%",
    mx: 0,
  };

  return (
    <Box sx={{ display: "grid", gap: 1.4 }}>
      <Box sx={(theme) => ({ ...panelSx(theme), display: "grid", gap: 0.5 })}>
        <Typography variant="subtitle1">Herramientas nutricionales</Typography>
        <Typography variant="body2" color="text.secondary">
          Registro inteligente, sugerencias y logística semanal.
        </Typography>
      </Box>

      <Box sx={tabsPanelSx}>
        <Tabs
          value={tab}
          onChange={(_event, newValue) => setTab(newValue)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={compactTabsSx}
        >
          <Tab label={nutritionTabLabelDot("primary.main", "Registro")} />
          <Tab label={nutritionTabLabelDot("warning.main", "Cocinar")} />
          <Tab label={nutritionTabLabelDot("info.main", "Casino")} />
          <Tab label={nutritionTabLabelDot("secondary.main", "Plan")} />
          <Tab label={nutritionTabLabelDot("success.main", "Kit")} />
          <Tab label={nutritionTabLabelDot("warning.main", "Inventario")} />
          <Tab label={nutritionTabLabelDot("error.main", "Compras")} />
        </Tabs>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Box sx={{ ...contentFrameSx, display: tab === 0 ? "block" : "none", animation: "fadeIn 140ms ease" }}>
          <SmartFoodInput profileId={profileId} onMealParsed={onMealParsed || (() => {})} />
        </Box>
        <Box sx={{ ...contentFrameSx, display: tab === 1 ? "block" : "none", animation: "fadeIn 140ms ease" }}>
          <CookWithWhatIHave />
        </Box>
        <Box sx={{ ...contentFrameSx, display: tab === 2 ? "block" : "none", animation: "fadeIn 140ms ease" }}>
          <CasinoMealEvaluator />
        </Box>
        <Box sx={{ ...contentFrameSx, display: tab === 3 ? "block" : "none", animation: "fadeIn 140ms ease" }}>
          <WorkMealPlanner />
        </Box>
        <Box sx={{ ...contentFrameSx, display: tab === 4 ? "block" : "none", animation: "fadeIn 140ms ease" }}>
          <CampMealKit profileId={profileId} />
        </Box>
        <Box sx={{ ...contentFrameSx, display: tab === 5 ? "block" : "none", animation: "fadeIn 140ms ease" }}>
          <WorkFoodInventory profileId={profileId} />
        </Box>
        <Box sx={{ ...contentFrameSx, display: tab === 6 ? "block" : "none", animation: "fadeIn 140ms ease" }}>
          <ShoppingList profileId={profileId} isActive={tab === 6} />
        </Box>
      </Box>
    </Box>
  );
}
