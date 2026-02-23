import "./index.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  actividad,
  buildExercises,
  calculateMetrics,
  fetchGifMeta,
  generatePlan,
  niveles,
  PLAN_TEMPLATES,
} from "./utils/plan";
import ProfileForm from "./components/ProfileForm";
import MetricsInfoModal from "./components/MetricsInfoModal";
import Plan from "./components/Plan";
import ExerciseDrawer from "./components/ExerciseDrawer";
import Sidebar from "./components/Sidebar";
import HistoryWeek from "./components/HistoryWeek";
import SessionRunner from "./components/SessionRunner";
import MuscleSummary from "./components/MuscleSummary";
import WeeklyCharts from "./components/WeeklyCharts";
import MetricsLogForm from "./components/MetricsLogForm";
import MetricsCharts from "./components/MetricsCharts";
import StatsMetricDrawer from "./components/StatsMetricDrawer";
import { getLevelProgress } from "./utils/levelProgress";
import {
  countExercises,
  countGifs,
  getAllExercises,
  getAllGifs,
  getGif,
  getMeta,
  setMeta,
  upsertExercises,
  upsertGif,
} from "./utils/idb";
import { supabase } from "./utils/supabaseClient";
import { applyCloudPayload, downloadCloud, uploadCloud } from "./utils/cloudSync";

const PROFILE_LIST_KEY = "fit_profiles";
const ACTIVE_PROFILE_KEY = "fit_active_profile";
const DB_COMPLETE_KEY = "exercises_complete";
const GIFS_COMPLETE_KEY = "gifs_complete";
const LOCAL_SYNC_KEY = "fit_last_local_change";
const AUTO_BACKUP_KEY = "fit_backup_auto";
const AUTO_BACKUP_PREV_KEY = "fit_backup_auto_prev";
const SYNC_RELOAD_GUARD_KEY = "fit_sync_reload_guard";
const LAST_SYNC_RESTORE_KEY = "fit_last_sync_restore_summary";

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function computeDerivedMetrics(entry, profile) {
  const heightCm = toNum(profile?.altura);
  const heightM = heightCm ? heightCm / 100 : 0;
  const weight = toNum(entry.weight);
  const waist = toNum(entry.waist);
  const hip = toNum(entry.hip) || toNum(profile?.cadera);
  const neck = toNum(entry.neck) || toNum(profile?.cuello);
  const sex = profile?.sexo || "Hombre";

  const bmi = heightM ? weight / (heightM * heightM) : 0;
  const whtr = heightCm ? waist / heightCm : 0;
  const whr = hip ? waist / hip : 0;

  let bodyFatNavy = 0;
  if (heightCm && waist && neck && sex === "Hombre") {
    bodyFatNavy =
      86.010 * Math.log10(waist - neck) -
      70.041 * Math.log10(heightCm) +
      36.76;
  }
  if (heightCm && waist && neck && hip && sex === "Mujer") {
    bodyFatNavy =
      163.205 * Math.log10(waist + hip - neck) -
      97.684 * Math.log10(heightCm) -
      78.387;
  }

  const bodyFat = bodyFatNavy || toNum(entry.bodyFat);
  const leanMass = bodyFat ? weight * (1 - bodyFat / 100) : 0;
  const ffmi = heightM ? leanMass / (heightM * heightM) : 0;

  return {
    bmi,
    whtr,
    whr,
    bodyFatNavy: bodyFatNavy ? Number(bodyFatNavy.toFixed(1)) : 0,
    leanMass: leanMass ? Number(leanMass.toFixed(1)) : 0,
    ffmi: ffmi ? Number(ffmi.toFixed(1)) : 0,
  };
}

const initialForm = {
  nombre: "",
  edad: "",
  sexo: "Hombre",
  peso: "",
  altura: "",
  cintura: "",
  cadera: "",
  cuello: "",
  nivel: "Media",
  actividadFactor: "1.55",
  objetivo: "Salud",
  planTemplate: "goal",
  trainDays: [0, 1, 2, 3, 4],
  reminderEnabled: false,
  reminderTime: "19:00",
  weeklyXpGoal: 600,
  weeklyMinutesGoal: 90,
};

function profileKeys(id) {
  return {
    profile: `fit_profile:${id}`,
    plan: `fit_plan:${id}`,
    progress: `fit_progress:${id}`,
    progressDetails: `fit_progress_details:${id}`,
    history: `fit_history:${id}`,
    metricsLog: `fit_metrics_log:${id}`,
    lang: `fit_lang:${id}`,
  };
}

function makeProfileId() {
  return `p_${Date.now().toString(36)}`;
}

function computeAdjustDelta(history, form) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  const keyFrom = start.toISOString().slice(0, 10);
  let xp = 0;
  let minutes = 0;
  Object.keys(history || {}).forEach((key) => {
    if (key < keyFrom) return;
    const items = history[key]?.items || [];
    items.forEach((it) => {
      xp += it.xp || 0;
      if (it.type === "time") minutes += (it.workSec || 0) / 60;
      if (it.type === "reps") {
        const reps = (it.repsBySet || []).reduce((a, b) => a + b, 0);
        minutes += (reps * 3) / 60;
      }
    });
  });
  const xpGoal = Number(form.weeklyXpGoal || 0);
  const minGoal = Number(form.weeklyMinutesGoal || 0);
  const xpRatio = xpGoal ? xp / xpGoal : 0;
  const minRatio = minGoal ? minutes / minGoal : 0;
  const avg = xpRatio * 0.55 + minRatio * 0.45;
  if (avg >= 1.25) return 1;
  if (avg <= 0.55) return -1;
  return 0;
}

function safeParseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const [y, m, d] = value.split("-").map(Number);
  return (
    date.getFullYear() === y &&
    date.getMonth() + 1 === m &&
    date.getDate() === d
  );
}

function countHistoryItems(history) {
  return Object.values(history || {}).reduce((sum, day) => {
    const items = Array.isArray(day?.items) ? day.items : [];
    return sum + items.filter((it) => it?.type !== "replace").length;
  }, 0);
}

function countTrainedDays(history) {
  return Object.values(history || {}).reduce((sum, day) => {
    const items = Array.isArray(day?.items) ? day.items : [];
    const trained = items.some((it) => it?.type !== "replace");
    return sum + (trained ? 1 : 0);
  }, 0);
}

