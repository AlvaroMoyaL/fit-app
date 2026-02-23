import { supabase } from "./supabaseClient";

const PROFILE_LIST_KEY = "fit_profiles";
const ACTIVE_PROFILE_KEY = "fit_active_profile";
const LOCAL_SYNC_KEY = "fit_last_local_change";

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

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function inferProfileNameFromBlock(block, fallbackName) {
  const parsed = safeParse(block?.profile);
  return parsed?.profile?.nombre || parsed?.nombre || fallbackName;
}

function deriveProfileIdsFromStorage(activeProfileId) {
  const ids = new Set();
  if (activeProfileId) ids.add(activeProfileId);
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i) || "";
    const m = k.match(
      /^fit_(?:profile|plan|progress|progress_details|history|metrics_log|lang):(.+)$/
    );
    if (m?.[1]) ids.add(m[1]);
  }
  return Array.from(ids);
}

export function buildCloudPayload() {
  const profilesRaw = localStorage.getItem(PROFILE_LIST_KEY);
  const parsedProfiles = profilesRaw ? safeParse(profilesRaw) : [];
  const activeProfileId = localStorage.getItem(ACTIVE_PROFILE_KEY) || "";
  const updatedAt =
    localStorage.getItem(LOCAL_SYNC_KEY) || new Date().toISOString();

  let profiles = Array.isArray(parsedProfiles)
    ? parsedProfiles.filter((p) => p?.id)
    : [];
  if (!profiles.length) {
    const inferredIds = deriveProfileIdsFromStorage(activeProfileId);
    profiles = inferredIds.map((id, index) => {
      const keys = profileKeys(id);
      const block = {
        profile: localStorage.getItem(keys.profile),
      };
      return {
        id,
        name: inferProfileNameFromBlock(block, `Perfil ${index + 1}`),
      };
    });
  }

  const dataByProfile = {};
  profiles.forEach((p) => {
    const keys = profileKeys(p.id);
    dataByProfile[p.id] = {
      profile: localStorage.getItem(keys.profile),
      plan: localStorage.getItem(keys.plan),
      progress: localStorage.getItem(keys.progress),
      progressDetails: localStorage.getItem(keys.progressDetails),
      history: localStorage.getItem(keys.history),
      metricsLog: localStorage.getItem(keys.metricsLog),
      lang: localStorage.getItem(keys.lang),
    };
  });

  // Legacy fallback (single-profile keys without suffix)
  if (!profiles.length) {
    const legacyProfile = localStorage.getItem("fit_profile");
    const legacyPlan = localStorage.getItem("fit_plan");
    const legacyProgress = localStorage.getItem("fit_progress");
    const legacyProgressDetails = localStorage.getItem("fit_progress_details");
    const legacyHistory = localStorage.getItem("fit_history");
    const legacyMetricsLog = localStorage.getItem("fit_metrics_log");
    const legacyLang = localStorage.getItem("fit_lang");
    const hasLegacyData = Boolean(
      legacyProfile ||
        legacyPlan ||
        legacyProgress ||
        legacyProgressDetails ||
        legacyHistory ||
        legacyMetricsLog ||
        legacyLang
    );
    if (hasLegacyData) {
      const legacyId = activeProfileId || "legacy-default";
      const fallbackBlock = { profile: legacyProfile };
      profiles = [
        {
          id: legacyId,
          name: inferProfileNameFromBlock(fallbackBlock, "Perfil legado"),
        },
      ];
      dataByProfile[legacyId] = {
        profile: legacyProfile,
        plan: legacyPlan,
        progress: legacyProgress,
        progressDetails: legacyProgressDetails,
        history: legacyHistory,
        metricsLog: legacyMetricsLog,
        lang: legacyLang,
      };
    }
  }

  return {
    meta: {
      updatedAt,
      version: 1,
    },
    profiles,
    activeProfileId,
    dataByProfile,
  };
}

export function applyCloudPayload(payload) {
  if (!payload) return;
  const { profiles, activeProfileId, dataByProfile, meta } = payload;
  let resolvedProfiles = Array.isArray(profiles) ? profiles.filter((p) => p?.id) : [];
  if (!resolvedProfiles.length && dataByProfile && typeof dataByProfile === "object") {
    resolvedProfiles = Object.keys(dataByProfile).map((id, index) => {
      const block = dataByProfile[id] || {};
      let name = `Perfil ${index + 1}`;
      try {
        const parsed = block.profile ? JSON.parse(block.profile) : null;
        name = parsed?.profile?.nombre || parsed?.nombre || name;
      } catch {
        // keep fallback name
      }
      return { id, name };
    });
  }

  if (resolvedProfiles.length) {
    localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(resolvedProfiles));
  }

  const hasActiveInProfiles = resolvedProfiles.some((p) => p.id === activeProfileId);
  if (activeProfileId && hasActiveInProfiles) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
  } else if (resolvedProfiles.length) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, resolvedProfiles[0].id);
  }

  if (dataByProfile && typeof dataByProfile === "object") {
    Object.keys(dataByProfile).forEach((id) => {
      const keys = profileKeys(id);
      const block = dataByProfile[id] || {};
      if (block.profile !== undefined && block.profile !== null) {
        localStorage.setItem(keys.profile, block.profile);
      }
      if (block.plan !== undefined && block.plan !== null) {
        localStorage.setItem(keys.plan, block.plan);
      }
      if (block.progress !== undefined && block.progress !== null) {
        localStorage.setItem(keys.progress, block.progress);
      }
      if (block.progressDetails)
        localStorage.setItem(keys.progressDetails, block.progressDetails);
      if (block.history !== undefined && block.history !== null) {
        localStorage.setItem(keys.history, block.history);
      }
      const metricsLogRaw =
        block.metricsLog !== undefined && block.metricsLog !== null
          ? block.metricsLog
          : block.metrics;
      if (metricsLogRaw !== undefined && metricsLogRaw !== null) {
        localStorage.setItem(keys.metricsLog, metricsLogRaw);
      }
      if (block.lang) localStorage.setItem(keys.lang, block.lang);
    });
  }
  if (meta?.updatedAt) {
    localStorage.setItem(LOCAL_SYNC_KEY, meta.updatedAt);
  }
}

export async function uploadCloud() {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("No hay sesión activa");
  const payload = buildCloudPayload();
  const { data, error } = await supabase
    .from("fit_cloud")
    .upsert({ user_id: userId, payload }, { onConflict: "user_id" })
    .select();
  if (error) throw error;

  // Best effort versioning: if fit_cloud_versions exists, keep history snapshots.
  try {
    await supabase.from("fit_cloud_versions").insert({ user_id: userId, payload });
  } catch {
    // ignore (table may not exist yet)
  }

  return data;
}

export async function downloadCloud() {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("No hay sesión activa");
  const { data, error } = await supabase
    .from("fit_cloud")
    .select("payload")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.payload || null;
}
