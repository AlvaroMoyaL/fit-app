import { useState } from "react";
import { evaluateCasinoOptions } from "../../utils/casinoMealEvaluator";

import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";

export default function CasinoMealEvaluator() {
  const [casinoText, setCasinoText] = useState("");
  const [result, setResult] = useState(null);

  const handleEvaluate = () => {
    const evaluation = evaluateCasinoOptions(casinoText);
    setResult(evaluation);
  };

  const hasNoResults =
    result &&
    !result.bestOption &&
    (!Array.isArray(result.alternatives) || result.alternatives.length === 0) &&
    (!Array.isArray(result.avoid) || result.avoid.length === 0);

  return (
    <Paper sx={{ p: 2.5, width: "100%", boxSizing: "border-box" }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h6">Evaluador de comida de casino</Typography>

        <TextField
          label="Opciones del casino"
          placeholder="lentejas arroz fideos pollo salsa lechuga tomate"
          fullWidth
          multiline
          minRows={3}
          value={casinoText}
          onChange={(event) => setCasinoText(event.target.value)}
        />

        <Button variant="contained" onClick={handleEvaluate} disabled={!casinoText.trim()}>
          Evaluar opciones
        </Button>

        {result && (
          <>
            {hasNoResults ? (
              <Typography variant="body2" color="text.secondary">
                No se pudieron generar combinaciones con esas opciones
              </Typography>
            ) : (
              <>
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Mejor opcion
                  </Typography>
                  <Typography variant="body1" color={result.bestOption ? "text.primary" : "text.secondary"}>
                    {result.bestOption || "Sin opcion recomendada"}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Alternativas
                  </Typography>
                  {Array.isArray(result.alternatives) && result.alternatives.length > 0 ? (
                    <List dense>
                      {result.alternatives.map((item) => (
                        <ListItem key={`alternative-${item}`} disablePadding>
                          <ListItemText primary={item} />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No hay alternativas disponibles.
                    </Typography>
                  )}
                </Box>

                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Evitar
                  </Typography>
                  {Array.isArray(result.avoid) && result.avoid.length > 0 ? (
                    <List dense>
                      {result.avoid.map((item) => (
                        <ListItem key={`avoid-${item}`} disablePadding>
                          <ListItemText primary={item} />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No hay combinaciones a evitar.
                    </Typography>
                  )}
                </Box>
              </>
            )}
          </>
        )}
      </Box>
    </Paper>
  );
}
