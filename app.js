const STORAGE_KEY = "zilcha-home-management-v1";
const APP_CONFIG = window.APP_CONFIG || {};
const SUPABASE_ENABLED = Boolean(
  APP_CONFIG.supabaseUrl &&
  APP_CONFIG.supabasePublishableKey &&
  APP_CONFIG.sharedLoginEmail &&
  APP_CONFIG.householdId &&
  window.supabase
);
const collator = new Intl.Collator("he", { sensitivity: "base", numeric: true });

const HOUSEHOLD_MEMBERS = ["איריס", "תומר"];
const TASK_ASSIGNEES = ["איריס", "תומר", "איריס ותומר"];
const WISH_GROUPS = ["בית", "ילדים", "תומר", "איריס"];
const SHOPPING_DEFAULT_CATEGORIES = [
  "בשר", "מאפים", "מוצרי חלב", "מזווה", "מתוקים", "נקניק",
  "ניקיון", "פארם", "פירות וירקות", "קפואים", "שתייה", "אחר"
];
const TRIP_CATEGORIES = ["אוכל", "רחצה", "תרופות", "בגדים", "ציוד"];

const NAV_ITEMS = [
  { id: "home", label: "בית", icon: "⌂" },
  { id: "shopping", label: "קניות", icon: "🛒" },
  { id: "events", label: "אירועים", icon: "📅" },
  { id: "tasks", label: "סידורים", icon: "✓" },
  { id: "wishes", label: "תכנונים", icon: "♡" },
  { id: "trip", label: "טיול", icon: "🎒" },
];

const defaultState = {
  shopping: [
    { id: crypto.randomUUID(), name: "אבוקדו", quantity: 3, category: "פירות וירקות", purchased: false, purchasedAt: null },
    { id: crypto.randomUUID(), name: "ביצים", quantity: 1, category: "מוצרי חלב", purchased: false, purchasedAt: null },
    { id: crypto.randomUUID(), name: "חלב 3%", quantity: 2, category: "מוצרי חלב", purchased: false, purchasedAt: null },
    { id: crypto.randomUUID(), name: "לחם מלא", quantity: 1, category: "מאפים", purchased: false, purchasedAt: null },
    { id: crypto.randomUUID(), name: "גבינה לבנה", quantity: 1, category: "מוצרי חלב", purchased: true, purchasedAt: new Date().toISOString() },
  ],
  shoppingCategories: [...SHOPPING_DEFAULT_CATEGORIES],
  memberEmails: { iris: "", tomer: "" },
  events: [
    { id: crypto.randomUUID(), title: "יום הולדת לסבתא רותי", date: "2026-07-25", allDay: false, startTime: "19:00", endTime: "22:00", location: "רמת גן", notes: "", participants: ["איריס", "תומר"], recurring: "none" },
    { id: crypto.randomUUID(), title: "בדיקת שיניים לאלון", date: "2026-07-27", allDay: false, startTime: "10:00", endTime: "10:30", location: "מרפאת ד״ר לוי", notes: "", participants: ["איריס"], recurring: "none" },
    { id: crypto.randomUUID(), title: "ערב זוגי", date: "2026-07-29", allDay: false, startTime: "20:30", endTime: "23:00", location: "תל אביב", notes: "", participants: ["איריס", "תומר"], recurring: "none" },
  ],
  tasks: [
    { id: crypto.randomUUID(), title: "להזמין טכנאי למזגן", assignee: "תומר", priority: "גבוהה", category: "בית", notes: "המזגן בחדר הילדים", recurring: "none", completed: false, completedAt: null },
    { id: crypto.randomUUID(), title: "להחזיר ספרים לספרייה", assignee: "איריס", priority: "בינונית", category: "ילדים", notes: "", recurring: "none", completed: false, completedAt: null },
    { id: crypto.randomUUID(), title: "לשלם חשבון מים", assignee: "איריס ותומר", priority: "גבוהה", category: "כספים", notes: "", recurring: "none", completed: false, completedAt: null },
    { id: crypto.randomUUID(), title: "לקבוע תור לרופא", assignee: "איריס", priority: "נמוכה", category: "בריאות", notes: "", recurring: "none", completed: true, completedAt: "2026-07-18T09:15:00" },
  ],
  wishes: [
    { id: crypto.randomUUID(), title: "ארון ויטרינה לסלון", group: "בית", description: "ארון צר ליד המרפסת בגוון עץ בהיר", references: ["https://example.com/vitrina"], estimatedPrice: 3500, priority: "גבוהה", status: "בבדיקה" },
    { id: crypto.randomUUID(), title: "אופניים חדשים לאלון", group: "ילדים", description: "גלגלי 16 אינץ׳", references: [], estimatedPrice: 650, priority: "בינונית", status: "רעיון" },
    { id: crypto.randomUUID(), title: "שואב אבק אלחוטי", group: "תומר", description: "לבדוק דגמים עם תחנת ריקון", references: [], estimatedPrice: 1800, priority: "נמוכה", status: "בבדיקה" },
    { id: crypto.randomUUID(), title: "סוף שבוע בצפון", group: "איריס", description: "מלון משפחתי עם בריכה", references: [], estimatedPrice: 2200, priority: "גבוהה", status: "מתוכנן" },
  ],
  tripItems: [
    { id: crypto.randomUUID(), name: "בקבוקי מים", category: "אוכל", quantity: 4, packed: false, packedAt: null },
    { id: crypto.randomUUID(), name: "מגבות", category: "רחצה", quantity: 4, packed: false, packedAt: null },
    { id: crypto.randomUUID(), name: "אקמול", category: "תרופות", quantity: 1, packed: false, packedAt: null },
    { id: crypto.randomUUID(), name: "בגדי החלפה לילדים", category: "בגדים", quantity: 2, packed: false, packedAt: null },
    { id: crypto.randomUUID(), name: "מטען לטלפון", category: "ציוד", quantity: 1, packed: true, packedAt: new Date().toISOString() },
  ],
};

let state = null;
let editingShoppingId = null;
let supabaseClient = null;
let currentUser = null;
let realtimeChannel = null;
let cloudSaveTimer = null;
let cloudStartedForUserId = null;
let currentScreen = location.hash.replace("#", "") || "home";
if (!NAV_ITEMS.some((item) => item.id === currentScreen)) currentScreen = "home";

