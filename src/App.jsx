import "./index.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  actividad,
  buildExercises,
  calculateMetrics,
  fetchGifUrl,
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
import {
  countExercises,
  getMeta,
  setMeta,
  upsertExercises,
} from "./utils/idb";
import { supabase } from "./utils/supabaseClient";
import { applyCloudPayload, downloadCloud, uploadCloud } from "./utils/cloudSync";

const PROFILE_LIST_KEY = "fit_profiles";
const ACTIVE_PROFILE_KEY = "fit_active_profile";
const DB_COMPLETE_KEY = "exercises_complete";
const LOCAL_SYNC_KEY = "fit_last_local_change";

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
  const neck = toNum(profile?.cuello);
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
  const avg = (xpRatio + minRatio) / 2;
  if (avg >= 1.1) return 1;
  if (avg <= 0.4) return -1;
  return 0;
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
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const authEnabled = Boolean(supabase);
  const [localChangeTick, setLocalChangeTick] = useState(0);
  const lastAutoSyncRef = useRef(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem("fit_high_contrast") === "1";
  });

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

  const metrics = useMemo(() => calculateMetrics(form), [form]);
  const allExercises = useMemo(() => {
    if (!plan) return [];
    return plan.days.flatMap((d) => d.exercises);
  }, [plan]);

  const XP_BASE = 10;
  const XP_TIME_BONUS = 5;

  const getExerciseKey = (dayTitle, ex) => `${dayTitle}::${ex.id || ex.name}`;

  const getExerciseXp = (ex) =>
    XP_BASE + (ex.prescription?.type === "time" ? XP_TIME_BONUS : 0);

  const todayKey = () => new Date().toISOString().slice(0, 10);

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

  const level = Math.max(1, Math.floor(earnedXp / 300) + 1);

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
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null);
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
    if (!authUser) return;
    autoSync();
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    if (!progressReady) return;
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
  }, [authUser, localChangeTick, progressReady]);

  useEffect(() => {
    if (!plan) {
      setDetailEx(null);
    }
  }, [plan]);

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
      const BATCH_SIZE = 20;
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
    if (!activeProfileId) return;
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
        if (parsed?.days) setPlan(parsed);
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
  }, [activeProfileId]);

  useEffect(() => {
    if (!progressReady || !activeProfileId) return;
    const keys = profileKeys(activeProfileId);
    localStorage.setItem(keys.progress, JSON.stringify(completed));
    touchLocalChange();
  }, [completed, progressReady, activeProfileId]);

  useEffect(() => {
    if (!progressReady || !activeProfileId) return;
    const keys = profileKeys(activeProfileId);
    localStorage.setItem(keys.progressDetails, JSON.stringify(completedDetails));
    touchLocalChange();
  }, [completedDetails, progressReady, activeProfileId]);

  useEffect(() => {
    if (!progressReady || !activeProfileId) return;
    const keys = profileKeys(activeProfileId);
    localStorage.setItem(keys.history, JSON.stringify(history));
    touchLocalChange();
  }, [history, progressReady, activeProfileId]);

  useEffect(() => {
    if (!progressReady || !activeProfileId) return;
    const keys = profileKeys(activeProfileId);
    localStorage.setItem(keys.metricsLog, JSON.stringify(metricsLog));
    touchLocalChange();
  }, [metricsLog, progressReady, activeProfileId]);

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

  const autoSync = async () => {
    if (!authUser) return;
    try {
      const localUpdated = localStorage.getItem(LOCAL_SYNC_KEY);
      const cloudPayload = await downloadCloud();

      if (!cloudPayload) {
        await uploadCloud();
        setSyncStatus("Sincronizado ✓");
        setTimeout(() => setSyncStatus(""), 1500);
        return;
      }

      const cloudUpdated = cloudPayload?.meta?.updatedAt || null;
      if (!localUpdated) {
        applyCloudPayload(cloudPayload);
        setSyncStatus("Datos restaurados ✓");
        setTimeout(() => window.location.reload(), 300);
        return;
      }

      if (cloudUpdated && cloudUpdated > localUpdated) {
        const ok = window.confirm(
          "Se encontraron datos más recientes en la nube. ¿Quieres usarlos? (Cancelar mantiene tus datos locales)"
        );
        if (ok) {
          applyCloudPayload(cloudPayload);
          setSyncStatus("Datos restaurados ✓");
          setTimeout(() => window.location.reload(), 300);
          return;
        }
      }

      await uploadCloud();
      setSyncStatus("Sincronizado ✓");
      setTimeout(() => setSyncStatus(""), 1500);
    } catch (e) {
      setSyncStatus(e?.message || "Error al sincronizar");
      setTimeout(() => setSyncStatus(""), 2000);
    }
  };

  const onSyncUp = async () => {
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
      applyCloudPayload(payload);
      setSyncStatus("Datos restaurados ✓");
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
    } catch (err) {
      setError("No se pudo generar el plan. Revisa tu API key.");
    } finally {
      setLoadingPlan(false);
    }
  };

  const onAddMetricsEntry = (entry) => {
    const derived = computeDerivedMetrics(entry, form);
    setMetricsLog((prev) => {
      const cleaned = prev.filter((e) => e.date !== entry.date);
      const next = [...cleaned, { ...entry, ...derived }];
      next.sort((a, b) => (a.date < b.date ? -1 : 1));
      return next;
    });
    touchLocalChange();
  };

  const onDeleteMetricsEntry = (date) => {
    setMetricsLog((prev) => prev.filter((e) => e.date !== date));
    touchLocalChange();
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
      levelIndex
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
    }
    setDetailEx(null);
  };

  const onToggleQuiet = async (dayIndex, quiet) => {
    if (!plan) return;
    const levelIndex = Math.max(0, niveles.indexOf(form.nivel));
    const updatedDays = [...plan.days];
    const day = updatedDays[dayIndex];

    const exercises = await buildExercises(
      exercisePool.length ? exercisePool : day.exercises,
      day.mode,
      quiet,
      day.exercises.length || 4,
      levelIndex
    );

    updatedDays[dayIndex] = {
      ...day,
      quiet,
      exercises,
    };

    const updatedPlan = { ...plan, days: updatedDays };
    setPlan(updatedPlan);
    if (activeProfileId) {
      const keys = profileKeys(activeProfileId);
      localStorage.setItem(keys.plan, JSON.stringify(stripGifs(updatedPlan)));
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
    const day = plan.days.find((d) => d.title === detailEx.dayTitle);
    if (day) {
      const idx = day.exercises.findIndex((e) => e.id === detailEx.ex.id);
      const next = day.exercises[(idx + 1) % day.exercises.length];
      setDetailEx({ ex: next, dayTitle: detailEx.dayTitle });
      return;
    }
    if (allExercises.length === 0) return;
    const idx = allExercises.findIndex((e) => e.id === detailEx.ex.id);
    const next = allExercises[(idx + 1) % allExercises.length];
    setDetailEx({ ex: next, dayTitle: detailEx.dayTitle });
  };

  const onPrevExercise = () => {
    if (!detailEx?.ex || !plan) return;
    const day = plan.days.find((d) => d.title === detailEx.dayTitle);
    if (day) {
      const idx = day.exercises.findIndex((e) => e.id === detailEx.ex.id);
      const prevIndex = (idx - 1 + day.exercises.length) % day.exercises.length;
      const prev = day.exercises[prevIndex];
      setDetailEx({ ex: prev, dayTitle: detailEx.dayTitle });
      return;
    }
    if (allExercises.length === 0) return;
    const idx = allExercises.findIndex((e) => e.id === detailEx.ex.id);
    const prevIndex = (idx - 1 + allExercises.length) % allExercises.length;
    const prev = allExercises[prevIndex];
    setDetailEx({ ex: prev, dayTitle: detailEx.dayTitle });
  };

  const getNextExerciseInDay = (dayTitle, ex) => {
    if (!plan) return null;
    const day = plan.days.find((d) => d.title === dayTitle);
    if (!day) return null;
    const idx = day.exercises.findIndex((e) => e.id === ex.id);
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

  const openDaySummary = (dayTitle) => {
    if (!plan) return;
    const day = plan.days.find((d) => d.title === dayTitle);
    if (!day) return;
    const dayTotal = day.exercises.length;
    const doneCount = day.exercises.filter((ex) =>
      completed[getExerciseKey(dayTitle, ex)]
    ).length;
    const dayXp = day.exercises.reduce((sum, ex) => {
      return sum + (completed[getExerciseKey(dayTitle, ex)] ? getExerciseXp(ex) : 0);
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
    const extra = await buildExercises(pool, day.mode, day.quiet, count, levelIndex);
    const nextExercises = [...day.exercises, ...extra];
    updatedDays[dayIndex] = { ...day, exercises: nextExercises };
    const updatedPlan = { ...plan, days: updatedDays };
    setPlan(updatedPlan);
    if (activeProfileId) {
      const keys = profileKeys(activeProfileId);
      localStorage.setItem(keys.plan, JSON.stringify(stripGifs(updatedPlan)));
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
          openDaySummary(dayTitle);
        }
      }
    }
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
    const day = plan.days[dayIndex];
    const ex = day.exercises[0];
    if (ex) {
      setDetailEx({ ex, dayTitle: day.title });
    }
  };

  const closeSession = () => {
    setSessionDayIndex(null);
    setSessionExIndex(0);
  };

  const sessionDay = plan?.days?.[sessionDayIndex] || null;

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
      const gifUrl = await fetchGifUrl(exercise.id);
      const updatedDays = plan.days.map((d) => ({
        ...d,
        exercises: d.exercises.map((ex) =>
          ex.id === exercise.id ? { ...ex, gifUrl } : ex
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

    if (reason === "no-equipment") {
      mode = "week";
    }
    if (reason === "space") {
      mode = "week";
      quiet = true;
    }

    const replacementList = await buildExercises(pool, mode, quiet, 1, levelIndex);
    let replacement = replacementList[0];
    if (!replacement || replacement.id === ex.id) {
      const fallback = await buildExercises(pool, mode, quiet, 2, levelIndex);
      replacement = fallback.find((r) => r.id !== ex.id) || fallback[0];
    }
    if (!replacement) return;

    const nextExercises = day.exercises.map((item) =>
      item.id === ex.id ? replacement : item
    );
    updatedDays[dayIndex] = { ...day, exercises: nextExercises };

    const updatedPlan = { ...plan, days: updatedDays };
    setPlan(updatedPlan);
    if (activeProfileId) {
      const keys = profileKeys(activeProfileId);
      localStorage.setItem(keys.plan, JSON.stringify(stripGifs(updatedPlan)));
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

  const onExport = () => {
    if (!activeProfileId) return;
    const keys = profileKeys(activeProfileId);
    const data = {
      profile: localStorage.getItem(keys.profile),
      plan: localStorage.getItem(keys.plan),
      progress: localStorage.getItem(keys.progress),
      progressDetails: localStorage.getItem(keys.progressDetails),
      history: localStorage.getItem(keys.history),
      metricsLog: localStorage.getItem(keys.metricsLog),
      lang: localStorage.getItem(keys.lang),
    };
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
        level={level}
        earnedXp={earnedXp}
        totalPossibleXp={totalPossibleXp}
        plan={plan}
        completedCount={completedCount}
        totalExercises={totalExercises}
        onContinuePlan={onContinuePlan}
        onResetPlan={onResetPlan}
        dbStatus={dbStatus}
        onStartDbDownload={startDbDownload}
        lang={lang}
        onChangeLang={onChangeLang}
        metricsLog={metricsLog}
        onExport={onExport}
        onImport={onImport}
        authUser={authUser}
        authForm={authForm}
        onAuthChange={onAuthChange}
        onSignIn={onSignIn}
        onSignUp={onSignUp}
        onMagicLink={onMagicLink}
        onSignOut={onSignOut}
        authLoading={authLoading}
        authError={authError}
        syncStatus={syncStatus}
        onSyncUp={onSyncUp}
        onSyncDown={onSyncDown}
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

              {(showProfileForm || !plan) && (
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
                </>
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
                onSelectExercise={onSelectExercise}
                completedMap={completed}
                completedDetails={completedDetails}
                onUpdateDetail={onUpdateDetail}
                getExerciseKey={getExerciseKey}
                getExerciseXp={getExerciseXp}
                earnedXp={earnedXp}
                totalPossibleXp={totalPossibleXp}
                level={level}
                gifsLoading={gifsLoading}
                lang={lang}
                onStartSession={startSession}
                metrics={metrics}
                onInfoMetrics={() => setShowInfo(true)}
                activeExerciseKey={
                  detailEx?.ex ? getExerciseKey(detailEx.dayTitle, detailEx.ex) : ""
                }
              />
            </>
          )}

          {sidebarTab === "history" && (
            <>
              <MuscleSummary history={history} lang={lang} />
              <WeeklyCharts history={history} lang={lang} goals={form} />
              <MetricsCharts metricsLog={metricsLog} lang={lang} />
              <div id="metrics-log">
                <MetricsLogForm
                  metricsLog={metricsLog}
                  onAddEntry={onAddMetricsEntry}
                  onDeleteEntry={onDeleteMetricsEntry}
                  lang={lang}
                />
              </div>
              <HistoryWeek history={history} lang={lang} />
            </>
          )}
        </div>

        <MetricsInfoModal
          open={showInfo && sidebarTab === "profile"}
          onClose={() => setShowInfo(false)}
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
        isDesktop={isDesktop}
        lang={lang}
      />

      <SessionRunner
        open={sessionDayIndex !== null}
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
      </div>
    </div>
  );
}
