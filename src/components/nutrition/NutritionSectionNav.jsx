import { Box, Button, Typography } from "@mui/material";

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
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 1.2,
        p: { xs: 0.95, md: 1.1 },
        borderRadius: { xs: 3, md: 3.5 },
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "rgba(255,255,255,0.74)",
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
        backdropFilter: "blur(14px)",
        position: { xs: "sticky", md: "static" },
        top: { xs: 10, md: "auto" },
        zIndex: { xs: 8, md: "auto" },
      }}
    >
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
      <Box
        sx={{
          display: { xs: "flex", sm: "grid" },
          gridTemplateColumns: {
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
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
              variant={isActive ? "contained" : "text"}
              color={isActive ? "primary" : "inherit"}
              onClick={() => onChangeSection && onChangeSection(item.key)}
              sx={{
                flex: { xs: "0 0 auto", sm: "1 1 auto" },
                minWidth: { xs: 148, sm: 0 },
                minHeight: 52,
                px: 1.5,
                py: 1.1,
                borderRadius: 3,
                justifyContent: "flex-start",
                textAlign: "left",
                whiteSpace: { xs: "nowrap", sm: "normal" },
                textTransform: "none",
                fontWeight: 700,
                lineHeight: 1.2,
                fontSize: { xs: "0.92rem", sm: "0.95rem" },
                border: isActive ? "1px solid transparent" : "1px solid rgba(15,23,42,0.08)",
                bgcolor: isActive ? "primary.main" : "rgba(255,255,255,0.72)",
                color: isActive ? "primary.contrastText" : "text.primary",
                boxShadow: isActive
                  ? "0 14px 30px rgba(15, 118, 110, 0.22)"
                  : "0 8px 18px rgba(15, 23, 42, 0.04)",
                "&:hover": {
                  bgcolor: isActive ? "primary.dark" : "rgba(255,255,255,0.94)",
                  borderColor: isActive ? "transparent" : "rgba(15,23,42,0.14)",
                },
              }}
            >
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                {item.label}
              </Box>
              <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
                {item.shortLabel}
              </Box>
            </Button>
          );
        })}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
        {note}
      </Typography>
    </Box>
  );
}
