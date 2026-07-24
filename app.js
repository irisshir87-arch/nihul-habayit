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
const TASK_ASSIGNEE_LABELS = { "איריס": "איריס", "תומר": "תומר", "איריס ותומר": "ביחד" };
const WISH_DEFAULT_CATEGORIES = ["בית", "ילדים", "תומר", "איריס", "מתכונים", "אטרקציות"];
const SHOPPING_DEFAULT_CATEGORIES = [
  "בשר", "מאפים", "מוצרי חלב", "מזווה", "מתוקים", "נקניק",
  "ניקיון", "פארם", "פירות וירקות", "קפואים", "שתייה", "אחר"
];
const TRIP_DEFAULT_CATEGORIES = ["אוכל", "רחצה", "תרופות", "בגדים", "ציוד"];
const TASK_CATEGORIES = ["אוטו", "בית", "ילדים", "כספים", "בריאות", "פארם", "עבודה", "אחר"];

const NAV_ICONS = {
  home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></svg>`,
  shopping: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20.5 8H6"/><circle cx="10" cy="19" r="1.3"/><circle cx="17" cy="19" r="1.3"/></svg>`,
  events: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M7.5 3.5v4M16.5 3.5v4M3.5 9.5h17"/><path d="M8 13h3M13 13h3M8 17h3"/></svg>`,
  tasks: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="m7 9 1.5 1.5L11 8M13 9h4M7 15l1.5 1.5L11 14M13 15h4"/></svg>`,
  wishes: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 8.8c0 5.1-8.5 10.2-8.5 10.2S3.5 13.9 3.5 8.8A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 8.5 1.1Z"/></svg>`,
  trip: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="7" width="14" height="14" rx="2"/><path d="M9 7V5.5A2.5 2.5 0 0 1 11.5 3h1A2.5 2.5 0 0 1 15 5.5V7M9 12v4M15 12v4M5 13h14"/></svg>`,
};

const NAV_ITEMS = [
  { id: "home", label: "בית", icon: NAV_ICONS.home },
  { id: "shopping", label: "קניות", icon: NAV_ICONS.shopping },
  { id: "events", label: "אירועים", icon: NAV_ICONS.events },
  { id: "tasks", label: "סידורים", icon: NAV_ICONS.tasks },
  { id: "wishes", label: "תכנונים", icon: NAV_ICONS.wishes },
  { id: "trip", label: "טיול", icon: NAV_ICONS.trip },
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
  taskCategories: [...TASK_CATEGORIES],
  tasks: [
    { id: crypto.randomUUID(), title: "להזמין טכנאי למזגן", assignee: "תומר", category: "בית", notes: "המזגן בחדר הילדים", completed: false, completedAt: null, order: 0 },
    { id: crypto.randomUUID(), title: "להחזיר ספרים לספרייה", assignee: "איריס", category: "ילדים", notes: "", completed: false, completedAt: null, order: 1 },
    { id: crypto.randomUUID(), title: "לשלם חשבון מים", assignee: "איריס ותומר", category: "כספים", notes: "", completed: false, completedAt: null, order: 2 },
    { id: crypto.randomUUID(), title: "לקבוע תור לרופא", assignee: "איריס", category: "בריאות", notes: "", completed: true, completedAt: "2026-07-18T09:15:00", order: 3 },
  ],
  wishCategories: [...WISH_DEFAULT_CATEGORIES],
  wishes: [
    { id: crypto.randomUUID(), title: "ארון ויטרינה לסלון", category: "בית", note: "ארון צר ליד המרפסת בגוון עץ בהיר", references: ["https://example.com/vitrina"] },
    { id: crypto.randomUUID(), title: "אופניים חדשים לאלון", category: "ילדים", note: "גלגלי 16 אינץ׳", references: [] },
    { id: crypto.randomUUID(), title: "שואב אבק אלחוטי", category: "תומר", note: "לבדוק דגמים עם תחנת ריקון", references: [] },
    { id: crypto.randomUUID(), title: "סוף שבוע בצפון", category: "איריס", note: "מלון משפחתי עם בריכה", references: [] },
  ],
  tripCategories: [...TRIP_DEFAULT_CATEGORIES],
  tripItems: [
    { id: crypto.randomUUID(), name: "בקבוקי מים", category: "אוכל", quantity: 4, packed: false, packedAt: null },
    { id: crypto.randomUUID(), name: "מגבות", category: "רחצה", quantity: 4, packed: false, packedAt: null },
    { id: crypto.randomUUID(), name: "אקמול", category: "תרופות", quantity: 1, packed: false, packedAt: null },
    { id: crypto.randomUUID(), name: "בגדי החלפה לילדים", category: "בגדים", quantity: 2, packed: false, packedAt: null },
    { id: crypto.randomUUID(), name: "מטען לטלפון", category: "ציוד", quantity: 1, packed: true, packedAt: new Date().toISOString() },
  ],
  tripArchive: [],
};

let state = null;
let editingShoppingId = null;
let shoppingCategoryFilter = "הכל";
let wishCategoryFilter = "הכל";
let calendarViewDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let expandedTaskIds = new Set();
let archivedTripSelection = new Set();
let taskDragState = null;
let suppressTaskClickUntil = 0;
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

function validStoredId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{6,}$/.test(value);
}

function ensureCollectionIds(items) {
  const seen = new Set();
  items.forEach((item) => {
    if (!validStoredId(item.id) || seen.has(item.id)) item.id = crypto.randomUUID();
    seen.add(item.id);
  });
}

function normalizeCategoryList(defaults, stored, itemCategories) {
  return [...new Set([
    ...defaults,
    ...(Array.isArray(stored) ? stored : []),
    ...itemCategories,
  ].map((value) => String(value || "").trim()).filter(Boolean))];
}

function normalizeState(input) {
  try {
    const loaded = input ? JSON.parse(JSON.stringify(input)) : cloneDefaultState();

    loaded.shopping = Array.isArray(loaded.shopping) ? loaded.shopping : [];
    ensureCollectionIds(loaded.shopping);
    loaded.shopping.forEach((item) => {
      item.quantity = positiveInteger(item.quantity);
      if (item.category === "תינוקות" || item.category === "טיפוח") item.category = "פארם";
      item.category = item.category || "אחר";
      item.purchased = Boolean(item.purchased);
      delete item.unitPrice;
      delete item.note;
    });
    loaded.shoppingCategories = normalizeCategoryList(
      SHOPPING_DEFAULT_CATEGORIES,
      loaded.shoppingCategories,
      loaded.shopping.map((item) => item.category)
    ).sort((a, b) => collator.compare(a, b));

    loaded.memberEmails = {
      iris: loaded.memberEmails?.iris || "",
      tomer: loaded.memberEmails?.tomer || "",
    };

    const oldContacts = Array.isArray(loaded.contacts) ? loaded.contacts : [];
    loaded.events = Array.isArray(loaded.events) ? loaded.events : [];
    ensureCollectionIds(loaded.events);
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
    ensureCollectionIds(loaded.tasks);
    loaded.tasks.forEach((task, index) => {
      task.title = String(task.title || task.name || "").trim();
      task.notes = String(task.notes || task.description || "").trim();
      task.assignee = task.assignee === "אמא" ? "איריס"
        : task.assignee === "אבא" ? "תומר"
        : task.assignee === "שנינו" ? "איריס ותומר"
        : TASK_ASSIGNEES.includes(task.assignee) ? task.assignee
        : "איריס";
      task.category = String(task.category || "אחר").trim() || "אחר";
      task.completed = Boolean(task.completed);
      task.order = Number.isFinite(Number(task.order)) ? Number(task.order) : index;
      delete task.dueDate;
      delete task.priority;
      delete task.recurring;
      delete task.description;
      delete task.name;
    });
    loaded.tasks.sort((a, b) => a.order - b.order).forEach((task, index) => { task.order = index; });
    loaded.taskCategories = normalizeCategoryList(
      TASK_CATEGORIES,
      loaded.taskCategories,
      loaded.tasks.map((task) => task.category)
    );

    loaded.wishes = Array.isArray(loaded.wishes) ? loaded.wishes : [];
    ensureCollectionIds(loaded.wishes);
    loaded.wishes.forEach((wish) => {
      wish.title = String(wish.title || "").trim();
      wish.category = String(wish.category || wish.group || wish.type || "בית").trim() || "בית";
      wish.note = String(wish.note || wish.description || "").trim();
      wish.references = Array.isArray(wish.references)
        ? wish.references.map((reference) => String(reference || "").trim()).filter(Boolean)
        : wish.link ? [String(wish.link).trim()] : [];
      delete wish.group;
      delete wish.description;
      delete wish.estimatedPrice;
      delete wish.type;
      delete wish.link;
      delete wish.priority;
      delete wish.status;
    });
    loaded.wishCategories = normalizeCategoryList(
      WISH_DEFAULT_CATEGORIES,
      loaded.wishCategories,
      loaded.wishes.map((wish) => wish.category)
    );

    loaded.tripItems = Array.isArray(loaded.tripItems) ? loaded.tripItems : cloneDefaultState().tripItems;
    loaded.tripArchive = Array.isArray(loaded.tripArchive) ? loaded.tripArchive : [];
    ensureCollectionIds(loaded.tripItems);
    ensureCollectionIds(loaded.tripArchive);
    const activeIds = new Set(loaded.tripItems.map((item) => item.id));
    loaded.tripArchive.forEach((item) => {
      if (activeIds.has(item.id)) item.id = crypto.randomUUID();
      activeIds.add(item.id);
    });
    [...loaded.tripItems, ...loaded.tripArchive].forEach((item) => {
      item.name = String(item.name || "").trim();
      item.category = String(item.category || "ציוד").trim() || "ציוד";
      item.quantity = positiveInteger(item.quantity);
      item.packed = Boolean(item.packed);
    });
    loaded.tripCategories = normalizeCategoryList(
      TRIP_DEFAULT_CATEGORIES,
      loaded.tripCategories,
      [...loaded.tripItems, ...loaded.tripArchive].map((item) => item.category)
    );

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
  const showHomeIdentity = currentScreen === "home";
  screenTitle.textContent = showHomeIdentity ? "ניהול הבית" : item.label;
  screenEyebrow.hidden = !showHomeIdentity;
  screenEyebrow.textContent = showHomeIdentity ? "משפחת זילכה" : "";
  quickAdd.hidden = false;
  quickAdd.textContent = showHomeIdentity ? "＋ הוספה מהירה" : `＋ ${addLabel(currentScreen)}`;
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
  return ({ shopping: "מוצר", events: "אירוע", tasks: "סידור", wishes: "תכנון", trip: "פריט" })[screen] || "פריט";
}

function upcomingEvents() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return [...state.events]
    .filter((event) => new Date(`${event.date}T${event.allDay ? "00:00" : (event.startTime || "00:00")}`) >= today)
    .sort((a, b) => `${a.date}T${a.allDay ? "00:00" : (a.startTime || "00:00")}`.localeCompare(`${b.date}T${b.allDay ? "00:00" : (b.startTime || "00:00")}`));
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function hebrewDateParts(date) {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-hebrew", { day: "numeric", month: "long", year: "numeric" }).formatToParts(date);
    return {
      day: Number(parts.find((part) => part.type === "day")?.value),
      month: parts.find((part) => part.type === "month")?.value || "",
      year: Number(parts.find((part) => part.type === "year")?.value),
    };
  } catch (error) {
    console.warn("Hebrew calendar is unavailable", error);
    return null;
  }
}

function isObservedIndependenceDay(date, hebrew) {
  if (!hebrew || hebrew.month !== "Iyar") return false;
  const weekday = date.getDay();
  if (hebrew.day === 3 && weekday === 4) return true;
  if (hebrew.day === 4 && weekday === 4) return true;
  if (hebrew.day === 5 && weekday === 3) return true;
  if (hebrew.day === 6 && weekday === 2) return true;
  return false;
}

function israelHolidayForDate(date) {
  const hebrew = hebrewDateParts(date);
  if (!hebrew) return null;
  const key = `${hebrew.month}-${hebrew.day}`;
  const holidays = {
    "Tishri-1": "ראש השנה",
    "Tishri-2": "ראש השנה",
    "Tishri-10": "יום כיפור",
    "Tishri-22": "שמחת תורה",
    "Nisan-15": "פסח",
    "Nisan-21": "שביעי של פסח",
    "Sivan-6": "שבועות",
  };
  let title = "";
  if (hebrew.month === "Tishri" && hebrew.day >= 15 && hebrew.day <= 21) {
    title = hebrew.day === 15 ? "סוכות" : hebrew.day === 21 ? "הושענא רבה" : "חול המועד סוכות";
  } else {
    title = holidays[key] || (isObservedIndependenceDay(date, hebrew) ? "יום העצמאות" : "");
  }
  if (!title) return null;
  return {
    id: `holiday-${dateKey(date)}`,
    title,
    date: dateKey(date),
    allDay: true,
    startTime: "",
    endTime: "",
    location: "",
    notes: "חג / יום חופש",
    participants: [],
    isHoliday: true,
  };
}

function calendarEntriesForDate(key) {
  const date = new Date(`${key}T12:00:00`);
  const holiday = israelHolidayForDate(date);
  const events = state.events
    .filter((event) => event.date === key)
    .sort((a, b) => `${a.allDay ? "00:00" : (a.startTime || "00:00")}`.localeCompare(`${b.allDay ? "00:00" : (b.startTime || "00:00")}`));
  return holiday ? [holiday, ...events] : events;
}

function renderHome() {
  const activeShopping = state.shopping.filter((item) => !item.purchased);
  const shoppingCounts = [...activeShopping.reduce((counts, item) => {
    const category = item.category || "אחר";
    counts.set(category, (counts.get(category) || 0) + 1);
    return counts;
  }, new Map()).entries()].sort((a, b) => collator.compare(a[0], b[0]));
  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  const monthTitle = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(calendarViewDate);
  return `
    <section class="card home-calendar-card">
      <div class="calendar-toolbar">
        <button type="button" class="calendar-nav-button" data-calendar-prev aria-label="החודש הקודם">›</button>
        <div><h3 class="card-title">לוח שנה</h3><strong class="calendar-month-title">${escapeHtml(monthTitle)}</strong></div>
        <button type="button" class="calendar-nav-button" data-calendar-next aria-label="החודש הבא">‹</button>
      </div>
      ${calendarHtml(year, month)}
    </section>
    <section class="card home-shopping-card">
      <div class="card-title-row home-shopping-title-row"><div><h3 class="card-title">קניות</h3><span class="muted small">${activeShopping.length} פריטים פעילים</span></div><div class="home-shopping-actions"><button type="button" class="secondary-button compact-button" data-add-shopping-item>＋ הוספת פריט</button><button class="link-button" data-nav="shopping">לרשימת הקניות</button></div></div>
      <div class="home-shopping-categories">${shoppingCounts.map(([category, count]) => homeShoppingCategoryHtml(category, count)).join("") || emptyHtml("רשימת הקניות ריקה")}</div>
    </section>`;
}

function homeShoppingCategoryHtml(category, count) {
  return `<button type="button" class="home-shopping-category" data-home-shopping-category="${escapeHtml(category)}"><span class="home-shopping-category-icon">${shoppingCategoryIcon(category)}</span><span>${escapeHtml(category)}</span><strong>${count}</strong></button>`;
}

function calendarHtml(year, monthIndex) {
  const first = new Date(year, monthIndex, 1, 12);
  const daysInMonth = new Date(year, monthIndex + 1, 0, 12).getDate();
  const cells = ["א", "ב", "ג", "ד", "ה", "ו", "ש"].map((day) => `<div class="calendar-day head">${day}</div>`);
  for (let index = 0; index < first.getDay(); index += 1) cells.push(`<div class="calendar-day empty" aria-hidden="true"></div>`);

  const now = new Date();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const currentDate = new Date(year, monthIndex, day, 12);
    const key = dateKey(currentDate);
    const today = dateKey(now) === key;
    const dayEvents = calendarEntriesForDate(key);
    const visibleEvents = dayEvents.slice(0, 2);
    const eventRows = visibleEvents.map((event, index) => {
      const label = event.title;
      return `<span class="calendar-event-chip calendar-event-${index + 1} ${event.isHoliday ? "holiday" : ""}" title="${escapeHtml(label)}"><span>${escapeHtml(label)}</span></span>`;
    }).join("");
    const moreEvents = dayEvents.length > 2
      ? `<span class="calendar-more-events">+${dayEvents.length - 2} נוספים</span>`
      : "";

    cells.push(`<div class="calendar-day ${today ? "today" : ""} ${dayEvents.length ? "has-events" : ""}" data-calendar-day="${key}" role="button" tabindex="0" aria-label="${day} ${escapeHtml(new Intl.DateTimeFormat("he-IL", { month: "long" }).format(currentDate))}${dayEvents.length ? `, ${dayEvents.length} אירועים` : ""}">
      <div class="calendar-day-number">${day}</div>
      <div class="calendar-day-events">${eventRows}${moreEvents}</div>
    </div>`);
  }

  return `<div class="calendar">${cells.join("")}</div>`;
}

function calendarMonthAgendaHtml(year, monthIndex) {
  const entries = [];
  const daysInMonth = new Date(year, monthIndex + 1, 0, 12).getDate();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthIndex, day, 12);
    const key = dateKey(date);
    calendarEntriesForDate(key).forEach((event) => entries.push({ ...event, key, date }));
  }
  const visible = entries.slice(0, 8);
  return `<div class="calendar-mobile-agenda">
    <div class="calendar-agenda-title">אירועים בחודש</div>
    ${visible.map((event) => {
      const dateLabel = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short" }).format(event.date);
      const time = event.allDay ? "כל היום" : (event.startTime || "");
      return `<button type="button" class="calendar-agenda-row ${event.isHoliday ? "holiday" : ""}" data-calendar-day="${event.key}"><span class="calendar-agenda-date">${escapeHtml(dateLabel)}</span><span class="calendar-agenda-name">${escapeHtml(event.title)}</span><span class="calendar-agenda-time">${escapeHtml(time)}</span></button>`;
    }).join("") || `<div class="calendar-agenda-empty">אין אירועים בחודש זה</div>`}
    ${entries.length > visible.length ? `<button type="button" class="calendar-agenda-more" data-nav="events">לכל האירועים</button>` : ""}
  </div>`;
}

function changeCalendarMonth(delta) {
  calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + delta, 1);
  render();
}

function openCalendarDay(key) {
  const date = new Date(`${key}T12:00:00`);
  const entries = calendarEntriesForDate(key);
  dialogEyebrow.textContent = new Intl.DateTimeFormat("he-IL", { weekday: "long" }).format(date);
  dialogTitle.textContent = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric" }).format(date);
  dialogSubmit.hidden = true;
  dialogForm.onsubmit = null;
  dialogBody.innerHTML = entries.length
    ? `<div class="calendar-day-dialog-list">${entries.map((event) => {
        const when = event.allDay ? "כל היום" : `${escapeHtml(event.startTime || "")}${event.endTime ? `–${escapeHtml(event.endTime)}` : ""}`;
        return `<article class="calendar-day-dialog-event ${event.isHoliday ? "holiday" : ""}"><div><strong>${escapeHtml(event.title)}</strong><span>${when}${event.location ? ` · ${escapeHtml(event.location)}` : ""}</span></div>${event.notes ? `<p>${escapeHtml(event.notes)}</p>` : ""}</article>`;
      }).join("")}</div>`
    : emptyHtml("אין אירועים ביום זה");
  dialog.showModal();
}

/* Shopping */
/* Shopping */
function renderShopping() {
  const allActive = state.shopping.filter((item) => !item.purchased);
  const allPurchased = state.shopping.filter((item) => item.purchased);
  const shoppingTotal = allActive.length + allPurchased.length;
  const shoppingProgress = shoppingTotal ? Math.round((allPurchased.length / shoppingTotal) * 100) : 0;
  if (shoppingCategoryFilter !== "הכל" && !allActive.some((item) => (item.category || "אחר") === shoppingCategoryFilter)) {
    shoppingCategoryFilter = "הכל";
  }
  const visibleActive = shoppingCategoryFilter === "הכל"
    ? allActive
    : allActive.filter((item) => (item.category || "אחר") === shoppingCategoryFilter);
  const visiblePurchased = shoppingCategoryFilter === "הכל"
    ? allPurchased
    : allPurchased.filter((item) => (item.category || "אחר") === shoppingCategoryFilter);

  return `<section class="shopping-page option-two-shopping-page">
    <section class="shopping-basket-progress" aria-label="התקדמות מילוי הסל">
      <div class="shopping-progress-heading"><div><strong>מילוי הסל</strong><span>${allPurchased.length} מתוך ${shoppingTotal} פריטים בסל</span></div><strong class="progress-number">${shoppingProgress}%</strong></div>
      <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${shoppingProgress}"><span style="width:${shoppingProgress}%"></span></div>
    </section>

    <div class="shopping-filter-strip" role="tablist" aria-label="סינון לפי קטגוריה">
      ${shoppingFilterChipsHtml(allActive)}
    </div>

    <section class="shopping-unified-card">
      <div class="shopping-unified-title">
        <div><span class="shopping-basket-icon">🧺</span><h3>לרכישה</h3></div>
        <span>${visibleActive.length}${shoppingCategoryFilter === "הכל" ? "" : ` מתוך ${allActive.length}`}</span>
      </div>
      <div class="shopping-unified-list">
        ${shoppingListHtml(visibleActive, false) || emptyHtml(shoppingCategoryFilter === "הכל" ? "רשימת הקניות ריקה" : "אין מוצרים בקטגוריה הזו")}
      </div>
    </section>

    <details class="shopping-purchased-card">
      <summary><span><span class="purchased-check-icon">✓</span>נרכשו</span><span class="count-pill completed">${visiblePurchased.length}</span></summary>
      <div class="shopping-unified-list purchased-list">
        ${shoppingListHtml(visiblePurchased, true) || emptyHtml("עדיין לא סומנו פריטים כנרכשו")}
      </div>
    </details>

    <div class="category-toolbar category-management-toolbar shopping-category-toolbar">
      <button class="secondary-button compact-button" type="button" data-add-shopping-category>＋ הוספת קטגוריה</button>
    </div>
  </section>`;
}

function shoppingFilterChipsHtml(activeItems) {
  const counts = activeItems.reduce((map, item) => {
    const category = item.category || "אחר";
    map.set(category, (map.get(category) || 0) + 1);
    return map;
  }, new Map());
  const categories = shoppingCategories().filter((category) => counts.has(category));
  if (shoppingCategoryFilter !== "הכל" && !categories.includes(shoppingCategoryFilter)) shoppingCategoryFilter = "הכל";
  const chips = ["הכל", ...categories];
  return chips.map((category) => {
    const selected = shoppingCategoryFilter === category;
    const count = category === "הכל" ? activeItems.length : (counts.get(category) || 0);
    const icon = category === "הכל" ? "☷" : shoppingCategoryIcon(category);
    return `<button type="button" class="shopping-filter-chip ${selected ? "active" : ""}" data-shopping-filter="${escapeHtml(category)}" role="tab" aria-selected="${selected}">
      <span class="shopping-filter-icon">${icon}</span><span>${escapeHtml(category)}</span><small>${count}</small>
    </button>`;
  }).join("");
}

function shoppingListHtml(items, purchased) {
  return [...items]
    .sort((a, b) => collator.compare(a.name, b.name))
    .map((item) => item.id === editingShoppingId ? shoppingInlineEditHtml(item) : shoppingRowHtml(item, true))
    .join("");
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

function shoppingRowHtml(item, showCategory = false) {
  return `<div class="shopping-row" data-shopping-row data-shopping-id="${item.id}" data-name="${escapeHtml(normalizeName(item.name))}" data-category="${escapeHtml(item.category || "אחר")}">
    <button class="checkbox ${item.purchased ? "checked" : ""}" data-shopping-toggle="${item.id}" aria-label="${item.purchased ? "החזרה לרשימת הקניות" : "סימון כנרכש"}">${item.purchased ? "✓" : ""}</button>
    <div class="shopping-product"><strong class="${item.purchased ? "strike" : ""}">${escapeHtml(item.name)}</strong>${showCategory && shoppingCategoryFilter === "הכל" ? `<small>${shoppingCategoryIcon(item.category || "אחר")} ${escapeHtml(item.category || "אחר")}</small>` : ""}</div>
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
  if (!events.length) return `<section class="events-page"><section class="card events-card clean-list-card">${emptyHtml("אין אירועים")}</section></section>`;

  const groups = events.reduce((months, event) => {
    const key = String(event.date || "").slice(0, 7) || "ללא-תאריך";
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(event);
    return months;
  }, new Map());

  return `<section class="events-page"><div class="events-month-list">${[...groups.entries()].map(([key, monthEvents]) => {
    const firstDate = new Date(`${monthEvents[0].date}T12:00:00`);
    const monthTitle = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(firstDate);
    return `<section class="events-month-group">
      <div class="events-month-heading"><h3>${escapeHtml(monthTitle)}</h3><span>${monthEvents.length} אירועים</span></div>
      <section class="card events-card clean-list-card">
        <div class="event-list-header"><span>תאריך</span><span>אירוע</span><span></span></div>
        <div class="compact-event-list">${monthEvents.map(eventFullHtml).join("")}</div>
      </section>
    </section>`;
  }).join("")}</div></section>`;
}

