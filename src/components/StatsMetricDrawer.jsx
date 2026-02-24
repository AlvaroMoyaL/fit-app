import { useMemo, useState } from "react";

const AUTO_COMPARE_VALUE = "__auto__";
const CHART_WINDOW_SIZE = 30;

const METRIC_META = {
  weight: {
    label: "Peso",
    unit: "kg",
    related: ["waist", "bodyFat", "sleepHours", "steps"],
    description: "Masa corporal total registrada por fecha.",
  },
  waist: {
    label: "Cintura",
    unit: "cm",
    related: ["weight", "bodyFat", "whtr"],
    description: "Perímetro abdominal en centímetros.",
  },
  hip: {
    label: "Cadera",
    unit: "cm",
    related: ["waist", "whr", "bodyFat"],
    description: "Perímetro de cadera en centímetros.",
  },
  bodyFat: {
    label: "% Grasa",
    unit: "%",
    related: ["weight", "waist", "leanMass"],
    description: "Estimación de porcentaje de grasa corporal.",
  },
  bmi: {
    label: "IMC",
    unit: "",
    related: ["weight", "waist", "whtr"],
    description: "Relación entre peso y altura.",
  },
  whtr: {
    label: "WHtR",
    unit: "",
    related: ["waist", "weight"],
    description: "Relación cintura/altura.",
  },
  whr: {
    label: "WHR",
    unit: "",
    related: ["waist", "hip"],
    description: "Relación cintura/cadera.",
  },
  leanMass: {
    label: "Masa magra",
    unit: "kg",
    related: ["weight", "bodyFat", "ffmi"],
    description: "Estimación de masa libre de grasa.",
  },
  ffmi: {
    label: "FFMI",
    unit: "",
    related: ["leanMass", "weight"],
    description: "Índice de masa libre de grasa ajustado por altura.",
  },
  restHr: {
    label: "FC reposo",
    unit: "bpm",
    related: ["sleepHours", "stress", "hrv"],
    description: "Frecuencia cardiaca en reposo.",
  },
  sleepHours: {
    label: "Sueño",
    unit: "h",
    related: ["restHr", "stress", "steps"],
    description: "Horas dormidas por noche.",
  },
  steps: {
    label: "Pasos",
    unit: "",
    related: ["sleepHours", "weight", "loadRatio"],
    description: "Volumen diario de actividad en pasos.",
  },
  sleepScore: {
    label: "Sleep score",
    unit: "",
    related: ["sleepHours", "readiness", "bodyBattery"],
    description: "Puntaje de calidad y recuperación del sueño.",
  },
  sleepStress: {
    label: "Estrés en sueño",
    unit: "",
    related: ["sleepScore", "sleepHours", "stress"],
    description: "Promedio de estrés durante el periodo de sueño.",
  },
  hrv: {
    label: "HRV",
    unit: "ms",
    related: ["restHr", "sleepHours", "readiness"],
    description: "Variabilidad de la frecuencia cardiaca.",
  },
  bodyBattery: {
    label: "Body Battery",
    unit: "",
    related: ["sleepHours", "stress", "readiness"],
    description: "Estimación de energía disponible.",
  },
  stress: {
    label: "Estrés",
    unit: "",
    related: ["sleepHours", "restHr", "bodyBattery"],
    description: "Indicador de carga fisiológica diaria.",
  },
  spo2: {
    label: "SpO2 promedio",
    unit: "%",
    related: ["respiration", "restHr", "sleepScore"],
    description: "Saturación promedio de oxígeno.",
  },
  respiration: {
    label: "Respiración",
    unit: "rpm",
    related: ["spo2", "sleepHours", "stress"],
    description: "Frecuencia respiratoria promedio.",
  },
  loadRatio: {
    label: "Carga 7d/28d",
    unit: "",
    related: ["steps", "vo2max", "readiness"],
    description: "Relación de carga reciente contra carga base.",
  },
  acuteLoad: {
    label: "Carga aguda",
    unit: "",
    related: ["chronicLoad", "loadRatio", "readiness"],
    description: "Carga reciente de entrenamiento.",
  },
  chronicLoad: {
    label: "Carga crónica",
    unit: "",
    related: ["acuteLoad", "loadRatio", "readiness"],
    description: "Carga de base usada para contextualizar la carga reciente.",
  },
  activeKcal: {
    label: "Kcal activas",
    unit: "kcal",
    related: ["steps", "activeMinutes", "distanceKm"],
    description: "Gasto energético activo diario.",
  },
  totalKcal: {
    label: "Kcal totales",
    unit: "kcal",
    related: ["activeKcal", "steps"],
    description: "Gasto energético total diario estimado.",
  },
  distanceKm: {
    label: "Distancia",
    unit: "km",
    related: ["steps", "activeMinutes", "activeKcal"],
    description: "Distancia total diaria recorrida.",
  },
  activeMinutes: {
    label: "Min activos",
    unit: "min",
    related: ["steps", "activeKcal", "distanceKm"],
    description: "Minutos diarios en actividad.",
  },
  vo2max: {
    label: "VO2 max",
    unit: "",
    related: ["restHr", "loadRatio", "steps"],
    description: "Estimación de capacidad aeróbica.",
  },
  readiness: {
    label: "Readiness",
    unit: "",
    related: ["sleepHours", "hrv", "bodyBattery"],
    description: "Preparación para entrenar según recuperación.",
  },
};

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getSeries(metricsLog, key) {
  if (!Array.isArray(metricsLog) || !key) return [];
  return [...metricsLog]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((entry) => ({ date: entry.date, value: toNum(entry[key]) }))
    .filter((item) => item.value > 0);
}

