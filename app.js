const PLAN = window.PLAN || [];
const LIBRARY = window.EXERCISE_LIBRARY || {};

const appHeader = document.getElementById("app-header");
const authView = document.getElementById("auth-view");
const appView = document.getElementById("app-view");
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const loginButton = document.getElementById("login-button");
const authMessage = document.getElementById("auth-message");
const userEmail = document.getElementById("user-email");
const logoutButton = document.getElementById("logout");
const tabs = document.getElementById("tabs");
const dateInput = document.getElementById("date");
const exportButton = document.getElementById("export");
const exportJsonButton = document.getElementById("export-json");
const importJsonInput = document.getElementById("import-json");
const backupStatus = document.getElementById("backup-status");
const autofillButton = document.getElementById("autofill");
const autofillDay = document.getElementById("autofill-day");
const checkButton = document.getElementById("check");
const statusEl = document.getElementById("status");
const analyticsStatus = document.getElementById("analytics-status");
const daysEl = document.getElementById("days");
const toast = document.getElementById("toast");
const themeToggle = document.getElementById("theme-toggle");
const themeToggle2 = document.getElementById("theme-toggle-2");
const fontToggle = document.getElementById("font-toggle");
const installButton = document.getElementById("install");
const installHint = document.getElementById("install-hint");
const librarySearch = document.getElementById("library-search");
const libraryList = document.getElementById("library-list");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");
const timerDisplay = document.getElementById("timer-display");
const timerStop = document.getElementById("timer-stop");
const weeklySummary = document.getElementById("weekly-summary");
const exerciseSelect = document.getElementById("exercise-select");
const recommendations = document.getElementById("recommendations");
const bodyForm = document.getElementById("body-form");
const bodyDate = document.getElementById("body-date");
const bodyWeight = document.getElementById("body-weight");
const bodyWaist = document.getElementById("body-waist");
const bodySleep = document.getElementById("body-sleep");
const bodyMood = document.getElementById("body-mood");
const bodySmoking = document.getElementById("body-smoking");
const bodyNotes = document.getElementById("body-notes");
const bodyHistory = document.getElementById("body-history");
const datesForm = document.getElementById("dates-form");
const gtoDateInput = document.getElementById("gto-date");
const raceDateInput = document.getElementById("race-date");
const countdownEl = document.getElementById("countdown");
const gtoForm = document.getElementById("gto-form");
const gtoTestDate = document.getElementById("gto-test-date");
const gtoPullups = document.getElementById("gto-pullups");
const gtoPushups = document.getElementById("gto-pushups");
const gtoSitups = document.getElementById("gto-situps");
const gtoBend = document.getElementById("gto-bend");
const gtoSprint = document.getElementById("gto-sprint");
const gtoRun3 = document.getElementById("gto-run3");
const gtoNotes = document.getElementById("gto-notes");
const gtoMetricSelect = document.getElementById("gto-metric");
const gtoHistory = document.getElementById("gto-history");
const runForm = document.getElementById("run-form");
const runDate = document.getElementById("run-date");
const runDistance = document.getElementById("run-distance");
const runDuration = document.getElementById("run-duration");
const runHr = document.getElementById("run-hr");
const runSurface = document.getElementById("run-surface");
const runNotes = document.getElementById("run-notes");
const runHistory = document.getElementById("run-history");

const SETTINGS_KEY = "training-log-settings";