const app = document.querySelector("#app");
const desktopNav = document.querySelector("#desktop-nav");
const mobileNav = document.querySelector("#mobile-nav");
const screenTitle = document.querySelector("#screen-title");
const screenEyebrow = document.querySelector("#screen-eyebrow");
const quickAdd = document.querySelector("#quick-add");
const dialog = document.querySelector("#app-dialog");
const dialogForm = document.querySelector("#dialog-form");
const dialogBody = document.querySelector("#dialog-body");
const dialogTitle = document.querySelector("#dialog-title");
const dialogEyebrow = document.querySelector("#dialog-eyebrow");
const dialogSubmit = document.querySelector("#dialog-submit");
const toast = document.querySelector("#toast");
const appShell = document.querySelector("#app-shell");
const authScreen = document.querySelector("#auth-screen");
const authForm = document.querySelector("#auth-form");
const authPassword = document.querySelector("#auth-password");
const authSubmit = document.querySelector("#auth-submit");
const authMessage = document.querySelector("#auth-message");
const signOutButton = document.querySelector("#sign-out");
const signedInUser = document.querySelector("#signed-in-user");
const syncIndicator = document.querySelector(".sync-indicator");

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function normalizeState(input) {
  try {
    const loaded = input ? JSON.parse(JSON.stringify(input)) : cloneDefaultState();

    loaded.shopping = Array.isArray(loaded.shopping) ? loaded.shopping : [];
    loaded.shopping.forEach((item) => {
      item.quantity = positiveInteger(item.quantity);
      if (item.category === "תינוקות" || item.category === "טיפוח") item.category = "פארם";
      item.category = item.category || "אחר";
      delete item.unitPrice;
      delete item.note;
    });
    loaded.shoppingCategories = [...new Set([
      ...SHOPPING_DEFAULT_CATEGORIES,
      ...(Array.isArray(loaded.shoppingCategories) ? loaded.shoppingCategories : []),
      ...loaded.shopping.map((item) => item.category)
    ].filter(Boolean))].sort((a, b) => collator.compare(a, b));

    loaded.memberEmails = {
      iris: loaded.memberEmails?.iris || "",
      tomer: loaded.memberEmails?.tomer || "",
    };

    const oldContacts = Array.isArray(loaded.contacts) ? loaded.contacts : [];
    loaded.events = Array.isArray(loaded.events) ? loaded.events : [];
    loaded.events.forEach((event) => {
      if (!Array.isArray(event.participants)) {
        const participantNames = (event.participantIds || [])
          .map((id) => oldContacts.find((contact) => contact.id === id)?.name)
          .filter(Boolean)
          .map((name) => name === "אמא" ? "איריס" : name === "אבא" ? "תומר" : name)
          .filter((name) => HOUSEHOLD_MEMBERS.includes(name));
        event.participants = [...new Set(participantNames)];
      }
      event.participants = event.participants.filter((name) => HOUSEHOLD_MEMBERS.includes(name));
      event.allDay = Boolean(event.allDay);
      if (event.allDay) {
        event.startTime = "";
        event.endTime = "";
      }
      delete event.participantIds;
      delete event.inviteEmails;
    });

    loaded.tasks = Array.isArray(loaded.tasks) ? loaded.tasks : [];
    loaded.tasks.forEach((task) => {
      task.assignee = task.assignee === "אמא" ? "איריס"
        : task.assignee === "אבא" ? "תומר"
        : task.assignee === "שנינו" ? "איריס ותומר"
        : TASK_ASSIGNEES.includes(task.assignee) ? task.assignee
        : "איריס";
      delete task.dueDate;
    });

    loaded.wishes = Array.isArray(loaded.wishes) ? loaded.wishes : [];
    loaded.wishes.forEach((wish) => {
      wish.group = WISH_GROUPS.includes(wish.group) ? wish.group
        : WISH_GROUPS.includes(wish.type) ? wish.type
        : "בית";
      wish.references = Array.isArray(wish.references)
        ? wish.references.filter(Boolean)
        : wish.link ? [wish.link] : [];
      wish.estimatedPrice = Math.max(0, Math.round(Number(wish.estimatedPrice) || 0));
      delete wish.type;
      delete wish.link;
    });

    loaded.tripItems = Array.isArray(loaded.tripItems) ? loaded.tripItems : cloneDefaultState().tripItems;
    loaded.tripItems.forEach((item) => {
      item.category = TRIP_CATEGORIES.includes(item.category) ? item.category : "ציוד";
      item.quantity = positiveInteger(item.quantity);
      item.packed = Boolean(item.packed);
    });

    delete loaded.contacts;
    return loaded;
  } catch (error) {
    console.warn("Could not normalize data", error);
    return cloneDefaultState();
  }
}

function loadLocalState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return normalizeState(saved ? JSON.parse(saved) : cloneDefaultState());
  } catch (error) {
    console.warn("Could not load saved data", error);
    return cloneDefaultState();
  }
}

function saveState(message = "נשמר") {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (SUPABASE_ENABLED && currentUser) {
    scheduleCloudSave(message);
  } else if (message) {
    showToast(message);
  }
}

function setSyncStatus(text, status = "ok") {
  syncIndicator.textContent = `● ${text}`;
  syncIndicator.classList.toggle("syncing", status === "syncing");
  syncIndicator.classList.toggle("error", status === "error");
  syncIndicator.title = SUPABASE_ENABLED ? "מסונכרן עם Supabase" : "נשמר במכשיר זה בלבד";
}

function scheduleCloudSave(message) {
  setSyncStatus("שומר…", "syncing");
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(async () => {
    const payload = {
      household_id: APP_CONFIG.householdId,
      state,
      updated_by: currentUser.id,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabaseClient
      .from("household_state")
      .upsert(payload, { onConflict: "household_id" });

    if (error) {
      console.error("Supabase save failed", error);
      setSyncStatus("שגיאת סנכרון", "error");
      showToast("השינוי נשמר במכשיר, אך לא בענן");
      return;
    }
    setSyncStatus("מסונכרן");
    if (message) showToast(message);
  }, 180);
}

async function loadCloudState() {
  setSyncStatus("טוען…", "syncing");
  const { data, error } = await supabaseClient
    .from("household_state")
    .select("state")
    .eq("household_id", APP_CONFIG.householdId)
    .maybeSingle();

  if (error) throw error;
  if (data?.state) {
    const loaded = normalizeState(data.state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
    setSyncStatus("מסונכרן");
    return loaded;
  }

  const initial = loadLocalState();
  const { error: insertError } = await supabaseClient
    .from("household_state")
    .insert({
      household_id: APP_CONFIG.householdId,
      state: initial,
      updated_by: currentUser.id,
    });
  if (insertError && insertError.code !== "23505") throw insertError;
  setSyncStatus("מסונכרן");
  return initial;
}

function subscribeToCloudState() {
  if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);
  realtimeChannel = supabaseClient
    .channel(`household-${APP_CONFIG.householdId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "household_state",
        filter: `household_id=eq.${APP_CONFIG.householdId}`,
      },
      (payload) => {
        if (!payload.new?.state) return;
        state = normalizeState(payload.new.state);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setSyncStatus("מסונכרן");
        render();
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") setSyncStatus("מסונכרן");
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setSyncStatus("אין חיבור", "error");
    });
}

function showLogin() {
  currentUser = null;
  cloudStartedForUserId = null;
  appShell.classList.add("hidden");
  mobileNav.classList.add("hidden");
  authScreen.classList.remove("hidden");
  signOutButton.classList.add("hidden");
  signedInUser.classList.add("hidden");
  authMessage.textContent = "";
}

async function startCloudApp(user) {
  if (cloudStartedForUserId === user.id) return;
  cloudStartedForUserId = user.id;
  currentUser = user;
  authScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
  mobileNav.classList.remove("hidden");
  signOutButton.classList.remove("hidden");
  signedInUser.classList.remove("hidden");
  signedInUser.textContent = "משפחת זילכה";

  try {
    state = await loadCloudState();
    subscribeToCloudState();
    render();
  } catch (error) {
    console.error("Could not start cloud app", error);
    state = loadLocalState();
    setSyncStatus("אין הרשאה", "error");
    render();
    showToast("לא ניתן לגשת לבית המשותף. בדקי את הגדרות Supabase וההרשאות.");
  }
}

async function initializeApp() {
  if (!SUPABASE_ENABLED) {
    state = loadLocalState();
    appShell.classList.remove("hidden");
    mobileNav.classList.remove("hidden");
    setSyncStatus("נשמר מקומית");
    render();
    return;
  }

  supabaseClient = window.supabase.createClient(
    APP_CONFIG.supabaseUrl,
    APP_CONFIG.supabasePublishableKey
  );

  let passwordRecoveryHandled = false;

  async function handlePasswordRecovery(nextSession) {
    if (passwordRecoveryHandled || !nextSession?.user) return;
    passwordRecoveryHandled = true;

    const newPassword = window.prompt("הקלידי סיסמה חדשה לחשבון המשפחתי (לפחות 6 תווים):");
    if (!newPassword) {
      passwordRecoveryHandled = false;
      showLogin();
      return;
    }

    if (newPassword.length < 6) {
      window.alert("הסיסמה חייבת להכיל לפחות 6 תווים. פתחי שוב את קישור האיפוס ונסי מחדש.");
      passwordRecoveryHandled = false;
      return;
    }

    const confirmation = window.prompt("הקלידי שוב את הסיסמה החדשה:");
    if (newPassword !== confirmation) {
      window.alert("הסיסמאות אינן תואמות. פתחי שוב את קישור האיפוס ונסי מחדש.");
      passwordRecoveryHandled = false;
      return;
    }

    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) {
      console.error("Could not update password", error);
      window.alert(`לא ניתן לעדכן את הסיסמה: ${error.message}`);
      passwordRecoveryHandled = false;
      return;
    }

    window.history.replaceState({}, document.title, window.location.pathname);
    window.alert("הסיסמה עודכנה בהצלחה.");
    await startCloudApp(nextSession.user);
  }

  supabaseClient.auth.onAuthStateChange((event, nextSession) => {
    setTimeout(async () => {
      if (event === "PASSWORD_RECOVERY") {
        await handlePasswordRecovery(nextSession);
        return;
      }
      if (nextSession?.user) await startCloudApp(nextSession.user);
      else showLogin();
    }, 0);
  });

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.user) await startCloudApp(session.user);
  else showLogin();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2100);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeName(value = "") {
  return String(value).trim().replace(/\s+/g, " ").toLocaleLowerCase("he");
}

function positiveInteger(value) {
  return Math.max(1, Math.round(Number(value) || 1));
}

function currency(value) {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(Number(value || 0));
}

function currencyWhole(value) {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Math.round(Number(value || 0)));
}

function formatDate(dateString) {
  if (!dateString) return "ללא תאריך";
  return new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${dateString}T12:00:00`));
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function priorityBadge(priority) {
  const map = { גבוהה: "pink", בינונית: "orange", נמוכה: "green" };
  return `<span class="badge ${map[priority] || "gray"}">${escapeHtml(priority)}</span>`;
}

function moreMenuHtml(actions) {
  return `<details class="more-menu"><summary aria-label="פעולות נוספות">⋯</summary><div class="more-menu-popover">${actions}</div></details>`;
}

function renderNavigation() {
  const html = NAV_ITEMS.map((item) => `
    <button class="nav-button ${item.id === currentScreen ? "active" : ""}" data-nav="${item.id}">
      <span class="nav-icon">${item.icon}</span><span>${item.label}</span>
    </button>`).join("");
  desktopNav.innerHTML = html;
  mobileNav.innerHTML = html;
}

function navigate(screen) {
  currentScreen = screen;
  location.hash = screen;
  render();
}

function render() {
  renderNavigation();
  const item = NAV_ITEMS.find((navItem) => navItem.id === currentScreen) || NAV_ITEMS[0];
  screenTitle.textContent = item.label;
  screenEyebrow.textContent = currentScreen === "home" ? "ניהול הבית · משפחת זילכה" : "משפחת זילכה";
  quickAdd.textContent = currentScreen === "home" ? "＋ הוספה מהירה" : `＋ ${addLabel(currentScreen)}`;
  quickAdd.onclick = () => currentScreen === "home" ? openQuickAdd() : openAddDialog(currentScreen);

  const renderers = {
    home: renderHome,
    shopping: renderShopping,
    events: renderEvents,
    tasks: renderTasks,
    wishes: renderWishes,
    trip: renderTrip,
  };
  app.innerHTML = renderers[currentScreen]();
  attachScreenEvents();
}

function addLabel(screen) {
  return ({ shopping: "מוצר", events: "אירוע", tasks: "סידור", wishes: "תכנון", trip: "פריט ציוד" })[screen] || "פריט";
}

function upcomingEvents() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return [...state.events]
    .filter((event) => new Date(`${event.date}T${event.allDay ? "00:00" : (event.startTime || "00:00")}`) >= today)
    .sort((a, b) => `${a.date}T${a.allDay ? "00:00" : (a.startTime || "00:00")}`.localeCompare(`${b.date}T${b.allDay ? "00:00" : (b.startTime || "00:00")}`));
}