function eventFullHtml(event) {
  const date = new Date(`${event.date}T12:00:00`);
  return `<div class="compact-event-row event-summary-row" data-view-event="${event.id}" role="button" tabindex="0" aria-label="פתיחת פרטי האירוע ${escapeHtml(event.title)}">
    <div class="compact-event-date"><strong>${date.getDate()}</strong><span>${new Intl.DateTimeFormat("he-IL", { month: "short" }).format(date)}</span></div>
    <div class="event-title-cell"><div class="list-title">${escapeHtml(event.title)}</div></div>
    ${moreMenuHtml(`<button type="button" data-edit-event="${event.id}">עריכה</button><button type="button" data-download-ics="${event.id}">הורדת זימון</button><button type="button" class="danger-menu-item" data-delete-event="${event.id}">מחיקה</button>`)}
  </div>`;
}

function openEventDetails(id) {
  const event = state.events.find((existing) => existing.id === id);
  if (!event) return;
  const date = new Date(`${event.date}T12:00:00`);
  const dateLabel = new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
  const timeLabel = event.allDay
    ? "כל היום"
    : [event.startTime || "", event.endTime || ""].filter(Boolean).join("–") || "לא הוגדרה שעה";
  const recurrenceLabels = { none: "ללא חזרה", weekly: "שבועי", monthly: "חודשי", yearly: "שנתי" };

  dialogEyebrow.textContent = "פרטי אירוע";
  dialogTitle.textContent = event.title;
  dialogSubmit.hidden = true;
  dialogForm.onsubmit = null;
  dialogBody.innerHTML = `<div class="event-details-list">
    <div class="event-detail-row"><span>תאריך</span><strong>${escapeHtml(dateLabel)}</strong></div>
    <div class="event-detail-row"><span>שעה</span><strong>${escapeHtml(timeLabel)}</strong></div>
    ${event.location ? `<div class="event-detail-row"><span>מקום</span><strong>${escapeHtml(event.location)}</strong></div>` : ""}
    ${event.notes ? `<div class="event-detail-notes"><span>הערות</span><p>${escapeHtml(event.notes)}</p></div>` : ""}
    ${event.recurring && event.recurring !== "none" ? `<div class="event-detail-row"><span>חזרתיות</span><strong>${escapeHtml(recurrenceLabels[event.recurring] || event.recurring)}</strong></div>` : ""}
  </div>`;
  if (dialog.open) dialog.close();
  dialog.showModal();
}

