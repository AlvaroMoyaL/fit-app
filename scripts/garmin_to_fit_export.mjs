import fs from "node:fs";
import path from "node:path";

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function toNumber(value, decimals = null) {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  if (decimals === null) return n;
  return Number(n.toFixed(decimals));
}

function toDateKeyLoose(value) {
  const s = String(value || "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{8}$/.test(s)) {
    const key = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return key;
  }
  const n = Number(value);
  if (Number.isFinite(n)) {
    const ts = Math.abs(n) < 1e11 ? n * 1000 : n;
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    if (y >= 2000 && y <= 2100) return `${y}-${m}-${day}`;
  }
  return "";
}

function upsertByDate(map, date, patch) {
  if (!date) return;
  const prev = map.get(date) || { date };
  map.set(date, { ...prev, ...patch });
}

function main() {
  const inputDir = process.argv[2];
  const outputFile = process.argv[3] || path.resolve(process.cwd(), "garmin-fit-export.json");

  if (!inputDir) {
    console.error("Uso: node scripts/garmin_to_fit_export.mjs <carpeta_export_garmin> [salida.json]");
    process.exit(1);
  }

  const files = walk(inputDir).filter((f) => f.toLowerCase().endsWith(".json"));
  const byDate = new Map();

  for (const file of files) {
    const base = path.basename(file);
    const data = readJson(file);
    if (!Array.isArray(data) || data.length === 0) continue;

    if (base.includes("sleepData")) {
      for (const row of data) {
        const date = row?.calendarDate;
        if (!date) continue;
        const deep = toNumber(row.deepSleepSeconds, 0) || 0;
        const light = toNumber(row.lightSleepSeconds, 0) || 0;
        const rem = toNumber(row.remSleepSeconds, 0) || 0;
        const sleepHours = toNumber((deep + light + rem) / 3600, 1);
        const sleepScore = toNumber(row?.sleepScores?.overallScore, 0);
        const sleepStress = toNumber(row?.avgSleepStress, 0);
        const spo2 = toNumber(row?.spo2SleepSummary?.averageSPO2, 1);
        const respiration = toNumber(row?.averageRespiration, 1);
        const patch = {};
        if (sleepHours !== undefined) patch.sleepHours = sleepHours;
        if (sleepScore !== undefined) patch.sleepScore = sleepScore;
        if (sleepStress !== undefined) patch.sleepStress = sleepStress;
        if (spo2 !== undefined) patch.spo2 = spo2;
        if (respiration !== undefined) patch.respiration = respiration;
        if (Object.keys(patch).length) upsertByDate(byDate, date, patch);
      }
      continue;
    }

    if (base.includes("UDSFile_")) {
      for (const row of data) {
        const date = row?.calendarDate;
        if (!date) continue;
        const steps = toNumber(row.totalSteps, 0);
        const restHr = toNumber(row.currentDayRestingHeartRate ?? row.restingHeartRate, 0);
        const bbStats = Array.isArray(row?.bodyBattery?.bodyBatteryStatList)
          ? row.bodyBattery.bodyBatteryStatList
          : [];
        const byType = Object.fromEntries(
          bbStats
            .filter((s) => s?.bodyBatteryStatType)
            .map((s) => [String(s.bodyBatteryStatType).toUpperCase(), s])
        );
        const bodyBattery =
          toNumber(byType.DURINGSLEEP?.statsValue, 0) ??
          toNumber(byType.ENDOFDAY?.statsValue, 0) ??
          toNumber(byType.MOSTRECENT?.statsValue, 0);

        let sleepHours;
        const sleepStart = byType.SLEEPSTART?.statTimestamp;
        const sleepEnd = byType.SLEEPEND?.statTimestamp;
        if (sleepStart && sleepEnd) {
          const h = (Date.parse(sleepEnd) - Date.parse(sleepStart)) / 36e5;
          sleepHours = toNumber(h, 1);
          if (!Number.isFinite(sleepHours) || sleepHours <= 0 || sleepHours > 18) {
            sleepHours = undefined;
          }
        }
        const stressTotal = Array.isArray(row?.allDayStress?.aggregatorList)
          ? row.allDayStress.aggregatorList.find(
              (a) => String(a?.type || "").toUpperCase() === "TOTAL"
            )
          : null;
        const stress = toNumber(stressTotal?.averageStressLevel, 0);
        const spo2 = toNumber(row?.averageSpo2Value, 1);
        const respiration = toNumber(row?.respiration?.avgWakingRespirationValue, 1);
        const activeKcal = toNumber(row?.activeKilocalories, 0);
        const totalKcal = toNumber(row?.totalKilocalories, 0);
        const distanceKm = toNumber(Number(row?.totalDistanceMeters || 0) / 1000, 2);
        const activeMinutes = toNumber(
          (Number(row?.highlyActiveSeconds || 0) + Number(row?.activeSeconds || 0)) / 60,
          0
        );
        const patch = {};
        if (steps !== undefined) patch.steps = steps;
        if (restHr !== undefined) patch.restHr = restHr;
        if (sleepHours !== undefined) patch.sleepHours = sleepHours;
        if (bodyBattery !== undefined) patch.bodyBattery = bodyBattery;
        if (stress !== undefined) patch.stress = stress;
        if (spo2 !== undefined) patch.spo2 = spo2;
        if (respiration !== undefined) patch.respiration = respiration;
        if (activeKcal !== undefined) patch.activeKcal = activeKcal;
        if (totalKcal !== undefined) patch.totalKcal = totalKcal;
        if (distanceKm !== undefined) patch.distanceKm = distanceKm;
        if (activeMinutes !== undefined) patch.activeMinutes = activeMinutes;
        if (Object.keys(patch).length) upsertByDate(byDate, date, patch);
      }
      continue;
    }

    if (base.includes("healthStatusData")) {
      for (const row of data) {
        const date = row?.calendarDate;
        if (!date || !Array.isArray(row.metrics)) continue;
        const metricByType = Object.fromEntries(
          row.metrics
            .filter((m) => m?.type)
            .map((m) => [String(m.type).toUpperCase(), m.value])
        );
        const patch = {};
        const hrv = toNumber(metricByType.HRV, 0);
        const spo2 = toNumber(metricByType.SPO2, 1);
        const respiration = toNumber(metricByType.RESPIRATION, 1);
        if (hrv !== undefined) patch.hrv = hrv;
        if (spo2 !== undefined) patch.spo2 = spo2;
        if (respiration !== undefined) patch.respiration = respiration;
        if (Object.keys(patch).length) upsertByDate(byDate, date, patch);
      }
      continue;
    }

    if (base.includes("TrainingReadinessDTO")) {
      const perDate = new Map();
      for (const row of data) {
        const date = row?.calendarDate;
        if (!date) continue;
        const prev = perDate.get(date);
        const currTs = Date.parse(row?.timestampLocal || row?.timestamp || "");
        const prevTs = prev ? Date.parse(prev?.timestampLocal || prev?.timestamp || "") : -Infinity;
        const rowHasSleep = !!row?.validSleep;
        const prevHasSleep = !!prev?.validSleep;
        const shouldTake =
          !prev ||
          (rowHasSleep && !prevHasSleep) ||
          (rowHasSleep === prevHasSleep && currTs >= prevTs);
        if (shouldTake) perDate.set(date, row);
      }
      for (const [date, row] of perDate.entries()) {
        const readiness = toNumber(row.score, 0);
        const sleepScore = toNumber(row.sleepScore, 0);
        const acuteLoad = toNumber(row.acuteLoad, 0);
        const patch = {};
        if (readiness !== undefined) patch.readiness = readiness;
        if (sleepScore !== undefined) patch.sleepScore = sleepScore;
        if (acuteLoad !== undefined) patch.acuteLoad = acuteLoad;
        if (Object.keys(patch).length) upsertByDate(byDate, date, patch);
      }
      continue;
    }

    if (base.includes("MetricsAcuteTrainingLoad_")) {
      for (const row of data) {
        const date = toDateKeyLoose(row?.calendarDate);
        if (!date) continue;
        const patch = {
          loadRatio: toNumber(row?.dailyAcuteChronicWorkloadRatio, 2),
          acuteLoad: toNumber(row?.dailyTrainingLoadAcute, 0),
          chronicLoad: toNumber(row?.dailyTrainingLoadChronic, 0),
        };
        upsertByDate(byDate, date, patch);
      }
      continue;
    }

    if (base.includes("fitnessAgeData")) {
      for (const row of data) {
        const date = toDateKeyLoose(String(row?.asOfDateGmt || "").slice(0, 10));
        if (!date) continue;
        const vo2max = toNumber(row?.biometricVo2Max, 1);
        if (vo2max !== undefined) upsertByDate(byDate, date, { vo2max });
      }
      continue;
    }

    if (base.includes("summarizedActivities")) {
      const rows =
        Array.isArray(data) && data[0] && Array.isArray(data[0]?.summarizedActivitiesExport)
          ? data[0].summarizedActivitiesExport
          : [];
      const byDay = new Map();
      for (const row of rows) {
        const date = toDateKeyLoose(String(row?.startTimeLocal || row?.startTimeGmt || "").slice(0, 10));
        if (!date) continue;
        const prev = byDay.get(date) || { activeMinutes: 0, activeKcal: 0, distanceKm: 0 };
        prev.activeMinutes += Number(row?.movingDuration || row?.duration || 0) / 60;
        prev.activeKcal += Number(row?.calories || 0);
        prev.distanceKm += Number(row?.distance || 0) / 1000;
        byDay.set(date, prev);
      }
      for (const [date, row] of byDay.entries()) {
        upsertByDate(byDate, date, {
          activeMinutes: toNumber(row.activeMinutes, 0),
          activeKcal: toNumber(row.activeKcal, 0),
          distanceKm: toNumber(row.distanceKm, 2),
        });
      }
    }
  }

  const metricsLog = [...byDate.values()]
    .filter((e) => Object.keys(e).length > 1)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const payload = {
    metricsLog: JSON.stringify(metricsLog),
  };

  fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2), "utf8");

  const firstDate = metricsLog[0]?.date || "-";
  const lastDate = metricsLog[metricsLog.length - 1]?.date || "-";
  console.log(`Generado: ${outputFile}`);
  console.log(`Entradas: ${metricsLog.length} | rango: ${firstDate} -> ${lastDate}`);
}

main();