function buildPairedSeries(aSeries, bSeries) {
  const map = new Map();
  aSeries.forEach((p) => map.set(p.date, { a: p.value, b: 0 }));
  bSeries.forEach((p) => {
    const row = map.get(p.date) || { a: 0, b: 0 };
    row.b = p.value;
    map.set(p.date, row);
  });
  return Array.from(map.values()).filter((r) => r.a > 0 && r.b > 0);
}

function absCorrelation(pairs) {
  if (!pairs || pairs.length < 2) return 0;
  const xs = pairs.map((p) => p.a);
  const ys = pairs.map((p) => p.b);
  const mx = xs.reduce((s, v) => s + v, 0) / xs.length;
  const my = ys.reduce((s, v) => s + v, 0) / ys.length;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < xs.length; i += 1) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  if (!den) return 0;
  return Math.abs(num / den);
}

function getScaleBounds(series) {
  if (!Array.isArray(series) || !series.length) return { min: 0, max: 1, range: 1 };
  const values = series.map((s) => s.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  return { min, max, range };
}

function buildLinePoints(series, bounds, width = 380, height = 180, pad = 14) {
  if (!series.length) return { polyline: "", dots: [] };
  const { min, range } = bounds;
  const stepX = series.length > 1 ? (width - pad * 2) / (series.length - 1) : 0;
  const dots = series.map((s, idx) => {
    const x = pad + idx * stepX;
    const y = height - pad - ((s.value - min) / range) * (height - pad * 2);
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, date: s.date, value: s.value };
  });
  return { polyline: dots.map((p) => `${p.x},${p.y}`).join(" "), dots };
}