function renderHome() {
  const activeTasks = state.tasks.filter((task) => !task.completed).sort(sortTasks);
  const events = upcomingEvents();
  const now = new Date();
  const monthTitle = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(now);
  return `
    <section class="card home-calendar-card">
      <div class="card-title-row"><h3 class="card-title">לוח שנה</h3><span class="muted small">${monthTitle}</span></div>
      ${calendarHtml(now.getFullYear(), now.getMonth())}
    </section>
    <section class="grid home-list-grid">
      <article class="card">
        <div class="card-title-row"><h3 class="card-title">סידורים</h3><button class="link-button" data-nav="tasks">הצג הכל</button></div>
        <div class="list">${activeTasks.slice(0, 6).map(taskItemHtml).join("") || emptyHtml("אין סידורים לביצוע")}</div>
      </article>
      <article class="card">
        <div class="card-title-row"><h3 class="card-title">אירועים קרובים</h3><button class="link-button" data-nav="events">הצג הכל</button></div>
        <div class="list">${events.slice(0, 6).map(eventItemHtml).join("") || emptyHtml("אין אירועים קרובים")}</div>
      </article>
    </section>`;
}

function taskItemHtml(task) {
  return `<div class="list-item">
    <button class="checkbox ${task.completed ? "checked" : ""}" data-task-toggle="${task.id}" aria-label="שינוי סטטוס">${task.completed ? "✓" : ""}</button>
    <div class="list-main"><div class="list-title ${task.completed ? "strike" : ""}">${escapeHtml(task.title)}</div>
    <div class="list-meta">${escapeHtml(task.assignee)} · ${escapeHtml(task.category)} · ${escapeHtml(task.priority)}</div></div>
  </div>`;
}

function eventItemHtml(event) {
  const eventDate = new Date(`${event.date}T12:00:00`);
  const when = event.allDay ? "כל היום" : `${escapeHtml(event.startTime || "")}${event.endTime ? `–${escapeHtml(event.endTime)}` : ""}`;
  return `<div class="list-item">
    <div class="event-date"><div>${eventDate.getDate()}<span>${new Intl.DateTimeFormat("he-IL", { month: "short" }).format(eventDate)}</span></div></div>
    <div class="list-main"><div class="list-title">${escapeHtml(event.title)}</div>
    <div class="list-meta">${when}${event.location ? ` · ${escapeHtml(event.location)}` : ""}</div></div>
  </div>`;
}

function calendarHtml(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const eventDays = new Set(state.events.filter((event) => {
    const date = new Date(`${event.date}T12:00:00`);
    return date.getFullYear() === year && date.getMonth() === monthIndex;
  }).map((event) => new Date(`${event.date}T12:00:00`).getDate()));
  const cells = ["א", "ב", "ג", "ד", "ה", "ו", "ש"].map((day) => `<div class="calendar-day head">${day}</div>`);
  for (let index = 0; index < first.getDay(); index += 1) cells.push(`<div class="calendar-day muted"></div>`);
  const now = new Date();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const today = now.getFullYear() === year && now.getMonth() === monthIndex && now.getDate() === day;
    cells.push(`<div class="calendar-day ${today ? "today" : ""} ${eventDays.has(day) ? "has-event" : ""}">${day}</div>`);
  }
  return `<div class="calendar">${cells.join("")}</div>`;
}

/* Shopping */
function renderShopping() {
  const active = state.shopping.filter((item) => !item.purchased);
  const purchased = state.shopping.filter((item) => item.purchased);
  return `<section class="shopping-page clean-shopping-page">
    <div class="shopping-page-head">
      <div><h3 class="card-title">רשימת קניות</h3><p class="muted small">כל המוצרים מוצגים מיד, מחולקים בכותרות קטגוריה וממוינים א׳–ב׳</p></div>
      <button class="secondary-button compact-button" type="button" data-add-shopping-category>＋ קטגוריה</button>
    </div>
    <div class="shopping-search-row">
      <input class="search-field" id="shopping-search" placeholder="חיפוש מוצר..." />
      <span class="shopping-active-count">${active.length} לקנייה</span>
    </div>
    <div class="shopping-section-title"><h3 class="card-title">לקנות</h3></div>
    <div class="shopping-groups flat-shopping-groups">${shoppingGroupsHtml(active, false) || emptyHtml("רשימת הקניות ריקה")}</div>
    <details class="purchased-section clean-purchased-section">
      <summary>נרכשו <span class="count-pill completed">${purchased.length}</span></summary>
      <div class="shopping-groups flat-shopping-groups purchased-groups">${shoppingGroupsHtml(purchased, true) || emptyHtml("עדיין לא סומנו פריטים כנרכשו")}</div>
    </details>
  </section>`;
}

function shoppingCategories() {
  return [...new Set([
    ...SHOPPING_DEFAULT_CATEGORIES,
    ...(Array.isArray(state.shoppingCategories) ? state.shoppingCategories : []),
    ...state.shopping.map((item) => item.category || "אחר")
  ].filter(Boolean))].sort((a, b) => collator.compare(a, b));
}

