import { useState } from "react";

import { Tabs, Tab, Box, Typography } from "@mui/material";

import SmartFoodInput from "./SmartFoodInput";
import CookWithWhatIHave from "./CookWithWhatIHave";
import CasinoMealEvaluator from "./CasinoMealEvaluator";
import WorkMealPlanner from "./WorkMealPlanner";
import CampMealKit from "./CampMealKit";
import ShoppingList from "./ShoppingList";

function tabLabelDot(color, text) {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.8 }}>
      <Box
        component="span"
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: color,
          flex: "0 0 auto",
        }}
      />
      <Box component="span">{text}</Box>
    </Box>
  );
}

export default function NutritionTools({ profileId, onMealParsed }) {
  const [tab, setTab] = useState(0);
  const panelSx = {
    p: { xs: 1.1, sm: 1.2 },
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 2,
    bgcolor: "background.paper",
  };
  const tabsPanelSx = {
    p: 0,
    width: "100%",
    maxWidth: "100%",
    alignSelf: "stretch",
    boxSizing: "border-box",
    border: "none",
    borderRadius: 0,
    bgcolor: "transparent",
  };
  const compactTabsSx = {
    minHeight: { xs: 40, sm: 36 },
    width: "100%",
    "& .MuiTab-root": {
      minHeight: { xs: 40, sm: 36 },
      minWidth: "auto",
      px: { xs: 1.15, sm: 1.1 },
      py: { xs: 0.7, sm: 0.45 },
      fontSize: { xs: "0.88rem", sm: "0.82rem" },
      mr: 0.45,
      whiteSpace: "nowrap",
    },
    "& .MuiTabs-flexContainer": {
      gap: 0.4,
    },
  };
  const contentFrameSx = {
    width: "100%",
    maxWidth: "100%",
    mx: 0,
  };

  return (
    <Box sx={{ display: "grid", gap: 1.4 }}>
      <Box sx={{ ...panelSx, display: "grid", gap: 0.5 }}>
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
          <Tab label={tabLabelDot("primary.main", "Registro")} />
          <Tab label={tabLabelDot("warning.main", "Cocinar")} />
          <Tab label={tabLabelDot("info.main", "Casino")} />
          <Tab label={tabLabelDot("secondary.main", "Plan")} />
          <Tab label={tabLabelDot("success.main", "Kit")} />
          <Tab label={tabLabelDot("error.main", "Compras")} />
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
          <ShoppingList profileId={profileId} isActive={tab === 5} />
        </Box>
      </Box>
    </Box>
  );
}
