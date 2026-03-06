import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
} from "@mui/material";
import { generateCampMealKit } from "../../utils/campMealKit";

export default function CampMealKit() {
  const [days, setDays] = useState(4);
  const [hasFridge, setHasFridge] = useState(false);
  const [includeBreakfast, setIncludeBreakfast] = useState(true);
  const [includeSnacks, setIncludeSnacks] = useState(true);
  const [includeDinner, setIncludeDinner] = useState(true);
  const [kit, setKit] = useState(null);

  const handleGenerate = () => {
    const result = generateCampMealKit({
      days: Number(days || 0),
      hasFridge,
      includeBreakfast,
      includeSnacks,
      includeDinner,
    });
    setKit(result);
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h5">Kit de comida para trabajo</Typography>

          <TextField
            label="Días de trabajo"
            type="number"
            value={days}
            onChange={(event) => setDays(event.target.value)}
            inputProps={{ min: 1, max: 14, step: 1 }}
            fullWidth
          />

          <FormControlLabel
            control={<Switch checked={hasFridge} onChange={(e) => setHasFridge(e.target.checked)} />}
            label="Tengo refrigerador disponible"
          />
          <FormControlLabel
            control={
              <Switch
                checked={includeBreakfast}
                onChange={(e) => setIncludeBreakfast(e.target.checked)}
              />
            }
            label="Incluir desayuno"
          />
          <FormControlLabel
            control={
              <Switch checked={includeSnacks} onChange={(e) => setIncludeSnacks(e.target.checked)} />
            }
            label="Incluir snacks"
          />
          <FormControlLabel
            control={
              <Switch checked={includeDinner} onChange={(e) => setIncludeDinner(e.target.checked)} />
            }
            label="Incluir cena"
          />

          <Box>
            <Button variant="contained" onClick={handleGenerate}>
              Generar kit de comida
            </Button>
          </Box>

          {kit && (
            <Stack spacing={2}>
              <Divider />

              <Box>
                <Typography variant="h6">Plan de comidas</Typography>
                <Stack spacing={1.2} sx={{ mt: 1 }}>
                  {(kit?.mealPlan?.days || []).map((dayItem, index) => (
                    <Box key={`kit-day-${dayItem.day}-${index}`}>
                      <Typography variant="h6">Día {dayItem.day}</Typography>

                      {dayItem.breakfast && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Desayuno
                          </Typography>
                          <Typography variant="body1">{dayItem.breakfast.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Saciedad: {dayItem.breakfast.satietyLevel || "—"}
                          </Typography>
                        </Box>
                      )}

                      {dayItem.snack && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Snack
                          </Typography>
                          <Typography variant="body1">{dayItem.snack.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Saciedad: {dayItem.snack.satietyLevel || "—"}
                          </Typography>
                        </Box>
                      )}

                      {dayItem.dinner && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Cena
                          </Typography>
                          <Typography variant="body1">{dayItem.dinner.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Saciedad: {dayItem.dinner.satietyLevel || "—"}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6">Lista de alimentos</Typography>
                <Stack spacing={0.6} sx={{ mt: 1 }}>
                  {(kit?.shoppingList || []).map((item) => (
                    <Typography key={`shopping-${item.food}`} variant="body1">
                      {item.food} × {item.quantity}
                    </Typography>
                  ))}
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6">Preparación antes de salir</Typography>
                <Stack spacing={0.6} sx={{ mt: 1 }}>
                  {(kit?.prepSuggestions || []).map((suggestion, index) => (
                    <Typography key={`prep-${index}`} variant="body1">
                      • {suggestion}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