function computeTrainingStreak(history) {
  const trainedDates = new Set(
    Object.entries(history || {})
      .filter(([, day]) =>
        Array.isArray(day?.items) ? day.items.some((it) => it?.type !== "replace") : false
      )
      .map(([date]) => date)
  );
  if (trainedDates.size === 0) return 0;

  const cursor = new Date();
  let streak = 0;
  for (;;) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (trainedDates.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (streak === 0) {
      cursor.setDate(cursor.getDate() - 1);
      const prevKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(cursor.getDate()).padStart(2, "0")}`;
      if (trainedDates.has(prevKey)) {
        streak = 1;
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
    }
    break;
  }
  return streak;
}

function countTrainedDaysThisMonth(history) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return Object.entries(history || {}).reduce((sum, [date, day]) => {
    const items = Array.isArray(day?.items) ? day.items : [];
    if (!items.some((it) => it?.type !== "replace")) return sum;
    const [y, m] = String(date).split("-").map(Number);
    if (y === year && m === month) return sum + 1;
    return sum;
  }, 0);
}

function countHistoryXp(history) {
  return Object.values(history || {}).reduce((sum, day) => {
    const items = Array.isArray(day?.items) ? day.items : [];
    return (
      sum +
      items.reduce((acc, it) => {
        if (it?.type === "replace") return acc;
        return acc + Number(it?.xp || 0);
      }, 0)
    );
  }, 0);
}

function buildPlanCompletionKeySet(plan, completed, getExerciseKey) {
  const set = new Set();
  if (!plan) return set;
  (plan.days || []).forEach((d) => {
    (d.exercises || []).forEach((ex) => {
      const key = getExerciseKey(d.title, ex);
      if (completed?.[key]) {
        set.add(`${d.title}::${String(ex.name || ex.name_es || ex.name_en || "").toLowerCase()}`);
      }
    });
  });
  return set;
}

function countHistoryXpExcludingPlanCompleted(history, completedSet) {
  return Object.values(history || {}).reduce((sum, day) => {
    const items = Array.isArray(day?.items) ? day.items : [];
    return (
      sum +
      items.reduce((acc, it) => {
        if (it?.type === "replace") return acc;
        const key = `${it?.dayTitle || ""}::${String(
          it?.name || it?.name_es || it?.name_en || ""
        ).toLowerCase()}`;
        if (completedSet.has(key)) return acc;
        return acc + Number(it?.xp || 0);
      }, 0)
    );
  }, 0);
}

function computeProgressScore({ progress, history, metricsLog }) {
  const completedCount = Object.values(progress || {}).filter(Boolean).length;
  const historyCount = countHistoryItems(history);
  const metricsCount = Array.isArray(metricsLog) ? metricsLog.length : 0;
  return completedCount + historyCount * 10 + metricsCount * 3;
}

function getLocalProfileSyncScore(profileId) {
  if (!profileId) return 0;
  const keys = profileKeys(profileId);
  const progress = safeParseJson(localStorage.getItem(keys.progress), {});
  const history = safeParseJson(localStorage.getItem(keys.history), {});
  const metricsLog = safeParseJson(localStorage.getItem(keys.metricsLog), []);
  return computeProgressScore({ progress, history, metricsLog });
}

function getCloudProfileSyncScore(payload, profileId) {
  if (!payload || !profileId) return 0;
  const block = payload?.dataByProfile?.[profileId];
  if (!block) return 0;
  const progress = safeParseJson(block.progress, {});
  const history = safeParseJson(block.history, {});
  const metricsLog = safeParseJson(block.metricsLog, []);
  return computeProgressScore({ progress, history, metricsLog });
}

function getLocalAppSyncScore() {
  const profiles = safeParseJson(localStorage.getItem(PROFILE_LIST_KEY), []);
  if (!Array.isArray(profiles) || profiles.length === 0) return 0;
  return profiles.reduce((sum, p) => sum + getLocalProfileSyncScore(p.id), 0);
}

function getCloudAppSyncScore(payload) {
  if (!payload) return 0;
  const ids = Array.isArray(payload.profiles)
    ? payload.profiles.map((p) => p.id).filter(Boolean)
    : Object.keys(payload.dataByProfile || {});
  return ids.reduce((sum, id) => sum + getCloudProfileSyncScore(payload, id), 0);
}

function summarizeCloudPayload(payload) {
  if (!payload) return { profiles: 0, metrics: 0 };
  const ids = Array.isArray(payload.profiles) && payload.profiles.length
    ? payload.profiles.map((p) => p.id).filter(Boolean)
    : Object.keys(payload.dataByProfile || {});
  const metrics = ids.reduce((sum, id) => {
    const block = payload?.dataByProfile?.[id] || {};
    const log = safeParseJson(block.metricsLog ?? block.metrics, []);
    return sum + (Array.isArray(log) ? log.length : 0);
  }, 0);
  return { profiles: ids.length, metrics };
}

function reloadAfterSyncOnce() {
  try {
    if (sessionStorage.getItem(SYNC_RELOAD_GUARD_KEY) === "1") return false;
    sessionStorage.setItem(SYNC_RELOAD_GUARD_KEY, "1");
  } catch {
    // ignore
  }
  window.location.reload();
  return true;
}

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [newProfileName, setNewProfileName] = useState("");
  const [renameProfileName, setRenameProfileName] = useState("");
  const [sidebarTab, setSidebarTab] = useState("profile");
  const [lang, setLang] = useState("es");
  const [sessionDayIndex, setSessionDayIndex] = useState(null);
  const [sessionExIndex, setSessionExIndex] = useState(0);
  const [sessionCustomDay, setSessionCustomDay] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [showInfo, setShowInfo] = useState(false);
  const [plan, setPlan] = useState(null);
  const [exercisePool, setExercisePool] = useState([]);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [error, setError] = useState("");
  const [detailEx, setDetailEx] = useState(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [completed, setCompleted] = useState({});
  const [completedDetails, setCompletedDetails] = useState({});
  const [history, setHistory] = useState({});
  const [metricsLog, setMetricsLog] = useState([]);
  const [progressReady, setProgressReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const hydratedPlanRef = useRef(null);
  const [gifsLoading, setGifsLoading] = useState(false);
  const [lastReminderDate, setLastReminderDate] = useState("");
  const [reminderPrompt, setReminderPrompt] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authForm, setAuthForm] = useState(() => ({
    email: localStorage.getItem("fit_auth_email") || "",
    password: "",
  }));
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [lastSyncRestoreSummary, setLastSyncRestoreSummary] = useState(
    () => localStorage.getItem(LAST_SYNC_RESTORE_KEY) || ""
  );
  const authEnabled = Boolean(supabase);
  const [localChangeTick, setLocalChangeTick] = useState(0);
  const lastAutoSyncRef = useRef(0);
  const initialSyncRef = useRef(false);
  const [canUploadSync, setCanUploadSync] = useState(false);
  const hydratingProfileRef = useRef(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [selectedPlanDayIndex, setSelectedPlanDayIndex] = useState(0);
  const [garminFiles, setGarminFiles] = useState([]);
  const [garminImportNote, setGarminImportNote] = useState("");
  const [statsDrawer, setStatsDrawer] = useState({
    open: false,
    metricKey: "weight",
    compareKey: "waist",
  });
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem("fit_high_contrast") === "1";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const touchLocalChange = () => {
    localStorage.setItem(LOCAL_SYNC_KEY, new Date().toISOString());
    setLocalChangeTick((t) => t + 1);
  };
  const [dbStatus, setDbStatus] = useState({
    state: "idle",
    downloaded: 0,
    total: 0,
    error: "",
    localCount: 0,
  });
  const dbDownloadRef = useRef({ running: false, resumeTimer: null });
  const [gifStatus, setGifStatus] = useState({
    state: "idle",
    downloaded: 0,
    total: 0,
    error: "",
    localCount: 0,
  });
  const gifDownloadRef = useRef({ running: false, resumeTimer: null });
  const planRef = useRef(null);
  const quietUpdateRef = useRef({ timer: null });
  const gifPlanKeyRef = useRef("");
  const gifLocalHydrateRef = useRef("");
  const backupTimerRef = useRef(null);
  const supabaseGifBase =
    (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "") || "";
  const supabaseGifBucket = import.meta.env.VITE_SUPABASE_GIF_BUCKET || "gifs";

  const metrics = useMemo(() => calculateMetrics(form), [form]);
  const activeProfileName = useMemo(() => {
    return profiles.find((p) => p.id === activeProfileId)?.name || form.nombre || "";
  }, [profiles, activeProfileId, form.nombre]);
  const lastMetric = useMemo(
    () => (metricsLog && metricsLog.length ? metricsLog[metricsLog.length - 1] : null),
    [metricsLog]
  );
  const prevMetric = useMemo(
    () => (metricsLog && metricsLog.length > 1 ? metricsLog[metricsLog.length - 2] : null),
    [metricsLog]
  );
  const trendSymbol = (key) => {
    const a = Number(lastMetric?.[key] || 0);
    const b = Number(prevMetric?.[key] || 0);
    if (!a || !b) return "→";
    if (a > b) return "↑";
    if (a < b) return "↓";
    return "→";
  };
  const openStatsMetric = (metricKey, compareKey = "") => {
    if (!metricKey) return;
    setStatsDrawer({
      open: true,
      metricKey,
      compareKey: compareKey || "",
    });
  };
  const renderStatsCard = (label, value, metricKey, compareKey = "") => {
    if (!metricKey) {
      return (
        <div className="stats-metric-static" key={`${label}-static`}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      );
    }
    return (
      <button
        key={`${label}-${metricKey}`}
        type="button"
        className="stats-metric-btn"
        onClick={() => openStatsMetric(metricKey, compareKey)}
      >
        <span>{label}</span>
        <strong>{value}</strong>
      </button>
    );
  };
  const allExercises = useMemo(() => {
    if (!plan) return [];
    return plan.days.flatMap((d) => d.exercises);
  }, [plan]);

  const XP_BASE = 10;
  const XP_TIME_BONUS = 5;
  const trainedDaysTotal = useMemo(() => countTrainedDays(history), [history]);
  const trainingStreak = useMemo(() => computeTrainingStreak(history), [history]);
  const trainedDaysThisMonth = useMemo(
    () => countTrainedDaysThisMonth(history),
    [history]
  );

  const getGifIdCandidates = (id) => {
    if (!id) return [];
    const original = String(id);
    const out = [original];
    if (/^\d+$/.test(original)) {
      const normalized = String(Number(original));
      if (normalized && normalized !== original) out.push(normalized);
    }
    return out;
  };

  const getExerciseKey = (dayTitle, ex) =>
    `${dayTitle}::${ex.instanceId || ex.id || ex.name}`;

  const getExerciseXp = (ex) =>
    XP_BASE + (ex.prescription?.type === "time" ? XP_TIME_BONUS : 0);

  const todayKey = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const getDetailSnapshot = (dayTitle, ex) => {
    const key = getExerciseKey(dayTitle, ex);
    const detail = completedDetails[key] || {};
    if (ex.prescription?.type === "reps") {
      const repsBySet =
        detail.repsBySet && detail.repsBySet.length
          ? detail.repsBySet
          : Array.from({ length: ex.prescription.sets }).map(
              () => ex.prescription.reps
            );
      return { type: "reps", repsBySet };
    }
    return {
      type: "time",
      workSec: detail.workSec ?? ex.prescription?.workSec ?? 0,
    };
  };

  const stripGifs = (planToStore) => ({
    ...planToStore,
    days: planToStore.days.map((d) => ({
      ...d,
      exercises: d.exercises.map((ex) => ({ ...ex, gifUrl: "" })),
    })),
  });

  const ensureInstanceIds = (planToNormalize) => {
    if (!planToNormalize?.days) return planToNormalize;
    let changed = false;
    const days = planToNormalize.days.map((d) => ({
      ...d,
      equipmentList: Array.isArray(d.equipmentList) ? d.equipmentList : [],
      exercises: d.exercises.map((ex) => {
        if (ex.instanceId) return ex;
        changed = true;
        return {
          ...ex,
          instanceId: `${ex.id || ex.name}-${Math.random().toString(36).slice(2, 8)}`,
        };
      }),
    }));
    return changed ? { ...planToNormalize, days } : { ...planToNormalize, days };
  };

  const totalPossibleXp = useMemo(() => {
    if (!plan) return 0;
    return plan.days.reduce((sum, d) => {
      const dayXp = d.exercises.reduce((acc, ex) => acc + getExerciseXp(ex), 0);
      return sum + dayXp;
    }, 0);
  }, [plan]);

  const earnedXp = useMemo(() => {
    if (!plan) return 0;
    return plan.days.reduce((sum, d) => {
      const dayXp = d.exercises.reduce((acc, ex) => {
        const key = getExerciseKey(d.title, ex);
        return acc + (completed[key] ? getExerciseXp(ex) : 0);
      }, 0);
      return sum + dayXp;
    }, 0);
  }, [plan, completed]);

  const completedPlanSet = useMemo(
    () => buildPlanCompletionKeySet(plan, completed, getExerciseKey),
    [plan, completed]
  );
  const historyXpUnique = useMemo(
    () => countHistoryXpExcludingPlanCompleted(history, completedPlanSet),
    [history, completedPlanSet]
  );
  const earnedXpTotal = earnedXp + historyXpUnique;
  const levelProgress = useMemo(() => getLevelProgress(earnedXpTotal), [earnedXpTotal]);
  const level = levelProgress.level;

  const totalExercises = plan
    ? plan.days.reduce((sum, d) => sum + d.exercises.length, 0)
    : 0;
  const completedCount = plan
    ? plan.days.reduce((sum, d) => {
        return (
          sum +
          d.exercises.filter((ex) => completed[getExerciseKey(d.title, ex)]).length
        );
      }, 0)
    : 0;

  const equipmentGroups = useMemo(() => {
    const pool = exercisePool.length ? exercisePool : plan?.pool || [];
    const set = new Set();
    pool.forEach((ex) => {
      if (ex?.equipment) set.add(ex.equipment);
    });
    const list = Array.from(set).sort((a, b) => a.localeCompare(b));
    const machine = list.filter((e) => /machine|smith|leverage/i.test(e));
    const other = list.filter((e) => !/machine|smith|leverage/i.test(e));
    const groups = [];
    if (other.length) {
      groups.push({
        label: lang === "en" ? "Equipment" : "Equipos",
        items: other,
      });
    }
    if (machine.length) {
      groups.push({
        label: lang === "en" ? "Machines" : "Máquinas",
        items: machine,
      });
    }
    return groups;
  }, [exercisePool, plan?.pool, lang]);

  const planExerciseKey = useMemo(() => {
    if (!plan) return "";
    return plan.days
      .map((d) => d.exercises.map((e) => e.instanceId || e.id || e.name).join(","))
      .join("|");
  }, [plan]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let ignore = false;
    supabase.auth.getSession().then(({ data }) => {
      if (ignore) return;
      setAuthUser(data?.session?.user || null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null);
      setAuthReady(true);
    });
    return () => {
      ignore = true;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("hc", highContrast);
    localStorage.setItem("fit_high_contrast", highContrast ? "1" : "0");
  }, [highContrast]);

  useEffect(() => {
    if (!authUser) {
      initialSyncRef.current = false;
      setCanUploadSync(false);
      return;
    }
    if (!progressReady || !activeProfileId) return;
    if (initialSyncRef.current) return;
    initialSyncRef.current = true;
    autoSync();
  }, [authUser, progressReady, activeProfileId]);

  useEffect(() => {
    if (!authUser) return;
    if (!progressReady) return;
    if (!canUploadSync) return;
    if (localChangeTick === 0) return;
    const now = Date.now();
    if (now - lastAutoSyncRef.current < 8000) return;
    const id = setTimeout(async () => {
      try {
        await uploadCloud();
        lastAutoSyncRef.current = Date.now();
      } catch {
        // silencio
      }
    }, 2500);
    return () => clearTimeout(id);
  }, [authUser, localChangeTick, progressReady, canUploadSync]);

  useEffect(() => {
    if (!plan) {
      setDetailEx(null);
    }
  }, [plan]);

  useEffect(() => {
    setGifsLoading(gifStatus.state === "downloading" || gifStatus.state === "paused");
  }, [gifStatus.state]);

  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  useEffect(() => {
    if (!plan || !planExerciseKey) return;
    if (planExerciseKey === gifPlanKeyRef.current) return;
    gifPlanKeyRef.current = planExerciseKey;

    let cancelled = false;
    const preload = async () => {
      setGifsLoading(true);
      const currentPlan = planRef.current || plan;
      for (const day of currentPlan.days) {
        for (const ex of day.exercises) {
          if (cancelled) break;
          if (ex.gifUrl) continue;
          try {
            const { url: gifUrl, resolvedId, source } = await fetchGifMeta(ex);
            if (!gifUrl || cancelled) continue;
            setPlan((prev) => {
              if (!prev) return prev;
              const days = prev.days.map((d) => ({
                ...d,
                exercises: d.exercises.map((item) => {
                  if (ex.instanceId) {
                    return item.instanceId === ex.instanceId
                      ? {
                          ...item,
                          gifUrl,
                          gifResolvedId: resolvedId || item.gifResolvedId || "",
                          gifSource: source || item.gifSource || "",
                        }
                      : item;
                  }
                  return item.id === ex.id
                    ? {
                        ...item,
                        gifUrl,
                        gifResolvedId: resolvedId || item.gifResolvedId || "",
                        gifSource: source || item.gifSource || "",
                      }
                    : item;
                }),
              }));
              return { ...prev, days };
            });
          } catch {
            // ignore
          }
          await new Promise((r) => setTimeout(r, 200));
        }
      }
      if (!cancelled) {
        setGifsLoading(false);
      }
    };
    preload();
    return () => {
      cancelled = true;
    };
  }, [planExerciseKey]);

  useEffect(() => {
    if (!plan) return;
    const localCount = gifStatus?.localCount || 0;
    if (localCount === 0) return;
    const key = [
      localCount,
      plan.days
        .map((d) =>
          d.exercises.map((e) => e.instanceId || e.id || e.name).join(",")
        )
        .join("|"),
    ].join("|");
    if (key && key === gifLocalHydrateRef.current) return;

    let cancelled = false;
    const hydrateLocalGifs = async () => {
      try {
        const [all, allExercises] = await Promise.all([getAllGifs(), getAllExercises()]);
        if (cancelled) return;
        const byId = new Map(all.map((g) => [g.id, g.blob]));
        const normalizeName = (value) =>
          (value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
        const idByName = new Map();
        allExercises.forEach((e) => {
          const names = [e?.name, e?.name_es, e?.name_en]
            .map(normalizeName)
            .filter(Boolean);
          names.forEach((n) => {
            if (!idByName.has(n)) idByName.set(n, e.id);
          });
        });
        setPlan((prev) => {
          if (!prev) return prev;
          const days = prev.days.map((d) => ({
            ...d,
            exercises: d.exercises.map((ex) => {
              let blob = byId.get(ex.id);
              if (!blob) {
                const nameKey = normalizeName(ex.name || ex.name_es || ex.name_en);
                const mappedId = idByName.get(nameKey);
                if (mappedId) blob = byId.get(mappedId);
              }
              if (blob) {
                return {
                  ...ex,
                  gifUrl: URL.createObjectURL(blob),
                  gifResolvedId: String(ex.id || ""),
                  gifSource: "exact-local",
                };
              }
              return ex;
            }),
          }));
          return { ...prev, days };
        });
        gifLocalHydrateRef.current = key;
      } catch {
        // ignore
      }
    };
    hydrateLocalGifs();
    return () => {
      cancelled = true;
    };
  }, [plan, gifStatus?.localCount]);

  useEffect(() => {
    const storedProfiles = localStorage.getItem(PROFILE_LIST_KEY);
    let list = [];
    if (storedProfiles) {
      try {
        list = JSON.parse(storedProfiles);
      } catch {
        list = [];
      }
    }

    if (!list.length) {
      const defaultId = "p1";
      list = [{ id: defaultId, name: "Mi Perfil" }];
      localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(list));
      localStorage.setItem(ACTIVE_PROFILE_KEY, defaultId);
    }

    let activeId = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (!activeId) {
      activeId = list[0].id;
      localStorage.setItem(ACTIVE_PROFILE_KEY, activeId);
    }

    const oldProfile = localStorage.getItem("fit_profile");
    const oldPlan = localStorage.getItem("fit_plan");
    const oldProgress = localStorage.getItem("fit_progress");
    const oldProgressDetails = localStorage.getItem("fit_progress_details");
    const keys = profileKeys(activeId);

    if (oldProfile && !localStorage.getItem(keys.profile)) {
      localStorage.setItem(keys.profile, oldProfile);
    }
    if (oldPlan && !localStorage.getItem(keys.plan)) {
      localStorage.setItem(keys.plan, oldPlan);
    }
    if (oldProgress && !localStorage.getItem(keys.progress)) {
      localStorage.setItem(keys.progress, oldProgress);
    }
    if (oldProgressDetails && !localStorage.getItem(keys.progressDetails)) {
      localStorage.setItem(keys.progressDetails, oldProgressDetails);
    }

    setProfiles(list);
    setActiveProfileId(activeId);
    const activeProfile = list.find((p) => p.id === activeId);
    setRenameProfileName(activeProfile?.name || "");
  }, []);

  const startDbDownload = async () => {
    const RESUME_DELAY_MS = 30 * 60 * 1000;
    if (dbDownloadRef.current.running) return;
    if (dbDownloadRef.current.resumeTimer) {
      clearTimeout(dbDownloadRef.current.resumeTimer);
      dbDownloadRef.current.resumeTimer = null;
    }
    dbDownloadRef.current.running = true;
    try {
      const BATCH_SIZE = 10;
      const BASE_BACKOFF_MS = 8000;
      const BATCH_DELAY_MS = 12000;

      const fetchBatch = async (limit, offset) => {
        let attempt = 0;
        while (attempt < 5) {
          const res = await fetch(`/edb/exercises?limit=${limit}&offset=${offset}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) return { items: data, total: 0 };
            if (Array.isArray(data?.results)) {
              return { items: data.results, total: data.count || data.total || 0 };
            }
            if (Array.isArray(data?.exercises)) {
              return { items: data.exercises, total: data.total || 0 };
            }
            return { items: [], total: 0 };
          }
          if (res.status === 429) {
            await new Promise((r) =>
              setTimeout(r, BASE_BACKOFF_MS * Math.pow(2, attempt))
            );
            attempt += 1;
            continue;
          }
          throw new Error(`API ${res.status}`);
        }
        throw new Error("Rate limit");
      };

      let offset = 0;
      let total = 0;
      let downloaded = await countExercises();
      offset = downloaded;
      const initialCount = downloaded;
      setDbStatus({
        state: "downloading",
        downloaded,
        total,
        error: "",
        localCount: initialCount,
      });

      while (true) {
        const { items, total: apiTotal } = await fetchBatch(BATCH_SIZE, offset);
        if (!items.length) break;
        await upsertExercises(items);
        downloaded += items.length;
        if (apiTotal) total = apiTotal;
        const localCount = await countExercises();
        setDbStatus({
          state: "downloading",
          downloaded,
          total,
          error: "",
          localCount,
        });
        offset += items.length;
        if (items.length < BATCH_SIZE) break;
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }

      await setMeta(DB_COMPLETE_KEY, { value: true, total: downloaded });
      setDbStatus({
        state: "ready",
        downloaded,
        total: total || downloaded,
        error: "",
        localCount: total || downloaded,
      });
    } catch (err) {
      const message = err?.message || "";
      if (message.includes("Rate limit") || message.includes("429")) {
        const localCount = await countExercises();
        const nextRetryAt = Date.now() + RESUME_DELAY_MS;
        setDbStatus({
          state: "paused",
          downloaded: localCount,
          total: 0,
          error: "",
          localCount,
          nextRetryAt,
        });
        dbDownloadRef.current.running = false;
        dbDownloadRef.current.resumeTimer = setTimeout(() => {
          startDbDownload();
        }, RESUME_DELAY_MS);
        return;
      }
      setDbStatus({
        state: "error",
        downloaded: 0,
        total: 0,
        error: err?.message || "Error al descargar",
        localCount: 0,
      });
    } finally {
      dbDownloadRef.current.running = false;
    }
  };

  const startGifDownload = async () => {
    const RESUME_DELAY_MS = 30 * 60 * 1000;
    const GIF_DELAY_MS = 300;
    if (gifDownloadRef.current.running) return;
    if (gifDownloadRef.current.resumeTimer) {
      clearTimeout(gifDownloadRef.current.resumeTimer);
      gifDownloadRef.current.resumeTimer = null;
    }
    let exercisesReady = await getMeta(DB_COMPLETE_KEY);
    if (!exercisesReady?.value) {
      const localCount = await countExercises();
      if (localCount > 0) {
        await setMeta(DB_COMPLETE_KEY, { value: true, total: localCount });
        exercisesReady = { value: true, total: localCount };
      }
    }
    if (!exercisesReady?.value) {
      setGifStatus({
        state: "error",
        downloaded: 0,
        total: 0,
        error: "Primero descarga la base de ejercicios",
        localCount: await countGifs(),
      });
      return;
    }

    if (!supabaseGifBase) {
      setGifStatus({
        state: "error",
        downloaded: 0,
        total: 0,
        error: "Falta configurar VITE_SUPABASE_URL",
        localCount: await countGifs(),
      });
      return;
    }

    gifDownloadRef.current.running = true;
    try {
      const all = await getAllExercises();
      const total = all.length;
      const localCount = await countGifs();
      let downloaded = localCount;
      setGifStatus({
        state: "downloading",
        downloaded,
        total,
        error: "",
        localCount,
      });

      for (const ex of all) {
        if (downloaded >= total) break;
        const cached = await getGif(ex.id);
        if (cached?.blob) {
          continue;
        }
        let attempt = 0;
        while (attempt < 3) {
          let res;
          try {
            const candidates = getGifIdCandidates(ex.id);
            for (const candidateId of candidates) {
              const url = `${supabaseGifBase}/storage/v1/object/public/${supabaseGifBucket}/${candidateId}.gif`;
              // Try both zero-padded and normalized ids (e.g. 0001 vs 1).
              const candidateRes = await fetch(url);
              if (candidateRes.ok || candidateRes.status === 429) {
                res = candidateRes;
                break;
              }
            }
            if (!res && supabase) {
              for (const candidateId of candidates) {
                const { data, error } = await supabase.storage
                  .from(supabaseGifBucket)
                  .download(`${candidateId}.gif`);
                if (error || !data) continue;
                await upsertGif(ex.id, data);
                downloaded += 1;
                setGifStatus({
                  state: "downloading",
                  downloaded,
                  total,
                  error: "",
                  localCount: downloaded,
                });
                res = { ok: true, status: 200, _skipBlob: true };
                break;
              }
              if (res?.ok) break;
            }
            if (!res) {
              attempt += 1;
              continue;
            }
          } catch {
            attempt += 1;
            if (attempt >= 3) break;
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          if (res.ok) {
            if (!res._skipBlob) {
              const blob = await res.blob();
              await upsertGif(ex.id, blob);
              downloaded += 1;
              setGifStatus({
                state: "downloading",
                downloaded,
                total,
                error: "",
                localCount: downloaded,
              });
            }
            break;
          }
          if (res.status === 429) {
            const nextRetryAt = Date.now() + RESUME_DELAY_MS;
            setGifStatus({
              state: "paused",
              downloaded,
              total,
              error: "",
              localCount: downloaded,
              nextRetryAt,
            });
            gifDownloadRef.current.running = false;
            gifDownloadRef.current.resumeTimer = setTimeout(() => {
              startGifDownload();
            }, RESUME_DELAY_MS);
            return;
          }
          attempt += 1;
        }
        await new Promise((r) => setTimeout(r, GIF_DELAY_MS));
      }

      await setMeta(GIFS_COMPLETE_KEY, { value: true, total: downloaded });
      setGifStatus({
        state: "ready",
        downloaded,
        total: total || downloaded,
        error: "",
        localCount: downloaded,
      });
    } catch (err) {
      setGifStatus({
        state: "error",
        downloaded: 0,
        total: 0,
        error: err?.message || "Error al descargar gifs",
        localCount: 0,
      });
    } finally {
      gifDownloadRef.current.running = false;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const meta = await getMeta(DB_COMPLETE_KEY);
        if (meta?.value) {
          const total = meta.total || (await countExercises());
          if (!cancelled) {
            setDbStatus({
              state: "ready",
              downloaded: total,
              total,
              error: "",
              localCount: total,
            });
          }
          return;
        }

        const localCount = await countExercises();
        if (localCount === 0) {
          try {
            const res = await fetch("/data/exercises.json");
            if (res.ok) {
              const bundled = await res.json();
              if (Array.isArray(bundled) && bundled.length) {
                await upsertExercises(bundled);
                await setMeta(DB_COMPLETE_KEY, { value: true, total: bundled.length });
                if (!cancelled) {
                  setDbStatus({
                    state: "ready",
                    downloaded: bundled.length,
                    total: bundled.length,
                    error: "",
                    localCount: bundled.length,
                  });
                }
                return;
              }
            }
          } catch {
            // ignore
          }
        }
        if (!cancelled) {
          setDbStatus({
            state: "idle",
            downloaded: localCount,
            total: 0,
            error: "",
            localCount,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setDbStatus({
            state: "error",
            downloaded: 0,
            total: 0,
            error: err?.message || "Error al descargar",
            localCount: 0,
          });
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const meta = await getMeta(GIFS_COMPLETE_KEY);
        if (meta?.value) {
          const total = meta.total || (await countGifs());
          if (!cancelled) {
            setGifStatus({
              state: "ready",
              downloaded: total,
              total,
              error: "",
              localCount: total,
            });
          }
          return;
        }

        const localCount = await countGifs();
        if (!cancelled) {
          setGifStatus({
            state: "idle",
            downloaded: localCount,
            total: 0,
            error: "",
            localCount,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setGifStatus({
            state: "error",
            downloaded: 0,
            total: 0,
            error: err?.message || "Error al descargar gifs",
            localCount: 0,
          });
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (gifDownloadRef.current.running) return;
    if (gifStatus.state === "ready") return;
    if (dbStatus.state !== "ready") return;
    const localCount = gifStatus.localCount || 0;
    if (localCount > 0 && gifStatus.state === "idle") {
      startGifDownload();
      return;
    }
    if (localCount === 0 && gifStatus.state === "idle") {
      startGifDownload();
    }
  }, [gifStatus.state, gifStatus.localCount, dbStatus.state]);

  useEffect(() => {
    if (!activeProfileId) return;
    hydratingProfileRef.current = true;
    setProgressReady(false);
    const keys = profileKeys(activeProfileId);

    const savedProgress = localStorage.getItem(keys.progress);
    if (savedProgress) {
      try {
        setCompleted(JSON.parse(savedProgress));
      } catch {
        setCompleted({});
      }
    } else {
      setCompleted({});
    }

    const savedDetails = localStorage.getItem(keys.progressDetails);
    if (savedDetails) {
      try {
        setCompletedDetails(JSON.parse(savedDetails));
      } catch {
        setCompletedDetails({});
      }
    } else {
      setCompletedDetails({});
    }

    const savedHistory = localStorage.getItem(keys.history);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch {
        setHistory({});
      }
    } else {
      setHistory({});
    }

    const savedMetrics = localStorage.getItem(keys.metricsLog);
    if (savedMetrics) {
      try {
        setMetricsLog(JSON.parse(savedMetrics));
      } catch {
        setMetricsLog([]);
      }
    } else {
      setMetricsLog([]);
    }

    const savedProfile = localStorage.getItem(keys.profile);
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        if (parsed?.profile) {
          const prof = { ...parsed.profile };
          if (!Array.isArray(prof.trainDays) && Array.isArray(prof.restDays)) {
            const rest = new Set(prof.restDays);
            prof.trainDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !rest.has(d));
          }
          if (!prof.planTemplate) {
            prof.planTemplate = "goal";
          }
          if (!Array.isArray(prof.trainDays) || prof.trainDays.length === 0) {
            prof.trainDays = [0, 1, 2, 3, 4];
          }
          setForm(prof);
        }
      } catch {
        setForm(initialForm);
      }
    } else {
      setForm(initialForm);
    }

    const savedPlan = localStorage.getItem(keys.plan);
    if (savedPlan) {
      try {
        const parsed = JSON.parse(savedPlan);
        if (parsed?.days) {
          const normalized = ensureInstanceIds(parsed);
          setPlan(normalized);
          if (normalized !== parsed) {
            localStorage.setItem(keys.plan, JSON.stringify(stripGifs(normalized)));
          }
        }
        if (parsed?.pool) setExercisePool(parsed.pool);
      } catch {
        setPlan(null);
        setExercisePool([]);
      }
    } else {
      setPlan(null);
      setExercisePool([]);
    }

    setProgressReady(true);
    setHydrated(true);
    setSidebarTab(savedPlan ? "plan" : "profile");
    setShowProfileForm(!savedPlan);

    const activeProfile = profiles.find((p) => p.id === activeProfileId);
    setRenameProfileName(activeProfile?.name || "");

    const savedLang = localStorage.getItem(keys.lang);
    if (savedLang === "es" || savedLang === "en") {
      setLang(savedLang);
    } else {
      setLang("es");
    }

    const unlockId = setTimeout(() => {
      hydratingProfileRef.current = false;
    }, 0);
    return () => {
      clearTimeout(unlockId);
      hydratingProfileRef.current = false;
    };
  }, [activeProfileId]);

  useEffect(() => {
    if (!progressReady || !activeProfileId) return;
    const keys = profileKeys(activeProfileId);
    const serialized = JSON.stringify(completed);
    if (localStorage.getItem(keys.progress) === serialized) return;
    localStorage.setItem(keys.progress, serialized);
    if (!hydratingProfileRef.current) touchLocalChange();
  }, [completed, progressReady, activeProfileId]);

  useEffect(() => {
    if (!progressReady || !activeProfileId) return;
    const keys = profileKeys(activeProfileId);
    const serialized = JSON.stringify(completedDetails);
    if (localStorage.getItem(keys.progressDetails) === serialized) return;
    localStorage.setItem(keys.progressDetails, serialized);
    if (!hydratingProfileRef.current) touchLocalChange();
  }, [completedDetails, progressReady, activeProfileId]);

  useEffect(() => {
    if (!progressReady || !activeProfileId) return;
    const keys = profileKeys(activeProfileId);
    const serialized = JSON.stringify(history);
    if (localStorage.getItem(keys.history) === serialized) return;
    localStorage.setItem(keys.history, serialized);
    if (!hydratingProfileRef.current) touchLocalChange();
  }, [history, progressReady, activeProfileId]);

  useEffect(() => {
    if (!progressReady || !activeProfileId) return;
    const keys = profileKeys(activeProfileId);
    const serialized = JSON.stringify(metricsLog);
    if (localStorage.getItem(keys.metricsLog) === serialized) return;
    localStorage.setItem(keys.metricsLog, serialized);
    if (!hydratingProfileRef.current) touchLocalChange();
  }, [metricsLog, progressReady, activeProfileId]);

  useEffect(() => {
    if (!progressReady || !activeProfileId) return;
    if (backupTimerRef.current) {
      clearTimeout(backupTimerRef.current);
    }
    backupTimerRef.current = setTimeout(() => {
      try {
        const keys = profileKeys(activeProfileId);
        const payload = buildBackupPayload(keys);
        const backup = {
          createdAt: new Date().toISOString(),
          profileId: activeProfileId,
          data: payload,
        };
        const prev = localStorage.getItem(AUTO_BACKUP_KEY);
        if (prev) localStorage.setItem(AUTO_BACKUP_PREV_KEY, prev);
        localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(backup));
      } catch {
        // ignore
      }
    }, 1200);
    return () => {
      if (backupTimerRef.current) {
        clearTimeout(backupTimerRef.current);
      }
    };
  }, [localChangeTick, progressReady, activeProfileId]);

  useEffect(() => {
    if (!plan) return;
    const allowed = new Set(
      plan.days.flatMap((d) =>
        d.exercises.map((ex) => getExerciseKey(d.title, ex))
      )
    );
    setCompleted((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        if (allowed.has(k)) next[k] = prev[k];
      });
      return next;
    });
    setCompletedDetails((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        if (allowed.has(k)) next[k] = prev[k];
      });
      return next;
    });
  }, [plan]);

  useEffect(() => {
    if (!plan || !hydrated) return;
    const key = plan.createdAt || "no-date";
    if (hydratedPlanRef.current === key) return;
    hydratedPlanRef.current = key;
  }, [plan, hydrated]);

  useEffect(() => {
    if (!form.reminderEnabled || !form.reminderTime) return;
    const check = () => {
      const now = new Date();
      const key = now.toISOString().slice(0, 10);
      if (lastReminderDate === key) return;
      const [h, m] = form.reminderTime.split(":").map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return;
      if (now.getHours() !== h || now.getMinutes() !== m) return;
      const dayIndex = (now.getDay() + 6) % 7;
      if (Array.isArray(form.trainDays) && !form.trainDays.includes(dayIndex)) {
        return;
      }

      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("Hora de entrenar", {
            body: "Tu sesión está lista. ¡Vamos!",
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then((perm) => {
            if (perm === "granted") {
              new Notification("Hora de entrenar", {
                body: "Tu sesión está lista. ¡Vamos!",
              });
            }
          });
        }
      } else {
        alert("Hora de entrenar. ¡Tu sesión está lista!");
      }

      setLastReminderDate(key);
      setReminderPrompt(true);
    };

    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [form.reminderEnabled, form.reminderTime, form.trainDays, lastReminderDate]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onToggleTrainDay = (idx) => {
    setForm((f) => {
      if (idx === "all") {
        return { ...f, trainDays: [0, 1, 2, 3, 4, 5, 6] };
      }
      if (idx === "none") {
        return { ...f, trainDays: [] };
      }
      const days = Array.isArray(f.trainDays) ? [...f.trainDays] : [];
      const i = days.indexOf(idx);
      if (i >= 0) {
        days.splice(i, 1);
      } else {
        days.push(idx);
      }
      return { ...f, trainDays: days.sort((a, b) => a - b) };
    });
  };

  const onChangeReminderEnabled = (enabled) => {
    setForm((f) => ({ ...f, reminderEnabled: enabled }));
  };

  const onChangeReminderTime = (time) => {
    setForm((f) => ({ ...f, reminderTime: time }));
  };

  const onAuthChange = (e) => {
    const { name, value } = e.target;
    setAuthForm((f) => ({ ...f, [name]: value }));
    if (name === "email") {
      localStorage.setItem("fit_auth_email", value);
    }
  };

  const onSignIn = async () => {
    if (!supabase) return;
    setAuthLoading(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: authForm.email,
      password: authForm.password,
    });
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  };

  const onSignUp = async () => {
    if (!supabase) return;
    setAuthLoading(true);
    setAuthError("");
    const { error } = await supabase.auth.signUp({
      email: authForm.email,
      password: authForm.password,
    });
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  };

  const onMagicLink = async () => {
    if (!supabase) return;
    setAuthLoading(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: authForm.email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  };

  const onSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const markSyncRestoreSummary = (summary) => {
    const timestamp = new Date().toLocaleString();
    const text = `Última descarga: perfiles ${summary.profiles} · métricas ${summary.metrics} · ${timestamp}`;
    setLastSyncRestoreSummary(text);
    localStorage.setItem(LAST_SYNC_RESTORE_KEY, text);
  };

  const autoSync = async () => {
    if (!authUser || !progressReady) return;
    try {
      const localUpdated = localStorage.getItem(LOCAL_SYNC_KEY);
      const cloudPayload = await downloadCloud();
      const localScore = getLocalAppSyncScore();

      if (!cloudPayload) {
        if (localScore > 0) {
          await uploadCloud();
          setSyncStatus("Sincronizado ✓");
        } else {
          setSyncStatus("Sin datos en la nube");
        }
        setCanUploadSync(true);
        setTimeout(() => setSyncStatus(""), 1500);
        return;
      }

      const cloudUpdated = cloudPayload?.meta?.updatedAt || null;
      const cloudScore = getCloudAppSyncScore(cloudPayload);
      if (!localUpdated || localScore === 0) {
        const summary = summarizeCloudPayload(cloudPayload);
        applyCloudPayload(cloudPayload);
        markSyncRestoreSummary(summary);
        setCanUploadSync(true);
        setSyncStatus(
          `Datos restaurados ✓ · perfiles: ${summary.profiles} · métricas: ${summary.metrics}`
        );
        setTimeout(() => {
          const didReload = reloadAfterSyncOnce();
          if (!didReload) {
            setSyncStatus(
              `Datos restaurados ✓ · perfiles: ${summary.profiles} · métricas: ${summary.metrics}`
            );
          }
        }, 300);
        return;
      }

      if (cloudUpdated && cloudUpdated > localUpdated) {
        const ok = window.confirm(
          "Se encontraron datos más recientes en la nube. ¿Quieres usarlos? (Cancelar mantiene tus datos locales)"
        );
        if (ok) {
          const summary = summarizeCloudPayload(cloudPayload);
          applyCloudPayload(cloudPayload);
          markSyncRestoreSummary(summary);
          setCanUploadSync(true);
          setSyncStatus(
            `Datos restaurados ✓ · perfiles: ${summary.profiles} · métricas: ${summary.metrics}`
          );
          setTimeout(() => {
            const didReload = reloadAfterSyncOnce();
            if (!didReload) {
              setSyncStatus(
                `Datos restaurados ✓ · perfiles: ${summary.profiles} · métricas: ${summary.metrics}`
              );
            }
          }, 300);
          return;
        }
      }

      if (cloudScore > localScore) {
        const keepCloud = window.confirm(
          "La nube parece tener más progreso que este dispositivo. ¿Quieres usar los datos de la nube para evitar sobrescribirlos?"
        );
        if (keepCloud) {
          const summary = summarizeCloudPayload(cloudPayload);
          applyCloudPayload(cloudPayload);
          markSyncRestoreSummary(summary);
          setCanUploadSync(true);
          setSyncStatus(
            `Datos restaurados ✓ · perfiles: ${summary.profiles} · métricas: ${summary.metrics}`
          );
          setTimeout(() => {
            const didReload = reloadAfterSyncOnce();
            if (!didReload) {
              setSyncStatus(
                `Datos restaurados ✓ · perfiles: ${summary.profiles} · métricas: ${summary.metrics}`
              );
            }
          }, 300);
          return;
        }
      }
      setCanUploadSync(true);
      setSyncStatus("Sincronización lista");
      setTimeout(() => setSyncStatus(""), 1200);
    } catch (e) {
      setSyncStatus(e?.message || "Error al sincronizar");
      setTimeout(() => setSyncStatus(""), 2000);
    }
  };

  const onSyncUp = async () => {
    if (!canUploadSync) {
      setSyncStatus("Primero descarga y revisa datos");
      setTimeout(() => setSyncStatus(""), 2200);
      return;
    }
    try {
      setSyncStatus("Subiendo...");
      await uploadCloud();
      setSyncStatus("Sincronizado ✓");
    } catch (e) {
      setSyncStatus(e?.message || "Error al subir");
    }
    setTimeout(() => setSyncStatus(""), 2000);
  };

  const onSyncDown = async () => {
    try {
      setSyncStatus("Descargando...");
      const payload = await downloadCloud();
      if (!payload) {
        setSyncStatus("Sin datos en la nube");
        setTimeout(() => setSyncStatus(""), 2000);
        return;
      }
      const summary = summarizeCloudPayload(payload);
      applyCloudPayload(payload);
      markSyncRestoreSummary(summary);
      setCanUploadSync(true);
      setSyncStatus(
        `Datos restaurados ✓ · perfiles: ${summary.profiles} · métricas: ${summary.metrics}`
      );
      setTimeout(() => window.location.reload(), 400);
    } catch (e) {
      setSyncStatus(e?.message || "Error al descargar");
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoadingPlan(true);

    try {
      const payload = { profile: form, metrics };
      const keys = profileKeys(activeProfileId);
      localStorage.setItem(keys.profile, JSON.stringify(payload));
      touchLocalChange();

      const adjustDelta = computeAdjustDelta(history, form);
      const newPlan = await generatePlan(form, {
        forceLocal: dbStatus.state !== "ready",
        adjustLevelDelta: adjustDelta,
      });
      setExercisePool(newPlan.pool);

      const finalPlan = { ...newPlan };
      const storedPlan = stripGifs(finalPlan);
      localStorage.setItem(keys.plan, JSON.stringify(storedPlan));
      touchLocalChange();
      setPlan(finalPlan);
      setSidebarTab("plan");
    } catch {
      setError("No se pudo generar el plan. Revisa tu API key.");
    } finally {
      setLoadingPlan(false);
    }
  };

  const onAddMetricsEntry = (entry) => {
    setMetricsLog((prev) => {
      const existing = prev.find((e) => e.date === entry.date) || {};
      const keys = ["weight", "waist", "hip", "neck", "bodyFat", "restHr", "sleepHours", "steps"];
      const merged = { ...existing, ...entry };
      keys.forEach((key) => {
        if (entry[key] === null || entry[key] === undefined) merged[key] = existing[key];
      });
      if ((entry.notes || "").trim() === "" && existing.notes) merged.notes = existing.notes;
      const derived = computeDerivedMetrics(merged, form);

      const cleaned = prev.filter((e) => e.date !== entry.date);
      const next = [...cleaned, { ...merged, ...derived }];
      next.sort((a, b) => (a.date < b.date ? -1 : 1));
      return next;
    });
    touchLocalChange();
  };

  const onDeleteMetricsEntry = (date) => {
    setMetricsLog((prev) => prev.filter((e) => e.date !== date));
    touchLocalChange();
  };

  const onSelectGarminFiles = (e) => {
    const files = Array.from(e.target.files || []);
    setGarminFiles(files);
    if (!files.length) {
      setGarminImportNote("");
      return;
    }
    const zipCount = files.filter((f) => /\.zip$/i.test(f.name)).length;
    const csvCount = files.filter((f) => /\.csv$/i.test(f.name)).length;
    const fitCount = files.filter((f) => /\.(fit|tcx|gpx)$/i.test(f.name)).length;
    setGarminImportNote(
      `Listo para procesar: ${files.length} archivo(s) · ZIP: ${zipCount} · CSV: ${csvCount} · FIT/TCX/GPX: ${fitCount}`
    );
  };

  const onChangeDayMode = async (dayIndex, mode) => {
    if (!plan) return;
    const levelIndex = Math.max(0, niveles.indexOf(form.nivel));

    const updatedDays = [...plan.days];
    const day = updatedDays[dayIndex];

    const exercises = await buildExercises(
      exercisePool.length ? exercisePool : day.exercises,
      mode,
      day.quiet,
      day.exercises.length || 4,
      levelIndex,
      day.equipmentList || []
    );

    updatedDays[dayIndex] = {
      ...day,
      mode,
      exercises,
    };

    const updatedPlan = { ...plan, days: updatedDays };
    setPlan(updatedPlan);
    if (activeProfileId) {
      const keys = profileKeys(activeProfileId);
      localStorage.setItem(keys.plan, JSON.stringify(stripGifs(updatedPlan)));
      touchLocalChange();
    }
    setDetailEx(null);
  };

  const onToggleQuiet = async (dayIndex, quiet) => {
    const currentPlan = planRef.current;
    if (!currentPlan) return;
    const updatedDays = [...currentPlan.days];
    const day = updatedDays[dayIndex];
    updatedDays[dayIndex] = { ...day, quiet };
    const updatedPlan = { ...currentPlan, days: updatedDays };
    setPlan(updatedPlan);
    if (activeProfileId) {
      const keys = profileKeys(activeProfileId);
      localStorage.setItem(keys.plan, JSON.stringify(stripGifs(updatedPlan)));
      touchLocalChange();
    }
    setDetailEx(null);

    if (quietUpdateRef.current.timer) {
      clearTimeout(quietUpdateRef.current.timer);
    }

    quietUpdateRef.current.timer = setTimeout(async () => {
      const latestPlan = planRef.current;
      if (!latestPlan) return;
      const levelIndex = Math.max(0, niveles.indexOf(form.nivel));
      const dayNow = latestPlan.days[dayIndex];
      if (!dayNow) return;
      const exercises = await buildExercises(
        exercisePool.length ? exercisePool : dayNow.exercises,
        dayNow.mode,
        quiet,
        dayNow.exercises.length || 4,
        levelIndex,
        dayNow.equipmentList || []
      );

      const nextDays = [...latestPlan.days];
      nextDays[dayIndex] = { ...dayNow, quiet, exercises };
      const nextPlan = { ...latestPlan, days: nextDays };
      setPlan(nextPlan);
      if (activeProfileId) {
        const keys = profileKeys(activeProfileId);
        localStorage.setItem(keys.plan, JSON.stringify(stripGifs(nextPlan)));
        touchLocalChange();
      }
    }, 400);
  };

  const onChangeDayEquipment = async (dayIndex, equipmentList) => {
    if (!plan) return;
    const levelIndex = Math.max(0, niveles.indexOf(form.nivel));
    const updatedDays = [...plan.days];
    const day = updatedDays[dayIndex];
    const nextList = Array.isArray(equipmentList) ? equipmentList : [];

    const exercises = await buildExercises(
      exercisePool.length ? exercisePool : day.exercises,
      day.mode,
      day.quiet,
      day.exercises.length || 4,
      levelIndex,
      nextList
    );

    updatedDays[dayIndex] = {
      ...day,
      equipmentList: nextList,
      exercises,
    };

    const updatedPlan = { ...plan, days: updatedDays };
    setPlan(updatedPlan);
    if (activeProfileId) {
      const keys = profileKeys(activeProfileId);
      localStorage.setItem(keys.plan, JSON.stringify(stripGifs(updatedPlan)));
      touchLocalChange();
    }
    setDetailEx(null);
  };

  const onSelectExercise = (payload) => {
    const ex = payload?.ex || payload;
    if (detailEx && detailEx?.ex?.id !== ex.id) {
      setDetailEx(null);
      setTimeout(() => setDetailEx(payload), 0);
      return;
    }
    setDetailEx(payload);
  };

  const onNextExercise = () => {
    if (!detailEx?.ex || !plan) return;
    const currentId = detailEx.ex.instanceId || detailEx.ex.id;
    const day = plan.days.find((d) => d.title === detailEx.dayTitle);
    if (day) {
      const idx = day.exercises.findIndex(
        (e) => (e.instanceId || e.id) === currentId
      );
      if (idx === -1) return;
      const next = day.exercises[(idx + 1) % day.exercises.length];
      setDetailEx({ ex: next, dayTitle: detailEx.dayTitle });
      return;
    }
    if (allExercises.length === 0) return;
    const idx = allExercises.findIndex(
      (e) => (e.instanceId || e.id) === currentId
    );
    if (idx === -1) return;
    const next = allExercises[(idx + 1) % allExercises.length];
    setDetailEx({ ex: next, dayTitle: detailEx.dayTitle });
  };

  const onPrevExercise = () => {
    if (!detailEx?.ex || !plan) return;
    const currentId = detailEx.ex.instanceId || detailEx.ex.id;
    const day = plan.days.find((d) => d.title === detailEx.dayTitle);
    if (day) {
      const idx = day.exercises.findIndex(
        (e) => (e.instanceId || e.id) === currentId
      );
      if (idx === -1) return;
      const prevIndex = (idx - 1 + day.exercises.length) % day.exercises.length;
      const prev = day.exercises[prevIndex];
      setDetailEx({ ex: prev, dayTitle: detailEx.dayTitle });
      return;
    }
    if (allExercises.length === 0) return;
    const idx = allExercises.findIndex(
      (e) => (e.instanceId || e.id) === currentId
    );
    if (idx === -1) return;
    const prevIndex = (idx - 1 + allExercises.length) % allExercises.length;
    const prev = allExercises[prevIndex];
    setDetailEx({ ex: prev, dayTitle: detailEx.dayTitle });
  };

  const getNextExerciseInDay = (dayTitle, ex) => {
    if (!plan) return null;
    const day = plan.days.find((d) => d.title === dayTitle);
    if (!day) return null;
    const exId = ex.instanceId || ex.id;
    const idx = day.exercises.findIndex((e) => (e.instanceId || e.id) === exId);
    if (idx === -1) return null;
    if (idx >= day.exercises.length - 1) return null;
    return day.exercises[idx + 1];
  };

  const onCompleteAndNext = (dayTitle, ex) => {
    onToggleComplete(dayTitle, ex, true);
    const next = getNextExerciseInDay(dayTitle, ex);
    if (!next) return;
    setTimeout(() => {
      setDetailEx({ ex: next, dayTitle });
    }, 0);
  };

  const openDaySummary = (dayTitle, completedOverride) => {
    if (!plan) return;
    const day = plan.days.find((d) => d.title === dayTitle);
    if (!day) return;
    const doneMap = completedOverride || completed;
    const dayTotal = day.exercises.length;
    const doneCount = day.exercises.filter((ex) =>
      doneMap[getExerciseKey(dayTitle, ex)]
    ).length;
    const dayXp = day.exercises.reduce((sum, ex) => {
      return sum + (doneMap[getExerciseKey(dayTitle, ex)] ? getExerciseXp(ex) : 0);
    }, 0);
    const minutes = day.exercises.reduce((sum, ex) => {
      const key = getExerciseKey(dayTitle, ex);
      const detail = completedDetails[key] || {};
      if (ex.prescription?.type === "time") return sum + (detail.workSec || 0) / 60;
      if (ex.prescription?.type === "reps") {
        const reps = (detail.repsBySet || []).reduce((a, b) => a + b, 0);
        return sum + reps * 3 / 60;
      }
      return sum;
    }, 0);

    setSummaryData({
      dayTitle,
      doneCount,
      dayTotal,
      dayXp,
      minutes: Math.round(minutes),
    });
    setSummaryOpen(true);
  };

  const addMoreExercises = async (dayTitle, count = 2) => {
    if (!plan) return;
    const levelIndex = Math.max(0, niveles.indexOf(form.nivel));
    const updatedDays = [...plan.days];
    const dayIndex = updatedDays.findIndex((d) => d.title === dayTitle);
    if (dayIndex === -1) return;
    const day = updatedDays[dayIndex];
    const pool = exercisePool.length ? exercisePool : day.exercises;
    const extra = await buildExercises(
      pool,
      day.mode,
      day.quiet,
      count,
      levelIndex,
      day.equipmentList || []
    );
    const nextExercises = [...day.exercises, ...extra];
    updatedDays[dayIndex] = { ...day, exercises: nextExercises };
    const updatedPlan = { ...plan, days: updatedDays };
    setPlan(updatedPlan);
    if (activeProfileId) {
      const keys = profileKeys(activeProfileId);
      localStorage.setItem(keys.plan, JSON.stringify(stripGifs(updatedPlan)));
      touchLocalChange();
    }
    const firstNew = extra[0];
    if (firstNew) {
      setDetailEx({ ex: firstNew, dayTitle });
    }
  };

  const onToggleComplete = (dayTitle, ex, checked) => {
    const key = getExerciseKey(dayTitle, ex);
    const nextCompleted = { ...completed, [key]: checked };
    setCompleted(nextCompleted);

    const date = todayKey();
    const entryKey = `${date}::${key}`;
    if (checked) {
      const detail = getDetailSnapshot(dayTitle, ex);
      setHistory((prev) => {
        const day = prev[date] || { items: [] };
        const exists = day.items.find((i) => i.key === entryKey);
        if (exists) return prev;
        const item = {
          key: entryKey,
          date,
          dayTitle,
          name: ex.name,
          name_es: ex.name_es,
          name_en: ex.name_en,
          target: ex.target,
          secondaryMuscles: ex.secondaryMuscles,
          type: detail.type,
          repsBySet: detail.repsBySet,
          workSec: detail.workSec,
          xp: getExerciseXp(ex),
        };
        return {
          ...prev,
          [date]: { ...day, items: [...day.items, item] },
        };
      });
    } else {
      setHistory((prev) => {
        const day = prev[date];
        if (!day) return prev;
        const nextItems = day.items.filter((i) => i.key !== entryKey);
        const next = { ...prev };
        if (nextItems.length) {
          next[date] = { ...day, items: nextItems };
        } else {
          delete next[date];
        }
        return next;
      });
    }

    if (checked && plan) {
      const day = plan.days.find((d) => d.title === dayTitle);
      if (day) {
        const allDone = day.exercises.every(
          (item) => nextCompleted[getExerciseKey(dayTitle, item)]
        );
        if (allDone) {
          openDaySummary(dayTitle, nextCompleted);
        }
      }
    }
  };

  const onRegisterPastExercise = (payload) => {
    const date = String(payload?.date || "").trim();
    const dayTitle = payload?.dayTitle || "";
    const ex = payload?.exercise;
    const detail = payload?.detail || {};
    if (!date || !isValidDateKey(date)) {
      alert("Fecha inválida. Usa formato YYYY-MM-DD.");
      return false;
    }
    if (!dayTitle || !ex) {
      alert("Faltan datos para registrar el ejercicio.");
      return false;
    }
    const itemType = detail.type === "time" ? "time" : "reps";
    const repsBySet =
      itemType === "reps"
        ? (Array.isArray(detail.repsBySet) && detail.repsBySet.length
            ? detail.repsBySet
            : Array.from({ length: ex.prescription?.sets || 3 }).map(
                () => ex.prescription?.reps || 10
              ))
        : undefined;
    const workSec =
      itemType === "time"
        ? Number(detail.workSec || ex.prescription?.workSec || 30)
        : undefined;

    const entryKey = `${date}::manual::${dayTitle}::${ex.id || ex.name}::${Date.now()}`;
    setHistory((prev) => {
      const day = prev[date] || { items: [] };
      const item = {
        key: entryKey,
        date,
        dayTitle,
        name: ex.name,
        name_es: ex.name_es,
        name_en: ex.name_en,
        target: ex.target,
        secondaryMuscles: ex.secondaryMuscles,
        type: itemType,
        repsBySet,
        workSec,
        xp: getExerciseXp(ex),
      };
      return {
        ...prev,
        [date]: { ...day, items: [...day.items, item] },
      };
    });
    touchLocalChange();
    return true;
  };

  const onUpdateDetail = (dayTitle, ex, patch) => {
    const key = getExerciseKey(dayTitle, ex);
    setCompletedDetails((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), ...patch },
    }));
  };

  const startSession = (dayIndex) => {
    if (!plan?.days?.[dayIndex]) return;
    setSessionDayIndex(dayIndex);
    setSessionCustomDay(null);
    setSessionExIndex(0);
    setDetailEx(null);
  };

  const startFreeSessionToday = async () => {
    if (!plan) return;
    const levelIndex = Math.max(0, niveles.indexOf(form.nivel));
    const sourcePool = exercisePool.length
      ? exercisePool
      : plan.pool?.length
      ? plan.pool
      : allExercises;
    const exercises = await buildExercises(
      sourcePool,
      "week",
      true,
      3,
      levelIndex,
      []
    );
    if (!exercises.length) return;
    const day = {
      title: `Libre ${todayKey()}`,
      exercises,
    };
    setSessionCustomDay(day);
    setSessionDayIndex(null);
    setSessionExIndex(0);
    setDetailEx(null);
  };

  const closeSession = () => {
    setSessionDayIndex(null);
    setSessionCustomDay(null);
    setSessionExIndex(0);
  };

  const sessionDay = sessionCustomDay || plan?.days?.[sessionDayIndex] || null;

  const nextSession = () => {
    if (!sessionDay) return;
    if (sessionExIndex < sessionDay.exercises.length - 1) {
      setSessionExIndex((i) => i + 1);
    } else {
      closeSession();
    }
  };

  const prevSession = () => {
    if (sessionExIndex > 0) setSessionExIndex((i) => i - 1);
  };

  const onRequestGif = async (exercise) => {
    if (!exercise?.id || !plan) return;
    try {
      const { url: gifUrl, resolvedId, source } = await fetchGifMeta(exercise);
      const updatedDays = plan.days.map((d) => ({
        ...d,
        exercises: d.exercises.map((ex) =>
          ex.id === exercise.id
            ? {
                ...ex,
                gifUrl,
                gifResolvedId: resolvedId || ex.gifResolvedId || "",
                gifSource: source || ex.gifSource || "",
              }
            : ex
        ),
      }));
      setPlan({ ...plan, days: updatedDays });
    } catch {
      // ignore
    }
  };

  const onReplaceExercise = async (dayTitle, ex, reason) => {
    if (!plan) return;
    const levelIndex = Math.max(0, niveles.indexOf(form.nivel));
    const updatedDays = [...plan.days];
    const dayIndex = updatedDays.findIndex((d) => d.title === dayTitle);
    if (dayIndex === -1) return;

    const day = updatedDays[dayIndex];
    const pool = exercisePool.length ? exercisePool : day.exercises;
    let mode = day.mode;
    let quiet = day.quiet;
    let equipmentList = Array.isArray(day.equipmentList) ? day.equipmentList : [];

    if (reason === "no-equipment") {
      mode = "week";
      equipmentList = ["body weight"];
    }
    if (reason === "space") {
      mode = "week";
      quiet = true;
    }

    const replacementList = await buildExercises(
      pool,
      mode,
      quiet,
      1,
      levelIndex,
      equipmentList
    );
    let replacement = replacementList[0];
    if (!replacement || replacement.id === ex.id) {
      const fallback = await buildExercises(
        pool,
        mode,
        quiet,
        2,
        levelIndex,
        equipmentList
      );
      replacement = fallback.find((r) => r.id !== ex.id) || fallback[0];
    }
    if (!replacement) return;

    const targetId = ex.instanceId || ex.id;
    const nextExercises = day.exercises.map((item) =>
      (item.instanceId || item.id) === targetId ? replacement : item
    );
    updatedDays[dayIndex] = { ...day, exercises: nextExercises };

    const updatedPlan = { ...plan, days: updatedDays };
    setPlan(updatedPlan);
    if (activeProfileId) {
      const keys = profileKeys(activeProfileId);
      localStorage.setItem(keys.plan, JSON.stringify(stripGifs(updatedPlan)));
      touchLocalChange();
    }
    const date = todayKey();
    const entryKey = `${date}::replace::${dayTitle}::${ex.id}`;
    const reasonLabel =
      reason === "no-equipment"
        ? "No tengo equipo"
        : reason === "space"
        ? "Necesita mucho espacio"
        : "Me incomoda";
    setHistory((prev) => {
      const dayHist = prev[date] || { items: [] };
      const item = {
        key: entryKey,
        date,
        dayTitle,
        name: `Cambio: ${ex.name} → ${replacement.name}`,
        type: "replace",
        reason: reasonLabel,
        xp: 0,
      };
      return {
        ...prev,
        [date]: { ...dayHist, items: [...dayHist.items, item] },
      };
    });
    setDetailEx({ ex: replacement, dayTitle });
  };

  const onSwitchProfile = (id) => {
    setActiveProfileId(id);
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  };

  const onAddProfile = () => {
    const name = newProfileName.trim();
    if (!name) return;
    const id = makeProfileId();
    const next = [...profiles, { id, name }];
    setProfiles(next);
    localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(next));
    touchLocalChange();
    setNewProfileName("");
    onSwitchProfile(id);
  };

  const onChangeLang = (value) => {
    setLang(value);
    if (activeProfileId) {
      const keys = profileKeys(activeProfileId);
      localStorage.setItem(keys.lang, value);
    }
  };

  const onRenameProfile = () => {
    const name = renameProfileName.trim();
    if (!name || !activeProfileId) return;
    const next = profiles.map((p) =>
      p.id === activeProfileId ? { ...p, name } : p
    );
    setProfiles(next);
    localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(next));
    touchLocalChange();
  };

  const onDeleteProfile = () => {
    if (profiles.length <= 1 || !activeProfileId) return;
    const ok = window.confirm("¿Eliminar este perfil? Se perderán sus datos.");
    if (!ok) return;
    const next = profiles.filter((p) => p.id !== activeProfileId);
    setProfiles(next);
    localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(next));
    touchLocalChange();

    const keys = profileKeys(activeProfileId);
    localStorage.removeItem(keys.profile);
    localStorage.removeItem(keys.plan);
    localStorage.removeItem(keys.progress);
    localStorage.removeItem(keys.progressDetails);

    const newActive = next[0].id;
    onSwitchProfile(newActive);
  };

  const onContinuePlan = () => {
    const el = document.getElementById("plan");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onGoToPlanDay = (dayIndex) => {
    setSidebarTab("plan");
    setSelectedPlanDayIndex(dayIndex);
    setTimeout(() => {
      const el = document.getElementById("plan");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const onAddExtraDay = async () => {
    if (!plan) return;
    const levelIndex = Math.max(0, niveles.indexOf(form.nivel));
    const sourcePool = exercisePool.length
      ? exercisePool
      : plan.pool?.length
      ? plan.pool
      : allExercises;
    const baseDay = plan.days?.[0];
    const count = Math.max(1, baseDay?.exercises?.length || 6);
    const mode = baseDay?.mode || "week";
    const quiet = typeof baseDay?.quiet === "boolean" ? baseDay.quiet : true;
    const equipmentList = Array.isArray(baseDay?.equipmentList) ? baseDay.equipmentList : [];

    const exercises = await buildExercises(
      sourcePool,
      mode,
      quiet,
      count,
      levelIndex,
      equipmentList
    );
    if (!exercises.length) return;

    const extraCount =
      (plan.days || []).filter((d) => String(d?.title || "").toLowerCase().startsWith("día extra"))
        .length + 1;
    const newDay = {
      title: `Día extra ${extraCount}`,
      mode,
      quiet,
      focus: "Extra",
      equipmentList,
      exercises,
      xp: 50 + levelIndex * 10 + exercises.length * 5,
    };

    const nextDays = [...(plan.days || []), newDay];
    const totalXp = nextDays.reduce((sum, d) => sum + (d.xp || 0), 0);
    const nextPlan = { ...plan, days: nextDays, totalXp };
    setPlan(nextPlan);

    if (activeProfileId) {
      const keys = profileKeys(activeProfileId);
      localStorage.setItem(keys.plan, JSON.stringify(stripGifs(nextPlan)));
      touchLocalChange();
    }

    onGoToPlanDay(nextDays.length - 1);
  };

  const onResetPlan = () => {
    if (!activeProfileId) return;
    const ok = window.confirm("¿Reiniciar plan y progreso de este perfil?");
    if (!ok) return;
    const keys = profileKeys(activeProfileId);
    localStorage.removeItem(keys.plan);
    localStorage.removeItem(keys.progress);
    localStorage.removeItem(keys.progressDetails);
    touchLocalChange();
    setPlan(null);
    setExercisePool([]);
    setCompleted({});
    setCompletedDetails({});
  };

  const buildBackupPayload = (keys) => ({
    profile: localStorage.getItem(keys.profile),
    plan: localStorage.getItem(keys.plan),
    progress: localStorage.getItem(keys.progress),
    progressDetails: localStorage.getItem(keys.progressDetails),
    history: localStorage.getItem(keys.history),
    metricsLog: localStorage.getItem(keys.metricsLog),
    lang: localStorage.getItem(keys.lang),
  });

  const onExport = () => {
    if (!activeProfileId) return;
    const keys = profileKeys(activeProfileId);
    const data = buildBackupPayload(keys);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fit-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = (e) => {
    if (!activeProfileId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const keys = profileKeys(activeProfileId);
        if (data.profile) localStorage.setItem(keys.profile, data.profile);
        if (data.plan) localStorage.setItem(keys.plan, data.plan);
        if (data.progress) localStorage.setItem(keys.progress, data.progress);
        if (data.progressDetails) localStorage.setItem(keys.progressDetails, data.progressDetails);
        if (data.history) localStorage.setItem(keys.history, data.history);
        if (data.metricsLog) localStorage.setItem(keys.metricsLog, data.metricsLog);
        if (data.lang) localStorage.setItem(keys.lang, data.lang);
        window.location.reload();
      } catch {
        alert("Archivo inválido.");
      }
    };
    reader.readAsText(file);
  };

  const onRestoreBackup = () => {
    if (!activeProfileId) return;
    const raw = localStorage.getItem(AUTO_BACKUP_KEY);
    if (!raw) {
      alert("No hay backup disponible.");
      return;
    }
    const ok = window.confirm("¿Restaurar el último backup automático?");
    if (!ok) return;
    try {
      const backup = JSON.parse(raw);
      const data = backup?.data || {};
      const keys = profileKeys(activeProfileId);
      if (data.profile) localStorage.setItem(keys.profile, data.profile);
      if (data.plan) localStorage.setItem(keys.plan, data.plan);
      if (data.progress) localStorage.setItem(keys.progress, data.progress);
      if (data.progressDetails) localStorage.setItem(keys.progressDetails, data.progressDetails);
      if (data.history) localStorage.setItem(keys.history, data.history);
      if (data.metricsLog) localStorage.setItem(keys.metricsLog, data.metricsLog);
      if (data.lang) localStorage.setItem(keys.lang, data.lang);
      window.location.reload();
    } catch {
      alert("Backup inválido.");
    }
  };

  const onRestorePrevBackup = () => {
    if (!activeProfileId) return;
    const raw = localStorage.getItem(AUTO_BACKUP_PREV_KEY);
    if (!raw) {
      alert("No hay backup anterior disponible.");
      return;
    }
    const ok = window.confirm("¿Restaurar el backup automático anterior?");
    if (!ok) return;
    try {
      const backup = JSON.parse(raw);
      const data = backup?.data || {};
      const keys = profileKeys(activeProfileId);
      if (data.profile) localStorage.setItem(keys.profile, data.profile);
      if (data.plan) localStorage.setItem(keys.plan, data.plan);
      if (data.progress) localStorage.setItem(keys.progress, data.progress);
      if (data.progressDetails) localStorage.setItem(keys.progressDetails, data.progressDetails);
      if (data.history) localStorage.setItem(keys.history, data.history);
      if (data.metricsLog) localStorage.setItem(keys.metricsLog, data.metricsLog);
      if (data.lang) localStorage.setItem(keys.lang, data.lang);
      window.location.reload();
    } catch {
      alert("Backup anterior inválido.");
    }
  };

  const renderCollapsible = (title, content, open = false) => (
    <details className="collapsible" open={open}>
      <summary>{title}</summary>
      <div className="collapsible-body">{content}</div>
    </details>
  );

  const formatBackupDate = (raw) => {
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw);
      const date = parsed?.createdAt ? new Date(parsed.createdAt) : null;
      if (!date || Number.isNaN(date.getTime())) return "";
      return date.toLocaleString();
    } catch {
      return "";
    }
  };
  const backupLastLabel = formatBackupDate(localStorage.getItem(AUTO_BACKUP_KEY));
  const backupPrevLabel = formatBackupDate(localStorage.getItem(AUTO_BACKUP_PREV_KEY));

  return (
    <div className="app-shell">
      <Sidebar
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSwitchProfile={onSwitchProfile}
        onAddProfile={onAddProfile}
        onRenameProfile={onRenameProfile}
        onDeleteProfile={onDeleteProfile}
        newProfileName={newProfileName}
        onChangeNewProfileName={setNewProfileName}
        renameProfileName={renameProfileName}
        onChangeRenameProfileName={setRenameProfileName}
        activeTab={sidebarTab}
        onChangeTab={setSidebarTab}
        profile={form}
        metrics={metrics}
        level={level}
        earnedXp={earnedXpTotal}
        totalPossibleXp={totalPossibleXp}
        plan={plan}
        completedCount={completedCount}
        totalExercises={totalExercises}
        trainedDaysTotal={trainedDaysTotal}
        trainedDaysThisMonth={trainedDaysThisMonth}
        trainingStreak={trainingStreak}
        selectedPlanDayIndex={selectedPlanDayIndex}
        onResetPlan={onResetPlan}
        onGoToPlanDay={onGoToPlanDay}
        onAddExtraDay={onAddExtraDay}
        dbStatus={dbStatus}
        onStartDbDownload={startDbDownload}
        gifStatus={gifStatus}
        onStartGifDownload={startGifDownload}
        lang={lang}
        onChangeLang={onChangeLang}
        metricsLog={metricsLog}
        onExport={onExport}
        onImport={onImport}
        onRestoreBackup={onRestoreBackup}
        onRestorePrevBackup={onRestorePrevBackup}
        backupLastLabel={backupLastLabel}
        backupPrevLabel={backupPrevLabel}
        authUser={authUser}
        authReady={authReady}
        authForm={authForm}
        onAuthChange={onAuthChange}
        onSignIn={onSignIn}
        onSignUp={onSignUp}
        onMagicLink={onMagicLink}
        onSignOut={onSignOut}
        authLoading={authLoading}
        authError={authError}
        syncStatus={syncStatus}
        syncRestoreSummary={lastSyncRestoreSummary}
        onSyncUp={onSyncUp}
        onSyncDown={onSyncDown}
        canSyncUp={canUploadSync}
        authEnabled={authEnabled}
        highContrast={highContrast}
        onToggleContrast={() => setHighContrast((v) => !v)}
      />

      <div className="page">
        <div className="card">
          {reminderPrompt && (
            <div className="reminder-banner">
              <span>Es hora de entrenar. ¿Quieres abrir tu plan?</span>
              <div className="reminder-actions">
                <button
                  type="button"
                  className="tiny primary-btn"
                  onClick={() => {
                    setSidebarTab("plan");
                    setReminderPrompt(false);
                    onContinuePlan();
                  }}
                >
                  Ir al plan
                </button>
                <button
                  type="button"
                  className="tiny"
                  onClick={() => setReminderPrompt(false)}
                >
                  Luego
                </button>
              </div>
            </div>
          )}
          {sidebarTab === "profile" && (
            <>
              <h1>Perfil inicial</h1>
              <p className="subtitle">
                Cuéntanos sobre ti para crear tu plan y calcular métricas.
              </p>

              {!plan && (
                <p className="note">
                  Completa tu perfil para generar el plan inicial.
                </p>
              )}

              {plan && (
                <div className="rest-panel">
                  <h3>Perfil</h3>
                  <p className="note">
                    Tu plan ya está creado. Si quieres cambiar tus datos,
                    presiona “Editar perfil”.
                  </p>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => setShowProfileForm(true)}
                  >
                    Editar perfil
                  </button>
                </div>
              )}

              {(showProfileForm || !plan) &&
                renderCollapsible(
                  "Formulario de perfil",
                  <>
                    <ProfileForm
                      form={form}
                      niveles={niveles}
                      actividad={actividad}
                      planTemplates={PLAN_TEMPLATES}
                      metrics={metrics}
                      loading={loadingPlan}
                      error={error}
                      onChange={onChange}
                      onToggleTrainDay={onToggleTrainDay}
                      onChangeReminderEnabled={onChangeReminderEnabled}
                      onChangeReminderTime={onChangeReminderTime}
                      onSubmit={(e) => {
                        onSubmit(e);
                        setShowProfileForm(false);
                      }}
                      onInfo={() => setShowInfo(true)}
                    />
                    <div style={{ marginTop: "12px" }}>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => {
                          setSidebarTab("history");
                          setTimeout(() => {
                            document.getElementById("metrics-log")?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }, 0);
                        }}
                      >
                        Ir a métricas
                      </button>
                    </div>
                  </>,
                  false
                )}
            </>
          )}

          {sidebarTab === "plan" && (
            <>
              {!plan && (
                <p className="note">
                  Aún no tienes plan. Ve a Perfil para generar uno.
                </p>
              )}
              <Plan
                plan={plan}
                onChangeDayMode={onChangeDayMode}
                onToggleQuiet={onToggleQuiet}
                onChangeDayEquipment={onChangeDayEquipment}
                onSelectExercise={onSelectExercise}
                completedMap={completed}
                getExerciseKey={getExerciseKey}
                getExerciseXp={getExerciseXp}
                earnedXp={earnedXpTotal}
                totalPossibleXp={totalPossibleXp}
                level={level}
                gifsLoading={gifsLoading}
                lang={lang}
                onStartSession={startSession}
                onStartFreeSession={startFreeSessionToday}
                activeProfileName={activeProfileName}
                activeExerciseKey={
                  detailEx?.ex ? getExerciseKey(detailEx.dayTitle, detailEx.ex) : ""
                }
                equipmentGroups={equipmentGroups}
                selectedDayIndex={selectedPlanDayIndex}
                onSelectDayIndex={setSelectedPlanDayIndex}
              />
            </>
          )}

          {sidebarTab === "history" && (
            <>
              {renderCollapsible(
                "Resumen muscular",
                <MuscleSummary history={history} lang={lang} />,
                false
              )}
              {renderCollapsible(
                "Resumen semanal",
                <WeeklyCharts history={history} lang={lang} goals={form} />,
                false
              )}
              {renderCollapsible(
                "Tendencia de métricas",
                <MetricsCharts metricsLog={metricsLog} lang={lang} />,
                false
              )}
              {renderCollapsible(
                "Registrar métricas",
                <div id="metrics-log">
                  <MetricsLogForm
                    metricsLog={metricsLog}
                    onAddEntry={onAddMetricsEntry}
                    onDeleteEntry={onDeleteMetricsEntry}
                    lang={lang}
                  />
                </div>,
                false
              )}
              {renderCollapsible(
                "Historial de entrenamientos",
                <HistoryWeek
                  history={history}
                  lang={lang}
                  plan={plan}
                  onRegisterPastExercise={onRegisterPastExercise}
                  onPreviewExercise={onSelectExercise}
                />,
                false
              )}
            </>
          )}

          {sidebarTab === "stats" && (
            <>
              <h2>Vista Stats</h2>
              <p className="note">
                Panel orientado a métricas de salud, tendencias y carga de datos Garmin.
              </p>
              {renderCollapsible(
                "Importar Garmin",
                <div className="metrics-log">
                  <p className="note">
                    Carga aquí la exportación de Garmin Connect (ZIP completo o archivos por actividad).
                  </p>
                  <div className="sidebar-actions">
                    <button
                      type="button"
                      className="tiny"
                      onClick={() => document.getElementById("garmin-import-input")?.click()}
                    >
                      Seleccionar archivos
                    </button>
                    {garminFiles.length > 0 && (
                      <button
                        type="button"
                        className="tiny"
                        onClick={() => {
                          setGarminFiles([]);
                          setGarminImportNote("");
                        }}
                      >
                        Limpiar
                      </button>
                    )}
                    <input
                      id="garmin-import-input"
                      type="file"
                      accept=".zip,.csv,.fit,.tcx,.gpx"
                      multiple
                      onChange={onSelectGarminFiles}
                      style={{ display: "none" }}
                    />
                  </div>
                  {garminImportNote && <p className="note">{garminImportNote}</p>}
                  {garminFiles.length > 0 && (
                    <ul className="history-list">
                      {garminFiles.slice(0, 10).map((f) => (
                        <li key={`${f.name}-${f.size}`}>
                          <strong>{f.name}</strong>
                          <span>{Math.round(f.size / 1024)} KB</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {garminFiles.length > 10 && (
                    <p className="note">+{garminFiles.length - 10} archivo(s) más…</p>
                  )}
                  <p className="note">
                    Próximo paso: parsear estos archivos y mapearlos a estadísticas de sueño, HRV,
                    FC reposo, carga y recuperación.
                  </p>
                </div>,
                true
              )}
              {renderCollapsible(
                "Estadísticas por tipo",
                <div className="stats-groups">
                  <section className="stats-group">
                    <h4>Recuperación y sueño</h4>
                    <div className="metrics-grid">
                      {renderStatsCard(
                        "Sueño (h)",
                        lastMetric?.sleepHours ? `${lastMetric.sleepHours} h` : "—",
                        "sleepHours",
                        "restHr"
                      )}
                      {renderStatsCard("Sleep score", "—", "sleepScore", "readiness")}
                      {renderStatsCard("HRV nocturna", "—", "hrv", "restHr")}
                      {renderStatsCard("Body Battery AM", "—", "bodyBattery", "sleepHours")}
                      {renderStatsCard("Readiness", "—", "readiness", "sleepHours")}
                      {renderStatsCard("Estrés diario", "—", "stress", "sleepHours")}
                    </div>
                  </section>
                  <section className="stats-group">
                    <h4>Cardio y carga</h4>
                    <div className="metrics-grid">
                      {renderStatsCard(
                        "FC reposo",
                        `${lastMetric?.restHr || "—"} bpm`,
                        "restHr",
                        "sleepHours"
                      )}
                      {renderStatsCard("VO2 max", "—", "vo2max", "restHr")}
                      {renderStatsCard("Carga 7d / 28d", "—", "loadRatio", "steps")}
                      {renderStatsCard("Pasos", lastMetric?.steps || "—", "steps", "sleepHours")}
                      {renderStatsCard("Días entrenados (mes)", trainedDaysThisMonth, "")}
                      {renderStatsCard("Racha actual", trainingStreak, "")}
                    </div>
                  </section>
                  <section className="stats-group">
                    <h4>Composición corporal</h4>
                    <div className="metrics-grid">
                      {renderStatsCard(
                        "Peso",
                        lastMetric?.weight ? `${lastMetric.weight} kg` : "—",
                        "weight",
                        "waist"
                      )}
                      {renderStatsCard(
                        "Cintura",
                        lastMetric?.waist ? `${lastMetric.waist} cm` : "—",
                        "waist",
                        "weight"
                      )}
                      {renderStatsCard(
                        "IMC",
                        metrics?.bmi ? metrics.bmi.toFixed(1) : "—",
                        "bmi",
                        "weight"
                      )}
                      {renderStatsCard("Categoría IMC", metrics?.bmiCat || "—", "")}
                      {renderStatsCard(
                        "WHtR",
                        metrics?.whtr ? metrics.whtr.toFixed(2) : "—",
                        "whtr",
                        "waist"
                      )}
                      {renderStatsCard(
                        "WHR",
                        metrics?.whr ? metrics.whr.toFixed(2) : "—",
                        "whr",
                        "waist"
                      )}
                      {renderStatsCard(
                        "% Grasa",
                        metrics?.bodyFat ? `${metrics.bodyFat.toFixed(1)}%` : "—",
                        "bodyFat",
                        "waist"
                      )}
                      {renderStatsCard(
                        "Masa magra",
                        metrics?.leanMass ? `${metrics.leanMass.toFixed(1)} kg` : "—",
                        "leanMass",
                        "weight"
                      )}
                      {renderStatsCard(
                        "FFMI",
                        metrics?.ffmi ? metrics.ffmi.toFixed(1) : "—",
                        "ffmi",
                        "leanMass"
                      )}
                    </div>
                  </section>
                  <section className="stats-group">
                    <h4>Metabolismo y tendencia</h4>
                    <div className="metrics-grid">
                      {renderStatsCard(
                        "TMB (BMR)",
                        metrics?.bmr ? `${Math.round(metrics.bmr)} kcal` : "—",
                        ""
                      )}
                      {renderStatsCard(
                        "TDEE",
                        metrics?.tdee ? `${Math.round(metrics.tdee)} kcal` : "—",
                        ""
                      )}
                      {renderStatsCard("Tendencia peso", trendSymbol("weight"), "weight", "waist")}
                      {renderStatsCard("Tendencia cintura", trendSymbol("waist"), "waist", "weight")}
                    </div>
                  </section>
                </div>,
                true
              )}
              {renderCollapsible(
                "Tendencia de métricas",
                <MetricsCharts metricsLog={metricsLog} lang={lang} />,
                false
              )}
              {renderCollapsible(
                "Registrar métricas",
                <div id="metrics-log-stats">
                  <MetricsLogForm
                    metricsLog={metricsLog}
                    onAddEntry={onAddMetricsEntry}
                    onDeleteEntry={onDeleteMetricsEntry}
                    lang={lang}
                  />
                </div>,
                false
              )}
            </>
          )}
        </div>

        <MetricsInfoModal
          open={showInfo}
          onClose={() => setShowInfo(false)}
        />

      <StatsMetricDrawer
        open={statsDrawer.open}
        metricKey={statsDrawer.metricKey}
        compareKey={statsDrawer.compareKey}
        metricsLog={metricsLog}
        onClose={() => setStatsDrawer((prev) => ({ ...prev, open: false }))}
        onChangeCompareKey={(nextKey) =>
          setStatsDrawer((prev) => ({ ...prev, compareKey: nextKey }))
        }
      />

      <ExerciseDrawer
        exercise={detailEx?.ex}
        dayTitle={detailEx?.dayTitle}
        completedMap={completed}
        completedDetails={completedDetails}
        onUpdateDetail={onUpdateDetail}
        onToggleComplete={onToggleComplete}
        onCompleteAndNext={onCompleteAndNext}
        getExerciseKey={getExerciseKey}
        onReplaceExercise={onReplaceExercise}
        onRequestGif={onRequestGif}
        onClose={() => setDetailEx(null)}
        onNext={onNextExercise}
        onPrev={onPrevExercise}
        isPersistent={isDesktop}
        lang={lang}
      />

      <SessionRunner
        open={sessionDayIndex !== null || Boolean(sessionCustomDay)}
        day={sessionDay}
        exerciseIndex={sessionExIndex}
        lang={lang}
        onClose={closeSession}
        onSave={onToggleComplete}
        onPrev={prevSession}
        onNext={nextSession}
        getExerciseKey={getExerciseKey}
        completedMap={completed}
        completedDetails={completedDetails}
        onUpdateDetail={onUpdateDetail}
      />

      {summaryOpen && summaryData && (
        <div className="overlay" onClick={() => setSummaryOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Resumen del día</h3>
            <div className="summary-grid">
              <div>
                <span>Día</span>
                <strong>{summaryData.dayTitle}</strong>
              </div>
              <div>
                <span>Completados</span>
                <strong>
                  {summaryData.doneCount} / {summaryData.dayTotal}
                </strong>
              </div>
              <div>
                <span>XP ganado</span>
                <strong>{summaryData.dayXp}</strong>
              </div>
              <div>
                <span>Minutos estimados</span>
                <strong>{summaryData.minutes} min</strong>
              </div>
            </div>
            <div className="summary-actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setSummaryOpen(false);
                }}
              >
                Guardar y cerrar
              </button>
              <button
                type="button"
                className="tiny"
                onClick={() => {
                  setSummaryOpen(false);
                  addMoreExercises(summaryData.dayTitle, 2);
                }}
              >
                Agregar más ejercicios
              </button>
            </div>
          </div>
        </div>
      )}
      <nav className="mobile-nav">
        <button
          type="button"
          className="menu-btn"
          onClick={() => setMobileMenuOpen(true)}
        >
          Menú
        </button>
        <button
          type="button"
          className={sidebarTab === "profile" ? "active" : ""}
          onClick={() => {
            setSidebarTab("profile");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          Perfil
        </button>
        <button
          type="button"
          className={sidebarTab === "plan" ? "active" : ""}
          onClick={() => {
            setSidebarTab("plan");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          Plan
        </button>
        <button
          type="button"
          className={sidebarTab === "history" ? "active" : ""}
          onClick={() => {
            setSidebarTab("history");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          Historial
        </button>
        <button
          type="button"
          className={sidebarTab === "stats" ? "active" : ""}
          onClick={() => {
            setSidebarTab("stats");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          Stats
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-head">
              <strong>Menú</strong>
              <button type="button" className="tiny" onClick={() => setMobileMenuOpen(false)}>
                Cerrar
              </button>
            </div>
            <Sidebar
              profiles={profiles}
              activeProfileId={activeProfileId}
              onSwitchProfile={onSwitchProfile}
              onAddProfile={onAddProfile}
              onRenameProfile={onRenameProfile}
              onDeleteProfile={onDeleteProfile}
              newProfileName={newProfileName}
              onChangeNewProfileName={setNewProfileName}
              renameProfileName={renameProfileName}
              onChangeRenameProfileName={setRenameProfileName}
              activeTab={sidebarTab}
              onChangeTab={setSidebarTab}
              profile={form}
              metrics={metrics}
              level={level}
              earnedXp={earnedXpTotal}
              totalPossibleXp={totalPossibleXp}
              plan={plan}
              completedCount={completedCount}
              totalExercises={totalExercises}
              trainedDaysTotal={trainedDaysTotal}
              trainedDaysThisMonth={trainedDaysThisMonth}
              trainingStreak={trainingStreak}
              selectedPlanDayIndex={selectedPlanDayIndex}
              onResetPlan={onResetPlan}
              onGoToPlanDay={(idx) => {
                onGoToPlanDay(idx);
                setMobileMenuOpen(false);
              }}
              onAddExtraDay={async () => {
                await onAddExtraDay();
                setMobileMenuOpen(false);
              }}
              dbStatus={dbStatus}
              onStartDbDownload={startDbDownload}
              gifStatus={gifStatus}
              onStartGifDownload={startGifDownload}
              lang={lang}
              onChangeLang={onChangeLang}
              metricsLog={metricsLog}
              onExport={onExport}
              onImport={onImport}
              onRestoreBackup={onRestoreBackup}
              onRestorePrevBackup={onRestorePrevBackup}
              backupLastLabel={backupLastLabel}
              backupPrevLabel={backupPrevLabel}
              authUser={authUser}
              authReady={authReady}
              authForm={authForm}
              onAuthChange={onAuthChange}
              onSignIn={onSignIn}
              onSignUp={onSignUp}
              onMagicLink={onMagicLink}
              onSignOut={onSignOut}
              authLoading={authLoading}
              authError={authError}
              syncStatus={syncStatus}
              syncRestoreSummary={lastSyncRestoreSummary}
              onSyncUp={onSyncUp}
              onSyncDown={onSyncDown}
              canSyncUp={canUploadSync}
              authEnabled={authEnabled}
              highContrast={highContrast}
              onToggleContrast={() => setHighContrast((v) => !v)}
            />
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