function shoppingCategoryOptions(selected = "") {
  return [...new Set([...shoppingCategories(), selected].filter(Boolean))]
    .sort((a, b) => collator.compare(a, b))
    .map((category) => `<option value="${escapeHtml(category)}" ${category === selected ? "selected" : ""}>${escapeHtml(category)}</option>`).join("");
}

function addShoppingCategory() {
  const category = String(window.prompt("שם הקטגוריה החדשה:") || "").trim();
  if (!category) return;
  if (shoppingCategories().some((existing) => normalizeName(existing) === normalizeName(category))) {
    showToast("הקטגוריה כבר קיימת");
    return;
  }
  state.shoppingCategories = [...new Set([...(state.shoppingCategories || []), category])].sort((a, b) => collator.compare(a, b));
  saveState("הקטגוריה נוספה");
  render();
}

function shoppingCategoryIcon(category) {
  const icons = {
    "בשר": "🥩", "מאפים": "🥖", "מוצרי חלב": "🥛", "מזווה": "🥫",
    "מתוקים": "🍫", "נקניק": "🌭", "ניקיון": "🧽", "פארם": "🧴",
    "פירות וירקות": "🥬", "קפואים": "❄️", "שתייה": "🥤", "אחר": "🛍️"
  };
  return icons[category] || "🛍️";
}

function shoppingGroupsHtml(items, purchased) {
  const grouped = items.reduce((groups, item) => {
    const category = item.category || "אחר";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
    return groups;
  }, new Map());

  return [...grouped.entries()]
    .sort(([categoryA], [categoryB]) => collator.compare(categoryA, categoryB))
    .map(([category, categoryItems]) => {
      const sortedItems = [...categoryItems].sort((a, b) => collator.compare(a.name, b.name));
      return `<section class="shopping-category-group" data-shopping-group data-category="${escapeHtml(category)}">
        <div class="shopping-category-header"><div class="shopping-category-title"><span class="shopping-category-icon">${shoppingCategoryIcon(category)}</span><h4>${escapeHtml(category)}</h4></div><span class="shopping-category-count">${sortedItems.length}</span></div>
        <div class="shopping-compact-list">${sortedItems.map((item) => item.id === editingShoppingId ? shoppingInlineEditHtml(item) : shoppingRowHtml(item)).join("")}</div>
      </section>`;
    }).join("");
}

function shoppingRowHtml(item) {
  return `<div class="shopping-row" data-shopping-row data-shopping-id="${item.id}" data-name="${escapeHtml(normalizeName(item.name))}" data-category="${escapeHtml(item.category || "אחר")}">
    <button class="checkbox ${item.purchased ? "checked" : ""}" data-shopping-toggle="${item.id}" aria-label="${item.purchased ? "החזרה לרשימת הקניות" : "סימון כנרכש"}">${item.purchased ? "✓" : ""}</button>
    <div class="shopping-product"><strong class="${item.purchased ? "strike" : ""}">${escapeHtml(item.name)}</strong></div>
    <div class="quantity-stepper always-visible" aria-label="כמות ${positiveInteger(item.quantity)}">
      <button type="button" class="stepper-button" data-shopping-quantity="${item.id}" data-delta="-1" aria-label="הפחתת כמות">−</button>
      <strong>${positiveInteger(item.quantity)}</strong>
      <button type="button" class="stepper-button" data-shopping-quantity="${item.id}" data-delta="1" aria-label="הגדלת כמות">＋</button>
    </div>
    ${moreMenuHtml(`<button type="button" data-edit-shopping="${item.id}">עריכה</button><button type="button" class="danger-menu-item" data-delete-shopping="${item.id}">מחיקה</button>`)}
  </div>`;
}

function shoppingInlineEditHtml(item) {
  return `<div class="shopping-row is-editing" data-shopping-row data-shopping-id="${item.id}" data-name="${escapeHtml(normalizeName(item.name))}" data-category="${escapeHtml(item.category || "אחר")}">
    <button class="checkbox ${item.purchased ? "checked" : ""}" data-shopping-toggle="${item.id}">${item.purchased ? "✓" : ""}</button>
    <div class="shopping-edit-fields">
      <label><span>מוצר</span><input data-inline-name value="${escapeHtml(item.name)}" aria-label="שם המוצר" /></label>
      <label><span>קטגוריה</span><select data-inline-category aria-label="קטגוריה">${shoppingCategoryOptions(item.category)}</select></label>
    </div>
    <div class="quantity-stepper always-visible">
      <button type="button" class="stepper-button" data-inline-quantity-step="-1">−</button>
      <input class="quantity-input" data-inline-quantity type="number" min="1" step="1" value="${positiveInteger(item.quantity)}" inputmode="numeric" />
      <button type="button" class="stepper-button" data-inline-quantity-step="1">＋</button>
    </div>
    <div class="inline-save-actions"><button class="icon-save" data-save-shopping-inline="${item.id}" aria-label="שמירה">✓</button><button class="icon-cancel" data-cancel-inline aria-label="ביטול">✕</button></div>
  </div>`;
}

function openInlineShoppingEdit(id) {
  const item = state.shopping.find((existing) => existing.id === id);
  if (!item) return;
  editingShoppingId = id;
  render();
  document.querySelector(`[data-shopping-row][data-shopping-id="${CSS.escape(id)}"] [data-inline-name]`)?.focus();
}

function updateShoppingQuantity(id, delta) {
  const item = state.shopping.find((existing) => existing.id === id);
  if (!item) return;
  item.quantity = Math.max(1, positiveInteger(item.quantity) + Number(delta));
  saveState("הכמות עודכנה");
  render();
}

function changeInlineShoppingQuantity(button, delta) {
  const row = button.closest("[data-shopping-row]");
  const input = row?.querySelector("[data-inline-quantity]");
  if (!input) return;
  input.value = Math.max(1, positiveInteger(input.value) + Number(delta));
}

function saveInlineShoppingEdit(id) {
  const item = state.shopping.find((existing) => existing.id === id);
  const row = document.querySelector(`[data-shopping-row][data-shopping-id="${CSS.escape(id)}"]`);
  if (!item || !row) return;
  const name = String(row.querySelector("[data-inline-name]")?.value || "").trim();
  if (!name) return showToast("יש להזין שם מוצר");
  const duplicate = state.shopping.find((existing) => existing.id !== id && !existing.purchased && !item.purchased && normalizeName(existing.name) === normalizeName(name));
  if (duplicate && !confirm("המוצר כבר נמצא ברשימת הקניות. לשמור את הכפילות בכל זאת?")) return;
  item.name = name;
  item.category = row.querySelector("[data-inline-category]")?.value || "אחר";
  item.quantity = positiveInteger(row.querySelector("[data-inline-quantity]")?.value);
  editingShoppingId = null;
  saveState("המוצר עודכן");
  render();
}

function filterShoppingRows() {
  const query = normalizeName(document.querySelector("#shopping-search")?.value || "");
  document.querySelectorAll("[data-shopping-group]").forEach((group) => {
    let visibleRows = 0;
    group.querySelectorAll("[data-shopping-row]").forEach((row) => {
      row.hidden = !row.dataset.name.includes(query);
      if (!row.hidden) visibleRows += 1;
    });
    group.hidden = visibleRows === 0;
  });
}

/* Events */
function renderEvents() {
  const events = [...state.events].sort((a, b) => `${a.date}T${a.allDay ? "00:00" : (a.startTime || "00:00")}`.localeCompare(`${b.date}T${b.allDay ? "00:00" : (b.startTime || "00:00")}`));
  return `<section class="card events-card clean-list-card">
    <div class="section-intro"><h3 class="card-title">האירועים שלנו</h3><p class="muted small">אירועים של איריס ותומר, כולל אירועים לכל היום</p></div>
    <div class="event-list-header"><span>תאריך</span><span>אירוע</span><span>זמן ומיקום</span><span>משתתפים</span><span></span></div>
    <div class="compact-event-list">${events.map(eventFullHtml).join("") || emptyHtml("אין אירועים")}</div>
  </section>`;
}

