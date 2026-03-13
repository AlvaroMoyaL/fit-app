import { Box, Button, Typography } from "@mui/material";

const SECTION_ITEMS = [
  { key: "registro", label: "Registro" },
  { key: "estado", label: "Estado diario" },
  { key: "plan", label: "Planificación" },
  { key: "work", label: "Nutrición en el trabajo" },
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
        p: { xs: 1, md: 1.1 },
        borderRadius: 3.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "rgba(255,255,255,0.74)",
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
        backdropFilter: "blur(14px)",
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
        <Typography variant="caption" color="text.secondary">
          Cambia de sección sin volver al panel lateral.
        </Typography>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
          gap: 1,
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
                minHeight: 52,
                px: 1.5,
                py: 1.1,
                borderRadius: 3,
                justifyContent: "flex-start",
                textAlign: "left",
                textTransform: "none",
                fontWeight: 700,
                lineHeight: 1.2,
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
              {item.label}
            </Button>
          );
        })}
      </Box>
      <Typography variant="caption" color="text.secondary">
        {note}
      </Typography>
    </Box>
  );
}