/* Tasks */
function taskCategories() {
  return normalizeCategoryList(TASK_CATEGORIES, state.taskCategories, state.tasks.map((task) => task.category));
}

function taskCategoryOptions(selected = "") {
  return taskCategories().map((category) => `<option value="${escapeHtml(category)}" ${category === selected ? "selected" : ""}>${escapeHtml(category)}</option>`).join("");
}

function renderTasks() {
  const active = state.tasks.filter((task) => !task.completed).sort(sortTasks);
  const completed = state.tasks.filter((task) => task.completed).sort(sortTasks);
  return `<section class="task-page">
    <div class="task-assignee-grid">${TASK_ASSIGNEES.map((assignee) => taskAssigneeGroupHtml(assignee, active, false)).join("")}</div>
    <details class="completed-section">
      <summary>סידורים שבוצעו <span class="count-pill completed">${completed.length}</span></summary>
      <div class="task-assignee-grid completed-task-grid">${TASK_ASSIGNEES.map((assignee) => taskAssigneeGroupHtml(assignee, completed, true)).join("")}</div>
    </details>
    <div class="category-toolbar category-management-toolbar task-category-toolbar">
      <button type="button" class="secondary-button compact-button" data-add-task-category>＋ הוספת קטגוריה</button>
    </div>
  </section>`;
}