function eventFullHtml(event) {
  const date = new Date(`${event.date}T12:00:00`);
  const participants = Array.isArray(event.participants) ? event.participants : [];
  const when = event.allDay ? "כל היום" : `${escapeHtml(event.startTime || "")}${event.endTime ? `–${escapeHtml(event.endTime)}` : ""}`;
  return `<div class="compact-event-row">
    <div class="compact-event-date"><strong>${date.getDate()}</strong><span>${new Intl.DateTimeFormat("he-IL", { month: "short" }).format(date)}</span></div>
    <div class="event-title-cell"><div class="list-title">${escapeHtml(event.title)}</div>${event.notes ? `<div class="list-meta one-line">${escapeHtml(event.notes)}</div>` : ""}</div>
    <div class="event-when-cell"><strong>${when}</strong>${event.location ? `<span>${escapeHtml(event.location)}</span>` : ""}</div>
    <div class="participant-badges">${participants.map((name) => `<span class="badge blue">${escapeHtml(name)}</span>`).join("") || `<span class="muted small">ללא משתתפים</span>`}</div>
    ${moreMenuHtml(`<button type="button" data-edit-event="${event.id}">עריכה</button><button type="button" data-download-ics="${event.id}">הורדת זימון</button><button type="button" data-email-event="${event.id}">פתיחת מייל</button><button type="button" class="danger-menu-item" data-delete-event="${event.id}">מחיקה</button>`)}
  </div>`;
}

/* Tasks */
function renderTasks() {
  const active = state.tasks.filter((task) => !task.completed).sort(sortTasks);
  const completed = state.tasks.filter((task) => task.completed).sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));
  return `<section>
    <div class="section-intro"><h3 class="card-title">סידורים לביצוע</h3><p class="muted small">מחולקים לפי איריס, תומר וסידורים משותפים</p></div>
    <div class="task-assignee-grid">${TASK_ASSIGNEES.map((assignee) => taskAssigneeSectionHtml(assignee, active.filter((task) => task.assignee === assignee), false)).join("")}</div>
    <details class="completed-section">
      <summary>סידורים שבוצעו <span class="count-pill completed">${completed.length}</span></summary>
      <div class="task-assignee-grid completed-task-grid">${TASK_ASSIGNEES.map((assignee) => taskAssigneeSectionHtml(assignee, completed.filter((task) => task.assignee === assignee), true)).join("")}</div>
    </details>
  </section>`;
}

function sortTasks(a, b) {
  const order = { גבוהה: 0, בינונית: 1, נמוכה: 2 };
  return (order[a.priority] ?? 9) - (order[b.priority] ?? 9) || collator.compare(a.title, b.title);
}

function taskAssigneeSectionHtml(assignee, tasks, completed) {
  const heading = assignee === "איריס ותומר" ? "סידורים משותפים" : `הסידורים של ${assignee}`;
  const icon = assignee === "איריס" ? "א" : assignee === "תומר" ? "ת" : "יחד";
  return `<article class="card task-assignee-card ${completed ? "completed-card" : ""}">
    <div class="task-assignee-header"><span class="assignee-avatar">${icon}</span><div><h4>${heading}</h4><span class="muted small">${tasks.length} סידורים</span></div></div>
    <div class="task-compact-list">${tasks.map((task) => taskCompactHtml(task, completed)).join("") || emptyHtml(completed ? "אין סידורים שבוצעו" : "אין סידורים לביצוע")}</div>
  </article>`;
}

function taskCompactHtml(task, completed) {
  return `<div class="task-compact-row">
    <button class="checkbox ${completed ? "checked" : ""}" data-task-toggle="${task.id}">${completed ? "✓" : ""}</button>
    <div class="list-main"><div class="list-title ${completed ? "strike" : ""}">${escapeHtml(task.title)}</div><div class="list-meta">${completed ? "בוצע" : `${escapeHtml(task.category)} · ${escapeHtml(task.priority)}`}${task.notes ? ` · ${escapeHtml(task.notes)}` : ""}</div></div>
    ${moreMenuHtml(`<button type="button" data-edit-task="${task.id}">עריכה</button><button type="button" class="danger-menu-item" data-delete-task="${task.id}">מחיקה</button>`)}
  </div>`;
}

/* Wishes */
function renderWishes() {
  return `<section>
    <div class="section-intro"><h3 class="card-title">התכנונים שלנו</h3><p class="muted small">מחולקים לבית, ילדים, תומר ואיריס</p></div>
    <div class="wish-group-grid">${WISH_GROUPS.map((group) => wishGroupHtml(group)).join("")}</div>
  </section>`;
}

function wishGroupHtml(group) {
  const wishes = state.wishes.filter((wish) => wish.group === group).sort((a, b) => collator.compare(a.title, b.title));
  const icon = { בית: "⌂", ילדים: "🧸", תומר: "ת", איריס: "א" }[group];
  return `<section class="card wish-group-card"><div class="wish-group-header"><span class="assignee-avatar">${icon}</span><div><h3>${group}</h3><span class="muted small">${wishes.length} תכנונים</span></div></div><div class="wish-list">${wishes.map(wishHtml).join("") || emptyHtml("אין תכנונים עדיין")}</div></section>`;
}

function wishHtml(wish) {
  const references = Array.isArray(wish.references) ? wish.references : [];
  return `<article class="wish-row">
    <div class="wish-main"><div class="row-wrap"><strong>${escapeHtml(wish.title)}</strong>${priorityBadge(wish.priority)}<span class="badge purple">${escapeHtml(wish.status)}</span></div>${wish.description ? `<div class="list-meta">${escapeHtml(wish.description)}</div>` : ""}
      ${references.length ? `<div class="reference-list">${references.map(referenceHtml).join("")}</div>` : ""}
    </div>
    <div class="wish-price">${currencyWhole(wish.estimatedPrice)}</div>
    ${moreMenuHtml(`<button type="button" data-edit-wish="${wish.id}">עריכה</button><button type="button" class="danger-menu-item" data-delete-wish="${wish.id}">מחיקה</button>`)}
  </article>`;
}

function referenceHtml(reference, index) {
  const isUrl = /^https?:\/\//i.test(reference);
  return isUrl
    ? `<a class="reference-chip" href="${escapeHtml(reference)}" target="_blank" rel="noopener">רפרנס ${index + 1}</a>`
    : `<span class="reference-chip">${escapeHtml(reference)}</span>`;
}

/* Trip packing */
function renderTrip() {
  const packed = state.tripItems.filter((item) => item.packed).length;
  const total = state.tripItems.length;
  const progress = total ? Math.round((packed / total) * 100) : 0;
  return `<section class="card trip-list-card clean-list-card">
    <div class="trip-list-head"><div><h3 class="card-title">רשימת ציוד משותפת</h3><p class="muted small">${packed} מתוך ${total} פריטים ארוזים</p></div><strong class="progress-number">${progress}%</strong></div>
    <div class="progress-track"><span style="width:${progress}%"></span></div>
    <div class="trip-category-list">${TRIP_CATEGORIES.map(tripCategoryHtml).join("")}</div>
  </section>`;
}

function tripCategoryHtml(category) {
  const items = state.tripItems.filter((item) => item.category === category).sort((a, b) => Number(a.packed) - Number(b.packed) || collator.compare(a.name, b.name));
  const icon = { אוכל: "🥪", רחצה: "🧴", תרופות: "💊", בגדים: "👕", ציוד: "🎒" }[category];
  return `<section class="trip-category-section"><div class="trip-category-header"><span>${icon}</span><h3>${category}</h3><small>${items.length}</small></div><div class="trip-list">${items.map(tripItemHtml).join("") || emptyHtml("אין פריטים")}</div></section>`;
}

function tripItemHtml(item) {
  return `<div class="trip-row">
    <button class="checkbox ${item.packed ? "checked" : ""}" data-trip-toggle="${item.id}">${item.packed ? "✓" : ""}</button>
    <div class="list-main"><div class="list-title ${item.packed ? "strike" : ""}">${escapeHtml(item.name)}</div></div>
    <div class="quantity-stepper always-visible"><button class="stepper-button" data-trip-quantity="${item.id}" data-delta="-1">−</button><strong>${positiveInteger(item.quantity)}</strong><button class="stepper-button" data-trip-quantity="${item.id}" data-delta="1">＋</button></div>
    ${moreMenuHtml(`<button type="button" data-edit-trip="${item.id}">עריכה</button><button type="button" class="danger-menu-item" data-delete-trip="${item.id}">מחיקה</button>`)}
  </div>`;
}