function todayIso() {
  const value = new Date();
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function dayForDate(value) {
  const weekday = new Date(value + "T00:00:00").getDay();
  if (weekday === 1) return "mon";
  if (weekday === 3) return "wed";
  if (weekday === 5) return "fri";
  return "mon";
}

dateInput.value = todayIso();
autofillDay.value = dayForDate(dateInput.value);
bodyDate.value = todayIso();
gtoTestDate.value = todayIso();
runDate.value = todayIso();

let currentDate = dateInput.value;
let currentView = "workout";
let currentUser = null;
let currentUserId = null;
let state = new Map();
let saveTimer = null;
let saveChain = Promise.resolve();
let toastTimer = null;
let timerInterval = null;
let timerEnd = 0;
let audioCtx = null;
let deferredPrompt = null;

const analytics = {
  loaded: false,
  workouts: [],
  body: [],
  gto: [],
  runs: [],
  errors: []
};

const charts = {};

let settings = { theme: "dark", font: "normal", gtoDate: "", raceDate: "" };
try {
  settings = { ...settings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
} catch (_error) {
  settings = { theme: "dark", font: "normal", gtoDate: "", raceDate: "" };
}

gtoDateInput.value = settings.gtoDate || "";
raceDateInput.value = settings.raceDate || "";

const supabaseUrl = window.SUPABASE_URL || "";
const supabaseAnonKey = window.SUPABASE_ANON_KEY || "";
const configured =
  supabaseUrl &&
  !supabaseUrl.includes("YOUR_PROJECT") &&
  supabaseAnonKey &&
  !supabaseAnonKey.includes("YOUR_ANON") &&
  typeof window.supabase !== "undefined" &&
  typeof window.supabase.createClient === "function";

const sb = configured
  ? window.supabase.createClient(supabaseUrl, supabaseAnonKey)
  : null;

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function formatDateShort(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}.${month}`;
}

function parseTimeToSeconds(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (/^\d+$/.test(text)) return Number(text);
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatSeconds(value) {
  if (!Number.isFinite(value)) return "—";
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function applySettings() {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.dataset.font = settings.font;

  themeToggle.textContent = settings.theme === "dark" ? "☀️" : "🌙";
  themeToggle2.textContent = settings.theme === "dark" ? "Светлая тема" : "Тёмная тема";
  fontToggle.textContent = settings.font === "large" ? "Обычный шрифт" : "Крупный шрифт";

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute("content", settings.theme === "dark" ? "#0f1115" : "#f4f6fa");
  }

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (_error) {
    // ignore
  }
}

function toggleTheme() {
  settings.theme = settings.theme === "dark" ? "light" : "dark";
  applySettings();
  if (analytics.loaded) renderCurrentView();
}

function toggleFont() {
  settings.font = settings.font === "large" ? "normal" : "large";
  applySettings();
}

function makeInput(dayId, exerciseName, field, placeholder) {
  const input = document.createElement("input");
  input.type = "text";
  input.dataset.day = dayId;
  input.dataset.ex = exerciseName;
  input.dataset.field = field;
  input.placeholder = placeholder;
  input.autocomplete = "off";
  if (field === "rpe" || field === "pain") input.inputMode = "decimal";
  return input;
}

function renderPlan() {
  daysEl.innerHTML = "";

  PLAN.forEach((day) => {
    const section = document.createElement("section");
    section.className = "day";

    const heading = document.createElement("h2");
    heading.textContent = day.title;
    const sub = document.createElement("p");
    sub.className = "sub";
    sub.textContent = day.subtitle;
    section.append(heading, sub);

    day.items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "ex";

      const top = document.createElement("div");
      top.className = "ex-top";

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = item.name + (item.isNew ? " 🆕" : "");

      const right = document.createElement("span");
      right.className = "ex-right";

      const target = document.createElement("span");
      target.className = "target";
      target.textContent = item.target;

      const info = document.createElement("button");
      info.type = "button";
      info.className = "info";
      info.dataset.ex = item.name;
      info.textContent = "i";
      info.setAttribute("aria-label", `Описание: ${item.name}`);

      right.append(target, info);
      top.append(name, right);
      card.appendChild(top);

      if (item.cardio) {
        const one = document.createElement("div");
        one.className = "one";
        const label = document.createElement("label");
        label.textContent = "Факт: минуты / пульс";
        label.appendChild(makeInput(day.id, item.name, "set1", "например 25 мин / 125"));
        one.appendChild(label);
        card.appendChild(one);
      } else {
        const sets = document.createElement("div");
        sets.className = "sets";
        [1, 2, 3].forEach((n) => {
          const label = document.createElement("label");
          label.textContent = `Подход ${n}`;
          label.appendChild(makeInput(day.id, item.name, `set${n}`, "кг×повт"));
          sets.appendChild(label);
        });
        card.appendChild(sets);

        const meta = document.createElement("div");
        meta.className = "meta";
        const rpeLabel = document.createElement("label");
        rpeLabel.textContent = "RPE";
        rpeLabel.appendChild(makeInput(day.id, item.name, "rpe", "6–8"));
        const painLabel = document.createElement("label");
        painLabel.textContent = "Боль в плече 0–10";
        painLabel.appendChild(makeInput(day.id, item.name, "pain", "0"));
        meta.append(rpeLabel, painLabel);
        card.appendChild(meta);
      }

      if (item.note) {
        const note = document.createElement("div");
        note.className = "note";
        note.textContent = item.note;
        card.appendChild(note);
      }

      section.appendChild(card);
    });

    daysEl.appendChild(section);
  });
}

function keyFor(dayId, exerciseName) {
  return `${dayId}|${exerciseName}`;
}

function emptyEntry() {
  return { set1: "", set2: "", set3: "", rpe: "", pain: "" };
}

function fillInputs() {
  daysEl.querySelectorAll("input[data-day]").forEach((input) => {
    const entry = state.get(keyFor(input.dataset.day, input.dataset.ex));
    input.value = entry ? entry[input.dataset.field] || "" : "";
  });
}

function setStatus(text) {
  statusEl.textContent = text;
}

function setBackupStatus(text) {
  backupStatus.textContent = text;
}

function flashToast(text, duration = 2200) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), duration);
}

function cacheKey(date) {
  return `training-log-cache:${date}`;
}

function cacheState(date, stateSnapshot) {
  try {
    localStorage.setItem(cacheKey(date), JSON.stringify(Object.fromEntries(stateSnapshot)));
  } catch (_error) {
    // ignore
  }
}

function readCache(date) {
  try {
    const raw = localStorage.getItem(cacheKey(date));
    return raw ? new Map(Object.entries(JSON.parse(raw))) : null;
  } catch (_error) {
    return null;
  }
}

function clearCache(date) {
  try {
    localStorage.removeItem(cacheKey(date));
  } catch (_error) {
    // ignore
  }
}

function buildRows(date, stateSnapshot, userId) {
  const rows = [];

  PLAN.forEach((day) => {
    day.items.forEach((item) => {
      const entry = stateSnapshot.get(keyFor(day.id, item.name)) || emptyEntry();
      rows.push({
        user_id: userId,
        workout_date: date,
        day: day.id,
        exercise: item.name,
        plan: item.target,
        set1: entry.set1 || null,
        set2: entry.set2 || null,
        set3: entry.set3 || null,
        rpe: entry.rpe || null,
        pain: entry.pain || null,
        notes: item.note || null
      });
    });
  });

  return rows;
}

async function saveRows(date, stateSnapshot, userId) {
  if (!userId || !sb) return;

  setStatus("Сохранение...");
  let result;

  try {
    result = await sb.from("workouts").upsert(buildRows(date, stateSnapshot, userId), {
      onConflict: "user_id,workout_date,day,exercise"
    });
  } catch (error) {
    cacheState(date, stateSnapshot);
    setStatus("Нет связи с Supabase. Данные сохранены локально. Нажми «Проверить связь».");
    return;
  }

  if (result.error) {
    cacheState(date, stateSnapshot);
    setStatus(
      "Ошибка сохранения: " +
        result.error.message +
        ". Данные сохранены локально. Нажми «Проверить связь»."
    );
    return;
  }

  clearCache(date);
  analytics.loaded = false;
  const time = new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
  setStatus("Сохранено " + time);
}

function enqueueSave(date, stateSnapshot, userId) {
  saveChain = saveChain
    .then(() => saveRows(date, stateSnapshot, userId))
    .catch((error) => {
      cacheState(date, stateSnapshot);
      setStatus("Ошибка сети: " + error.message + ". Данные сохранены локально.");
    });
}

function scheduleSave() {
  clearTimeout(saveTimer);
  const date = currentDate;
  const snapshot = new Map(state);
  const userId = currentUser?.id;

  saveTimer = setTimeout(() => {
    if (userId) enqueueSave(date, snapshot, userId);
  }, 500);
}

async function flushSave() {
  clearTimeout(saveTimer);
  if (!currentUser) return;

  const date = currentDate;
  const snapshot = new Map(state);
  enqueueSave(date, snapshot, currentUser.id);
  await saveChain;
}

async function loadForDate() {
  if (!currentUser || !sb) return;

  setStatus("Загрузка...");
  const { data, error } = await sb
    .from("workouts")
    .select("*")
    .eq("workout_date", currentDate);

  if (error) {
    const cached = readCache(currentDate);
    if (cached) {
      state = cached;
      fillInputs();
      setStatus("Нет связи с Supabase. Показаны локально сохранённые данные.");
      return;
    }

    setStatus("Ошибка загрузки: " + error.message);
    return;
  }

  state = new Map();
  (data || []).forEach((row) => {
    state.set(keyFor(row.day, row.exercise), {
      set1: row.set1 || "",
      set2: row.set2 || "",
      set3: row.set3 || "",
      rpe: row.rpe || "",
      pain: row.pain || ""
    });
  });

  const cached = readCache(currentDate);
  if (cached) {
    cached.forEach((entry, key) => state.set(key, entry));
    fillInputs();
    setStatus("Есть локальные правки. Нажми «Проверить связь», чтобы отправить их.");
    return;
  }

  fillInputs();
  setStatus(data && data.length ? "Загружено" : "Новая дата");
}

function rowHasData(row) {
  return ["set1", "set2", "set3", "rpe", "pain"].some(
    (field) => String(row[field] || "").trim()
  );
}

async function autofillLastWorkout() {
  if (!currentUser || !sb) return;

  const dayId = autofillDay.value;
  const day = PLAN.find((item) => item.id === dayId);
  const dayTitle = day ? day.title : dayId;

  setStatus(`Ищу прошлую тренировку: ${dayTitle}...`);
  const { data, error } = await sb
    .from("workouts")
    .select("*")
    .eq("day", dayId)
    .lt("workout_date", currentDate)
    .order("workout_date", { ascending: false })
    .limit(500);

  if (error) {
    setStatus("Ошибка загрузки прошлой тренировки: " + error.message);
    return;
  }

  const rows = data || [];
  const lastDate = rows.find(rowHasData)?.workout_date;

  if (!lastDate) {
    setStatus(`Нет прошлых записей для дня «${dayTitle}».`);
    flashToast("Нет прошлых записей для этого дня", 2600);
    return;
  }

  const sourceRows = rows.filter((row) => row.workout_date === lastDate);
  let filled = 0;

  sourceRows.forEach((row) => {
    if (!row.exercise) return;

    const key = keyFor(dayId, row.exercise);
    const entry = state.get(key) || emptyEntry();

    ["set1", "set2", "set3", "rpe", "pain"].forEach((field) => {
      const currentValue = String(entry[field] || "").trim();
      const sourceValue = String(row[field] || "").trim();

      if (!currentValue && sourceValue) {
        entry[field] = sourceValue;
        filled += 1;
      }
    });

    state.set(key, entry);
  });

  fillInputs();

  if (filled) scheduleSave();

  const message = filled
    ? `Заполнено пустых полей: ${filled} из ${lastDate}`
    : `Нет пустых полей для заполнения (${lastDate})`;
  setStatus(message);
  flashToast(message, 3000);
}

function formatTimer(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function ensureAudio() {
  if (!audioCtx) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioCtor) audioCtx = new AudioCtor();
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}

function beep() {
  try {
    ensureAudio();
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.25);
  } catch (_error) {
    // sound is optional
  }
}

function startRestTimer(seconds) {
  clearInterval(timerInterval);
  ensureAudio();
  timerEnd = Date.now() + seconds * 1000;
  timerDisplay.textContent = formatTimer(seconds);
  flashToast(`Отдых ${seconds} сек`, 1200);

  timerInterval = setInterval(() => {
    const left = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
    timerDisplay.textContent = formatTimer(left);

    if (left <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerEnd = 0;
      timerDisplay.textContent = "Готово";
      beep();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      flashToast("Отдых закончен", 3000);
    }
  }, 250);
}

function stopRestTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerEnd = 0;
  timerDisplay.textContent = "—";
}

function openLibrary(name) {
  const info = LIBRARY[name] || {};
  const planItem = PLAN.flatMap((day) => day.items).find((item) => item.name === name);

  modalTitle.textContent = name;
  modalBody.innerHTML = "";

  const sections = [
    ["Зачем", info.muscles],
    ["Техника", info.cues],
    ["Ошибки", info.mistakes],
    ["Замены", info.swaps],
    ["Заметка", planItem?.note]
  ];

  sections.forEach(([label, text]) => {
    if (!text) return;
    const paragraph = document.createElement("p");
    const strong = document.createElement("b");
    strong.textContent = label + ": ";
    paragraph.appendChild(strong);
    paragraph.appendChild(document.createTextNode(text));
    modalBody.appendChild(paragraph);
  });

  modal.hidden = false;
}

function closeModal() {
  modal.hidden = true;
}

function renderLibrary(filter = "") {
  const query = filter.trim().toLowerCase();
  libraryList.innerHTML = "";

  Object.keys(LIBRARY)
    .filter((name) => !query || name.toLowerCase().includes(query))
    .sort((a, b) => a.localeCompare(b, "ru"))
    .forEach((name) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "lib-item";
      button.textContent = name;
      button.addEventListener("click", () => openLibrary(name));
      libraryList.appendChild(button);
    });

  if (!libraryList.children.length) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "Ничего не найдено.";
    libraryList.appendChild(empty);
  }
}

function parseSet(value) {
  const match = String(value || "").match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+)/i);
  if (!match) return null;
  return {
    weight: Number(match[1].replace(",", ".")),
    reps: Number(match[2])
  };
}

function statsForRow(row) {
  const sets = [row.set1, row.set2, row.set3].map(parseSet).filter(Boolean);
  if (!sets.length) return null;

  const rpe = numberOrNull(row.rpe);
  const pain = numberOrNull(row.pain);

  return {
    maxWeight: Math.max(...sets.map((set) => set.weight)),
    volume: sets.reduce((sum, set) => sum + set.weight * set.reps, 0),
    reps: sets.map((set) => set.reps),
    rpe,
    pain
  };
}

function chartTheme() {
  const light = document.documentElement.dataset.theme === "light";
  return {
    text: light ? "#334155" : "#c9d6ea",
    grid: light ? "rgba(29, 78, 216, 0.12)" : "rgba(255, 255, 255, 0.08)",
    accent: light ? "#1d4ed8" : "#8ab4f8",
    green: light ? "#15803d" : "#4ade80",
    orange: "#fb923c",
    red: "#f87171"
  };
}

function baseChartOptions() {
  const colors = chartTheme();
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15, 17, 21, 0.92)",
        titleColor: "#fff",
        bodyColor: "#e8eaed"
      }
    },
    scales: {
      x: {
        ticks: { color: colors.text, maxRotation: 0, autoSkip: true },
        grid: { color: colors.grid }
      },
      y: {
        ticks: { color: colors.text },
        grid: { color: colors.grid },
        beginAtZero: true
      }
    }
  };
}

function makeChart(key, canvasId, config) {
  if (!window.Chart) return;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (charts[key]) charts[key].destroy();
  charts[key] = new Chart(canvas, config);
}

function renderExerciseSelect() {
  const names = [
    ...new Set(
      analytics.workouts
        .filter((row) => statsForRow(row))
        .map((row) => row.exercise)
    )
  ].sort((a, b) => a.localeCompare(b, "ru"));

  const previous = exerciseSelect.value;
  exerciseSelect.innerHTML = "";
  names.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    exerciseSelect.appendChild(option);
  });

  if (previous && names.includes(previous)) exerciseSelect.value = previous;
}

function renderExerciseChart() {
  const name = exerciseSelect.value;
  if (!name) {
    if (charts.exercise) {
      charts.exercise.destroy();
      delete charts.exercise;
    }
    return;
  }

  const rows = analytics.workouts.filter((row) => row.exercise === name && statsForRow(row));
  const labels = rows.map((row) => formatDateShort(row.workout_date));
  const values = rows.map((row) => statsForRow(row).maxWeight);
  const colors = chartTheme();

  makeChart("exercise", "exercise-chart", {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          data: values,
          borderColor: colors.accent,
          backgroundColor: "rgba(138, 180, 248, 0.15)",
          fill: true,
          tension: 0.25,
          pointRadius: 3
        }
      ]
    },
    options: baseChartOptions()
  });
}

function renderVolumeChart() {
  const byDate = new Map();
  analytics.workouts.forEach((row) => {
    const stats = statsForRow(row);
    if (!stats) return;
    byDate.set(row.workout_date, (byDate.get(row.workout_date) || 0) + stats.volume);
  });

  const dates = [...byDate.keys()].sort();
  const colors = chartTheme();

  makeChart("volume", "volume-chart", {
    type: "bar",
    data: {
      labels: dates.map(formatDateShort),
      datasets: [
        {
          data: dates.map((date) => Math.round(byDate.get(date))),
          backgroundColor: colors.green,
          borderRadius: 6
        }
      ]
    },
    options: baseChartOptions()
  });
}

function renderPainChart() {
  const byDate = new Map();
  analytics.workouts.forEach((row) => {
    const pain = numberOrNull(row.pain);
    if (pain === null) return;
    byDate.set(row.workout_date, Math.max(byDate.get(row.workout_date) || 0, pain));
  });

  const dates = [...byDate.keys()].sort();
  const colors = chartTheme();

  makeChart("pain", "pain-chart", {
    type: "line",
    data: {
      labels: dates.map(formatDateShort),
      datasets: [
        {
          data: dates.map((date) => byDate.get(date)),
          borderColor: colors.red,
          backgroundColor: "rgba(248, 113, 113, 0.15)",
          fill: true,
          tension: 0.2,
          pointRadius: 3
        }
      ]
    },
    options: {
      ...baseChartOptions(),
      scales: {
        ...baseChartOptions().scales,
        y: {
          ...baseChartOptions().scales.y,
          suggestedMax: 10
        }
      }
    }
  });
}

function renderWeeklySummary() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const startIso = new Date(start.getTime() - start.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  const endIso = new Date(end.getTime() - end.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

  const workouts = analytics.workouts.filter(
    (row) => row.workout_date >= startIso && row.workout_date <= endIso
  );
  const dates = new Set(workouts.map((row) => row.workout_date));
  const volume = workouts.reduce((sum, row) => {
    const stats = statsForRow(row);
    return sum + (stats ? stats.volume : 0);
  }, 0);
  const rpe = average(workouts.map((row) => numberOrNull(row.rpe)));
  const pain = Math.max(
    0,
    ...workouts.map((row) => numberOrNull(row.pain) || 0)
  );
  const runs = analytics.runs.filter(
    (row) => row.run_date >= startIso && row.run_date <= endIso
  );
  const distance = runs.reduce((sum, row) => sum + (numberOrNull(row.distance_km) || 0), 0);
  const bodyRows = analytics.body.filter((row) => row.measured_on <= endIso);
  const lastBody = bodyRows[bodyRows.length - 1];
  const firstBody = bodyRows[0];
  const weightDelta =
    lastBody && firstBody ? numberOrNull(lastBody.weight_kg) - numberOrNull(firstBody.weight_kg) : null;

  const items = [
    [dates.size, "тренировок"],
    [Math.round(volume), "кг объёма"],
    [rpe === null ? "—" : rpe.toFixed(1), "средний RPE"],
    [pain || "—", "макс. боль"],
    [distance ? distance.toFixed(1) : "—", "км бега"],
    [weightDelta === null ? "—" : `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)}`, "кг за всё время"]
  ];

  weeklySummary.innerHTML = "";
  items.forEach(([value, label]) => {
    const item = document.createElement("div");
    item.className = "summary-item";
    const strong = document.createElement("b");
    strong.textContent = value;
    const span = document.createElement("span");
    span.textContent = label;
    item.append(strong, span);
    weeklySummary.appendChild(item);
  });
}

function renderRecommendations() {
  const byExercise = new Map();

  analytics.workouts.forEach((row) => {
    const stats = statsForRow(row);
    if (!stats) return;
    if (!byExercise.has(row.exercise)) byExercise.set(row.exercise, []);
    byExercise.get(row.exercise).push({ date: row.workout_date, stats, plan: row.plan });
  });

  const hints = [];

  byExercise.forEach((entries, name) => {
    entries.sort((a, b) => a.date.localeCompare(b.date));
    const last = entries[entries.length - 1];
    if (!last) return;

    const planMatch = String(last.plan || "").match(/(\d+)\s*[–-]\s*(\d+)/);
    const topReps = planMatch ? Number(planMatch[2]) : null;
    const allTop = topReps && last.stats.reps.every((reps) => reps >= topReps);

    if (last.stats.pain !== null && last.stats.pain >= 4) {
      hints.push(`⚠️ ${name}: боль ${last.stats.pain}/10. Снизь вес или амплитуду.`);
    } else if (allTop && (last.stats.rpe === null || last.stats.rpe <= 8)) {
      const lowerBody = /ног|присед|тяга|ягод/i.test(name);
      hints.push(`✅ ${name}: все подходы на верхней границе. Можно +${lowerBody ? 5 : 2.5} кг.`);
    } else if (last.stats.rpe !== null && last.stats.rpe >= 9) {
      hints.push(`🟡 ${name}: RPE ${last.stats.rpe}. Не добавляй вес, сначала техника.`);
    }
  });

  if (!hints.length) {
    hints.push("Пока мало данных. Заполни 2–3 тренировки — появятся подсказки.");
  }

  recommendations.innerHTML = "";
  hints.slice(0, 8).forEach((text) => {
    const item = document.createElement("div");
    item.className = "recommendation";
    item.textContent = text;
    recommendations.appendChild(item);
  });
}

function renderProgress() {
  renderWeeklySummary();
  renderExerciseSelect();
  renderExerciseChart();
  renderVolumeChart();
  renderPainChart();
  renderRecommendations();
}

function historyRow(left, right) {
  const row = document.createElement("div");
  row.className = "history-row";
  const first = document.createElement("span");
  first.textContent = left;
  const second = document.createElement("span");
  second.textContent = right;
  row.append(first, second);
  return row;
}

function renderBody() {
  const rows = analytics.body.slice().sort((a, b) => a.measured_on.localeCompare(b.measured_on));
  const labels = rows.map((row) => formatDateShort(row.measured_on));
  const weights = rows.map((row) => numberOrNull(row.weight_kg));
  const waists = rows.map((row) => numberOrNull(row.waist_cm));
  const colors = chartTheme();

  makeChart("weight", "weight-chart", {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Вес, кг",
          data: weights,
          borderColor: colors.accent,
          backgroundColor: "rgba(138, 180, 248, 0.12)",
          fill: true,
          tension: 0.25,
          pointRadius: 3,
          yAxisID: "y"
        },
        {
          label: "Живот, см",
          data: waists,
          borderColor: colors.orange,
          tension: 0.25,
          pointRadius: 3,
          yAxisID: "y1"
        }
      ]
    },
    options: {
      ...baseChartOptions(),
      plugins: { legend: { display: true, labels: { color: colors.text } } },
      scales: {
        x: baseChartOptions().scales.x,
        y: {
          ...baseChartOptions().scales.y,
          position: "left"
        },
        y1: {
          ...baseChartOptions().scales.y,
          position: "right",
          grid: { drawOnChartArea: false }
        }
      }
    }
  });

  bodyHistory.innerHTML = "";
  rows
    .slice()
    .reverse()
    .slice(0, 12)
    .forEach((row) => {
      const parts = [
        row.weight_kg ? `${row.weight_kg} кг` : null,
        row.waist_cm ? `${row.waist_cm} см` : null,
        row.sleep_hours ? `сон ${row.sleep_hours} ч` : null,
        row.mood ? `настроение ${row.mood}/5` : null
      ].filter(Boolean);
      bodyHistory.appendChild(historyRow(row.measured_on, parts.join(" · ") || "—"));
    });

  if (!rows.length) bodyHistory.appendChild(historyRow("Пока нет замеров", "—"));
}

function renderCountdown() {
  const items = [
    ["ГТО", settings.gtoDate],
    ["Гонка", settings.raceDate]
  ];

  countdownEl.innerHTML = "";
  items.forEach(([label, date]) => {
    const item = document.createElement("div");
    item.className = "countdown-item";
    const strong = document.createElement("b");
    const span = document.createElement("span");
    span.textContent = label;

    if (!date) {
      strong.textContent = "—";
      span.textContent = `${label}: укажи дату`;
    } else {
      const target = new Date(date + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const days = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
      strong.textContent = days >= 0 ? days : "0";
      span.textContent = days >= 0 ? `${label}: дней` : `${label}: дата прошла`;
    }

    item.append(strong, span);
    countdownEl.appendChild(item);
  });
}

function renderGto() {
  const rows = analytics.gto.slice().sort((a, b) => a.tested_on.localeCompare(b.tested_on));
  const metric = gtoMetricSelect.value;
  const labels = rows.map((row) => formatDateShort(row.tested_on));
  const values = rows.map((row) => numberOrNull(row[metric]));
  const colors = chartTheme();

  makeChart("gto", "gto-chart", {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          data: values,
          borderColor: colors.green,
          backgroundColor: "rgba(74, 222, 128, 0.15)",
          fill: true,
          tension: 0.2,
          pointRadius: 3
        }
      ]
    },
    options: baseChartOptions()
  });

  gtoHistory.innerHTML = "";
  rows
    .slice()
    .reverse()
    .slice(0, 12)
    .forEach((row) => {
      const parts = [
        row.pullups ? `подт. ${row.pullups}` : null,
        row.pushups ? `отж. ${row.pushups}` : null,
        row.situps ? `пресс ${row.situps}` : null,
        row.forward_bend_cm ? `наклон ${row.forward_bend_cm} см` : null,
        row.sprint_100m_s ? `100 м ${row.sprint_100m_s} с` : null,
        row.run_3km_s ? `3 км ${formatSeconds(row.run_3km_s)}` : null
      ].filter(Boolean);
      gtoHistory.appendChild(historyRow(row.tested_on, parts.join(" · ") || "—"));
    });

  if (!rows.length) gtoHistory.appendChild(historyRow("Пока нет тестов", "—"));
}

function renderRuns() {
  const rows = analytics.runs.slice().sort((a, b) => a.run_date.localeCompare(b.run_date));
  const weeks = new Map();

  rows.forEach((row) => {
    const date = new Date(row.run_date + "T00:00:00");
    const day = (date.getDay() + 6) % 7;
    const monday = new Date(date);
    monday.setDate(date.getDate() - day);
    const key = new Date(monday.getTime() - monday.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    weeks.set(key, (weeks.get(key) || 0) + (numberOrNull(row.distance_km) || 0));
  });

  const labels = [...weeks.keys()].sort();
  const colors = chartTheme();

  makeChart("run", "run-chart", {
    type: "bar",
    data: {
      labels: labels.map(formatDateShort),
      datasets: [
        {
          data: labels.map((key) => Number(weeks.get(key).toFixed(1))),
          backgroundColor: colors.orange,
          borderRadius: 6
        }
      ]
    },
    options: baseChartOptions()
  });

  runHistory.innerHTML = "";
  rows
    .slice()
    .reverse()
    .slice(0, 12)
    .forEach((row) => {
      const parts = [
        row.distance_km ? `${row.distance_km} км` : null,
        row.duration_min ? `${row.duration_min} мин` : null,
        row.avg_hr ? `${row.avg_hr} уд/мин` : null,
        row.surface === "treadmill" ? "дорожка" : row.surface === "outdoor" ? "улица" : null
      ].filter(Boolean);
      runHistory.appendChild(historyRow(row.run_date, parts.join(" · ") || "—"));
    });

  if (!rows.length) runHistory.appendChild(historyRow("Пока нет пробежек", "—"));
}

function renderGoals() {
  renderCountdown();
  renderGto();
  renderRuns();
}

function renderCurrentView() {
  if (currentView === "progress") renderProgress();
  if (currentView === "body") renderBody();
  if (currentView === "goals") renderGoals();
}

async function loadAnalytics(force = false) {
  if (!currentUser || !sb) return;
  if (analytics.loaded && !force) return;

  analyticsStatus.textContent = "Загружаю данные...";

  const [workoutsResult, bodyResult, gtoResult, runsResult] = await Promise.all([
    sb.from("workouts").select("*").order("workout_date", { ascending: true }).limit(5000),
    sb.from("body_metrics").select("*").order("measured_on", { ascending: true }).limit(1000),
    sb.from("gto_tests").select("*").order("tested_on", { ascending: true }).limit(1000),
    sb.from("runs").select("*").order("run_date", { ascending: true }).limit(1000)
  ]);

  analytics.workouts = workoutsResult.data || [];
  analytics.body = bodyResult.data || [];
  analytics.gto = gtoResult.data || [];
  analytics.runs = runsResult.data || [];
  analytics.errors = [workoutsResult.error, bodyResult.error, gtoResult.error, runsResult.error]
    .filter(Boolean)
    .map((error) => error.message);
  analytics.loaded = analytics.errors.length === 0;

  if (analytics.errors.length) {
    analyticsStatus.textContent =
      "Не все таблицы доступны. Выполни supabase/schema_v2.sql в SQL Editor. " +
      analytics.errors[0];
  } else {
    analyticsStatus.textContent = "";
  }
}

async function switchView(view) {
  currentView = view;

  tabs.querySelectorAll("button[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  document.querySelectorAll(".view").forEach((section) => {
    section.hidden = section.id !== `view-${view}`;
  });

  if (view === "progress" || view === "body" || view === "goals") {
    await loadAnalytics();
    renderCurrentView();
  }
}

async function saveBody(event) {
  event.preventDefault();
  if (!currentUser || !sb) return;

  const row = {
    user_id: currentUser.id,
    measured_on: bodyDate.value,
    weight_kg: numberOrNull(bodyWeight.value),
    waist_cm: numberOrNull(bodyWaist.value),
    sleep_hours: numberOrNull(bodySleep.value),
    mood: numberOrNull(bodyMood.value),
    smoking: numberOrNull(bodySmoking.value),
    notes: bodyNotes.value.trim() || null
  };

  if (!row.measured_on) return;

  const { error } = await sb.from("body_metrics").upsert(row, {
    onConflict: "user_id,measured_on"
  });

  if (error) {
    flashToast("Ошибка замера: " + error.message, 4000);
    return;
  }

  flashToast("Замер сохранён");
  bodyForm.reset();
  bodyDate.value = todayIso();
  await loadAnalytics(true);
  renderBody();
}

async function saveGto(event) {
  event.preventDefault();
  if (!currentUser || !sb) return;

  const row = {
    user_id: currentUser.id,
    tested_on: gtoTestDate.value,
    pullups: numberOrNull(gtoPullups.value),
    pushups: numberOrNull(gtoPushups.value),
    situps: numberOrNull(gtoSitups.value),
    forward_bend_cm: numberOrNull(gtoBend.value),
    sprint_100m_s: numberOrNull(gtoSprint.value),
    run_3km_s: parseTimeToSeconds(gtoRun3.value),
    notes: gtoNotes.value.trim() || null
  };

  if (!row.tested_on) return;

  const { error } = await sb.from("gto_tests").upsert(row, {
    onConflict: "user_id,tested_on"
  });

  if (error) {
    flashToast("Ошибка теста: " + error.message, 4000);
    return;
  }

  flashToast("Тест сохранён");
  gtoForm.reset();
  gtoTestDate.value = todayIso();
  await loadAnalytics(true);
  renderGto();
}

async function saveRun(event) {
  event.preventDefault();
  if (!currentUser || !sb) return;

  const row = {
    user_id: currentUser.id,
    run_date: runDate.value,
    distance_km: numberOrNull(runDistance.value),
    duration_min: numberOrNull(runDuration.value),
    avg_hr: numberOrNull(runHr.value),
    surface: runSurface.value,
    notes: runNotes.value.trim() || null
  };

  if (!row.run_date) return;

  const { error } = await sb.from("runs").upsert(row, {
    onConflict: "user_id,run_date,distance_km,duration_min"
  });

  if (error) {
    flashToast("Ошибка пробежки: " + error.message, 4000);
    return;
  }

  flashToast("Пробежка сохранена");
  runForm.reset();
  runDate.value = todayIso();
  await loadAnalytics(true);
  renderRuns();
}

function saveDates(event) {
  event.preventDefault();
  settings.gtoDate = gtoDateInput.value;
  settings.raceDate = raceDateInput.value;
  applySettings();
  renderCountdown();
  flashToast("Даты сохранены");
}

async function exportJson() {
  if (!currentUser || !sb) return;

  setBackupStatus("Готовлю JSON...");
  const [workoutsResult, bodyResult, gtoResult, runsResult] = await Promise.all([
    sb.from("workouts").select("*").order("workout_date", { ascending: true }),
    sb.from("body_metrics").select("*").order("measured_on", { ascending: true }),
    sb.from("gto_tests").select("*").order("tested_on", { ascending: true }),
    sb.from("runs").select("*").order("run_date", { ascending: true })
  ]);

  const payload = {
    version: 2,
    exported_at: new Date().toISOString(),
    workouts: workoutsResult.data || [],
    body_metrics: bodyResult.data || [],
    gto_tests: gtoResult.data || [],
    runs: runsResult.data || []
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `training-backup-${currentDate}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setBackupStatus(
    `Скачано: тренировки ${payload.workouts.length}, замеры ${payload.body_metrics.length}, ГТО ${payload.gto_tests.length}, бег ${payload.runs.length}`
  );
}