function taskAssigneeGroupHtml(assignee, tasks, completed) {
  const assignedTasks = tasks.filter((task) => task.assignee === assignee);
  const listKey = `${completed ? "completed" : "active"}-${assignee}`;
  const assigneeLabel = TASK_ASSIGNEE_LABELS[assignee] || assignee;
  return `<section class="card task-assignee-card ${completed ? "completed-card" : ""}">
    <div class="task-assignee-header"><h3>${escapeHtml(assigneeLabel)} <span>${assignedTasks.length}</span></h3></div>
    <div class="task-simple-list" data-task-list="${escapeHtml(listKey)}">${assignedTasks.map((task) => taskCompactHtml(task, completed)).join("") || emptyHtml("אין סידורים")}</div>
  </section>`;
}

function sortTasks(a, b) {
  return Number(a.order || 0) - Number(b.order || 0) || collator.compare(a.title, b.title);
}

function taskCompactHtml(task, completed) {
  const expanded = expandedTaskIds.has(task.id) && Boolean(task.notes);
  return `<article class="task-compact-row task-draggable-row ${expanded ? "expanded" : ""}" data-task-id="${task.id}" data-task-completed="${completed}" draggable="true">
    <button class="checkbox ${completed ? "checked" : ""}" data-task-toggle="${task.id}" aria-label="${completed ? "החזרה לביצוע" : "סימון כהושלם"}">${completed ? "✓" : ""}</button>
    <button type="button" class="task-title-button" ${task.notes ? `data-task-expand="${task.id}" aria-expanded="${expanded}"` : "disabled"}>
      <span class="task-title-copy"><span class="list-title ${completed ? "strike" : ""}">${escapeHtml(task.title)}</span><small>${escapeHtml(task.category || "אחר")}</small></span>${task.notes ? `<span class="task-expand-icon">⌄</span>` : ""}
    </button>
    <button type="button" class="task-drag-handle" data-task-drag-handle="${task.id}" aria-label="גרירת הסידור לשינוי סדר" title="גרירה לשינוי סדר">⋮⋮</button>
    ${moreMenuHtml(`<button type="button" data-edit-task="${task.id}">עריכה</button><button type="button" class="danger-menu-item" data-delete-task="${task.id}">מחיקה</button>`)}
    ${task.notes ? `<div class="task-description" ${expanded ? "" : "hidden"}>${escapeHtml(task.notes)}</div>` : ""}
  </article>`;
}

function toggleTaskDescription(id) {
  if (Date.now() < suppressTaskClickUntil) return;
  const task = state.tasks.find((item) => item.id === id);
  if (!task?.notes) return;
  if (expandedTaskIds.has(id)) expandedTaskIds.delete(id);
  else expandedTaskIds.add(id);
  render();
}

function addTaskCategory() {
  const category = String(window.prompt("שם הקטגוריה החדשה:") || "").trim();
  if (!category) return;
  if (taskCategories().some((existing) => normalizeName(existing) === normalizeName(category))) {
    showToast("הקטגוריה כבר קיימת");
    return;
  }
  state.taskCategories = taskCategories();
  state.taskCategories.push(category);
  saveState("הקטגוריה נוספה לסידורים");
  render();
}

/* Wishes */
function wishCategories() {
  return normalizeCategoryList(WISH_DEFAULT_CATEGORIES, state.wishCategories, state.wishes.map((wish) => wish.category));
}

function wishCategoryOptions(selected = "") {
  return wishCategories().map((category) => `<option value="${escapeHtml(category)}" ${category === selected ? "selected" : ""}>${escapeHtml(category)}</option>`).join("");
}