function emptyHtml(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

/* Event bindings */
function attachScreenEvents() {
  document.querySelectorAll("[data-nav]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.nav)));
  document.querySelectorAll("[data-add]").forEach((button) => button.addEventListener("click", () => openAddDialog(button.dataset.add)));

  document.querySelectorAll("[data-shopping-toggle]").forEach((button) => button.addEventListener("click", () => toggleShopping(button.dataset.shoppingToggle)));
  document.querySelectorAll("[data-shopping-quantity]").forEach((button) => button.addEventListener("click", () => updateShoppingQuantity(button.dataset.shoppingQuantity, button.dataset.delta)));
  document.querySelectorAll("[data-edit-shopping]").forEach((button) => button.addEventListener("click", () => openInlineShoppingEdit(button.dataset.editShopping)));
  document.querySelectorAll("[data-save-shopping-inline]").forEach((button) => button.addEventListener("click", () => saveInlineShoppingEdit(button.dataset.saveShoppingInline)));
  document.querySelectorAll("[data-cancel-inline]").forEach((button) => button.addEventListener("click", () => { editingShoppingId = null; render(); }));
  document.querySelectorAll("[data-inline-quantity-step]").forEach((button) => button.addEventListener("click", () => changeInlineShoppingQuantity(button, button.dataset.inlineQuantityStep)));
  document.querySelectorAll("[data-delete-shopping]").forEach((button) => button.addEventListener("click", () => deleteFrom("shopping", button.dataset.deleteShopping)));
  document.querySelector("#shopping-search")?.addEventListener("input", filterShoppingRows);
  document.querySelector("[data-add-shopping-category]")?.addEventListener("click", addShoppingCategory);

  document.querySelectorAll("[data-edit-event]").forEach((button) => button.addEventListener("click", () => openEditDialog("events", button.dataset.editEvent)));
  document.querySelectorAll("[data-delete-event]").forEach((button) => button.addEventListener("click", () => deleteFrom("events", button.dataset.deleteEvent)));
  document.querySelectorAll("[data-download-ics]").forEach((button) => button.addEventListener("click", () => downloadICS(button.dataset.downloadIcs)));
  document.querySelectorAll("[data-email-event]").forEach((button) => button.addEventListener("click", () => emailEvent(button.dataset.emailEvent)));

  document.querySelectorAll("[data-task-toggle]").forEach((button) => button.addEventListener("click", () => toggleTask(button.dataset.taskToggle)));
  document.querySelectorAll("[data-edit-task]").forEach((button) => button.addEventListener("click", () => openEditDialog("tasks", button.dataset.editTask)));
  document.querySelectorAll("[data-delete-task]").forEach((button) => button.addEventListener("click", () => deleteFrom("tasks", button.dataset.deleteTask)));

  document.querySelectorAll("[data-edit-wish]").forEach((button) => button.addEventListener("click", () => openEditDialog("wishes", button.dataset.editWish)));
  document.querySelectorAll("[data-delete-wish]").forEach((button) => button.addEventListener("click", () => deleteFrom("wishes", button.dataset.deleteWish)));

  document.querySelectorAll("[data-trip-toggle]").forEach((button) => button.addEventListener("click", () => toggleTrip(button.dataset.tripToggle)));
  document.querySelectorAll("[data-trip-quantity]").forEach((button) => button.addEventListener("click", () => updateTripQuantity(button.dataset.tripQuantity, button.dataset.delta)));
  document.querySelectorAll("[data-edit-trip]").forEach((button) => button.addEventListener("click", () => openEditDialog("trip", button.dataset.editTrip)));
  document.querySelectorAll("[data-delete-trip]").forEach((button) => button.addEventListener("click", () => deleteFrom("tripItems", button.dataset.deleteTrip)));
}

function toggleShopping(id) {
  const item = state.shopping.find((existing) => existing.id === id);
  if (!item) return;
  item.purchased = !item.purchased;
  item.purchasedAt = item.purchased ? new Date().toISOString() : null;
  saveState(item.purchased ? "המוצר הועבר לנרכשו" : "המוצר הוחזר לרשימת הקניות");
  render();
}

function toggleTask(id) {
  const task = state.tasks.find((existing) => existing.id === id);
  if (!task) return;
  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : null;
  saveState(task.completed ? "הסידור הועבר לסידורים שבוצעו" : "הסידור הוחזר לביצוע");
  render();
}

function toggleTrip(id) {
  const item = state.tripItems.find((existing) => existing.id === id);
  if (!item) return;
  item.packed = !item.packed;
  item.packedAt = item.packed ? new Date().toISOString() : null;
  saveState(item.packed ? "הפריט סומן כארוז" : "הפריט הוחזר לציוד שצריך לארוז");
  render();
}

function updateTripQuantity(id, delta) {
  const item = state.tripItems.find((existing) => existing.id === id);
  if (!item) return;
  item.quantity = Math.max(1, positiveInteger(item.quantity) + Number(delta));
  saveState("כמות הציוד עודכנה");
  render();
}

function deleteFrom(collection, id) {
  if (!confirm("למחוק את הפריט?")) return;
  state[collection] = state[collection].filter((item) => item.id !== id);
  saveState("הפריט נמחק");
  render();
}

/* Dialogs */
function openQuickAdd() {
  dialogEyebrow.textContent = "הוספה מהירה";
  dialogTitle.textContent = "מה תרצו להוסיף?";
  dialogBody.innerHTML = `<div class="grid quick-grid">${NAV_ITEMS.filter((item) => item.id !== "home").map((item) => `<button type="button" class="quick-card" data-dialog-add="${item.id}"><span>${item.icon}</span>${addLabel(item.id)}</button>`).join("")}</div>`;
  dialogSubmit.hidden = true;
  dialogForm.onsubmit = null;
  dialog.showModal();
  dialogBody.querySelectorAll("[data-dialog-add]").forEach((button) => button.addEventListener("click", () => { dialog.close(); openAddDialog(button.dataset.dialogAdd); }));
}

function openAddDialog(type) {
  const config = dialogConfig(type, null);
  showConfiguredDialog(config);
}

function openEditDialog(type, id) {
  const collection = type === "trip" ? "tripItems" : type;
  const item = state[collection].find((existing) => existing.id === id);
  if (!item) return;
  const config = dialogConfig(type, item);
  showConfiguredDialog(config);
}

function showConfiguredDialog(config) {
  dialogSubmit.hidden = false;
  dialogSubmit.textContent = config.submitLabel;
  dialogEyebrow.textContent = config.eyebrow;
  dialogTitle.textContent = config.title;
  dialogBody.innerHTML = config.html;
  dialogForm.onsubmit = (event) => {
    event.preventDefault();
    config.submit(new FormData(dialogForm));
  };
  dialog.showModal();
  const allDayToggle = dialogBody.querySelector("[data-all-day-toggle]");
  const timeFields = dialogBody.querySelector("#event-time-fields");
  if (allDayToggle && timeFields) {
    const syncAllDay = () => { timeFields.hidden = allDayToggle.checked; };
    allDayToggle.addEventListener("change", syncAllDay);
    syncAllDay();
  }
}

function dialogConfig(type, item) {
  const editing = Boolean(item);
  const configs = {
    shopping: {
      eyebrow: "רשימת קניות", title: editing ? "עריכת מוצר" : "הוספת מוצר", html: shoppingFormHtml(item), submitLabel: editing ? "שמירת שינויים" : "שמירה",
      submit: (data) => editing ? submitShoppingEdit(item.id, data) : submitShopping(data),
    },
    events: {
      eyebrow: "אירועים", title: editing ? "עריכת אירוע" : "יצירת אירוע", html: eventFormHtml(item), submitLabel: editing ? "שמירת שינויים" : "שמירה",
      submit: (data) => submitEvent(data, item?.id),
    },
    tasks: {
      eyebrow: "סידורים", title: editing ? "עריכת סידור" : "סידור חדש", html: taskFormHtml(item), submitLabel: editing ? "שמירת שינויים" : "שמירה",
      submit: (data) => submitTask(data, item?.id),
    },
    wishes: {
      eyebrow: "תכנונים", title: editing ? "עריכת תכנון" : "תכנון חדש", html: wishFormHtml(item), submitLabel: editing ? "שמירת שינויים" : "שמירה",
      submit: (data) => submitWish(data, item?.id),
    },
    trip: {
      eyebrow: "התארגנות לטיול", title: editing ? "עריכת פריט ציוד" : "פריט ציוד חדש", html: tripFormHtml(item), submitLabel: editing ? "שמירת שינויים" : "שמירה",
      submit: (data) => submitTripItem(data, item?.id),
    },
  };
  return configs[type];
}

function shoppingFormHtml(item = null) {
  return `<div class="form-stack">
    <label>שם המוצר<input name="name" required autofocus value="${escapeHtml(item?.name || "")}" /></label>
    <div class="form-grid"><label>כמות<input name="quantity" type="number" min="1" step="1" inputmode="numeric" value="${positiveInteger(item?.quantity)}" required /></label><label>קטגוריה<select name="category">${shoppingCategoryOptions(item?.category || "פירות וירקות")}</select></label></div>
    ${item ? `<label class="checkbox-label"><input name="purchased" type="checkbox" ${item.purchased ? "checked" : ""} /> המוצר נרכש</label>` : ""}
    <div id="duplicate-container"></div>
  </div>`;
}

function submitShopping(formData, force = false) {
  const item = {
    id: crypto.randomUUID(),
    name: String(formData.get("name") || "").trim(),
    quantity: positiveInteger(formData.get("quantity")),
    category: formData.get("category") || "אחר",
    purchased: false,
    purchasedAt: null,
  };
  const duplicate = state.shopping.find((existing) => !existing.purchased && normalizeName(existing.name) === normalizeName(item.name));
  if (duplicate && !force) {
    const container = document.querySelector("#duplicate-container");
    container.innerHTML = `<div class="duplicate-warning"><strong>המוצר כבר נמצא ברשימת הקניות.</strong><div class="toolbar" style="margin:10px 0 0"><button type="button" class="primary-button" id="force-add">הוסף בכל זאת</button><button type="button" class="secondary-button" id="cancel-duplicate">לא להוסיף</button></div></div>`;
    container.querySelector("#force-add").onclick = () => { state.shopping.push(item); saveState("המוצר נוסף למרות הכפילות"); dialog.close(); render(); };
    container.querySelector("#cancel-duplicate").onclick = () => dialog.close();
    return;
  }
  state.shopping.push(item);
  saveState("המוצר נוסף לרשימת הקניות");
  dialog.close();
  render();
}

function submitShoppingEdit(id, formData) {
  const item = state.shopping.find((existing) => existing.id === id);
  if (!item) return;
  const name = String(formData.get("name") || "").trim();
  const purchased = formData.get("purchased") === "on";
  const duplicate = state.shopping.find((existing) => existing.id !== id && !existing.purchased && !purchased && normalizeName(existing.name) === normalizeName(name));
  if (duplicate && !confirm("המוצר כבר נמצא ברשימת הקניות. לשמור את הכפילות בכל זאת?")) return;
  const wasPurchased = item.purchased;
  Object.assign(item, {
    name,
    quantity: positiveInteger(formData.get("quantity")),
    category: formData.get("category") || "אחר",
    purchased,
  });
  if (!wasPurchased && purchased) item.purchasedAt = new Date().toISOString();
  if (wasPurchased && !purchased) item.purchasedAt = null;
  saveState("המוצר עודכן");
  dialog.close();
  render();
}

function memberChoicesHtml(selected = HOUSEHOLD_MEMBERS) {
  return HOUSEHOLD_MEMBERS.map((name) => `<label class="member-choice"><input type="checkbox" name="participants" value="${name}" ${selected.includes(name) ? "checked" : ""} /><span>${name}</span></label>`).join("");
}

function eventFormHtml(item = null) {
  const allDay = Boolean(item?.allDay);
  return `<div class="form-stack">
    <label>שם האירוע<input name="title" required autofocus value="${escapeHtml(item?.title || "")}" /></label>
    <div class="form-grid"><label>תאריך<input name="date" type="date" required value="${escapeHtml(item?.date || "")}" /></label><label>מיקום<input name="location" value="${escapeHtml(item?.location || "")}" /></label></div>
    <label class="checkbox-label all-day-choice"><input name="allDay" type="checkbox" data-all-day-toggle ${allDay ? "checked" : ""} /> אירוע לכל היום</label>
    <div class="form-grid" id="event-time-fields" ${allDay ? "hidden" : ""}><label>שעת התחלה<input name="startTime" type="time" value="${escapeHtml(item?.startTime || "")}" /></label><label>שעת סיום<input name="endTime" type="time" value="${escapeHtml(item?.endTime || "")}" /></label></div>
    <label>הערות<textarea name="notes">${escapeHtml(item?.notes || "")}</textarea></label>
    <label>משתתפים<div class="member-choice-grid">${memberChoicesHtml(item?.participants || HOUSEHOLD_MEMBERS)}</div></label>
    <div><div class="small muted" style="margin-bottom:7px">כתובות המייל נשמרות לזימונים הבאים</div><div class="form-grid"><label>המייל של איריס<input name="irisEmail" type="email" value="${escapeHtml(state.memberEmails.iris)}" /></label><label>המייל של תומר<input name="tomerEmail" type="email" value="${escapeHtml(state.memberEmails.tomer)}" /></label></div></div>
    <label>חזרתיות<select name="recurring"><option value="none" ${item?.recurring === "none" ? "selected" : ""}>ללא חזרה</option><option value="weekly" ${item?.recurring === "weekly" ? "selected" : ""}>שבועי</option><option value="monthly" ${item?.recurring === "monthly" ? "selected" : ""}>חודשי</option><option value="yearly" ${item?.recurring === "yearly" ? "selected" : ""}>שנתי</option></select></label>
  </div>`;
}

function submitEvent(formData, id = null) {
  state.memberEmails = { iris: String(formData.get("irisEmail") || "").trim(), tomer: String(formData.get("tomerEmail") || "").trim() };
  const allDay = formData.get("allDay") === "on";
  const values = {
    title: String(formData.get("title") || "").trim(), date: formData.get("date"), allDay,
    startTime: allDay ? "" : formData.get("startTime"), endTime: allDay ? "" : formData.get("endTime"),
    location: String(formData.get("location") || "").trim(), notes: String(formData.get("notes") || "").trim(), participants: formData.getAll("participants"), recurring: formData.get("recurring"),
  };
  if (id) Object.assign(state.events.find((event) => event.id === id), values);
  else state.events.push({ id: crypto.randomUUID(), ...values });
  saveState(id ? "האירוע עודכן" : "האירוע נוסף");
  dialog.close();
  render();
}

function taskFormHtml(item = null) {
  return `<div class="form-stack">
    <label>שם הסידור<input name="title" required autofocus value="${escapeHtml(item?.title || "")}" /></label>
    <label>הערה<textarea name="notes">${escapeHtml(item?.notes || "")}</textarea></label>
    <div class="form-grid"><label>אחראי<select name="assignee">${TASK_ASSIGNEES.map((assignee) => `<option ${item?.assignee === assignee ? "selected" : ""}>${assignee}</option>`).join("")}</select></label><label>קטגוריה<select name="category">${["אוטו", "בית", "ילדים", "כספים", "בריאות", "עבודה", "אחר"].map((category) => `<option ${item?.category === category ? "selected" : ""}>${category}</option>`).join("")}</select></label></div>
    <div class="form-grid"><label>עדיפות<select name="priority">${["גבוהה", "בינונית", "נמוכה"].map((priority) => `<option ${item?.priority === priority || (!item && priority === "בינונית") ? "selected" : ""}>${priority}</option>`).join("")}</select></label><label>חזרתיות<select name="recurring">${[["none", "ללא חזרה"], ["daily", "יומי"], ["weekly", "שבועי"], ["monthly", "חודשי"]].map(([value, label]) => `<option value="${value}" ${item?.recurring === value ? "selected" : ""}>${label}</option>`).join("")}</select></label></div>
  </div>`;
}

function submitTask(formData, id = null) {
  const values = {
    title: String(formData.get("title") || "").trim(), notes: String(formData.get("notes") || "").trim(), assignee: formData.get("assignee"),
    priority: formData.get("priority"), category: formData.get("category"), recurring: formData.get("recurring"),
  };
  if (id) Object.assign(state.tasks.find((task) => task.id === id), values);
  else state.tasks.push({ id: crypto.randomUUID(), ...values, completed: false, completedAt: null });
  saveState(id ? "הסידור עודכן" : "הסידור נוסף");
  dialog.close();
  render();
}

function referencesToText(references = []) {
  return references.join("\n");
}

function parseReferences(value) {
  return String(value || "").split(/\n+/).map((reference) => reference.trim()).filter(Boolean);
}

function wishFormHtml(item = null) {
  return `<div class="form-stack">
    <label>שם התכנון<input name="title" required autofocus value="${escapeHtml(item?.title || "")}" /></label>
    <label>תיאור<textarea name="description">${escapeHtml(item?.description || "")}</textarea></label>
    <div class="form-grid"><label>שיוך<select name="group">${WISH_GROUPS.map((group) => `<option ${item?.group === group ? "selected" : ""}>${group}</option>`).join("")}</select></label><label>עדיפות<select name="priority">${["גבוהה", "בינונית", "נמוכה"].map((priority) => `<option ${item?.priority === priority || (!item && priority === "בינונית") ? "selected" : ""}>${priority}</option>`).join("")}</select></label></div>
    <label>רפרנסים<textarea name="references" placeholder="קישור או תיאור, אחד בכל שורה">${escapeHtml(referencesToText(item?.references || []))}</textarea></label>
    <div class="form-grid"><label>מחיר משוער בשקלים שלמים<input name="estimatedPrice" type="number" min="0" step="1" value="${Math.round(Number(item?.estimatedPrice || 0))}" /></label><label>סטטוס<select name="status">${["רעיון", "בבדיקה", "מתוכנן", "בוצע"].map((status) => `<option ${item?.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></label></div>
  </div>`;
}

function submitWish(formData, id = null) {
  const values = {
    title: String(formData.get("title") || "").trim(), description: String(formData.get("description") || "").trim(), group: formData.get("group"), priority: formData.get("priority"),
    references: parseReferences(formData.get("references")), estimatedPrice: Math.max(0, Math.round(Number(formData.get("estimatedPrice")) || 0)), status: formData.get("status"),
  };
  if (id) Object.assign(state.wishes.find((wish) => wish.id === id), values);
  else state.wishes.push({ id: crypto.randomUUID(), ...values });
  saveState(id ? "התכנון עודכן" : "התכנון נוסף");
  dialog.close();
  render();
}

function tripFormHtml(item = null) {
  return `<div class="form-stack">
    <label>שם הפריט<input name="name" required autofocus value="${escapeHtml(item?.name || "")}" /></label>
    <div class="form-grid"><label>קטגוריה<select name="category">${TRIP_CATEGORIES.map((category) => `<option ${item?.category === category ? "selected" : ""}>${category}</option>`).join("")}</select></label><label>כמות<input name="quantity" type="number" min="1" step="1" inputmode="numeric" value="${positiveInteger(item?.quantity)}" /></label></div>
    ${item ? `<label class="checkbox-label"><input name="packed" type="checkbox" ${item.packed ? "checked" : ""} /> הפריט ארוז</label>` : ""}
  </div>`;
}

function submitTripItem(formData, id = null) {
  const values = { name: String(formData.get("name") || "").trim(), category: formData.get("category"), quantity: positiveInteger(formData.get("quantity")) };
  if (id) {
    const item = state.tripItems.find((tripItem) => tripItem.id === id);
    const packed = formData.get("packed") === "on";
    const wasPacked = item.packed;
    Object.assign(item, values, { packed });
    if (!wasPacked && packed) item.packedAt = new Date().toISOString();
    if (wasPacked && !packed) item.packedAt = null;
  } else {
    state.tripItems.push({ id: crypto.randomUUID(), ...values, packed: false, packedAt: null });
  }
  saveState(id ? "פריט הציוד עודכן" : "פריט נוסף לרשימת הטיול");
  dialog.close();
  render();
}

/* Calendar invitations */
function eventEmails(event) {
  const participants = Array.isArray(event.participants) ? event.participants : [];
  return [...new Set(participants.map((name) => name === "איריס" ? state.memberEmails.iris : state.memberEmails.tomer).filter(Boolean))];
}

function downloadICS(eventId) {
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return;
  const dateOnly = event.date.replaceAll("-", "");
  let dateLines;
  if (event.allDay) {
    const nextDate = new Date(`${event.date}T12:00:00`);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateOnly = `${nextDate.getFullYear()}${String(nextDate.getMonth() + 1).padStart(2, "0")}${String(nextDate.getDate()).padStart(2, "0")}`;
    dateLines = [`DTSTART;VALUE=DATE:${dateOnly}`, `DTEND;VALUE=DATE:${nextDateOnly}`];
  } else {
    const startTime = event.startTime || "00:00";
    const endTime = event.endTime || startTime;
    dateLines = [`DTSTART:${dateOnly}T${startTime.replace(":", "")}00`, `DTEND:${dateOnly}T${endTime.replace(":", "")}00`];
  }
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nihul Habayit//Zilcha//HE", "CALSCALE:GREGORIAN", "METHOD:REQUEST",
    "BEGIN:VEVENT", `UID:${event.id}@nihul-habayit`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    ...dateLines, `SUMMARY:${escapeIcs(event.title)}`, `LOCATION:${escapeIcs(event.location || "")}`, `DESCRIPTION:${escapeIcs(event.notes || "")}`,
    ...eventEmails(event).map((email) => `ATTENDEE;RSVP=TRUE:mailto:${email}`), "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${event.title}.ics`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("קובץ הזימון הורד");
}

function escapeIcs(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll(",", "\\,").replaceAll(";", "\\;").replaceAll("\n", "\\n");
}

function emailEvent(eventId) {
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return;
  const emails = eventEmails(event);
  if (!emails.length) return showToast("לא הוגדרו כתובות מייל למשתתפים");
  const subject = encodeURIComponent(`זימון: ${event.title}`);
  const when = event.allDay ? "כל היום" : `${event.startTime || ""}${event.endTime ? `–${event.endTime}` : ""}`;
  const body = encodeURIComponent(`${event.title}\n${formatDate(event.date)} ${when}\n${event.location || ""}\n\nנא לצרף את קובץ הזימון שהורד מהאפליקציה.`);
  location.href = `mailto:${emails.join(",")}?subject=${subject}&body=${body}`;
}

function resetDemo() {
  if (!confirm("לאפס את כל הנתונים ולחזור לנתוני הדוגמה?")) return;
  state = cloneDefaultState();
  saveState("נתוני הדוגמה שוחזרו");
  render();
}

document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => dialog.close()));
document.querySelector("#reset-demo").addEventListener("click", resetDemo);
window.addEventListener("hashchange", () => {
  currentScreen = location.hash.replace("#", "") || "home";
  if (!NAV_ITEMS.some((item) => item.id === currentScreen)) currentScreen = "home";
  render();
});

authForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  authMessage.textContent = "";
  authSubmit.disabled = true;
  authSubmit.textContent = "נכנסת…";
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: APP_CONFIG.sharedLoginEmail.trim(),
    password: authPassword.value,
  });
  authSubmit.disabled = false;
  authSubmit.textContent = "כניסה";
  if (error) authMessage.textContent = "הסיסמה אינה נכונה או שהחיבור עדיין לא הוגדר.";
});

signOutButton?.addEventListener("click", async () => {
  if (realtimeChannel) await supabaseClient.removeChannel(realtimeChannel);
  await supabaseClient.auth.signOut();
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(console.warn);
}

initializeApp().catch((error) => {
  console.error("Application initialization failed", error);
  state = loadLocalState();
  appShell.classList.remove("hidden");
  mobileNav.classList.remove("hidden");
  setSyncStatus("מצב מקומי", "error");
  render();
  showToast("האפליקציה נפתחה במצב מקומי עקב שגיאת חיבור");
});