async function importJson(file) {
  if (!currentUser || !sb || !file) return;

  setBackupStatus("Читаю файл...");
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch (_error) {
    setBackupStatus("Это не JSON-файл.");
    return;
  }

  const workouts = Array.isArray(payload) ? payload : payload?.workouts;
  if (!Array.isArray(workouts)) {
    setBackupStatus("В файле нет массива workouts.");
    return;
  }

  if (!confirm("Импортировать данные из файла? Совпадающие даты будут обновлены.")) {
    setBackupStatus("Импорт отменён.");
    return;
  }

  const job = {
    table: "workouts",
    rows: workouts,
    conflict: "user_id,workout_date,day,exercise",
    map: (row) => ({
      user_id: currentUser.id,
      workout_date: row.workout_date,
      day: row.day,
      exercise: row.exercise,
      plan: row.plan || null,
      set1: row.set1 || null,
      set2: row.set2 || null,
      set3: row.set3 || null,
      rpe: row.rpe || null,
      pain: row.pain || null,
      notes: row.notes || null
    }),
    valid: (row) => row.workout_date && row.day && row.exercise
  };

  const cleanWorkouts = job.rows.map(job.map).filter(job.valid);
  if (!cleanWorkouts.length) {
    setBackupStatus("Нет корректных строк для импорта.");
    return;
  }

  for (let index = 0; index < cleanWorkouts.length; index += 100) {
    const chunk = cleanWorkouts.slice(index, index + 100);
    const { error } = await sb.from("workouts").upsert(chunk, { onConflict: job.conflict });
    if (error) {
      setBackupStatus("Ошибка импорта тренировок: " + error.message);
      return;
    }
  }

  const extraJobs = [
    {
      table: "body_metrics",
      rows: payload?.body_metrics,
      conflict: "user_id,measured_on",
      map: (row) => ({
        user_id: currentUser.id,
        measured_on: row.measured_on,
        weight_kg: row.weight_kg || null,
        waist_cm: row.waist_cm || null,
        sleep_hours: row.sleep_hours || null,
        mood: row.mood || null,
        smoking: row.smoking || null,
        notes: row.notes || null
      }),
      valid: (row) => row.measured_on
    },
    {
      table: "gto_tests",
      rows: payload?.gto_tests,
      conflict: "user_id,tested_on",
      map: (row) => ({
        user_id: currentUser.id,
        tested_on: row.tested_on,
        pullups: row.pullups || null,
        pushups: row.pushups || null,
        situps: row.situps || null,
        forward_bend_cm: row.forward_bend_cm || null,
        sprint_100m_s: row.sprint_100m_s || null,
        run_3km_s: row.run_3km_s || null,
        notes: row.notes || null
      }),
      valid: (row) => row.tested_on
    },
    {
      table: "runs",
      rows: payload?.runs,
      conflict: "user_id,run_date,distance_km,duration_min",
      map: (row) => ({
        user_id: currentUser.id,
        run_date: row.run_date,
        distance_km: row.distance_km || null,
        duration_min: row.duration_min || null,
        avg_hr: row.avg_hr || null,
        surface: row.surface || null,
        notes: row.notes || null
      }),
      valid: (row) => row.run_date
    }
  ];

  for (const extra of extraJobs) {
    if (!Array.isArray(extra.rows) || !extra.rows.length) continue;
    const clean = extra.rows.map(extra.map).filter(extra.valid);
    for (let index = 0; index < clean.length; index += 100) {
      const chunk = clean.slice(index, index + 100);
      const { error } = await sb.from(extra.table).upsert(chunk, {
        onConflict: extra.conflict
      });
      if (error) {
        setBackupStatus(`Ошибка импорта ${extra.table}: ` + error.message);
        return;
      }
    }
  }

  setBackupStatus(`Импортировано тренировок: ${cleanWorkouts.length}`);
  flashToast("Импорт завершён");
  analytics.loaded = false;
  await loadForDate();
}