function seriesStats(series) {
  if (!Array.isArray(series) || !series.length) return null;
  const values = series.map((s) => s.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return {
    min: Math.round(min * 10) / 10,
    max: Math.round(max * 10) / 10,
    avg: Math.round(avg * 10) / 10,
    last: Math.round(values[values.length - 1] * 10) / 10,
  };
}

function formatValue(value, unit = "") {
  if (!Number.isFinite(value) || value <= 0) return "—";
  const raw = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return unit ? `${raw} ${unit}` : String(raw);
}

function summarizeTrend(delta, unit = "") {
  if (!Number.isFinite(delta) || delta === 0) return "estable respecto al último registro";
  const abs = Math.round(Math.abs(delta) * 10) / 10;
  const val = unit ? `${abs} ${unit}` : `${abs}`;
  return delta > 0 ? `subiendo (+${val})` : `bajando (-${val})`;
}

function evaluateMetric(metricKey, current, recentAvg) {
  if (!Number.isFinite(current) || current <= 0) return "Sin datos suficientes para interpretar.";

  if (metricKey === "sleepHours") {
    if (current < 6) return "Valor bajo para recuperación; intenta acercarte a 7-9 h.";
    if (current <= 9) return "Rango adecuado para recuperación general.";
    return "Valor alto; revisa también cómo te sientes al despertar.";
  }
  if (metricKey === "sleepScore") {
    if (current >= 70) return "Buen nivel de recuperación nocturna.";
    if (current >= 50) return "Nivel intermedio de recuperación.";
    return "Recuperación baja; conviene priorizar descanso.";
  }
  if (metricKey === "readiness") {
    if (current >= 70) return "Buena disposición para cargas exigentes.";
    if (current >= 50) return "Disposición moderada; prioriza carga controlada.";
    return "Disposición baja; mejor sesión suave o recuperación.";
  }
  if (metricKey === "restHr") {
    if (current <= 60) return "FC reposo favorable.";
    if (current <= 70) return "FC reposo media; monitorea tendencia.";
    return "FC reposo elevada para tu registro; vigila descanso y fatiga.";
  }
  if (metricKey === "steps") {
    if (current >= 10000) return "Actividad diaria alta en pasos.";
    if (current >= 6000) return "Actividad diaria moderada.";
    return "Actividad diaria baja en pasos.";
  }
  if (metricKey === "hrv" && Number.isFinite(recentAvg) && recentAvg > 0) {
    if (current >= recentAvg * 1.1) return "HRV por encima de tu media reciente.";
    if (current <= recentAvg * 0.9) return "HRV por debajo de tu media reciente.";
    return "HRV cerca de tu media reciente.";
  }
  return "Lectura útil para seguir tendencia en el tiempo.";
}

function recommendedText(metricKey, recentAvg) {
  if (metricKey === "sleepHours") return "Recomendado: 7-9 h";
  if (metricKey === "sleepScore") return "Recomendado: >= 70";
  if (metricKey === "readiness") return "Recomendado: >= 70 para cargas altas";
  if (metricKey === "restHr") return "Recomendado: estable o a la baja";
  if (metricKey === "steps") return "Recomendado: 8k-10k+ pasos/día";
  if (metricKey === "hrv" && Number.isFinite(recentAvg) && recentAvg > 0) {
    return `Recomendado: mantenerte en torno o por encima de tu media (~${Math.round(
      recentAvg
    )} ms)`;
  }
  return "Recomendado: tendencia estable/mejorando según tu objetivo.";
}

function bmiCategory(bmi) {
  if (!Number.isFinite(bmi) || bmi <= 0) return "";
  if (bmi < 18.5) return "bajo peso";
  if (bmi < 25) return "rango saludable";
  if (bmi < 30) return "sobrepeso";
  return "obesidad";
}

function medicalMessage(metricKey, current, latestRow, delta = 0) {
  if (!Number.isFinite(current) || current <= 0) return "";

  const bmi = Number(latestRow?.bmi || 0);
  const whtr = Number(latestRow?.whtr || 0);

  if (metricKey === "weight") {
    if (bmi >= 30) {
      return "Tu peso actual es elevado para tu estatura (IMC en obesidad). Esto aumenta riesgo cardiometabólico (presión arterial, glucosa y perfil lipídico) y también sobrecarga articular. Si esta tendencia sigue al alza, el impacto acumulado crece. Prioridad práctica: déficit calórico moderado, fuerza regular y más movimiento diario.";
    }
    if (bmi >= 25) {
      return "Tu peso actual está por encima de lo recomendado para tu estatura (IMC en sobrepeso). Mantener este rango durante meses aumenta el riesgo metabólico y suele empeorar recuperación y rendimiento. Objetivo útil: reducir 5-10% de peso de forma progresiva.";
    }
    if (bmi > 0 && bmi < 18.5) {
      return "Tu peso actual está por debajo de lo esperado para tu estatura (IMC bajo). Esto puede comprometer rendimiento, recuperación y reserva energética. Conviene priorizar fuerza, proteína suficiente y progresión nutricional.";
    }
    if (bmi > 0) {
      return "Tu peso actual es compatible con un rango saludable para tu estatura. El foco aquí es mantener estabilidad y buena composición corporal.";
    }
  }

  if (metricKey === "bmi") {
    const cat = bmiCategory(current);
    if (cat === "obesidad") {
      return "Tu IMC indica obesidad, asociado a mayor riesgo de hipertensión, resistencia a la insulina y enfermedad cardiovascular. Reducir peso de forma gradual mejora estos marcadores incluso antes de llegar a rango normal.";
    }
    if (cat === "sobrepeso") {
      return "Tu IMC indica sobrepeso; es una fase donde intervenir temprano tiene alta rentabilidad en salud y rendimiento.";
    }
    if (cat === "bajo peso") {
      return "Tu IMC indica bajo peso; conviene vigilar energía disponible y masa muscular.";
    }
    return "Tu IMC está en rango saludable.";
  }

  if (metricKey === "whtr" || metricKey === "waist") {
    const ratio = metricKey === "whtr" ? current : whtr;
    if (ratio >= 0.6) {
      return "La distribución de grasa abdominal es alta; este patrón aumenta riesgo cardiometabólico aun si el peso total no parece extremo. Reducir cintura suele mejorar riesgo global.";
    }
    if (ratio >= 0.5) {
      return "La grasa abdominal está por encima de lo ideal. Es una señal temprana para ajustar nutrición, fuerza y pasos diarios.";
    }
    if (ratio > 0) {
      return "La relación cintura-altura está en rango favorable.";
    }
  }

  if (metricKey === "restHr") {
    if (current > 70) {
      return "Tu FC de reposo está alta para tu contexto de entrenamiento. Puede reflejar fatiga acumulada, estrés o recuperación incompleta. Si se mantiene elevada varios días, conviene bajar intensidad y priorizar sueño/hidratación.";
    }
    if (current >= 60) {
      return "Tu FC de reposo está en zona intermedia; la tendencia es clave. Si sube respecto a tu base, reduce carga temporalmente.";
    }
    return "Tu FC de reposo está en rango favorable.";
  }

  if (metricKey === "sleepHours") {
    if (current < 6) {
      return "Duermes por debajo de lo recomendado. Esto suele aumentar fatiga, elevar percepción de esfuerzo y reducir capacidad de recuperación. También puede afectar apetito y control del estrés.";
    }
    if (current <= 9) return "Tu duración de sueño está dentro de lo recomendado para recuperación.";
    return "Duración de sueño alta; revisa también calidad y energía diurna.";
  }

  if (metricKey === "sleepScore") {
    if (current < 50) {
      return "Tu recuperación nocturna es baja. Impacto esperado: peor calidad de sesión, menor tolerancia a cargas altas y más riesgo de encadenar fatiga.";
    }
    if (current < 70) return "Recuperación intermedia; hay margen de mejora en hábitos de descanso.";
    return "Tu recuperación nocturna es buena.";
  }

  if (metricKey === "readiness") {
    if (current < 50) {
      return "Tu readiness es baja; forzar alta intensidad hoy eleva riesgo de sobrecarga y mala recuperación posterior. Es mejor sesión suave o descarga activa.";
    }
    if (current < 70) return "Readiness moderada; conviene ajustar intensidad al estado de recuperación.";
    return "Readiness alta; mejor contexto para cargas exigentes.";
  }

  if (metricKey === "bodyBattery") {
    if (current < 30) {
      return "Tu Body Battery está bajo. Esto sugiere energía limitada para sesiones duras y más riesgo de fatiga si fuerzas la carga.";
    }
    if (current < 60) {
      return "Tu Body Battery está en rango medio; entrenar es posible, pero ajustando volumen/intensidad.";
    }
    return "Tu Body Battery es favorable para sostener carga de entrenamiento.";
  }

  if (metricKey === "stress") {
    if (current >= 60) {
      return "Tu estrés diario está alto. Si coincide con mal sueño o FC reposo elevada, aumenta riesgo de fatiga sistémica y bajo rendimiento.";
    }
    if (current >= 40) return "Tu estrés está en rango medio; vigila acumulación semanal.";
    return "Tu estrés está controlado para recuperación.";
  }

  if (metricKey === "hrv") {
    if (delta < 0) {
      return "Tu HRV va a la baja frente a registros recientes; puede ser señal de mayor carga interna o recuperación insuficiente.";
    }
    if (delta > 0) {
      return "Tu HRV mejora respecto a registros previos, señal compatible con mejor recuperación autonómica.";
    }
    return "Tu HRV se mantiene estable respecto a tu base reciente.";
  }

  if (metricKey === "steps") {
    if (current < 5000) {
      return "Tu volumen de pasos es bajo. Mantener niveles bajos de actividad diaria se asocia con mayor riesgo cardiometabólico y peor condición funcional a medio plazo.";
    }
    if (current < 8000) {
      return "Tu volumen de pasos es moderado-bajo. Aumentar actividad diaria puede mejorar sensibilidad a la insulina, gasto energético y salud cardiovascular.";
    }
    if (current < 10000) {
      return "Tu volumen de pasos es adecuado y con beneficio de salud. Mantener consistencia semanal es más importante que picos aislados.";
    }
    return "Tu volumen de pasos es alto y favorable para salud cardiometabólica y control de peso.";
  }

  if (metricKey === "hip") {
    return "La cadera por sí sola se interpreta junto a cintura y peso. Úsala para vigilar distribución de grasa y tendencia de composición corporal.";
  }

  if (metricKey === "bodyFat") {
    if (current >= 35) return "El porcentaje de grasa corporal es alto; esto suele asociarse a mayor riesgo metabólico y menor eficiencia funcional.";
    if (current >= 25) return "El porcentaje de grasa corporal está por encima de un rango atlético/saludable y conviene reducirlo de forma progresiva.";
    if (current < 10) return "El porcentaje de grasa corporal es bajo; conviene vigilar energía disponible, recuperación y estado hormonal.";
    return "El porcentaje de grasa corporal está en un rango funcional favorable.";
  }

  if (metricKey === "whr") {
    if (current >= 1) return "La relación cintura/cadera es alta y sugiere mayor adiposidad central, asociada a mayor riesgo cardiometabólico.";
    if (current >= 0.9) return "La relación cintura/cadera está en rango intermedio-alto; conviene priorizar reducción de cintura.";
    return "La relación cintura/cadera es favorable.";
  }

  if (metricKey === "leanMass") {
    if (delta < 0) return "La masa magra va a la baja; si se mantiene, puede afectar fuerza, metabolismo y salud músculo-esquelética.";
    if (delta > 0) return "La masa magra muestra mejora, señal favorable para rendimiento y salud metabólica.";
    return "La masa magra se mantiene estable.";
  }

  if (metricKey === "ffmi") {
    if (current < 17) return "El FFMI sugiere baja reserva muscular relativa; conviene priorizar fuerza y proteína adecuada.";
    if (current > 23) return "FFMI alto; útil para rendimiento si se sostiene con buena recuperación y salud articular.";
    return "FFMI en rango funcional, con buena base para progresar.";
  }

  if (metricKey === "sleepStress") {
    if (current >= 35) return "El estrés durante el sueño es alto y suele reducir la calidad real de recuperación nocturna.";
    if (current >= 20) return "El estrés nocturno está en rango medio; puede limitar la recuperación si se acumula.";
    return "El estrés durante el sueño está en rango favorable para recuperar.";
  }

  if (metricKey === "spo2") {
    if (current < 92) return "SpO2 baja para reposo. Si se repite con síntomas (fatiga marcada, disnea, cefalea), requiere evaluación médica.";
    if (current < 95) return "SpO2 ligeramente baja; conviene vigilar tendencia, sueño y posibles factores respiratorios.";
    return "SpO2 en rango favorable para oxigenación en reposo.";
  }

  if (metricKey === "respiration") {
    if (current > 18) return "La frecuencia respiratoria está elevada; puede indicar estrés fisiológico, mala recuperación o carga alta.";
    if (current < 10) return "Frecuencia respiratoria baja; interpreta junto a síntomas y contexto de entrenamiento.";
    return "Frecuencia respiratoria en rango habitual de reposo.";
  }

  if (metricKey === "loadRatio") {
    if (current > 1.5) return "La relación de carga está alta; aumenta riesgo de fatiga y de lesión por incremento brusco.";
    if (current < 0.8) return "La relación de carga está baja; útil en descarga, pero sostenida puede reducir adaptación.";
    return "La relación de carga está en zona razonable para progresar con menor riesgo.";
  }

  if (metricKey === "acuteLoad") {
    if (delta > 0) return "La carga aguda viene subiendo; si el aumento es continuo sin recuperación suficiente, sube el riesgo de sobrecarga.";
    return "La carga aguda está estable o bajando, lo que favorece consolidar recuperación.";
  }

  if (metricKey === "chronicLoad") {
    if (current < 100) return "La carga crónica es baja; puede limitar tolerancia futura a sesiones más exigentes.";
    return "La carga crónica aporta base de tolerancia; lo clave es aumentar de forma gradual y sostenida.";
  }

  if (metricKey === "activeKcal") {
    if (current < 250) return "El gasto activo diario es bajo; mantenerlo bajo reduce estímulo cardiometabólico total.";
    if (current < 600) return "El gasto activo es moderado y funcional para salud general.";
    return "El gasto activo es alto; vigila recuperación e ingesta acorde para sostener rendimiento.";
  }

  if (metricKey === "totalKcal") {
    return "El gasto total diario se interpreta junto a peso y actividad: si hay desbalance sostenido entre ingesta y gasto, impacta composición corporal y recuperación.";
  }

  if (metricKey === "distanceKm") {
    if (current < 4) return "La distancia diaria es baja; aumentar volumen aeróbico suave suele mejorar salud cardiovascular.";
    if (current < 8) return "La distancia diaria es moderada y útil para salud general.";
    return "La distancia diaria es alta; combina con recuperación para evitar sobreuso.";
  }

  if (metricKey === "activeMinutes") {
    if (current < 30) return "Minutos activos bajos para el día; subirlos mejora control metabólico y capacidad funcional.";
    if (current < 60) return "Minutos activos en rango aceptable; más consistencia semanal mejora resultados.";
    return "Buen volumen de minutos activos para salud cardiovascular y control de peso.";
  }

  if (metricKey === "vo2max") {
    if (current < 35) return "VO2 max bajo para rendimiento aeróbico; hay margen amplio de mejora con trabajo progresivo.";
    if (current < 45) return "VO2 max intermedio; buen punto para seguir mejorando capacidad aeróbica.";
    return "VO2 max favorable para capacidad cardiorrespiratoria.";
  }

  return "Impacto clínico moderado: usa la tendencia de esta métrica junto a sueño, FC reposo y carga para ajustar riesgo y recuperación.";
}

function coachMessage(metricKey, current, delta = 0) {
  if (!Number.isFinite(current) || current <= 0) return "";

  if (metricKey === "weight" || metricKey === "bmi" || metricKey === "waist" || metricKey === "whtr") {
    return "Coach: mantén constancia semanal. Prioriza fuerza, pasos diarios y un ajuste nutricional sostenible; evita cambios extremos.";
  }
  if (metricKey === "restHr") {
    if (current > 70 || delta > 0) {
      return "Coach: hoy conviene bajar una marcha. Haz sesión técnica o zona 2 suave, hidrátate bien y protege el sueño de esta noche.";
    }
    return "Coach: buen estado para entrenar normal. Mantén calentamiento y progresión controlada.";
  }
  if (metricKey === "sleepHours" || metricKey === "sleepScore") {
    return "Coach: objetivo inmediato, dormir mejor esta semana. Fija hora de corte de pantallas, cena ligera y horario de sueño más estable.";
  }
  if (metricKey === "readiness" || metricKey === "bodyBattery" || metricKey === "hrv" || metricKey === "stress") {
    if (delta < 0 || metricKey === "stress") {
      return "Coach: ajusta carga al estado actual. Menos intensidad hoy, más recuperación activa, respiración y movilidad.";
    }
    return "Coach: puedes sostener una sesión de calidad, pero sin salirte del plan base.";
  }
  if (metricKey === "steps") {
    return "Coach: sube progresivamente tu NEAT (pasos). Sumar bloques cortos caminando durante el día suele ser la vía más sostenible.";
  }
  if (metricKey === "hip" || metricKey === "whr") {
    return "Coach: céntrate en bajar cintura más que peso rápido. Fuerza + pasos + adherencia nutricional te darán mejor cambio corporal.";
  }
  if (metricKey === "bodyFat") {
    return "Coach: objetivo práctico, bajar grasa sin perder músculo. Mantén proteína alta, fuerza 3-4 días y déficit moderado.";
  }
  if (metricKey === "leanMass" || metricKey === "ffmi") {
    return "Coach: prioriza progresión de fuerza, proteína diaria y sueño. Eso protege y mejora tu masa magra.";
  }
  if (metricKey === "sleepStress" || metricKey === "stress") {
    return "Coach: hoy suma recuperación activa: respiración, caminata suave y baja estímulos tarde-noche para dormir mejor.";
  }
  if (metricKey === "spo2" || metricKey === "respiration") {
    return "Coach: mantén trabajo aeróbico base (zona 2) y calidad de sueño; evita picos intensos si te notas fatigado.";
  }
  if (metricKey === "loadRatio" || metricKey === "acuteLoad" || metricKey === "chronicLoad") {
    if (delta > 0) return "Coach: la carga sube; progresa en pasos pequeños y planifica descarga antes de acumular fatiga.";
    return "Coach: buena fase para consolidar técnica y constancia antes de volver a subir carga.";
  }
  if (metricKey === "activeKcal" || metricKey === "totalKcal" || metricKey === "distanceKm" || metricKey === "activeMinutes") {
    return "Coach: usa esta métrica para asegurar movimiento diario real. Lo clave es consistencia semanal, no un solo día alto.";
  }
  if (metricKey === "vo2max") {
    return "Coach: para subir VO2 max combina base aeróbica constante con 1-2 sesiones de intervalos bien dosificados por semana.";
  }
  return "Coach: ajusta intensidad y volumen según tendencia, manteniendo progresión sostenible y recuperación suficiente.";
}

export default function StatsMetricDrawer({
  open,
  onClose,
  metricKey,
  compareKey,
  onChangeCompareKey,
  metricsLog,
}) {
  const [activeTooltip, setActiveTooltip] = useState(null);
  const meta = METRIC_META[metricKey] || { label: metricKey || "Métrica", unit: "", related: [] };
  const primary = useMemo(() => getSeries(metricsLog, metricKey), [metricsLog, metricKey]);

  const compareOptions = useMemo(() => {
    const base = meta.related || [];
    return base.filter((k) => k !== metricKey);
  }, [meta.related, metricKey]);

  const recommendedCompareKey = useMemo(() => {
    if (!primary.length || !compareOptions.length) return "";
    let best = "";
    let bestScore = -1;
    compareOptions.forEach((key) => {
      const candidate = getSeries(metricsLog, key);
      const pairs = buildPairedSeries(primary, candidate);
      if (pairs.length < 2) return;
      const corr = absCorrelation(pairs);
      const score = pairs.length * 10 + corr;
      if (score > bestScore) {
        best = key;
        bestScore = score;
      }
    });
    return best;
  }, [primary, compareOptions, metricsLog]);

  const effectiveCompareKey =
    compareKey === AUTO_COMPARE_VALUE ? recommendedCompareKey || "" : compareKey || "";
  const compare = useMemo(
    () => getSeries(metricsLog, effectiveCompareKey),
    [metricsLog, effectiveCompareKey]
  );
  const compareMeta = METRIC_META[effectiveCompareKey] || null;
  const chartPrimary = useMemo(() => primary.slice(-CHART_WINDOW_SIZE), [primary]);
  const chartCompare = useMemo(() => {
    if (!effectiveCompareKey) return [];
    const dateSet = new Set(chartPrimary.map((p) => p.date));
    return compare.filter((p) => dateSet.has(p.date)).slice(-CHART_WINDOW_SIZE);
  }, [compare, chartPrimary, effectiveCompareKey]);
  const chartPrimaryBounds = useMemo(() => getScaleBounds(chartPrimary), [chartPrimary]);
  const chartCompareBounds = useMemo(() => getScaleBounds(chartCompare), [chartCompare]);
  const primaryPlot = useMemo(
    () => buildLinePoints(chartPrimary, chartPrimaryBounds),
    [chartPrimary, chartPrimaryBounds]
  );
  const comparePlot = useMemo(
    () => buildLinePoints(chartCompare, chartCompareBounds),
    [chartCompare, chartCompareBounds]
  );
  const primaryStats = useMemo(() => seriesStats(chartPrimary), [chartPrimary]);
  const compareStats = useMemo(() => seriesStats(chartCompare), [chartCompare]);

  const primaryCurrent = primary.length ? primary[primary.length - 1].value : 0;
  const primaryPrev = primary.length > 1 ? primary[primary.length - 2].value : 0;
  const primaryDelta = primaryCurrent && primaryPrev ? primaryCurrent - primaryPrev : 0;

  const compareCurrent = compare.length ? compare[compare.length - 1].value : 0;
  const comparePrev = compare.length > 1 ? compare[compare.length - 2].value : 0;
  const compareDelta = compareCurrent && comparePrev ? compareCurrent - comparePrev : 0;

  const latestDates = useMemo(() => {
    const map = new Map();
    primary.forEach((i) => {
      map.set(i.date, { ...(map.get(i.date) || {}), a: i.value });
    });
    compare.forEach((i) => {
      map.set(i.date, { ...(map.get(i.date) || {}), b: i.value });
    });
    return Array.from(map.entries())
      .map(([date, v]) => ({ date, a: v.a || 0, b: v.b || 0 }))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 8);
  }, [primary, compare]);

  const recentAvg = useMemo(() => {
    if (!primary.length) return 0;
    const slice = primary.slice(-7);
    return slice.reduce((sum, row) => sum + row.value, 0) / slice.length;
  }, [primary]);
  const latestRow = useMemo(() => {
    if (!primary.length || !Array.isArray(metricsLog)) return null;
    const date = primary[primary.length - 1]?.date;
    if (!date) return null;
    return metricsLog.find((row) => row?.date === date) || null;
  }, [primary, metricsLog]);
  const interpretation = evaluateMetric(metricKey, primaryCurrent, recentAvg);
  const trendText = summarizeTrend(primaryDelta, meta.unit);
  const recommended = recommendedText(metricKey, recentAvg);
  const medicalText = medicalMessage(metricKey, primaryCurrent, latestRow, primaryDelta);
  const coachText = coachMessage(metricKey, primaryCurrent, primaryDelta);

  return (
    <>
      <div className={`drawer-backdrop ${open ? "is-open" : ""}`} onClick={onClose} />
      <aside className={`drawer stats-drawer ${open ? "is-open" : ""}`}>
        <div className="drawer-head">
          <div>
            <h3>{meta.label}</h3>
            <p className="note">Serie temporal y cruce con otra métrica relacionada.</p>
          </div>
          <div className="drawer-actions">
            <button className="tiny" type="button" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>

        <div className="stats-drawer-controls">
          <label>
            Cruzar con
            <select
              value={compareKey || ""}
              onChange={(e) => onChangeCompareKey(e.target.value)}
            >
              <option value="">Ninguna</option>
              <option value={AUTO_COMPARE_VALUE}>
                {recommendedCompareKey
                  ? `Auto (recomendado: ${METRIC_META[recommendedCompareKey]?.label || recommendedCompareKey})`
                  : "Auto (sin recomendación)"}
              </option>
              {compareOptions.map((key) => (
                <option key={key} value={key}>
                  {METRIC_META[key]?.label || key}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="stats-drawer-summary">
          <div>
            <span>{meta.label}</span>
            <strong>{formatValue(primaryCurrent, meta.unit)}</strong>
            <small>{primaryDelta ? `${primaryDelta > 0 ? "+" : ""}${Math.round(primaryDelta * 10) / 10}` : "sin cambio"}</small>
          </div>
          {effectiveCompareKey && (
            <div>
              <span>{compareMeta?.label || effectiveCompareKey}</span>
              <strong>{formatValue(compareCurrent, compareMeta?.unit || "")}</strong>
              <small>{compareDelta ? `${compareDelta > 0 ? "+" : ""}${Math.round(compareDelta * 10) / 10}` : "sin cambio"}</small>
            </div>
          )}
        </div>

        <div className="stats-drawer-chart">
          {chartPrimary.length < 2 ? (
            <p className="note">No hay suficientes datos para graficar esta métrica.</p>
          ) : (
            <svg viewBox="0 0 380 180" role="img" aria-label={`Tendencia ${meta.label}`}>
              {[0, 1, 2, 3, 4].map((idx) => (
                <line
                  key={`grid-${idx}`}
                  x1="14"
                  y1={14 + idx * 38}
                  x2="366"
                  y2={14 + idx * 38}
                  className="stats-line-grid"
                />
              ))}
              <polyline points={primaryPlot.polyline} className="stats-line-primary" />
              {primaryPlot.dots.map((p) => (
                <circle
                  key={`p-${p.date}`}
                  cx={p.x}
                  cy={p.y}
                  r="2.8"
                  className="stats-dot-primary"
                  onMouseEnter={() =>
                    setActiveTooltip({
                      x: p.x,
                      y: p.y,
                      date: p.date,
                      label: meta.label,
                      value: formatValue(p.value, meta.unit),
                    })
                  }
                  onFocus={() =>
                    setActiveTooltip({
                      x: p.x,
                      y: p.y,
                      date: p.date,
                      label: meta.label,
                      value: formatValue(p.value, meta.unit),
                    })
                  }
                  onMouseLeave={() => setActiveTooltip(null)}
                  onBlur={() => setActiveTooltip(null)}
                >
                  <title>
                    {p.date} · {meta.label}: {formatValue(p.value, meta.unit)}
                  </title>
                </circle>
              ))}
              {chartCompare.length >= 2 && (
                <>
                  <polyline points={comparePlot.polyline} className="stats-line-compare" />
                  {comparePlot.dots.map((p) => (
                    <circle
                      key={`c-${p.date}`}
                      cx={p.x}
                      cy={p.y}
                      r="2.5"
                      className="stats-dot-compare"
                      onMouseEnter={() =>
                        setActiveTooltip({
                          x: p.x,
                          y: p.y,
                          date: p.date,
                          label: compareMeta?.label || effectiveCompareKey,
                          value: formatValue(p.value, compareMeta?.unit || ""),
                        })
                      }
                      onFocus={() =>
                        setActiveTooltip({
                          x: p.x,
                          y: p.y,
                          date: p.date,
                          label: compareMeta?.label || effectiveCompareKey,
                          value: formatValue(p.value, compareMeta?.unit || ""),
                        })
                      }
                      onMouseLeave={() => setActiveTooltip(null)}
                      onBlur={() => setActiveTooltip(null)}
                    >
                      <title>
                        {p.date} · {compareMeta?.label || effectiveCompareKey}:{" "}
                        {formatValue(p.value, compareMeta?.unit || "")}
                      </title>
                    </circle>
                  ))}
                </>
              )}
              {activeTooltip && (
                <g
                  transform={`translate(${Math.max(
                    14,
                    Math.min(246, activeTooltip.x + 10)
                  )},${Math.max(16, activeTooltip.y - 46)})`}
                  className="stats-tooltip"
                >
                  <rect width="120" height="40" rx="6" ry="6" />
                  <text x="8" y="15" className="stats-tooltip-date">
                    {activeTooltip.date}
                  </text>
                  <text x="8" y="30" className="stats-tooltip-value">
                    {activeTooltip.label}: {activeTooltip.value}
                  </text>
                </g>
              )}
            </svg>
          )}
          <div className="stats-drawer-legend">
            <span className="primary-dot">{meta.label}</span>
            {chartCompare.length >= 2 && (
              <span className="compare-dot">{compareMeta?.label || effectiveCompareKey}</span>
            )}
          </div>
          <div className="stats-chart-meta">
            <span>
              Ventana: últimos {chartPrimary.length} registros ({chartPrimary[0]?.date || "—"} a{" "}
              {chartPrimary[chartPrimary.length - 1]?.date || "—"}).
            </span>
            {primaryStats && (
              <span>
                {meta.label}: min {formatValue(primaryStats.min, meta.unit)} · prom{" "}
                {formatValue(primaryStats.avg, meta.unit)} · max {formatValue(primaryStats.max, meta.unit)}
              </span>
            )}
            {compareStats && compareMeta && (
              <span>
                {compareMeta.label}: min {formatValue(compareStats.min, compareMeta.unit || "")} · prom{" "}
                {formatValue(compareStats.avg, compareMeta.unit || "")} · max{" "}
                {formatValue(compareStats.max, compareMeta.unit || "")}
              </span>
            )}
          </div>
          <p className="note">
            Escala visual por serie (cada línea se normaliza para ver tendencia), con valores reales
            resumidos arriba.
          </p>
        </div>

        <div className="stats-drawer-insight">
          <h4>Interpretación</h4>
          <p>
            <strong>Qué mide:</strong> {meta.description || "Indicador de evolución en el tiempo."}
          </p>
          <p>
            <strong>Lectura actual:</strong> {formatValue(primaryCurrent, meta.unit)}. {interpretation}
          </p>
          <p>
            <strong>Estado actual vs recomendado:</strong> Actual{" "}
            {formatValue(primaryCurrent, meta.unit)}. {recommended}
          </p>
          {medicalText && (
            <p>
              <strong>Impacto actual (médico):</strong> {medicalText}
            </p>
          )}
          {coachText && (
            <p>
              <strong>Impacto actual (coach):</strong> {coachText}
            </p>
          )}
          <p>
            <strong>Análisis de tendencia:</strong> {meta.label} está {trendText}.
          </p>
        </div>

        {latestDates.length > 0 && (
          <div className="stats-drawer-table">
            <div className="stats-drawer-table-head">
              <strong>Fecha</strong>
              <strong>{meta.label}</strong>
              <strong>{compareMeta?.label || "Cruce"}</strong>
            </div>
            {latestDates.map((row) => (
              <div className="stats-drawer-table-row" key={row.date}>
                <span>{row.date}</span>
                <span>{formatValue(row.a, meta.unit)}</span>
                <span>{effectiveCompareKey ? formatValue(row.b, compareMeta?.unit || "") : "—"}</span>
              </div>
            ))}
          </div>
        )}
      </aside>
    </>
  );
}
