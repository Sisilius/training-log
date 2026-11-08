const PLAN = [
  {
    id: "mon",
    title: "Понедельник — низ + жим + тяга",
    subtitle: "Основная силовая. Кардио — велотренажёр.",
    items: [
      { name: "Жим ноги в платформе", target: "3×10–12", note: "Двумя ногами. Стопы на середине, колени по носкам, таз прижат." },
      { name: "Горизонтальный жим сидя в тренажёре", target: "3×8–12", note: "Вместо штанги лёжа. Рукоятки на уровне сосков, локти ~45°, без боли." },
      { name: "Тяга горизонтального блока к поясу", target: "3×10–12", note: "К низу живота, лопатки своди." },
      { name: "Гиперэкстензия", target: "3×12–15", note: "Спина нейтральная, без переразгибания." },
      { name: "Разведение резины перед грудью", target: "2×15–20", isNew: true, note: "Лопатки своди, плечо не болит." },
      { name: "Планка", target: "3×20–30 сек", note: "Поясница не провисает." },
      { name: "Велотренажёр", target: "25 мин Z2", cardio: true, note: "Пульс 115–135, можешь говорить." }
    ]
  },
  {
    id: "wed",
    title: "Среда — верх + ноги",
    subtitle: "Легче, чем понедельник. Кардио — эллипс.",
    items: [
      { name: "Присед в Смите", target: "3×10–12", note: "Легко, до параллели, колени по носкам." },
      { name: "Тяга верхнего блока средним хватом", target: "3×10–12", note: "К верхней груди, не за голову." },
      { name: "«Бабочка»", target: "3×10–12", note: "Очень легко, не до полного разведения. Больно — пропусти." },
      { name: "Тяга горизонтального блока к поясу", target: "3×10–12" },
      { name: "Подъём на носки сидя", target: "3×15–20" },
      { name: "Подъём на носки на жиме ноги", target: "2×12–15", isNew: true, note: "Носки на краю платформы, ноги почти прямые." },
      { name: "Наружная ротация с резиной", target: "2×12–15", note: "Локоть прижат, боль не больше 2–3/10." },
      { name: "«Птица-собака»", target: "3×10/сторону" },
      { name: "Эллипс", target: "25 мин Z2", cardio: true, note: "Пульс 115–135." }
    ]
  },
  {
    id: "fri",
    title: "Пятница — фулбоди + хват",
    subtitle: "Кардио — дорожка: бег/шаг.",
    items: [
      { name: "Подтягивания в ассисте", target: "3×5–8", isNew: true, note: "Подбери противовес. Опускание 3 секунды, без раскачки." },
      { name: "Отжимания", target: "3×8–15", note: "С опорой, если тяжело." },
      { name: "Жим ноги одной ногой", target: "3×10–12/ногу", isNew: true, note: "Очень лёгкий вес, колено по носку, не в замок." },
      { name: "Фермерская прогулка", target: "3×30–40 м", isNew: true, note: "Спина прямая, плечи не заваливай." },
      { name: "Трицепс на блоке", target: "2–3×12–15" },
      { name: "Молотки", target: "2×12" },
      { name: "Дорожка: бег/шаг", target: "5 мин шаг + 15–20 мин", cardio: true, note: "1 мин бег / 2 мин шаг, наклон 1%." }
    ]
  }
];

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
const statusEl = document.getElementById("status");
const daysEl = document.getElementById("days");
const toast = document.getElementById("toast");

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

function makeInput(dayId, exerciseName, field, placeholder) {
  const input = document.createElement("input");
  input.type = "text";
  input.dataset.day = dayId;
  input.dataset.ex = exerciseName;
  input.dataset.field = field;
  input.placeholder = placeholder;
  input.autocomplete = "off";
  if (field === "rpe" || field === "pain") {
    input.inputMode = "decimal";
  }
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
      const target = document.createElement("span");
      target.className = "target";
      target.textContent = item.target;
      top.append(name, target);
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

function flashToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1200);
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
  const { error } = await sb.from("workouts").upsert(buildRows(date, stateSnapshot, userId), {
    onConflict: "user_id,workout_date,day,exercise"
  });

  if (error) {
    setStatus("Ошибка сохранения: " + error.message);
    return;
  }

  const time = new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
  setStatus("Сохранено " + time);
}

function enqueueSave(date, stateSnapshot, userId) {
  saveChain = saveChain
    .then(() => saveRows(date, stateSnapshot, userId))
    .catch((error) => setStatus("Ошибка: " + error.message));
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

  fillInputs();
  setStatus(data && data.length ? "Загружено" : "Новая дата");
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

dateInput.addEventListener("change", async () => {
  await flushSave();
  currentDate = dateInput.value;
  await loadForDate();
});

exportButton.addEventListener("click", exportCsv);

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

async function init() {
  renderPlan();

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