function applySession(session) {
  const user = session?.user ?? null;
  const userId = user?.id ?? null;

  if (userId === currentUserId) return;

  currentUserId = userId;
  currentUser = user;

  if (currentUser) {
    authView.hidden = true;
    appView.hidden = false;
    appHeader.hidden = false;
    userEmail.textContent = currentUser.email || "";
    currentDate = dateInput.value;
    analytics.loaded = false;
    switchView("workout");
    loadForDate();
  } else {
    authView.hidden = false;
    appView.hidden = true;
    appHeader.hidden = true;
    state = new Map();
  }
}

function exportCsv() {
  const rows = [
    ["Дата", "День", "Упражнение", "План", "Подход 1", "Подход 2", "Подход 3", "RPE", "Боль", "Заметки"]
  ];

  PLAN.forEach((day) => {
    day.items.forEach((item) => {
      const entry = state.get(keyFor(day.id, item.name)) || emptyEntry();
      rows.push([
        currentDate,
        day.title,
        item.name,
        item.target,
        entry.set1 || "",
        entry.set2 || "",
        entry.set3 || "",
        entry.rpe || "",
        entry.pain || "",
        item.note || ""
      ]);
    });
  });

  const csv =
    "\ufeff" +
    rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `training-${currentDate}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

daysEl.addEventListener("input", (event) => {
  const input = event.target.closest("input[data-day]");
  if (!input) return;

  const key = keyFor(input.dataset.day, input.dataset.ex);
  const entry = state.get(key) || emptyEntry();
  entry[input.dataset.field] = input.value;
  state.set(key, entry);
  scheduleSave();
});

daysEl.addEventListener("click", (event) => {
  const infoButton = event.target.closest("button.info");
  if (infoButton) openLibrary(infoButton.dataset.ex);
});

dateInput.addEventListener("change", async () => {
  await flushSave();
  currentDate = dateInput.value;
  autofillDay.value = dayForDate(currentDate);
  analytics.loaded = false;
  await loadForDate();
});

tabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-view]");
  if (button) switchView(button.dataset.view);
});

exportButton.addEventListener("click", exportCsv);
exportJsonButton.addEventListener("click", exportJson);
importJsonInput.addEventListener("change", () => {
  const file = importJsonInput.files?.[0];
  importJson(file);
  importJsonInput.value = "";
});
autofillButton.addEventListener("click", autofillLastWorkout);
themeToggle.addEventListener("click", toggleTheme);
themeToggle2.addEventListener("click", toggleTheme);
fontToggle.addEventListener("click", toggleFont);
exerciseSelect.addEventListener("change", renderExerciseChart);
gtoMetricSelect.addEventListener("change", renderGto);
bodyForm.addEventListener("submit", saveBody);
gtoForm.addEventListener("submit", saveGto);
runForm.addEventListener("submit", saveRun);
datesForm.addEventListener("submit", saveDates);

document.querySelectorAll(".timer-chip").forEach((button) => {
  button.addEventListener("click", () => startRestTimer(Number(button.dataset.seconds)));
});
timerStop.addEventListener("click", stopRestTimer);

librarySearch.addEventListener("input", () => renderLibrary(librarySearch.value));
modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.hidden) closeModal();
});

checkButton.addEventListener("click", async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    setStatus("config.js не заполнен: нет URL или anon key.");
    flashToast("❌ config.js не заполнен");
    return;
  }

  const originalText = checkButton.textContent;
  checkButton.disabled = true;
  checkButton.textContent = "Проверяю...";
  setStatus("Проверяю связь с Supabase...");
  flashToast("Проверяю связь...", 1200);

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health?t=${Date.now()}`, {
      headers: { apikey: supabaseAnonKey },
      cache: "no-store"
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    setStatus("Связь с Supabase: OK");
    flashToast("✅ Связь с Supabase: OK", 2600);

    if (currentUser) await flushSave();
  } catch (error) {
    const message =
      "Нет связи с Supabase: " +
      error.message +
      ". Проверь VPN, AdBlock, Private DNS и открой сайт по https, а не через file://.";
    setStatus(message);
    flashToast("❌ " + error.message, 4200);
  } finally {
    checkButton.disabled = false;
    checkButton.textContent = originalText;
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!sb) return;

  const email = emailInput.value.trim();
  if (!email) return;

  loginButton.disabled = true;
  authMessage.textContent = "Отправляю ссылку...";

  const { error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + window.location.pathname
    }
  });

  loginButton.disabled = false;

  if (error) {
    authMessage.textContent = "Ошибка: " + error.message;
    return;
  }

  authMessage.textContent = "Ссылка отправлена. Проверь почту и папку «Спам».";
});