function renderWishes() {
  const categories = wishCategories();
  const populatedCategories = categories.filter((category) => state.wishes.some((wish) => wish.category === category));
  if (wishCategoryFilter !== "הכל" && !populatedCategories.includes(wishCategoryFilter)) wishCategoryFilter = "הכל";
  const visibleCategories = wishCategoryFilter === "הכל" ? populatedCategories : [wishCategoryFilter];
  return `<section class="planning-page">
    ${populatedCategories.length ? `<div class="category-toolbar category-filter-toolbar">
      <label class="category-filter-label">סינון<select data-wish-filter><option value="הכל">הכל</option>${populatedCategories.map((category) => `<option value="${escapeHtml(category)}" ${wishCategoryFilter === category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}</select></label>
    </div>` : ""}
    <div class="wish-group-grid">${visibleCategories.map(wishGroupHtml).join("") || emptyHtml("עדיין לא נוספו תכנונים")}</div>
    <div class="category-toolbar category-management-toolbar planning-management-toolbar">
      <button type="button" class="secondary-button compact-button" data-add-wish-category>＋ הוספת קטגוריה</button>
      <label class="category-manager-label">ניהול קטגוריה<select data-wish-category-manager>${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}</select></label>
      <button type="button" class="secondary-button compact-button" data-rename-wish-category>שינוי שם</button>
      <button type="button" class="danger-button compact-button" data-delete-wish-category>מחיקה</button>
    </div>
  </section>`;
}

function wishGroupHtml(category) {
  const wishes = state.wishes.filter((wish) => wish.category === category).sort((a, b) => collator.compare(a.title, b.title));
  return `<section class="card wish-group-card"><div class="wish-group-header"><h3>${escapeHtml(category)}</h3><span class="muted small">${wishes.length} תכנונים</span></div><div class="wish-list">${wishes.map(wishHtml).join("") || emptyHtml("אין תכנונים בקטגוריה")}</div></section>`;
}

function wishHtml(wish) {
  const references = Array.isArray(wish.references) ? wish.references : [];
  return `<article class="wish-row">
    <div class="wish-main"><strong>${escapeHtml(wish.title)}</strong>${wish.note ? `<div class="list-meta">${escapeHtml(wish.note)}</div>` : ""}
      ${references.length ? `<ol class="reference-list">${references.map(referenceHtml).join("")}</ol>` : ""}
    </div>
    ${moreMenuHtml(`<button type="button" data-edit-wish="${wish.id}">עריכה</button><button type="button" class="danger-menu-item" data-delete-wish="${wish.id}">מחיקה</button>`)}
  </article>`;
}

function referenceHtml(reference, index) {
  return `<li><a class="reference-chip" href="${escapeHtml(reference)}" target="_blank" rel="noopener">קישור ${index + 1}</a></li>`;
}

function addWishCategory() {
  const category = String(window.prompt("שם הקטגוריה החדשה:") || "").trim();
  if (!category) return;
  if (wishCategories().some((existing) => normalizeName(existing) === normalizeName(category))) return showToast("הקטגוריה כבר קיימת");
  state.wishCategories = [...wishCategories(), category];
  wishCategoryFilter = "הכל";
  saveState("הקטגוריה נוספה");
  render();
}

function selectedWishManageCategory() {
  return document.querySelector("[data-wish-category-manager]")?.value || "";
}

function renameWishCategory() {
  const oldName = selectedWishManageCategory();
  if (!oldName) return;
  const newName = String(window.prompt("השם החדש לקטגוריה:", oldName) || "").trim();
  if (!newName || newName === oldName) return;
  if (wishCategories().some((category) => category !== oldName && normalizeName(category) === normalizeName(newName))) return showToast("הקטגוריה כבר קיימת");
  state.wishCategories = wishCategories().map((category) => category === oldName ? newName : category);
  state.wishes.forEach((wish) => { if (wish.category === oldName) wish.category = newName; });
  if (wishCategoryFilter === oldName) wishCategoryFilter = newName;
  saveState("שם הקטגוריה עודכן");
  render();
}

function deleteWishCategory() {
  const category = selectedWishManageCategory();
  if (!category) return;
  if (state.wishes.some((wish) => wish.category === category)) return showToast("אפשר למחוק רק קטגוריה ריקה");
  if (!confirm(`למחוק את הקטגוריה „${category}”?`)) return;
  state.wishCategories = wishCategories().filter((item) => item !== category);
  if (wishCategoryFilter === category) wishCategoryFilter = "הכל";
  saveState("הקטגוריה נמחקה");
  render();
}

/* Trip packing */
function tripCategories() {
  return normalizeCategoryList(TRIP_DEFAULT_CATEGORIES, state.tripCategories, [...state.tripItems, ...state.tripArchive].map((item) => item.category));
}

function tripCategoryOptions(selected = "") {
  return tripCategories().map((category) => `<option value="${escapeHtml(category)}" ${category === selected ? "selected" : ""}>${escapeHtml(category)}</option>`).join("");
}

function renderTrip() {
  const packed = state.tripItems.filter((item) => item.packed).length;
  const total = state.tripItems.length;
  const progress = total ? Math.round((packed / total) * 100) : 0;
  const categories = tripCategories();
  const visibleCategories = categories.filter((category) => state.tripItems.some((item) => item.category === category));
  return `<section class="trip-page">
    <section class="card trip-list-card clean-list-card">
      <div class="trip-list-head"><span class="muted small">${packed} מתוך ${total} פריטים ארוזים</span><div class="trip-head-actions"><strong class="progress-number">${progress}%</strong><button class="secondary-button compact-button" type="button" data-reset-trip>איפוס רשימה</button></div></div>
      <div class="progress-track"><span style="width:${progress}%"></span></div>
      <div class="trip-category-list">${visibleCategories.map(tripCategoryHtml).join("") || emptyHtml("הרשימה הפעילה ריקה")}</div>
    </section>
    ${tripArchiveHtml()}
    <div class="category-toolbar category-management-toolbar trip-category-toolbar">
      <button type="button" class="secondary-button compact-button" data-add-trip-category>＋ הוספת קטגוריה</button>
      <label class="category-manager-label">ניהול קטגוריה<select data-trip-category-manager>${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}</select></label>
      <button type="button" class="secondary-button compact-button" data-rename-trip-category>שינוי שם</button>
      <button type="button" class="danger-button compact-button" data-delete-trip-category>מחיקה</button>
    </div>
  </section>`;
}

function tripCategoryHtml(category) {
  const items = state.tripItems.filter((item) => item.category === category).sort((a, b) => Number(a.packed) - Number(b.packed) || collator.compare(a.name, b.name));
  if (!items.length) return "";
  const icon = { אוכל: "🥪", רחצה: "🧴", תרופות: "💊", בגדים: "👕", ציוד: "🎒" }[category] || "📦";
  return `<section class="trip-category-section"><div class="trip-category-header"><span>${icon}</span><h3>${escapeHtml(category)}</h3><small>${items.length}</small></div><div class="trip-list">${items.map(tripItemHtml).join("")}</div></section>`;
}

function tripItemHtml(item) {
  return `<div class="trip-row" data-trip-id="${item.id}">
    <button class="checkbox ${item.packed ? "checked" : ""}" data-trip-toggle="${item.id}" aria-label="${item.packed ? "סימון כלא ארוז" : "סימון כארוז"}">${item.packed ? "✓" : ""}</button>
    <div class="list-main"><div class="list-title ${item.packed ? "strike" : ""}">${escapeHtml(item.name)}</div></div>
    <div class="quantity-stepper always-visible"><button class="stepper-button" data-trip-quantity="${item.id}" data-delta="-1">−</button><strong>${positiveInteger(item.quantity)}</strong><button class="stepper-button" data-trip-quantity="${item.id}" data-delta="1">＋</button></div>
    ${moreMenuHtml(`
      <button type="button" data-edit-trip="${item.id}">עריכה</button>
      <button type="button" class="danger-menu-item" data-delete-trip="${item.id}">מחיקה</button>
    `)}
  </div>`;
}

function tripArchiveHtml() {
  const archive = [...state.tripArchive].sort((a, b) => (b.archivedAt || "").localeCompare(a.archivedAt || "") || collator.compare(a.name, b.name));
  return `<details class="card trip-archive-card" ${archivedTripSelection.size ? "open" : ""}>
    <summary>ארכיון <span class="count-pill completed">${archive.length}</span></summary>
    <div class="archive-actions">
      <button type="button" class="secondary-button compact-button" data-restore-selected-trip ${archivedTripSelection.size ? "" : "disabled"}>החזרת מסומנים</button>
      <button type="button" class="secondary-button compact-button" data-restore-all-trip ${archive.length ? "" : "disabled"}>החזרת כל הפריטים</button>
      <button type="button" class="danger-button compact-button" data-delete-archived-trip ${archivedTripSelection.size ? "" : "disabled"}>מחיקה לצמיתות</button>
    </div>
    <div class="trip-archive-list">${archive.map((item) => `<label class="trip-archive-row"><input type="checkbox" data-trip-archive-select="${item.id}" ${archivedTripSelection.has(item.id) ? "checked" : ""}/><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)} · כמות ${positiveInteger(item.quantity)}</small></span></label>`).join("") || emptyHtml("הארכיון ריק")}</div>
  </details>`;
}

function addTripCategory() {
  const category = String(window.prompt("שם הקטגוריה החדשה:") || "").trim();
  if (!category) return;
  if (tripCategories().some((existing) => normalizeName(existing) === normalizeName(category))) return showToast("הקטגוריה כבר קיימת");
  state.tripCategories = [...tripCategories(), category];
  saveState("הקטגוריה נוספה");
  render();
}

function selectedTripManageCategory() {
  return document.querySelector("[data-trip-category-manager]")?.value || "";
}

function renameTripCategory() {
  const oldName = selectedTripManageCategory();
  if (!oldName) return;
  const newName = String(window.prompt("השם החדש לקטגוריה:", oldName) || "").trim();
  if (!newName || newName === oldName) return;
  if (tripCategories().some((category) => category !== oldName && normalizeName(category) === normalizeName(newName))) return showToast("הקטגוריה כבר קיימת");
  state.tripCategories = tripCategories().map((category) => category === oldName ? newName : category);
  [...state.tripItems, ...state.tripArchive].forEach((item) => { if (item.category === oldName) item.category = newName; });
  saveState("שם הקטגוריה עודכן");
  render();
}

function deleteTripCategory() {
  const category = selectedTripManageCategory();
  if (!category) return;
  if ([...state.tripItems, ...state.tripArchive].some((item) => item.category === category)) return showToast("אפשר למחוק רק קטגוריה ריקה");
  if (!confirm(`למחוק את הקטגוריה „${category}”?`)) return;
  state.tripCategories = tripCategories().filter((item) => item !== category);
  saveState("הקטגוריה נמחקה");
  render();
}

function emptyHtml(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

/* Event bindings */
function attachScreenEvents() {
  document.querySelectorAll("[data-nav]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.nav)));
  document.querySelectorAll("[data-add]").forEach((button) => button.addEventListener("click", () => openAddDialog(button.dataset.add)));
  document.querySelectorAll("[data-home-shopping-category]").forEach((button) => button.addEventListener("click", () => {
    shoppingCategoryFilter = button.dataset.homeShoppingCategory || "הכל";
    editingShoppingId = null;
    navigate("shopping");
  }));

  document.querySelector("[data-calendar-prev]")?.addEventListener("click", () => changeCalendarMonth(-1));
  document.querySelector("[data-calendar-next]")?.addEventListener("click", () => changeCalendarMonth(1));
  document.querySelectorAll("[data-calendar-day]").forEach((cell) => {
    cell.addEventListener("click", () => openCalendarDay(cell.dataset.calendarDay));
    cell.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCalendarDay(cell.dataset.calendarDay);
      }
    });
  });

  document.querySelectorAll("[data-shopping-toggle]").forEach((button) => button.addEventListener("click", () => toggleShopping(button.dataset.shoppingToggle)));
  document.querySelectorAll("[data-shopping-quantity]").forEach((button) => button.addEventListener("click", () => updateShoppingQuantity(button.dataset.shoppingQuantity, button.dataset.delta)));
  document.querySelectorAll("[data-edit-shopping]").forEach((button) => button.addEventListener("click", () => openInlineShoppingEdit(button.dataset.editShopping)));
  document.querySelectorAll("[data-save-shopping-inline]").forEach((button) => button.addEventListener("click", () => saveInlineShoppingEdit(button.dataset.saveShoppingInline)));
  document.querySelectorAll("[data-cancel-inline]").forEach((button) => button.addEventListener("click", () => { editingShoppingId = null; render(); }));
  document.querySelectorAll("[data-inline-quantity-step]").forEach((button) => button.addEventListener("click", () => changeInlineShoppingQuantity(button, button.dataset.inlineQuantityStep)));
  document.querySelectorAll("[data-delete-shopping]").forEach((button) => button.addEventListener("click", () => deleteFrom("shopping", button.dataset.deleteShopping)));
  document.querySelector("#shopping-search")?.addEventListener("input", filterShoppingRows);
  document.querySelector("[data-add-shopping-item]")?.addEventListener("click", () => openAddDialog("shopping"));
  document.querySelector("[data-add-shopping-category]")?.addEventListener("click", addShoppingCategory);
  document.querySelectorAll("[data-shopping-filter]").forEach((button) => button.addEventListener("click", () => {
    shoppingCategoryFilter = button.dataset.shoppingFilter || "הכל";
    editingShoppingId = null;
    render();
  }));

  document.querySelectorAll("[data-view-event]").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest(".more-menu")) return;
      openEventDetails(row.dataset.viewEvent);
    });
    row.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && !event.target.closest(".more-menu")) {
        event.preventDefault();
        openEventDetails(row.dataset.viewEvent);
      }
    });
  });
  document.querySelectorAll("[data-edit-event]").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); openEditDialog("events", button.dataset.editEvent); }));
  document.querySelectorAll("[data-delete-event]").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); deleteFrom("events", button.dataset.deleteEvent); }));
  document.querySelectorAll("[data-download-ics]").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); downloadICS(button.dataset.downloadIcs); }));

  document.querySelectorAll("[data-task-toggle]").forEach((button) => button.addEventListener("click", () => toggleTask(button.dataset.taskToggle)));
  document.querySelectorAll("[data-task-expand]").forEach((button) => button.addEventListener("click", () => toggleTaskDescription(button.dataset.taskExpand)));
  document.querySelectorAll("[data-edit-task]").forEach((button) => button.addEventListener("click", () => openEditDialog("tasks", button.dataset.editTask)));
  document.querySelectorAll("[data-delete-task]").forEach((button) => button.addEventListener("click", () => deleteFrom("tasks", button.dataset.deleteTask)));
  document.querySelector("[data-add-task-category]")?.addEventListener("click", addTaskCategory);
  setupTaskDragHandles();

  document.querySelectorAll("[data-edit-wish]").forEach((button) => button.addEventListener("click", () => openEditDialog("wishes", button.dataset.editWish)));
  document.querySelectorAll("[data-delete-wish]").forEach((button) => button.addEventListener("click", () => deleteFrom("wishes", button.dataset.deleteWish)));
  document.querySelector("[data-wish-filter]")?.addEventListener("change", (event) => { wishCategoryFilter = event.target.value; render(); });
  document.querySelector("[data-add-wish-category]")?.addEventListener("click", addWishCategory);
  document.querySelector("[data-rename-wish-category]")?.addEventListener("click", renameWishCategory);
  document.querySelector("[data-delete-wish-category]")?.addEventListener("click", deleteWishCategory);

  document.querySelectorAll("[data-trip-toggle]").forEach((button) => button.addEventListener("click", () => toggleTrip(button.dataset.tripToggle)));
  document.querySelectorAll("[data-trip-quantity]").forEach((button) => button.addEventListener("click", () => updateTripQuantity(button.dataset.tripQuantity, button.dataset.delta)));
  document.querySelectorAll("[data-edit-trip]").forEach((button) => button.addEventListener("click", () => openEditDialog("trip", button.dataset.editTrip)));
  document.querySelectorAll("[data-delete-trip]").forEach((button) => button.addEventListener("click", () => deleteTripItem(button.dataset.deleteTrip)));
  document.querySelector("[data-reset-trip]")?.addEventListener("click", resetTripList);
  document.querySelector("[data-add-trip-category]")?.addEventListener("click", addTripCategory);
  document.querySelector("[data-rename-trip-category]")?.addEventListener("click", renameTripCategory);
  document.querySelector("[data-delete-trip-category]")?.addEventListener("click", deleteTripCategory);
  document.querySelectorAll("[data-trip-archive-select]").forEach((checkbox) => checkbox.addEventListener("change", () => {
    if (checkbox.checked) archivedTripSelection.add(checkbox.dataset.tripArchiveSelect);
    else archivedTripSelection.delete(checkbox.dataset.tripArchiveSelect);
    updateArchiveActionButtons();
  }));
  document.querySelector("[data-restore-selected-trip]")?.addEventListener("click", restoreSelectedTripItems);
  document.querySelector("[data-restore-all-trip]")?.addEventListener("click", restoreAllTripItems);
  document.querySelector("[data-delete-archived-trip]")?.addEventListener("click", permanentlyDeleteArchivedTripItems);
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
  expandedTaskIds.delete(id);
  saveState(task.completed ? "הסידור הועבר לסידורים שבוצעו" : "הסידור הוחזר לביצוע");
  render();
}

function setupTaskDragHandles() {
  document.querySelectorAll("[data-task-drag-handle]").forEach((handle) => {
    const row = handle.closest("[data-task-id]");
    handle.addEventListener("pointerdown", startTaskPointerDrag);
    handle.addEventListener("mousedown", () => {
      if (row) row.dataset.dragReady = "true";
    });
  });

  document.querySelectorAll("[data-task-id]").forEach((row) => {
    row.addEventListener("dragstart", (event) => {
      if (row.dataset.dragReady !== "true") {
        event.preventDefault();
        return;
      }
      const list = row.closest("[data-task-list]");
      if (!list) return;
      taskDragState = { row, list, active: true, desktop: true };
      row.classList.add("dragging");
      document.body.classList.add("task-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", row.dataset.taskId || "");
      suppressTaskClickUntil = Date.now() + 450;
    });

    row.addEventListener("dragover", (event) => {
      const drag = taskDragState;
      if (!drag?.desktop || !drag.active || drag.row === row || drag.list !== row.closest("[data-task-list]")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const rect = row.getBoundingClientRect();
      if (event.clientY < rect.top + rect.height / 2) drag.list.insertBefore(drag.row, row);
      else drag.list.insertBefore(drag.row, row.nextSibling);
    });

    row.addEventListener("drop", (event) => {
      if (!taskDragState?.desktop) return;
      event.preventDefault();
    });

    row.addEventListener("dragend", () => {
      if (!taskDragState?.desktop) return;
      const draggedRow = taskDragState.row;
      draggedRow.classList.remove("dragging");
      draggedRow.removeAttribute("data-drag-ready");
      document.body.classList.remove("task-dragging");
      suppressTaskClickUntil = Date.now() + 450;
      taskDragState = null;
      persistTaskOrderFromDom();
    });
  });
}

function startTaskPointerDrag(event) {
  if (event.pointerType === "mouse") return;
  if (event.button !== undefined && event.button !== 0) return;
  const handle = event.currentTarget;
  const row = handle.closest("[data-task-id]");
  const list = row?.closest("[data-task-list]");
  if (!row || !list) return;
  event.preventDefault();
  const pointerId = event.pointerId;
  const drag = { handle, row, list, pointerId, active: true };
  taskDragState = drag;
  row.classList.add("dragging");
  document.body.classList.add("task-dragging");
  suppressTaskClickUntil = Date.now() + 450;
  try { handle.setPointerCapture(pointerId); } catch (error) { /* no-op */ }

  const move = (moveEvent) => {
    if (taskDragState !== drag || moveEvent.pointerId !== pointerId) return;
    if (moveEvent.cancelable) moveEvent.preventDefault();
    const candidates = [...list.querySelectorAll("[data-task-id]")].filter((candidate) => candidate !== row);
    const insertBefore = candidates.find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      return moveEvent.clientY < rect.top + rect.height / 2;
    });
    if (insertBefore) list.insertBefore(row, insertBefore);
    else list.appendChild(row);

    const edge = 70;
    if (moveEvent.clientY < edge) window.scrollBy({ top: -18, behavior: "auto" });
    else if (moveEvent.clientY > window.innerHeight - edge) window.scrollBy({ top: 18, behavior: "auto" });
  };

  const finish = (endEvent) => {
    if (endEvent.pointerId !== pointerId) return;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", finish);
    window.removeEventListener("pointercancel", finish);
    try { handle.releasePointerCapture(pointerId); } catch (error) { /* no-op */ }
    row.classList.remove("dragging");
    document.body.classList.remove("task-dragging");
    suppressTaskClickUntil = Date.now() + 450;
    if (taskDragState === drag) taskDragState = null;
    persistTaskOrderFromDom();
  };

  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", finish);
  window.addEventListener("pointercancel", finish);
}

function persistTaskOrderFromDom() {
  const orderedIds = [...document.querySelectorAll("[data-task-list] [data-task-id]")].map((row) => row.dataset.taskId);
  const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
  state.tasks.sort((a, b) => (orderMap.get(a.id) ?? 99999) - (orderMap.get(b.id) ?? 99999));
  state.tasks.forEach((task, index) => { task.order = index; });
  saveState("סדר הסידורים נשמר");
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

function deleteTripItem(id) {
  const item = state.tripItems.find((existing) => existing.id === id);
  if (!item) return;
  if (!confirm(`למחוק את „${item.name}” מרשימת הטיול?`)) return;
  state.tripItems = state.tripItems.filter((existing) => existing.id !== id);
  saveState("הפריט נמחק מרשימת הטיול");
  render();
}

function archiveTripItem(id) {
  const item = state.tripItems.find((existing) => existing.id === id);
  if (!item) return;
  if (!confirm(`להעביר את „${item.name}” לארכיון?`)) return;
  state.tripItems = state.tripItems.filter((existing) => existing.id !== id);
  state.tripArchive.push({ ...item, packed: false, packedAt: null, archivedAt: new Date().toISOString() });
  saveState("הפריט הועבר לארכיון");
  render();
}

function resetTripList() {
  if (!state.tripItems.length) return showToast("רשימת הטיול כבר ריקה");
  if (!confirm("לאפס את הרשימה הפעילה ולהעביר את כל הפריטים לארכיון?")) return;
  const archivedAt = new Date().toISOString();
  const archiveBatchId = crypto.randomUUID();
  state.tripArchive.push(...state.tripItems.map((item) => ({
    ...item,
    packed: false,
    packedAt: null,
    archivedAt,
    archiveBatchId,
  })));
  state.tripItems = [];
  archivedTripSelection.clear();
  saveState("הרשימה אופסה והפריטים הועברו לארכיון");
  render();
}

function updateTripQuantity(id, delta) {
  const item = state.tripItems.find((existing) => existing.id === id);
  if (!item) return;
  item.quantity = Math.max(1, positiveInteger(item.quantity) + Number(delta));
  saveState("כמות הציוד עודכנה");
  render();
}

function restoreTripItems(ids) {
  const idSet = new Set(ids);
  const restored = state.tripArchive.filter((item) => idSet.has(item.id));
  if (!restored.length) return;
  const activeIds = new Set(state.tripItems.map((item) => item.id));
  restored.forEach((item) => {
    const restoredItem = { ...item, packed: false, packedAt: null };
    delete restoredItem.archivedAt;
    delete restoredItem.archiveBatchId;
    if (activeIds.has(restoredItem.id)) restoredItem.id = crypto.randomUUID();
    activeIds.add(restoredItem.id);
    state.tripItems.push(restoredItem);
    if (!state.tripCategories.includes(restoredItem.category)) state.tripCategories.push(restoredItem.category);
  });
  state.tripArchive = state.tripArchive.filter((item) => !idSet.has(item.id));
  ids.forEach((id) => archivedTripSelection.delete(id));
  saveState("הפריטים הוחזרו לרשימה הפעילה");
  render();
}

function restoreSelectedTripItems() {
  restoreTripItems([...archivedTripSelection]);
}

function restoreAllTripItems() {
  if (!state.tripArchive.length) return;
  restoreTripItems(state.tripArchive.map((item) => item.id));
}

function permanentlyDeleteArchivedTripItems() {
  const ids = [...archivedTripSelection];
  if (!ids.length) return;
  if (!confirm(`למחוק לצמיתות ${ids.length} פריטים מהארכיון? לא ניתן לבטל פעולה זו.`)) return;
  const idSet = new Set(ids);
  state.tripArchive = state.tripArchive.filter((item) => !idSet.has(item.id));
  archivedTripSelection.clear();
  saveState("הפריטים נמחקו לצמיתות מהארכיון");
  render();
}

function updateArchiveActionButtons() {
  const hasSelection = archivedTripSelection.size > 0;
  const restoreButton = document.querySelector("[data-restore-selected-trip]");
  const deleteButton = document.querySelector("[data-delete-archived-trip]");
  if (restoreButton) restoreButton.disabled = !hasSelection;
  if (deleteButton) deleteButton.disabled = !hasSelection;
}

function deleteFrom(collection, id) {
  if (!confirm("למחוק את הפריט?")) return;
  state[collection] = state[collection].filter((item) => item.id !== id);
  if (collection === "tasks") expandedTaskIds.delete(id);
  saveState("הפריט נמחק");
  render();
}

/* Dialogs */
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
  document.querySelectorAll("details[open]").forEach((details) => details.removeAttribute("open"));
  dialogSubmit.hidden = false;
  dialogSubmit.textContent = config.submitLabel;
  dialogEyebrow.textContent = config.eyebrow;
  dialogTitle.textContent = config.title;
  dialogBody.innerHTML = config.html;
  dialogForm.onsubmit = (event) => {
    event.preventDefault();
    config.submit(new FormData(dialogForm));
  };
  if (dialog.open) dialog.close();
  dialog.showModal();
  requestAnimationFrame(() => {
    dialog.scrollTop = 0;
    dialog.querySelector(".dialog-card")?.scrollTo({ top: 0, behavior: "auto" });
  });
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
      eyebrow: "טיול", title: editing ? "עריכת פריט ציוד" : "פריט ציוד חדש", html: tripFormHtml(item), submitLabel: editing ? "שמירת שינויים" : "שמירה",
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

function eventFormHtml(item = null) {
  const allDay = Boolean(item?.allDay);
  return `<div class="form-stack">
    <label>שם האירוע<input name="title" required autofocus value="${escapeHtml(item?.title || "")}" /></label>
    <div class="form-grid"><label>תאריך<input name="date" type="date" required value="${escapeHtml(item?.date || "")}" /></label><label>מיקום<input name="location" value="${escapeHtml(item?.location || "")}" /></label></div>
    <label class="checkbox-label all-day-choice"><input name="allDay" type="checkbox" data-all-day-toggle ${allDay ? "checked" : ""} /> אירוע לכל היום</label>
    <div class="form-grid" id="event-time-fields" ${allDay ? "hidden" : ""}><label>שעת התחלה<input name="startTime" type="time" value="${escapeHtml(item?.startTime || "")}" /></label><label>שעת סיום<input name="endTime" type="time" value="${escapeHtml(item?.endTime || "")}" /></label></div>
    <label>הערות<textarea name="notes">${escapeHtml(item?.notes || "")}</textarea></label>
    <label>חזרתיות<select name="recurring"><option value="none" ${item?.recurring === "none" ? "selected" : ""}>ללא חזרה</option><option value="weekly" ${item?.recurring === "weekly" ? "selected" : ""}>שבועי</option><option value="monthly" ${item?.recurring === "monthly" ? "selected" : ""}>חודשי</option><option value="yearly" ${item?.recurring === "yearly" ? "selected" : ""}>שנתי</option></select></label>
  </div>`;
}

function submitEvent(formData, id = null) {
  const allDay = formData.get("allDay") === "on";
  const values = {
    title: String(formData.get("title") || "").trim(), date: formData.get("date"), allDay,
    startTime: allDay ? "" : formData.get("startTime"), endTime: allDay ? "" : formData.get("endTime"),
    location: String(formData.get("location") || "").trim(), notes: String(formData.get("notes") || "").trim(), recurring: formData.get("recurring"),
  };
  if (id) Object.assign(state.events.find((event) => event.id === id), values);
  else state.events.push({ id: crypto.randomUUID(), ...values });
  saveState(id ? "האירוע עודכן" : "האירוע נוסף");
  dialog.close();
  render();
}

function taskFormHtml(item = null) {
  return `<div class="form-stack">
    <label>שם הסידור<input name="title" required ${item ? "" : "autofocus"} value="${escapeHtml(item?.title || "")}" /></label>
    <label>תיאור<textarea name="notes">${escapeHtml(item?.notes || "")}</textarea></label>
    <div class="form-grid"><label>שיוך<select name="assignee">${TASK_ASSIGNEES.map((assignee) => `<option value="${escapeHtml(assignee)}" ${item?.assignee === assignee ? "selected" : ""}>${escapeHtml(TASK_ASSIGNEE_LABELS[assignee] || assignee)}</option>`).join("")}</select></label><label>קטגוריה<select name="category">${taskCategoryOptions(item?.category || "אחר")}</select></label></div>
  </div>`;
}

function submitTask(formData, id = null) {
  const values = {
    title: String(formData.get("title") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
    assignee: formData.get("assignee"),
    category: formData.get("category") || "אחר",
  };
  if (!state.taskCategories) state.taskCategories = taskCategories();
  if (!state.taskCategories.some((category) => normalizeName(category) === normalizeName(values.category))) {
    state.taskCategories.push(values.category);
  }
  if (id) {
    const task = state.tasks.find((existing) => existing.id === id);
    if (!task) return;
    Object.assign(task, values);
  } else {
    const nextOrder = state.tasks.reduce((max, task) => Math.max(max, Number(task.order || 0)), -1) + 1;
    state.tasks.push({ id: crypto.randomUUID(), ...values, completed: false, completedAt: null, order: nextOrder });
  }
  saveState(id ? "הסידור עודכן" : "הסידור נוסף");
  dialog.close();
  render();
}

function referencesToText(references = []) {
  return references.join("\n");
}

function parseReferences(value) {
  return String(value || "").split(/\n+/).map((reference) => reference.trim()).filter(Boolean).map((reference) => {
    if (/^www\./i.test(reference)) return `https://${reference}`;
    return reference;
  });
}

function isValidWebLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
}

function wishFormHtml(item = null) {
  return `<div class="form-stack">
    <label>שם התכנון<input name="title" required autofocus value="${escapeHtml(item?.title || "")}" /></label>
    <label>קטגוריה<select name="category">${wishCategoryOptions(item?.category || (wishCategoryFilter === "הכל" ? "בית" : wishCategoryFilter))}</select></label>
    <label>קישורים<textarea name="references" required placeholder="קישור אחד בכל שורה">${escapeHtml(referencesToText(item?.references || []))}</textarea></label>
    <label>הערה אופציונלית<textarea name="note">${escapeHtml(item?.note || "")}</textarea></label>
  </div>`;
}

function submitWish(formData, id = null) {
  const references = parseReferences(formData.get("references"));
  if (!references.length) return showToast("יש להוסיף לפחות קישור אחד");
  if (references.some((reference) => !isValidWebLink(reference))) return showToast("יש להזין קישורים תקינים שמתחילים ב־https://");
  const values = {
    title: String(formData.get("title") || "").trim(),
    category: formData.get("category") || "בית",
    references,
    note: String(formData.get("note") || "").trim(),
  };
  if (!state.wishCategories.includes(values.category)) state.wishCategories.push(values.category);
  if (id) {
    const wish = state.wishes.find((existing) => existing.id === id);
    if (!wish) return;
    Object.assign(wish, values);
  } else {
    state.wishes.push({ id: crypto.randomUUID(), ...values });
  }
  saveState(id ? "התכנון עודכן" : "התכנון נוסף");
  dialog.close();
  render();
}

function tripFormHtml(item = null) {
  return `<div class="form-stack">
    <label>שם הפריט<input name="name" required autofocus value="${escapeHtml(item?.name || "")}" /></label>
    <div class="form-grid"><label>קטגוריה<select name="category">${tripCategoryOptions(item?.category || "ציוד")}</select></label><label>כמות<input name="quantity" type="number" min="1" step="1" inputmode="numeric" value="${positiveInteger(item?.quantity)}" /></label></div>
    ${item ? `<label class="checkbox-label"><input name="packed" type="checkbox" ${item.packed ? "checked" : ""} /> הפריט ארוז</label>` : ""}
  </div>`;
}

function submitTripItem(formData, id = null) {
  const values = {
    name: String(formData.get("name") || "").trim(),
    category: formData.get("category") || "ציוד",
    quantity: positiveInteger(formData.get("quantity")),
  };
  if (!state.tripCategories.includes(values.category)) state.tripCategories.push(values.category);
  if (id) {
    const item = state.tripItems.find((tripItem) => tripItem.id === id);
    if (!item) return;
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
/* Calendar invitations */
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
    "END:VEVENT", "END:VCALENDAR",
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
