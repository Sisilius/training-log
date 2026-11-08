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
const dateInput = document.getElementById("date");
const exportButton = document.getElementById("export");
const exportJsonButton = document.getElementById("export-json");
const importJsonInput = document.getElementById("import-json");
const backupStatus = document.getElementById("backup-status");
const autofillButton = document.getElementById("autofill");
const checkButton = document.getElementById("check");
const statusEl = document.getElementById("status");
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

const SETTINGS_KEY = "training-log-settings";

const now = new Date();
dateInput.value = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 10);

let currentDate = dateInput.value;
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

let settings = { theme: "dark", font: "normal" };
try {
  settings = { ...settings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
} catch (_error) {
  settings = { theme: "dark", font: "normal" };
}

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

function hasAnyValue() {
  return [...state.values()].some(
    (entry) => entry.set1 || entry.set2 || entry.set3 || entry.rpe || entry.pain
  );
}

async function autofillLastWorkout() {
  if (!currentUser || !sb) return;

  setStatus("Ищу прошлую тренировку...");
  const { data, error } = await sb
    .from("workouts")
    .select("*")
    .lt("workout_date", currentDate)
    .order("workout_date", { ascending: false })
    .limit(200);

  if (error) {
    setStatus("Ошибка загрузки прошлой тренировки: " + error.message);
    return;
  }

  if (!data || !data.length) {
    setStatus("Прошлых тренировок нет.");
    flashToast("Прошлых тренировок нет");
    return;
  }

  const lastDate = data[0].workout_date;
  const rows = data.filter((row) => row.workout_date === lastDate);

  if (hasAnyValue() && !confirm(`Заменить текущие значения данными за ${lastDate}?`)) {
    return;
  }

  rows.forEach((row) => {
    if (!row.day || !row.exercise) return;
    state.set(keyFor(row.day, row.exercise), {
      set1: row.set1 || "",
      set2: row.set2 || "",
      set3: row.set3 || "",
      rpe: row.rpe || "",
      pain: row.pain || ""
    });
  });

  fillInputs();
  scheduleSave();
  setStatus(`Заполнено из ${lastDate}`);
  flashToast(`Заполнено из ${lastDate}`, 2600);
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

async function exportJson() {
  if (!currentUser || !sb) return;

  setBackupStatus("Готовлю JSON...");
  const { data, error } = await sb
    .from("workouts")
    .select("*")
    .order("workout_date", { ascending: true });

  if (error) {
    setBackupStatus("Ошибка: " + error.message);
    return;
  }

  const payload = {
    version: 1,
    exported_at: new Date().toISOString(),
    workouts: data || []
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
  setBackupStatus(`Скачано записей: ${(data || []).length}`);
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

  const rows = Array.isArray(payload) ? payload : payload?.workouts;
  if (!Array.isArray(rows)) {
    setBackupStatus("В файле нет массива workouts.");
    return;
  }

  const clean = rows
    .map((row) => ({
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
    }))
    .filter((row) => row.workout_date && row.day && row.exercise);

  if (!clean.length) {
    setBackupStatus("Нет корректных строк для импорта.");
    return;
  }

  if (!confirm(`Импортировать ${clean.length} строк?`)) {
    setBackupStatus("Импорт отменён.");
    return;
  }

  for (let index = 0; index < clean.length; index += 100) {
    const chunk = clean.slice(index, index + 100);
    const { error } = await sb.from("workouts").upsert(chunk, {
      onConflict: "user_id,workout_date,day,exercise"
    });
    if (error) {
      setBackupStatus("Ошибка импорта: " + error.message);
      return;
    }
  }

  setBackupStatus(`Импортировано строк: ${clean.length}`);
  flashToast("Импорт завершён");
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
  await loadForDate();
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

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installButton.hidden = false;
  installHint.textContent = "Браузер готов установить приложение.";
});

installButton.addEventListener("click", async () => {
  if (!deferredPrompt) {
    installHint.textContent =
      "Открой меню браузера и выбери «Установить приложение» или «На экран Домой».";
    return;
  }

  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  installButton.hidden = true;
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

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isStandalone) {
    installHint.textContent = "Приложение уже установлено.";
  } else if (isIOS) {
    installHint.textContent =
      "На iPhone: «Поделиться» → «На экран Домой». Тогда откроется без браузерной панели.";
  } else {
    installHint.textContent =
      "Если кнопка не появилась — открой меню браузера и выбери «Установить приложение».";
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