logoutButton.addEventListener("click", async () => {
  await flushSave();
  if (sb) await sb.auth.signOut();
});

function showInstallInstructions() {
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);

  modalTitle.textContent = "Установка приложения";
  modalBody.innerHTML = "";

  const steps = isIOS
    ? [
        "Открой сайт в Safari, а не во встроенном браузере Telegram/Instagram.",
        "Нажми «Поделиться» — квадрат со стрелкой вверх.",
        "Выбери «На экран «Домой»».",
        "Назови «Тренировки» и нажми «Добавить»."
      ]
    : isAndroid
      ? [
          "Открой сайт в Chrome, а не во встроенном браузере Telegram.",
          "Нажми ⋮ в правом верхнем углу.",
          "Выбери «Установить приложение» или «Добавить на главный экран».",
          "Если пункта нет — обнови страницу и подожди пару секунд."
        ]
      : [
          "В Chrome или Edge нажми иконку установки в адресной строке.",
          "Или открой меню ⋮ → «Установить приложение».",
          "На компьютере приложение откроется в отдельном окне."
        ];

  steps.forEach((text, index) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = `${index + 1}. ${text}`;
    modalBody.appendChild(paragraph);
  });

  modal.hidden = false;
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installButton.textContent = "Установить приложение";
  installButton.disabled = false;
  installHint.textContent = "Браузер готов установить приложение.";
});

