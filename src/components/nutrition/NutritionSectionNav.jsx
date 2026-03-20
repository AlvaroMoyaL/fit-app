import { Box, Button, Typography } from "@mui/material";
import { nutritionNavButtonSx, nutritionTabsRailSx } from "./nutritionUi";

const SECTION_ITEMS = [
  { key: "registro", label: "Registro", shortLabel: "Registro" },
  { key: "estado", label: "Estado diario", shortLabel: "Estado" },
  { key: "plan", label: "Planificación", shortLabel: "Plan" },
  { key: "work", label: "Nutrición en el trabajo", shortLabel: "Trabajo" },
];

export default function NutritionSectionNav({
  activeSection = "estado",
  onChangeSection,
  note = "Orden sugerido: registro rápido, revisión del balance y luego planificación semanal.",
  showHeader = true,
  showNote = true,
  compact = false,
}) {
  return (
    <Box
      sx={(theme) => ({
        ...nutritionTabsRailSx(theme),
        display: "grid",
        gap: 1.2,
        p: { xs: 0.95, md: 1.05 },
        position: { xs: "sticky", md: "static" },
        top: { xs: 10, md: "auto" },
        zIndex: { xs: 8, md: "auto" },
      })}
    >
      {showHeader ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography
            variant="overline"
            sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: "0.12em" }}
          >
            Navegación nutricional
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
            Cambia de sección sin volver al panel lateral.
          </Typography>
        </Box>
      ) : null}
      <Box
        sx={{
          display: { xs: "flex", sm: "grid" },
          gridTemplateColumns: {
            sm: compact ? "1fr" : "repeat(2, minmax(0, 1fr))",
            lg: compact ? "1fr" : "repeat(4, minmax(0, 1fr))",
          },
          gap: 1,
          overflowX: { xs: "auto", sm: "visible" },
          pb: { xs: 0.2, sm: 0 },
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {SECTION_ITEMS.map((item) => {
          const isActive = activeSection === item.key;
          return (
            <Button
              key={item.key}
              type="button"
              variant="text"
              color="inherit"
              onClick={() => onChangeSection && onChangeSection(item.key)}
              sx={(theme) =>
                nutritionNavButtonSx(theme, isActive, compact
                  ? {
                      mobileMinWidth: 128,
                      minHeight: 48,
                      px: 1.2,
                      py: 0.95,
                      mobileFontSize: "0.88rem",
                      desktopFontSize: "0.88rem",
                    }
                  : {})
              }
            >
              <Box component="span" className="nutrition-nav-button-label" sx={{ display: { xs: "none", sm: "inline" } }}>
                {compact ? item.shortLabel : item.label}
              </Box>
              <Box component="span" className="nutrition-nav-button-label" sx={{ display: { xs: "inline", sm: "none" } }}>
                {item.shortLabel}
              </Box>
            </Button>
          );
        })}
      </Box>
      {showNote ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
          {note}
        </Typography>
      ) : null}
    </Box>
  );
}
