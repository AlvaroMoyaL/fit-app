import { useMemo } from "react";

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

function buildLinePoints(series, width = 380, height = 180, pad = 14) {
  if (!series.length) return "";
  const values = series.map((s) => s.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const stepX = series.length > 1 ? (width - pad * 2) / (series.length - 1) : 0;
  return series
    .map((s, idx) => {
      const x = pad + idx * stepX;
      const y = height - pad - ((s.value - min) / range) * (height - pad * 2);
      return `${x},${Math.round(y * 10) / 10}`;
    })
    .join(" ");
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

  return "";
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
  return "Coach: usa esta métrica para decidir intensidad diaria y mantener consistencia sin sobrecarga.";
}

export default function StatsMetricDrawer({
  open,
  onClose,
  metricKey,
  compareKey,
  onChangeCompareKey,
  metricsLog,
}) {
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

  const effectiveCompareKey = compareKey || recommendedCompareKey || "";
  const compare = useMemo(
    () => getSeries(metricsLog, effectiveCompareKey),
    [metricsLog, effectiveCompareKey]
  );
  const compareMeta = METRIC_META[effectiveCompareKey] || null;

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
              <option value="">
                {recommendedCompareKey
                  ? `Auto (recomendado: ${METRIC_META[recommendedCompareKey]?.label || recommendedCompareKey})`
                  : "Auto"}
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
          {primary.length < 2 ? (
            <p className="note">No hay suficientes datos para graficar esta métrica.</p>
          ) : (
            <svg viewBox="0 0 380 180" role="img" aria-label={`Tendencia ${meta.label}`}>
              <polyline points={buildLinePoints(primary)} className="stats-line-primary" />
              {compare.length >= 2 && (
                <polyline points={buildLinePoints(compare)} className="stats-line-compare" />
              )}
            </svg>
          )}
          <div className="stats-drawer-legend">
            <span className="primary-dot">{meta.label}</span>
            {compare.length >= 2 && (
              <span className="compare-dot">{compareMeta?.label || effectiveCompareKey}</span>
            )}
          </div>
          <p className="note">El gráfico compara tendencia normalizada por métrica.</p>
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