installButton.addEventListener("click", async () => {
  if (!deferredPrompt) {
    showInstallInstructions();
    return;
  }

  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;

  if (choice.outcome === "accepted") {
    installButton.textContent = "Установлено";
    installButton.disabled = true;
    installHint.textContent = "Приложение установлено.";
  } else {
    installButton.textContent = "Как установить";
  }
});

window.addEventListener("appinstalled", () => {
  installButton.textContent = "Установлено";
  installButton.disabled = true;
  installHint.textContent = "Приложение установлено.";
  flashToast("Приложение установлено");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // offline mode is optional
    });
  });
}

async function init() {
  applySettings();
  renderPlan();
  renderLibrary();
  renderCountdown();

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isStandalone) {
    installButton.textContent = "Установлено";
    installButton.disabled = true;
    installHint.textContent = "Приложение уже открыто в режиме установленного.";
  } else if (isIOS) {
    installButton.textContent = "Как установить";
    installHint.textContent =
      "На iPhone: «Поделиться» → «На экран Домой». В меню Safari нет пункта «Установить приложение» — это нормально.";
  } else {
    installButton.textContent = "Как установить";
    installHint.textContent =
      "Chrome/Edge: иконка установки в адресной строке или меню ⋮ → «Установить приложение».";
  }

  if (!configured) {
    authMessage.textContent =
      "Вставь Project URL и anon key в config.js, затем перезагрузи страницу.";
    loginButton.disabled = true;
    return;
  }

  const { data } = await sb.auth.getSession();
  applySession(data.session);

  sb.auth.onAuthStateChange((_event, session) => {
    applySession(session);
  });
}

init();
