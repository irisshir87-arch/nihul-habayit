const STORAGE_KEY_PREFIX = "home-management-v2";
const LEGACY_STORAGE_KEY = "zilcha-home-management-v1";
const APP_CONFIG = window.APP_CONFIG || {};
const SUPABASE_ENABLED = Boolean(
  APP_CONFIG.supabaseUrl &&
  APP_CONFIG.supabasePublishableKey &&
  window.supabase
);
const collator = new Intl.Collator("he", { sensitivity: "base", numeric: true });

const APP_RELEASES = Object.freeze([
  {
    version: "15.14",
    updates: [
      { icon: "🔗", text: "בעמוד תכנונים אפשר לשמור תכנון גם בלי להוסיף קישור." },
    ],
  },
  {
    version: "15.15",
    updates: [
      { icon: "🔁", text: "אירועים חוזרים מוצגים בכל שבוע, חודש או שנה בהתאם להגדרה." },
    ],
  },
  {
    version: "15.16",
    updates: [
      { icon: "🔐", text: "במסך ניהול המשפחות אפשר לשלוח למשתמש קישור לאיפוס סיסמה.", adminOnly: true },
    ],
  },
  {
    version: "15.17",
    updates: [
      { icon: "✨", text: "נוסף חלון קצר שמציג מה חדש לאחר עדכון גרסה." },
    ],
  },
  {
    version: "15.18",
    updates: [
      { icon: "🗓️", text: "בביטול אירוע חוזר אפשר לבחור בין ביטול המועד המסוים לבין ביטול כל הסדרה." },
      { icon: "📚", text: "עדכוני הגרסה מוצגים במצטבר, כך שיופיעו כל החידושים שלא נצפו עדיין." },
      { icon: "🏠", text: "שם האפליקציה עודכן ל„ניהול הבית” ואינו מציג עוד שם של משפחה אחרת." },
    ],
  },
  {
    version: "15.19",
    updates: [
      { icon: "🔔", text: "נוספה אפשרות לקבל התראות במכשיר כשבן או בת המשפחה מוסיפים אירוע, סידור או תכנון." },
      { icon: "🛒", text: "מוצרים חדשים ברשימת הקניות נשלחים כהתראה מרוכזת כדי לא להעמיס." },
      { icon: "⚙️", text: "אפשר להפעיל או לכבות התראות מתפריט האפליקציה בכל מכשיר בנפרד." },
    ],
  },
  {
    version: "15.20",
    updates: [
      { icon: "✨", text: "חלון מה חדש מציג רק עדכונים שלא נקראו; משתמש חדש רואה רק את הגרסה העדכנית." },
      { icon: "🏠", text: "שם משפחת זילכה הוסר גם ממסך הטעינה הראשוני של האפליקציה." },
    ],
  },
  {
    version: "15.21",
    updates: [
      { icon: "🔔", text: "תוקנה שליחת ההתראות למשתמשים אחרים במשפחה ונוספה הודעת הצלחה או שגיאה ברורה." },
    ],
  },
]);
const APP_RELEASE = Object.freeze({
  ...APP_RELEASES[APP_RELEASES.length - 1],
  title: "מה חדש באפליקציה?",
});
const WHATS_NEW_STORAGE_PREFIX = "nihul-habayit-whats-new-seen";
const PUSH_VAPID_PUBLIC_KEY = "BLCrC64_BfAUfG8NyKmUCY-WCyZPk6tDzk5cPLXur8i4daSv9rSFRkDlNwb1naz6xKUV3GojIGQbVdO35NImXeA";
const PUSH_FUNCTION_NAME = "send-household-notification";
const SHOPPING_PUSH_STORAGE_PREFIX = "nihul-habayit-shopping-push";
const SHOPPING_PUSH_DELAY_MS = 45_000;

const DEFAULT_HOUSEHOLD_MEMBERS = ["איריס", "תומר"];
const WISH_BASE_CATEGORIES = ["בית", "ילדים", "מתכונים", "אטרקציות"];
let HOUSEHOLD_MEMBERS = [...DEFAULT_HOUSEHOLD_MEMBERS];
let TASK_ASSIGNEES = [];
let TASK_ASSIGNEE_LABELS = {};
let WISH_DEFAULT_CATEGORIES = [];

function configureHouseholdMembers(members) {
  const cleanMembers = [...new Set((Array.isArray(members) ? members : [])
    .map((name) => String(name || "").trim())
    .filter(Boolean))];
  HOUSEHOLD_MEMBERS = cleanMembers.length ? cleanMembers : [...DEFAULT_HOUSEHOLD_MEMBERS];
  const together = HOUSEHOLD_MEMBERS.join(" ו");
  TASK_ASSIGNEES = HOUSEHOLD_MEMBERS.length > 1
    ? [...HOUSEHOLD_MEMBERS, together]
    : [...HOUSEHOLD_MEMBERS];
  TASK_ASSIGNEE_LABELS = Object.fromEntries(HOUSEHOLD_MEMBERS.map((name) => [name, name]));
  if (HOUSEHOLD_MEMBERS.length > 1) TASK_ASSIGNEE_LABELS[together] = "ביחד";
  WISH_DEFAULT_CATEGORIES = [...new Set([...WISH_BASE_CATEGORIES, ...HOUSEHOLD_MEMBERS])];
}

configureHouseholdMembers(DEFAULT_HOUSEHOLD_MEMBERS);
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
  admin: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4.5 6.5v5.2c0 4.6 3.1 7.8 7.5 9.3 4.4-1.5 7.5-4.7 7.5-9.3V6.5L12 3Z"/><path d="M9.2 12.1 11 14l3.9-4.2"/></svg>`,
};

const ADMIN_NAV_ITEM = { id: "admin", label: "ניהול משפחות", icon: NAV_ICONS.admin };

const NAV_ITEMS = [
  { id: "home", label: "בית", icon: NAV_ICONS.home },
  { id: "shopping", label: "קניות", icon: NAV_ICONS.shopping },
  { id: "events", label: "אירועים", icon: NAV_ICONS.events },
  { id: "tasks", label: "סידורים", icon: NAV_ICONS.tasks },
  { id: "wishes", label: "תכנונים", icon: NAV_ICONS.wishes },
  { id: "trip", label: "טיול", icon: NAV_ICONS.trip },
];

const defaultState = {
  householdMembers: [...DEFAULT_HOUSEHOLD_MEMBERS],
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
let currentHouseholdId = "";
let currentHouseholdName = "";
let currentMemberName = "";
let currentUserIsAdmin = false;
let adminCreateResult = null;
let realtimeChannel = null;
let cloudSaveTimer = null;
let cloudStartedForUserId = null;
const initialAuthParams = new URLSearchParams(location.hash.startsWith("#") ? location.hash.slice(1) : location.search);
let pendingInviteFlow = initialAuthParams.get("type") === "invite";
let currentScreen = location.hash.replace("#", "") || "home";
if (!NAV_ITEMS.some((item) => item.id === currentScreen) && currentScreen !== "admin") currentScreen = "home";

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
let authEmail = document.querySelector("#auth-email");
const authPassword = document.querySelector("#auth-password");
const authSubmit = document.querySelector("#auth-submit");
const authMessage = document.querySelector("#auth-message");
const signOutButton = document.querySelector("#sign-out");
const signedInUser = document.querySelector("#signed-in-user");
const syncIndicator = document.querySelector(".sync-indicator");
let deferredInstallPrompt = null;
let mobileMenuDocumentListenerAttached = false;
let whatsNewShownThisSession = false;
let pendingWhatsNewSeenKey = "";
let pushSubscriptionStatus = "unknown";
let pushActionInProgress = false;
let shoppingPushTimer = null;


function pushNotificationsSupported() {
  return Boolean(
    SUPABASE_ENABLED &&
    currentUser &&
    currentHouseholdId &&
    window.isSecureContext &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function pushDeviceLabel() {
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone / iPad";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
  return "דפדפן";
}

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

async function persistPushSubscription(subscription) {
  if (!subscription || !currentUser || !currentHouseholdId || !supabaseClient) return;
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const authKey = json.keys?.auth;
  if (!p256dh || !authKey) throw new Error("לא ניתן לקרוא את מפתחות ההתראה מהמכשיר.");

  const { error } = await supabaseClient
    .from("push_subscriptions")
    .upsert({
      household_id: currentHouseholdId,
      user_id: currentUser.id,
      endpoint: subscription.endpoint,
      p256dh,
      auth_key: authKey,
      user_agent: navigator.userAgent || "",
      device_label: pushDeviceLabel(),
      is_active: true,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "user_id,endpoint" });
  if (error) throw error;
}

function notificationActionLabel() {
  if (pushActionInProgress) return "מעדכנת התראות…";
  if (pushSubscriptionStatus === "active") return "🔕 כיבוי התראות במכשיר";
  if (pushSubscriptionStatus === "blocked") return "🔕 ההתראות חסומות בדפדפן";
  return "🔔 הפעלת התראות במכשיר";
}

function updatePushNotificationControls() {
  const supported = pushNotificationsSupported();
  const shouldShow = Boolean(currentHouseholdId && currentUser && SUPABASE_ENABLED);
  const label = notificationActionLabel();
  const mobileButton = document.querySelector("#mobile-notification-button");
  const desktopButton = document.querySelector("#desktop-notification-button");
  [mobileButton, desktopButton].forEach((button) => {
    if (!button) return;
    button.hidden = !shouldShow;
    button.disabled = pushActionInProgress;
    button.textContent = supported || pushSubscriptionStatus === "blocked"
      ? label
      : "🔕 התראות אינן נתמכות במכשיר";
  });
}

function ensureDesktopNotificationAction() {
  const footer = signOutButton?.parentElement;
  if (!footer) return;
  let button = document.querySelector("#desktop-notification-button");
  if (!button) {
    button = document.createElement("button");
    button.id = "desktop-notification-button";
    button.className = "ghost-button";
    button.type = "button";
    button.addEventListener("click", togglePushNotifications);
    footer.insertBefore(button, signOutButton);
  }
  updatePushNotificationControls();
}

function openPushBlockedHelpDialog() {
  if (dialog.open) dialog.close();
  dialogEyebrow.textContent = "התראות";
  dialogTitle.textContent = "ההתראות חסומות במכשיר";
  dialogBody.innerHTML = `<div class="install-help">
    <p>כדי לקבל התראות צריך לאפשר אותן בהגדרות האתר בדפדפן.</p>
    <ol>
      <li>פתחו את פרטי האתר או את הגדרות הדפדפן.</li>
      <li>בחרו <strong>התראות</strong> ושנו ל־<strong>אפשר</strong>.</li>
      <li>חזרו לאפליקציה ולחצו שוב על הפעלת התראות.</li>
    </ol>
  </div>`;
  dialogSubmit.hidden = true;
  dialogForm.onsubmit = null;
  dialog.showModal();
}

async function refreshPushSubscriptionStatus({ syncExisting = true, rerenderHome = false } = {}) {
  const previousStatus = pushSubscriptionStatus;
  if (!pushNotificationsSupported()) {
    pushSubscriptionStatus = currentHouseholdId ? "unsupported" : "unknown";
    updatePushNotificationControls();
    return;
  }
  if (Notification.permission === "denied") {
    pushSubscriptionStatus = "blocked";
    updatePushNotificationControls();
  } else if (Notification.permission !== "granted") {
    pushSubscriptionStatus = "inactive";
    updatePushNotificationControls();
  } else {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      pushSubscriptionStatus = subscription ? "active" : "inactive";
      if (subscription && syncExisting) await persistPushSubscription(subscription);
    } catch (error) {
      console.warn("Could not read push subscription", error);
      pushSubscriptionStatus = "inactive";
    }
    updatePushNotificationControls();
  }
  if (rerenderHome && currentScreen === "home" && previousStatus !== pushSubscriptionStatus && state) render();
}

async function enablePushNotifications() {
  if (!pushNotificationsSupported()) {
    showToast("המכשיר או הדפדפן אינם תומכים בהתראות");
    return;
  }
  pushActionInProgress = true;
  updatePushNotificationControls();
  try {
    const permission = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
    if (permission !== "granted") {
      pushSubscriptionStatus = permission === "denied" ? "blocked" : "inactive";
      if (permission === "denied") openPushBlockedHelpDialog();
      else showToast("הפעלת ההתראות לא אושרה");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUSH_VAPID_PUBLIC_KEY),
      });
    }
    await persistPushSubscription(subscription);
    pushSubscriptionStatus = "active";
    showToast("ההתראות הופעלו במכשיר הזה");
  } catch (error) {
    console.error("Could not enable push notifications", error);
    showToast(error instanceof Error ? error.message : "לא ניתן להפעיל התראות");
  } finally {
    pushActionInProgress = false;
    updatePushNotificationControls();
    if (currentScreen === "home" && state) render();
  }
}

async function disablePushNotifications() {
  if (!pushNotificationsSupported()) return;
  if (!confirm("לכבות התראות במכשיר הזה?")) return;
  pushActionInProgress = true;
  updatePushNotificationControls();
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await supabaseClient
        .from("push_subscriptions")
        .update({ is_active: false, last_seen_at: new Date().toISOString() })
        .eq("user_id", currentUser.id)
        .eq("endpoint", subscription.endpoint);
      await subscription.unsubscribe();
    }
    pushSubscriptionStatus = "inactive";
    showToast("ההתראות כובו במכשיר הזה");
  } catch (error) {
    console.error("Could not disable push notifications", error);
    showToast("לא ניתן לכבות את ההתראות כרגע");
  } finally {
    pushActionInProgress = false;
    updatePushNotificationControls();
    if (currentScreen === "home" && state) render();
  }
}

async function togglePushNotifications() {
  setMobileMenuOpen(false);
  if (pushSubscriptionStatus === "blocked") {
    openPushBlockedHelpDialog();
    return;
  }
  if (pushSubscriptionStatus === "active") await disablePushNotifications();
  else await enablePushNotifications();
}

function notificationOptInHtml() {
  if (!currentHouseholdId || !currentUser || !SUPABASE_ENABLED) return "";
  if (pushSubscriptionStatus === "active" || pushSubscriptionStatus === "unknown" || pushSubscriptionStatus === "unsupported") return "";
  if (pushSubscriptionStatus === "blocked") {
    return `<section class="notification-optin-card blocked">
      <div class="notification-optin-icon">🔕</div>
      <div><strong>ההתראות חסומות במכשיר</strong><span>אפשר לפתוח אותן דרך הגדרות האתר בדפדפן.</span></div>
      <button type="button" class="secondary-button compact-button" data-push-help>איך מפעילים?</button>
    </section>`;
  }
  return `<section class="notification-optin-card">
    <div class="notification-optin-icon">🔔</div>
    <div><strong>רוצים לקבל עדכונים מהמשפחה?</strong><span>הפעילו התראות במכשיר הזה לאירועים, סידורים ותכנונים חשובים.</span></div>
    <button type="button" class="primary-button compact-button" data-enable-push>הפעלת התראות</button>
  </section>`;
}

async function sendHouseholdNotification(payload, { showNoRecipients = false } = {}) {
  if (!SUPABASE_ENABLED || !supabaseClient || !currentUser || !currentHouseholdId) {
    if (showNoRecipients) showToast("הפריט נשמר, אך חסרים פרטי התחברות לשליחת ההתראה");
    return null;
  }
  try {
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) throw sessionError;
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("לא נמצא אסימון התחברות פעיל");

    const response = await fetch(`${APP_CONFIG.supabaseUrl}/functions/v1/${PUSH_FUNCTION_NAME}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "apikey": APP_CONFIG.supabasePublishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        householdId: currentHouseholdId,
        kind: payload.kind,
        title: payload.title,
        body: payload.body,
        targetPage: payload.targetPage || "home",
        entityId: payload.entityId || null,
        dedupeKey: payload.dedupeKey || null,
        metadata: payload.metadata || {},
      }),
    });

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }
    if (!response.ok) {
      throw new Error(data?.error || `שליחת ההתראה נכשלה (${response.status})`);
    }

    if (showNoRecipients && data?.noRecipients) {
      showToast("נשמר. המשתמש השני עדיין לא הפעיל התראות במכשיר שלו");
    } else if (showNoRecipients && Number(data?.failed || 0) > 0 && !Number(data?.sent || 0)) {
      showToast("נשמר, אך שליחת ההתראה לא הצליחה");
    } else if (showNoRecipients && Number(data?.sent || 0) > 0) {
      showToast("נשמרה ונשלחה התראה");
    }
    return data;
  } catch (error) {
    console.warn("Could not send household notification", error);
    if (showNoRecipients) {
      const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
      showToast(`הפריט נשמר, אך ההתראה לא נשלחה: ${message}`);
    }
    return null;
  }
}

function notificationChoiceHtml({ checked = false, text = "שליחת התראה לבן או בת המשפחה" } = {}) {
  if (!SUPABASE_ENABLED || !currentHouseholdId || !currentUser) return "";
  return `<label class="notification-choice">
    <span class="notification-choice-icon" aria-hidden="true">🔔</span>
    <span class="notification-choice-copy"><strong>${escapeHtml(text)}</strong><small>ההתראה תישלח רק למכשירים אחרים במשפחה שאישרו קבלת התראות.</small></span>
    <input name="sendNotification" type="checkbox" ${checked ? "checked" : ""} />
  </label>`;
}

function shoppingPushStorageKey() {
  return `${SHOPPING_PUSH_STORAGE_PREFIX}:${currentUser?.id || "local"}:${currentHouseholdId || "none"}`;
}

function scheduleShoppingPushFlush(delay = SHOPPING_PUSH_DELAY_MS) {
  clearTimeout(shoppingPushTimer);
  shoppingPushTimer = setTimeout(() => {
    flushShoppingPushNotification().catch((error) => console.warn("Could not flush shopping notification", error));
  }, Math.max(1_500, delay));
}

function queueShoppingPushNotification(itemName) {
  if (!SUPABASE_ENABLED || !currentUser || !currentHouseholdId) return;
  const key = shoppingPushStorageKey();
  let buffer = { count: 0, names: [], updatedAt: Date.now() };
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "null");
    if (stored && typeof stored === "object") buffer = stored;
  } catch (error) { /* start a fresh buffer */ }
  buffer.count = Math.max(0, Number(buffer.count) || 0) + 1;
  buffer.names = [...new Set([...(Array.isArray(buffer.names) ? buffer.names : []), String(itemName || "").trim()].filter(Boolean))].slice(0, 3);
  buffer.updatedAt = Date.now();
  localStorage.setItem(key, JSON.stringify(buffer));
  scheduleShoppingPushFlush();
}

async function flushShoppingPushNotification() {
  clearTimeout(shoppingPushTimer);
  shoppingPushTimer = null;
  if (!SUPABASE_ENABLED || !currentUser || !currentHouseholdId) return;
  const key = shoppingPushStorageKey();
  let buffer;
  try {
    buffer = JSON.parse(localStorage.getItem(key) || "null");
  } catch (error) {
    localStorage.removeItem(key);
    return;
  }
  if (!buffer?.count) return;
  localStorage.removeItem(key);
  const count = Math.max(1, Number(buffer.count) || 1);
  const names = Array.isArray(buffer.names) ? buffer.names.filter(Boolean) : [];
  const body = count === 1
    ? `נוסף מוצר לרשימת הקניות${names[0] ? `: ${names[0]}` : ""}`
    : `נוספו ${count} מוצרים לרשימת הקניות${names.length ? `: ${names.join(", ")}${count > names.length ? " ועוד" : ""}` : ""}`;
  await sendHouseholdNotification({
    kind: "shopping",
    title: "רשימת הקניות עודכנה",
    body,
    targetPage: "shopping",
    dedupeKey: `shopping:${currentHouseholdId}:${Math.floor(Date.now() / SHOPPING_PUSH_DELAY_MS)}`,
  });
}

function resumeShoppingPushBuffer() {
  if (!SUPABASE_ENABLED || !currentUser || !currentHouseholdId) return;
  try {
    const buffer = JSON.parse(localStorage.getItem(shoppingPushStorageKey()) || "null");
    if (!buffer?.count) return;
    const elapsed = Date.now() - Number(buffer.updatedAt || Date.now());
    scheduleShoppingPushFlush(Math.max(1_500, SHOPPING_PUSH_DELAY_MS - elapsed));
  } catch (error) { /* ignore invalid local buffer */ }
}

function isInstalledApp() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function setMobileMenuOpen(open) {
  const menu = document.querySelector("#mobile-app-menu-popover");
  const button = document.querySelector("#mobile-more-button");
  if (!menu || !button) return;
  menu.hidden = !open;
  button.setAttribute("aria-expanded", String(open));
}

function updateMobileInstallAction() {
  const installButton = document.querySelector("#mobile-install-button");
  if (!installButton) return;
  installButton.hidden = isInstalledApp();
}

function updateMobileAdminAction() {
  const adminButton = document.querySelector("#mobile-admin-button");
  if (!adminButton) return;
  adminButton.hidden = !currentUserIsAdmin;
}

function openInstallHelpDialog() {
  dialogEyebrow.textContent = "גישה מהירה";
  dialogTitle.textContent = "הוספה למסך הבית";
  dialogBody.innerHTML = `
    <div class="install-help">
      <p>האפליקציה לא הציגה כרגע חלון התקנה אוטומטי.</p>
      <ol>
        <li>פתחי את האתר ישירות ב־Chrome או ב־Samsung Internet.</li>
        <li>פתחי את תפריט הדפדפן ובחרי <strong>התקנת אפליקציה</strong> או <strong>הוספה למסך הבית</strong>.</li>
        <li>אם האתר פתוח כבר מתוך אייקון במסך הבית, האפליקציה כבר מותקנת.</li>
      </ol>
    </div>`;
  dialogSubmit.hidden = true;
  dialogForm.onsubmit = null;
  if (dialog.open) dialog.close();
  dialog.showModal();
}

async function requestAppInstall() {
  setMobileMenuOpen(false);
  if (isInstalledApp()) {
    showToast("האפליקציה כבר נמצאת במסך הבית");
    updateMobileInstallAction();
    return;
  }
  if (!deferredInstallPrompt) {
    openInstallHelpDialog();
    return;
  }
  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  await promptEvent.prompt();
  const choice = await promptEvent.userChoice.catch(() => null);
  if (choice?.outcome === "accepted") showToast("האפליקציה נוספה למסך הבית");
  updateMobileInstallAction();
}

async function signOutCurrentUser() {
  setMobileMenuOpen(false);
  if (realtimeChannel) await supabaseClient.removeChannel(realtimeChannel);
  realtimeChannel = null;
  await supabaseClient.auth.signOut();
}

function ensureMobileTopbarMenu() {
  const actions = document.querySelector(".topbar-actions");
  if (!actions) return;

  let wrapper = document.querySelector("#mobile-app-menu");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.id = "mobile-app-menu";
    wrapper.className = "mobile-app-menu";
    wrapper.innerHTML = `
      <button id="mobile-more-button" class="icon-button mobile-more-button" type="button"
        aria-label="אפשרויות" aria-haspopup="menu" aria-expanded="false">⋮</button>
      <div id="mobile-app-menu-popover" class="mobile-app-menu-popover" role="menu" hidden>
        <button id="mobile-admin-button" type="button" role="menuitem" hidden>ניהול משפחות</button>
        <button id="mobile-notification-button" type="button" role="menuitem" hidden>🔔 הפעלת התראות במכשיר</button>
        <button id="mobile-install-button" type="button" role="menuitem">＋ הוספה למסך הבית</button>
        <button id="mobile-sign-out-button" type="button" role="menuitem">יציאה</button>
      </div>`;
    actions.appendChild(wrapper);

    wrapper.querySelector("#mobile-more-button")?.addEventListener("click", (event) => {
      event.stopPropagation();
      const menu = wrapper.querySelector("#mobile-app-menu-popover");
      setMobileMenuOpen(Boolean(menu?.hidden));
    });
    wrapper.querySelector("#mobile-admin-button")?.addEventListener("click", () => {
      setMobileMenuOpen(false);
      navigate("admin");
    });
    wrapper.querySelector("#mobile-notification-button")?.addEventListener("click", togglePushNotifications);
    wrapper.querySelector("#mobile-install-button")?.addEventListener("click", requestAppInstall);
    wrapper.querySelector("#mobile-sign-out-button")?.addEventListener("click", signOutCurrentUser);
  }

  if (!mobileMenuDocumentListenerAttached) {
    document.addEventListener("click", (event) => {
      if (!event.target.closest("#mobile-app-menu")) setMobileMenuOpen(false);
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 760) setMobileMenuOpen(false);
    });
    mobileMenuDocumentListenerAttached = true;
  }
  updateMobileInstallAction();
  updateMobileAdminAction();
  updatePushNotificationControls();
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateMobileInstallAction();
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateMobileInstallAction();
  showToast("האפליקציה נוספה למסך הבית");
});

function prepareMultiHouseholdUi() {
  document.title = "ניהול הבית";
  const authEyebrow = authScreen?.querySelector(".auth-brand .eyebrow");
  if (authEyebrow) authEyebrow.textContent = "ניהול הבית";
  const authHint = authScreen?.querySelector(".auth-card > .muted");
  if (authHint) authHint.textContent = "הזינו את כתובת האימייל והסיסמה שלכם.";

  if (authForm && !authEmail) {
    const emailLabel = document.createElement("label");
    emailLabel.textContent = "אימייל";
    emailLabel.innerHTML += '<input id="auth-email" type="email" autocomplete="username" inputmode="email" required />';
    authForm.insertBefore(emailLabel, authForm.firstElementChild);
    authEmail = emailLabel.querySelector("#auth-email");
  }

  document.querySelectorAll(".sidebar .brand p").forEach((element) => {
    element.textContent = currentHouseholdName || "המשפחה שלי";
  });
  const demoResetButton = document.querySelector("#reset-demo");
  if (demoResetButton && SUPABASE_ENABLED) demoResetButton.hidden = true;
  ensureMobileTopbarMenu();
  ensureDesktopNotificationAction();
}

function updateHouseholdUi() {
  const householdLabel = currentHouseholdName || (currentUserIsAdmin ? "ניהול משפחות" : "המשפחה שלי");
  document.title = currentUserIsAdmin && !currentHouseholdId
    ? "ניהול משפחות | ניהול הבית"
    : `ניהול הבית | ${householdLabel}`;
  document.querySelectorAll(".sidebar .brand p").forEach((element) => {
    element.textContent = householdLabel;
  });
  if (signedInUser) {
    signedInUser.textContent = currentUserIsAdmin && !currentHouseholdId
      ? "מנהלת האפליקציה"
      : (currentMemberName ? `${householdLabel} · ${currentMemberName}` : householdLabel);
  }
  updateMobileAdminAction();
  updatePushNotificationControls();
}

function householdStorageKey() {
  return currentHouseholdId
    ? `${STORAGE_KEY_PREFIX}:${currentHouseholdId}`
    : `${STORAGE_KEY_PREFIX}:local`;
}

function createEmptyHouseholdState() {
  return {
    householdMembers: [...HOUSEHOLD_MEMBERS],
    shopping: [],
    shoppingCategories: [...SHOPPING_DEFAULT_CATEGORIES],
    memberEmails: { iris: "", tomer: "" },
    events: [],
    taskCategories: [...TASK_CATEGORIES],
    tasks: [],
    wishCategories: [...WISH_DEFAULT_CATEGORIES],
    wishes: [],
    tripCategories: [...TRIP_DEFAULT_CATEGORIES],
    tripItems: [],
    tripArchive: [],
  };
}

prepareMultiHouseholdUi();

function cloneDefaultState() {
  const cloned = JSON.parse(JSON.stringify(defaultState));
  cloned.householdMembers = [...HOUSEHOLD_MEMBERS];
  return cloned;
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

    const storedMembers = Array.isArray(loaded.householdMembers)
      ? loaded.householdMembers
      : HOUSEHOLD_MEMBERS;
    configureHouseholdMembers(storedMembers);
    loaded.householdMembers = [...HOUSEHOLD_MEMBERS];

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
          .map((name) => name === "אמא" ? HOUSEHOLD_MEMBERS[0] : name === "אבא" ? (HOUSEHOLD_MEMBERS[1] || HOUSEHOLD_MEMBERS[0]) : name)
          .filter((name) => HOUSEHOLD_MEMBERS.includes(name));
        event.participants = [...new Set(participantNames)];
      }
      event.participants = event.participants.filter((name) => HOUSEHOLD_MEMBERS.includes(name));
      event.allDay = Boolean(event.allDay);
      event.recurring = ["weekly", "monthly", "yearly"].includes(event.recurring) ? event.recurring : "none";
      event.excludedDates = [...new Set((Array.isArray(event.excludedDates) ? event.excludedDates : [])
        .map((date) => String(date || "").trim())
        .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)))].sort();
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
      const togetherAssignee = HOUSEHOLD_MEMBERS.join(" ו");
      task.assignee = task.assignee === "אמא" ? HOUSEHOLD_MEMBERS[0]
        : task.assignee === "אבא" ? (HOUSEHOLD_MEMBERS[1] || HOUSEHOLD_MEMBERS[0])
        : task.assignee === "שנינו" ? togetherAssignee
        : TASK_ASSIGNEES.includes(task.assignee) ? task.assignee
        : HOUSEHOLD_MEMBERS[0];
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

    loaded.tripItems = Array.isArray(loaded.tripItems) ? loaded.tripItems : [];
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


function loadLocalState(options = {}) {
  try {
    let saved = localStorage.getItem(householdStorageKey());
    if (!saved && options.allowLegacy && currentHouseholdName === "משפחת זילכה") {
      saved = localStorage.getItem(LEGACY_STORAGE_KEY);
    }
    const fallback = options.empty ? createEmptyHouseholdState() : cloneDefaultState();
    return normalizeState(saved ? JSON.parse(saved) : fallback);
  } catch (error) {
    console.warn("Could not load saved data", error);
    return normalizeState(options.empty ? createEmptyHouseholdState() : cloneDefaultState());
  }
}

function saveState(message = "נשמר") {
  localStorage.setItem(householdStorageKey(), JSON.stringify(state));
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
      household_id: currentHouseholdId,
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
    .eq("household_id", currentHouseholdId)
    .maybeSingle();

  if (error) throw error;
  if (data?.state) {
    const loaded = normalizeState(data.state);
    localStorage.setItem(householdStorageKey(), JSON.stringify(loaded));
    setSyncStatus("מסונכרן");
    return loaded;
  }

  const initial = normalizeState(createEmptyHouseholdState());
  localStorage.setItem(householdStorageKey(), JSON.stringify(initial));
  const { error: insertError } = await supabaseClient
    .from("household_state")
    .insert({
      household_id: currentHouseholdId,
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
    .channel(`household-${currentHouseholdId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "household_state",
        filter: `household_id=eq.${currentHouseholdId}`,
      },
      (payload) => {
        if (!payload.new?.state) return;
        state = normalizeState(payload.new.state);
        localStorage.setItem(householdStorageKey(), JSON.stringify(state));
        setSyncStatus("מסונכרן");
        render();
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") setSyncStatus("מסונכרן");
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setSyncStatus("אין חיבור", "error");
    });
}

async function checkAdminAccess(user) {
  const { data, error } = await supabaseClient
    .from("app_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("Could not check admin access", error);
    return false;
  }
  return Boolean(data?.user_id);
}

async function resolveHouseholdContext(user) {
  const { data: membership, error: membershipError } = await supabaseClient
    .from("household_members")
    .select("household_id, display_name")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership?.household_id) return false;

  const { data: household, error: householdError } = await supabaseClient
    .from("households")
    .select("name")
    .eq("id", membership.household_id)
    .maybeSingle();

  if (householdError) throw householdError;
  if (!household?.name) throw new Error("לא נמצאה משפחה למשתמש");

  currentHouseholdId = membership.household_id;
  currentHouseholdName = String(household.name).trim();
  currentMemberName = String(membership.display_name || "").trim();

  const fallbackMembers = currentHouseholdName === "משפחת זילכה"
    ? [...DEFAULT_HOUSEHOLD_MEMBERS]
    : [currentMemberName].filter(Boolean);
  configureHouseholdMembers(fallbackMembers);
  updateHouseholdUi();
  return true;
}

function whatsNewSeenKey() {
  const viewerId = currentUser?.id || "local";
  return `${WHATS_NEW_STORAGE_PREFIX}:${viewerId}`;
}

function versionParts(version) {
  return String(version || "")
    .match(/\d+/g)?.map(Number) || [];
}

function compareVersions(first, second) {
  const left = versionParts(first);
  const right = versionParts(second);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] || 0) - (right[index] || 0);
    if (difference) return difference;
  }
  return 0;
}

function unseenReleaseGroups(lastSeenVersion) {
  const candidateReleases = lastSeenVersion
    ? APP_RELEASES.filter((release) => compareVersions(release.version, lastSeenVersion) > 0)
    : [APP_RELEASE];
  return candidateReleases
    .map((release) => ({
      ...release,
      updates: release.updates.filter((update) => !update.adminOnly || currentUserIsAdmin),
    }))
    .filter((release) => release.updates.length);
}

function showWhatsNewIfNeeded() {
  if (whatsNewShownThisSession || !dialog || !appShell || appShell.classList.contains("hidden")) return;
  const seenKey = whatsNewSeenKey();
  const lastSeenVersion = localStorage.getItem(seenKey) || "";
  if (lastSeenVersion && compareVersions(lastSeenVersion, APP_RELEASE.version) >= 0) return;

  const releaseGroups = unseenReleaseGroups(lastSeenVersion);
  if (!releaseGroups.length) {
    localStorage.setItem(seenKey, APP_RELEASE.version);
    return;
  }

  if (dialog.open) dialog.close();
  whatsNewShownThisSession = true;
  pendingWhatsNewSeenKey = seenKey;
  dialogEyebrow.textContent = lastSeenVersion ? "עדכונים מאז הפעם האחרונה" : `גרסה ${APP_RELEASE.version}`;
  dialogTitle.textContent = APP_RELEASE.title;
  dialogBody.innerHTML = `
    <section class="whats-new-panel">
      <p class="whats-new-intro">${lastSeenVersion
        ? "ריכזנו את כל החידושים שעלו מאז הפעם האחרונה שפתחת את האפליקציה."
        : "ריכזנו עבורך את החידושים האחרונים כדי שיהיה קל להתחיל להשתמש בהם."}</p>
      <div class="whats-new-release-list">
        ${releaseGroups.map((release) => `
          <section class="whats-new-release-group">
            <h4>גרסה ${escapeHtml(release.version)}</h4>
            <div class="whats-new-list">
              ${release.updates.map((update) => `
                <article class="whats-new-item">
                  <span class="whats-new-icon" aria-hidden="true">${update.icon}</span>
                  <p>${escapeHtml(update.text)}</p>
                </article>`).join("")}
            </div>
          </section>`).join("")}
      </div>
      <p class="whats-new-note">לאחר האישור, החידושים האלה יסומנו כנקראו במכשיר הזה.</p>
    </section>`;
  dialogSubmit.hidden = false;
  dialogSubmit.textContent = "הבנתי, אפשר להמשיך";
  dialogForm.onsubmit = (event) => {
    event.preventDefault();
    dialog.close();
  };
  dialog.showModal();
}

function scheduleWhatsNew() {
  window.setTimeout(showWhatsNewIfNeeded, 180);
}

function showLogin(message = "") {
  whatsNewShownThisSession = false;
  pendingWhatsNewSeenKey = "";
  currentUser = null;
  cloudStartedForUserId = null;
  currentHouseholdId = "";
  currentHouseholdName = "";
  currentMemberName = "";
  currentUserIsAdmin = false;
  adminCreateResult = null;
  pushSubscriptionStatus = "unknown";
  pushActionInProgress = false;
  clearTimeout(shoppingPushTimer);
  shoppingPushTimer = null;
  configureHouseholdMembers(DEFAULT_HOUSEHOLD_MEMBERS);
  prepareMultiHouseholdUi();
  setMobileMenuOpen(false);
  appShell.classList.add("hidden");
  mobileNav.classList.add("hidden");
  authScreen.classList.remove("hidden");
  signOutButton.classList.add("hidden");
  signedInUser.classList.add("hidden");
  authMessage.textContent = message;
  if (authPassword) authPassword.value = "";
}

async function startCloudApp(user) {
  if (cloudStartedForUserId === user.id && (currentHouseholdId || currentUserIsAdmin)) return;
  currentUser = user;

  try {
    currentUserIsAdmin = await checkAdminAccess(user);
    const hasHousehold = await resolveHouseholdContext(user);
    if (!hasHousehold && !currentUserIsAdmin) throw new Error("המשתמש אינו משויך למשפחה");

    cloudStartedForUserId = user.id;
    authScreen.classList.add("hidden");
    appShell.classList.remove("hidden");
    signOutButton.classList.remove("hidden");
    signedInUser.classList.remove("hidden");

    if (!hasHousehold && currentUserIsAdmin) {
      currentScreen = "admin";
      if (location.hash !== "#admin") history.replaceState({}, document.title, `${location.pathname}${location.search}#admin`);
      state = null;
      mobileNav.classList.add("hidden");
      setSyncStatus("מצב ניהול");
      updateHouseholdUi();
      render();
      scheduleWhatsNew();
      return;
    }

    mobileNav.classList.remove("hidden");
    state = await loadCloudState();
    updateHouseholdUi();
    subscribeToCloudState();
    render();
    refreshPushSubscriptionStatus({ syncExisting: true, rerenderHome: true }).catch(console.warn);
    resumeShoppingPushBuffer();
    scheduleWhatsNew();
  } catch (error) {
    console.error("Could not start cloud app", error);
    if (realtimeChannel) await supabaseClient.removeChannel(realtimeChannel);
    await supabaseClient.auth.signOut();
    showLogin("החשבון עדיין לא שויך למשפחה או לניהול. בדקי את ההגדרה ב־Supabase.");
  }
}

async function initializeApp() {
  if (!SUPABASE_ENABLED) {
    currentHouseholdName = "המשפחה שלי";
    configureHouseholdMembers(DEFAULT_HOUSEHOLD_MEMBERS);
    updateHouseholdUi();
    state = loadLocalState();
    appShell.classList.remove("hidden");
    mobileNav.classList.remove("hidden");
    setSyncStatus("נשמר מקומית");
    render();
    scheduleWhatsNew();
    return;
  }

  supabaseClient = window.supabase.createClient(
    APP_CONFIG.supabaseUrl,
    APP_CONFIG.supabasePublishableKey
  );

  let passwordSetupHandled = false;

  async function handlePasswordSetup(nextSession, mode = "recovery") {
    if (passwordSetupHandled || !nextSession?.user) return;
    passwordSetupHandled = true;
    const isInvite = mode === "invite";

    const newPassword = window.prompt(isInvite
      ? "ברוכים הבאים! בחרו סיסמה לחשבון המשפחתי (לפחות 6 תווים):"
      : "הקלידי סיסמה חדשה לחשבון המשפחתי (לפחות 6 תווים):");
    if (!newPassword) {
      passwordSetupHandled = false;
      showLogin();
      return;
    }

    if (newPassword.length < 6) {
      window.alert("הסיסמה חייבת להכיל לפחות 6 תווים. פתחו שוב את הקישור ונסו מחדש.");
      passwordSetupHandled = false;
      return;
    }

    const confirmation = window.prompt("הקלידו שוב את הסיסמה:");
    if (newPassword !== confirmation) {
      window.alert("הסיסמאות אינן תואמות. פתחו שוב את הקישור ונסו מחדש.");
      passwordSetupHandled = false;
      return;
    }

    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) {
      console.error("Could not update password", error);
      window.alert(`לא ניתן לעדכן את הסיסמה: ${error.message}`);
      passwordSetupHandled = false;
      return;
    }

    pendingInviteFlow = false;
    window.history.replaceState({}, document.title, window.location.pathname);
    window.alert(isInvite ? "הסיסמה נשמרה. אפשר להתחיל להשתמש באפליקציה." : "הסיסמה עודכנה בהצלחה.");
    await startCloudApp(nextSession.user);
  }

  supabaseClient.auth.onAuthStateChange((event, nextSession) => {
    setTimeout(async () => {
      if (event === "PASSWORD_RECOVERY") {
        await handlePasswordSetup(nextSession, "recovery");
        return;
      }
      if (pendingInviteFlow && nextSession?.user) {
        await handlePasswordSetup(nextSession, "invite");
        return;
      }
      if (nextSession?.user) await startCloudApp(nextSession.user);
      else showLogin();
    }, 0);
  });

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.user && pendingInviteFlow) await handlePasswordSetup(session, "invite");
  else if (session?.user) await startCloudApp(session.user);
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

function availableNavItems() {
  if (currentUserIsAdmin && !currentHouseholdId) return [ADMIN_NAV_ITEM];
  return currentUserIsAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;
}

function renderNavigation() {
  const items = availableNavItems();
  const html = items.map((item) => `
    <button class="nav-button ${item.id === currentScreen ? "active" : ""}" data-nav="${item.id}">
      <span class="nav-icon">${item.icon}</span><span>${item.label}</span>
    </button>`).join("");
  desktopNav.innerHTML = html;
  mobileNav.innerHTML = currentUserIsAdmin && !currentHouseholdId ? "" : html;
  mobileNav.classList.toggle("hidden", currentUserIsAdmin && !currentHouseholdId);
}

function navigate(screen) {
  if (!availableNavItems().some((item) => item.id === screen)) return;
  currentScreen = screen;
  location.hash = screen;
  render();
}

function render() {
  renderNavigation();
  updateMobileAdminAction();
  const items = availableNavItems();
  if (!items.some((item) => item.id === currentScreen)) currentScreen = items[0]?.id || "home";
  const item = items.find((navItem) => navItem.id === currentScreen) || items[0] || NAV_ITEMS[0];
  const showHomeIdentity = currentScreen === "home";
  const showAdmin = currentScreen === "admin";
  screenTitle.textContent = showHomeIdentity ? "ניהול הבית" : item.label;
  screenEyebrow.hidden = !(showHomeIdentity || showAdmin);
  screenEyebrow.textContent = showHomeIdentity
    ? (currentHouseholdName || "המשפחה שלי")
    : (showAdmin ? "מנהלת האפליקציה" : "");
  quickAdd.hidden = showAdmin;
  if (!showAdmin) {
    quickAdd.textContent = showHomeIdentity ? "＋ הוספה מהירה" : `＋ ${addLabel(currentScreen)}`;
    quickAdd.onclick = () => currentScreen === "home" ? openQuickAdd() : openAddDialog(currentScreen);
  } else {
    quickAdd.onclick = null;
  }

  const renderers = {
    home: renderHome,
    shopping: renderShopping,
    events: renderEvents,
    tasks: renderTasks,
    wishes: renderWishes,
    trip: renderTrip,
    admin: renderAdminFamilies,
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

function dateSerialFromKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ""));
  if (!match) return null;
  return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000);
}

function eventOccursOnDate(event, key) {
  const startKey = String(event?.date || "");
  if (!startKey || !key) return false;
  if ((Array.isArray(event.excludedDates) ? event.excludedDates : []).includes(key)) return false;
  if (startKey === key) return true;

  const recurrence = String(event.recurring || "none");
  if (recurrence === "none") return false;

  const startSerial = dateSerialFromKey(startKey);
  const targetSerial = dateSerialFromKey(key);
  if (startSerial === null || targetSerial === null || targetSerial < startSerial) return false;

  if (recurrence === "weekly") return (targetSerial - startSerial) % 7 === 0;

  const [startYear, startMonth, startDay] = startKey.split("-").map(Number);
  const [targetYear, targetMonth, targetDay] = key.split("-").map(Number);
  if (recurrence === "monthly") return targetDay === startDay;
  if (recurrence === "yearly") return targetMonth === startMonth && targetDay === startDay;
  return false;
}

function eventOccurrenceForDate(event, key) {
  return {
    ...event,
    date: key,
    sourceEventId: event.id,
    isRecurringOccurrence: key !== event.date,
  };
}

function calendarEntriesForDate(key) {
  const date = new Date(`${key}T12:00:00`);
  const holiday = israelHolidayForDate(date);
  const events = state.events
    .filter((event) => eventOccursOnDate(event, key))
    .map((event) => eventOccurrenceForDate(event, key))
    .sort((a, b) => `${a.allDay ? "00:00" : (a.startTime || "00:00")}`.localeCompare(`${b.allDay ? "00:00" : (b.startTime || "00:00")}`));
  return holiday ? [holiday, ...events] : events;
}

function adminMemberRowHtml(index, values = {}) {
  const required = index === 0 ? "required" : "";
  return `<div class="admin-member-row" data-admin-member-row>
    <label>שם פרטי
      <input type="text" name="member-name-${index}" maxlength="50" value="${escapeHtml(values.displayName || "")}" placeholder="לדוגמה: נדב" ${required} />
    </label>
    <label>אימייל
      <input type="email" name="member-email-${index}" maxlength="254" value="${escapeHtml(values.email || "")}" placeholder="name@example.com" inputmode="email" ${required} />
    </label>
    <button type="button" class="icon-button admin-remove-member" data-remove-admin-member aria-label="הסרת משתמש" ${index < 2 ? "hidden" : ""}>×</button>
  </div>`;
}

function renderAdminFamilies() {
  const success = adminCreateResult?.ok ? `<section class="admin-success-card" aria-live="polite">
    <strong>משפחת ${escapeHtml(adminCreateResult.household?.name || "")} נפתחה בהצלחה</strong>
    <span>נשלחו הזמנות אל ${adminCreateResult.members.map((member) => escapeHtml(member.email)).join(" ו־")}.</span>
    <span>כל משתמש יפתח את הקישור במייל ויבחר לעצמו סיסמה.</span>
  </section>` : "";

  return `<section class="admin-page">
    ${success}
    <section class="card admin-create-card">
      <div class="admin-card-heading">
        <div><h3 class="card-title">פתיחת משפחה חדשה</h3><p class="muted">ממלאים את הפרטים ושולחים הזמנה. אין צורך ליצור משתמשים או להריץ SQL.</p></div>
        <span class="admin-lock-badge">🔒 למנהלת בלבד</span>
      </div>
      <form id="create-family-form" class="admin-family-form">
        <label class="admin-household-name">שם המשפחה
          <input id="admin-household-name" type="text" maxlength="80" placeholder="לדוגמה: משפחת כהן" required />
        </label>
        <div class="admin-members-heading"><strong>בני המשפחה</strong><span class="muted small">לפחות משתמש אחד</span></div>
        <div id="admin-members-list" class="admin-members-list">
          ${adminMemberRowHtml(0)}
          ${adminMemberRowHtml(1)}
        </div>
        <button type="button" class="secondary-button admin-add-member" data-add-admin-member>＋ הוספת משתמש נוסף</button>
        <div id="admin-form-message" class="admin-form-message" role="alert"></div>
        <button id="create-family-submit" type="submit" class="primary-button admin-submit-button">פתיחת משפחה ושליחת הזמנות</button>
      </form>
    </section>

    <section class="card admin-reset-card">
      <div class="admin-card-heading">
        <div><h3 class="card-title">איפוס סיסמה למשתמש</h3><p class="muted">הזיני את כתובת האימייל של המשתמש. הוא יקבל קישור מאובטח לבחירת סיסמה חדשה.</p></div>
        <span class="admin-lock-badge">🔒 למנהלת בלבד</span>
      </div>
      <form id="admin-password-reset-form" class="admin-password-reset-form">
        <label>אימייל המשתמש
          <input id="admin-reset-email" type="email" maxlength="254" placeholder="name@example.com" inputmode="email" autocomplete="email" required />
        </label>
        <div id="admin-reset-message" class="admin-form-message" role="alert"></div>
        <button id="admin-reset-submit" type="submit" class="secondary-button admin-reset-submit">שליחת קישור לאיפוס סיסמה</button>
      </form>
    </section>
  </section>`;
}

function addAdminMemberRow() {
  const list = document.querySelector("#admin-members-list");
  if (!list) return;
  const count = list.querySelectorAll("[data-admin-member-row]").length;
  if (count >= 10) {
    showToast("אפשר להוסיף עד 10 משתמשים למשפחה");
    return;
  }
  list.insertAdjacentHTML("beforeend", adminMemberRowHtml(count));
  attachAdminMemberRemoveEvents();
}

function attachAdminMemberRemoveEvents() {
  document.querySelectorAll("[data-remove-admin-member]").forEach((button) => {
    button.onclick = () => button.closest("[data-admin-member-row]")?.remove();
  });
}

async function submitCreateFamily(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = document.querySelector("#create-family-submit");
  const message = document.querySelector("#admin-form-message");
  const householdName = String(document.querySelector("#admin-household-name")?.value || "").trim();
  const members = [...form.querySelectorAll("[data-admin-member-row]")]
    .map((row) => ({
      displayName: String(row.querySelector('input[type="text"]')?.value || "").trim(),
      email: String(row.querySelector('input[type="email"]')?.value || "").trim().toLowerCase(),
    }))
    .filter((member) => member.displayName || member.email);

  message.textContent = "";
  if (!householdName || !members.length || members.some((member) => !member.displayName || !member.email)) {
    message.textContent = "יש למלא שם משפחה ושם ואימייל לכל משתמש שהוספת.";
    return;
  }

  submit.disabled = true;
  submit.textContent = "פותחת משפחה ושולחת הזמנות…";
  try {
    const { data, error } = await supabaseClient.functions.invoke("create-family", {
      body: { householdName, members },
    });
    if (error) {
      let detailedMessage = data?.error || error.message || "פתיחת המשפחה נכשלה.";
      try {
        if (error.context && typeof error.context.json === "function") {
          const body = await error.context.json();
          detailedMessage = body?.error || detailedMessage;
        }
      } catch (contextError) {
        console.warn("Could not read function error response", contextError);
      }
      throw new Error(detailedMessage);
    }
    if (!data?.ok) throw new Error(data?.error || "פתיחת המשפחה נכשלה.");
    adminCreateResult = data;
    showToast("המשפחה נפתחה וההזמנות נשלחו");
    render();
  } catch (error) {
    console.error("Could not create family", error);
    message.textContent = error instanceof Error ? error.message : "פתיחת המשפחה נכשלה.";
    submit.disabled = false;
    submit.textContent = "פתיחת משפחה ושליחת הזמנות";
  }
}

async function submitAdminPasswordReset(event) {
  event.preventDefault();
  if (!currentUserIsAdmin || !supabaseClient) {
    showToast("אין הרשאת ניהול");
    return;
  }

  const form = event.currentTarget;
  const emailInput = form.querySelector("#admin-reset-email");
  const message = form.querySelector("#admin-reset-message");
  const submit = form.querySelector("#admin-reset-submit");
  const email = String(emailInput?.value || "").trim().toLowerCase();

  message.textContent = "";
  if (!email || !emailInput.checkValidity()) {
    message.textContent = "יש להזין כתובת אימייל תקינה.";
    emailInput?.focus();
    return;
  }

  submit.disabled = true;
  submit.textContent = "שולחת קישור…";
  try {
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    form.reset();
    message.classList.add("success");
    message.textContent = `קישור לאיפוס סיסמה נשלח אל ${email}.`;
    showToast("מייל איפוס הסיסמה נשלח");
  } catch (error) {
    console.error("Could not send password reset", error);
    message.classList.remove("success");
    message.textContent = error instanceof Error ? error.message : "שליחת קישור האיפוס נכשלה.";
  } finally {
    submit.disabled = false;
    submit.textContent = "שליחת קישור לאיפוס סיסמה";
  }
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
    ${notificationOptInHtml()}
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
        const actions = event.isHoliday ? "" : `<div class="calendar-day-event-actions">
          <button type="button" class="danger-link-button" data-cancel-event-occurrence="${escapeHtml(event.sourceEventId || event.id)}" data-occurrence-date="${escapeHtml(event.date)}">ביטול האירוע</button>
        </div>`;
        return `<article class="calendar-day-dialog-event ${event.isHoliday ? "holiday" : ""}"><div class="calendar-day-event-main"><strong>${escapeHtml(event.title)}</strong><span>${when}${event.location ? ` · ${escapeHtml(event.location)}` : ""}</span></div>${event.notes ? `<p>${escapeHtml(event.notes)}</p>` : ""}${actions}</article>`;
      }).join("")}</div>`
    : emptyHtml("אין אירועים ביום זה");
  dialogBody.querySelectorAll("[data-cancel-event-occurrence]").forEach((button) => button.addEventListener("click", () => {
    openEventCancellationDialog(button.dataset.cancelEventOccurrence, button.dataset.occurrenceDate);
  }));
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
    ${moreMenuHtml(`<button type="button" data-edit-event="${event.id}">עריכה</button><button type="button" data-download-ics="${event.id}">הורדת זימון</button><button type="button" class="danger-menu-item" data-delete-event="${event.id}">ביטול אירוע</button>`)}
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
  document.querySelector("#create-family-form")?.addEventListener("submit", submitCreateFamily);
  document.querySelector("#admin-password-reset-form")?.addEventListener("submit", submitAdminPasswordReset);
  document.querySelector("[data-add-admin-member]")?.addEventListener("click", addAdminMemberRow);
  document.querySelector("[data-enable-push]")?.addEventListener("click", enablePushNotifications);
  document.querySelector("[data-push-help]")?.addEventListener("click", openPushBlockedHelpDialog);
  attachAdminMemberRemoveEvents();
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
  document.querySelectorAll("[data-delete-event]").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    const calendarEvent = state.events.find((item) => item.id === button.dataset.deleteEvent);
    openEventCancellationDialog(button.dataset.deleteEvent, calendarEvent?.date || "");
  }));
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

function removeEventSeries(eventId) {
  const event = state.events.find((existing) => existing.id === eventId);
  if (!event) return;
  state.events = state.events.filter((existing) => existing.id !== eventId);
  saveState(event.recurring && event.recurring !== "none" ? "סדרת האירועים בוטלה" : "האירוע בוטל");
  if (dialog.open) dialog.close();
  render();
}

function cancelSingleEventOccurrence(eventId, occurrenceDate) {
  const event = state.events.find((existing) => existing.id === eventId);
  if (!event || !eventOccursOnDate(event, occurrenceDate)) return;
  event.excludedDates = [...new Set([...(event.excludedDates || []), occurrenceDate])].sort();
  saveState("המועד הזה בוטל ושאר הסדרה נשמרה");
  if (dialog.open) dialog.close();
  render();
}

function openEventCancellationDialog(eventId, occurrenceDate = "") {
  const event = state.events.find((existing) => existing.id === eventId);
  if (!event) return;
  const recurring = event.recurring && event.recurring !== "none";
  const selectedDate = occurrenceDate || event.date;

  if (!recurring) {
    if (!confirm(`לבטל את האירוע „${event.title}”?`)) return;
    removeEventSeries(eventId);
    return;
  }

  const date = new Date(`${selectedDate}T12:00:00`);
  const readableDate = Number.isNaN(date.getTime())
    ? selectedDate
    : new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric" }).format(date);

  if (dialog.open) dialog.close();
  dialogEyebrow.textContent = "אירוע חוזר";
  dialogTitle.textContent = "איזה אירוע לבטל?";
  dialogSubmit.hidden = true;
  dialogForm.onsubmit = null;
  dialogBody.innerHTML = `<section class="recurring-cancel-panel">
    <p>האירוע „${escapeHtml(event.title)}” מוגדר כאירוע חוזר.</p>
    <div class="recurring-cancel-actions">
      <button type="button" class="secondary-button" data-cancel-one-occurrence>רק בתאריך ${escapeHtml(readableDate)}</button>
      <button type="button" class="danger-button" data-cancel-entire-series>כל סדרת האירועים</button>
    </div>
    <p class="muted small">ביטול מועד אחד לא ישפיע על שאר המועדים בסדרה.</p>
  </section>`;
  dialogBody.querySelector("[data-cancel-one-occurrence]")?.addEventListener("click", () => cancelSingleEventOccurrence(eventId, selectedDate));
  dialogBody.querySelector("[data-cancel-entire-series]")?.addEventListener("click", () => {
    if (!confirm(`לבטל את כל סדרת האירועים „${event.title}”?`)) return;
    removeEventSeries(eventId);
  });
  dialog.showModal();
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
    container.querySelector("#force-add").onclick = () => { state.shopping.push(item); queueShoppingPushNotification(item.name); saveState("המוצר נוסף למרות הכפילות"); dialog.close(); render(); };
    container.querySelector("#cancel-duplicate").onclick = () => dialog.close();
    return;
  }
  state.shopping.push(item);
  queueShoppingPushNotification(item.name);
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
    ${notificationChoiceHtml({ checked: !item, text: item ? "שליחת התראה על העדכון" : "שליחת התראה על האירוע החדש" })}
  </div>`;
}

function submitEvent(formData, id = null) {
  const allDay = formData.get("allDay") === "on";
  const values = {
    title: String(formData.get("title") || "").trim(), date: formData.get("date"), allDay,
    startTime: allDay ? "" : formData.get("startTime"), endTime: allDay ? "" : formData.get("endTime"),
    location: String(formData.get("location") || "").trim(), notes: String(formData.get("notes") || "").trim(), recurring: formData.get("recurring"),
  };
  let savedEvent;
  if (id) {
    savedEvent = state.events.find((event) => event.id === id);
    if (!savedEvent) return;
    Object.assign(savedEvent, values);
    savedEvent.excludedDates = Array.isArray(savedEvent.excludedDates) ? savedEvent.excludedDates : [];
  } else {
    savedEvent = { id: crypto.randomUUID(), ...values, excludedDates: [] };
    state.events.push(savedEvent);
  }
  const shouldNotify = formData.get("sendNotification") === "on";
  saveState(id ? "האירוע עודכן" : "האירוע נוסף");
  dialog.close();
  render();
  if (shouldNotify) {
    const recurrence = { weekly: " · חוזר מדי שבוע", monthly: " · חוזר מדי חודש", yearly: " · חוזר מדי שנה" }[values.recurring] || "";
    const time = values.allDay ? " · כל היום" : (values.startTime ? ` · ${values.startTime}` : "");
    void sendHouseholdNotification({
      kind: "event",
      title: id ? "אירוע משפחתי עודכן" : "אירוע חדש במשפחה",
      body: `${values.title} · ${formatDate(values.date)}${time}${recurrence}`,
      targetPage: "events",
      entityId: savedEvent.id,
      metadata: { recurring: values.recurring, date: values.date },
    }, { showNoRecipients: true });
  }
}

function taskFormHtml(item = null) {
  return `<div class="form-stack">
    <label>שם הסידור<input name="title" required ${item ? "" : "autofocus"} value="${escapeHtml(item?.title || "")}" /></label>
    <label>תיאור<textarea name="notes">${escapeHtml(item?.notes || "")}</textarea></label>
    <div class="form-grid"><label>שיוך<select name="assignee">${TASK_ASSIGNEES.map((assignee) => `<option value="${escapeHtml(assignee)}" ${item?.assignee === assignee ? "selected" : ""}>${escapeHtml(TASK_ASSIGNEE_LABELS[assignee] || assignee)}</option>`).join("")}</select></label><label>קטגוריה<select name="category">${taskCategoryOptions(item?.category || "אחר")}</select></label></div>
    ${notificationChoiceHtml({ checked: !item, text: item ? "שליחת התראה על העדכון" : "שליחת התראה על הסידור החדש" })}
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
  let savedTask;
  if (id) {
    savedTask = state.tasks.find((existing) => existing.id === id);
    if (!savedTask) return;
    Object.assign(savedTask, values);
  } else {
    const nextOrder = state.tasks.reduce((max, task) => Math.max(max, Number(task.order || 0)), -1) + 1;
    savedTask = { id: crypto.randomUUID(), ...values, completed: false, completedAt: null, order: nextOrder };
    state.tasks.push(savedTask);
  }
  const shouldNotify = formData.get("sendNotification") === "on";
  saveState(id ? "הסידור עודכן" : "הסידור נוסף");
  dialog.close();
  render();
  if (shouldNotify) {
    void sendHouseholdNotification({
      kind: "task",
      title: id ? "סידור משפחתי עודכן" : "סידור חדש",
      body: `${values.title}${values.assignee ? ` · ${TASK_ASSIGNEE_LABELS[values.assignee] || values.assignee}` : ""}`,
      targetPage: "tasks",
      entityId: savedTask.id,
      metadata: { assignee: values.assignee, category: values.category },
    }, { showNoRecipients: true });
  }
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
    <label>קישורים אופציונליים<textarea name="references" placeholder="קישור אחד בכל שורה (לא חובה)">${escapeHtml(referencesToText(item?.references || []))}</textarea></label>
    <label>הערה אופציונלית<textarea name="note">${escapeHtml(item?.note || "")}</textarea></label>
    ${notificationChoiceHtml({ checked: false, text: item ? "שליחת התראה על העדכון" : "שליחת התראה על התכנון החדש" })}
  </div>`;
}

function submitWish(formData, id = null) {
  const references = parseReferences(formData.get("references"));
  if (references.some((reference) => !isValidWebLink(reference))) return showToast("יש להזין קישורים תקינים שמתחילים ב־https://");
  const values = {
    title: String(formData.get("title") || "").trim(),
    category: formData.get("category") || "בית",
    references,
    note: String(formData.get("note") || "").trim(),
  };
  if (!state.wishCategories.includes(values.category)) state.wishCategories.push(values.category);
  let savedWish;
  if (id) {
    savedWish = state.wishes.find((existing) => existing.id === id);
    if (!savedWish) return;
    Object.assign(savedWish, values);
  } else {
    savedWish = { id: crypto.randomUUID(), ...values };
    state.wishes.push(savedWish);
  }
  const shouldNotify = formData.get("sendNotification") === "on";
  saveState(id ? "התכנון עודכן" : "התכנון נוסף");
  dialog.close();
  render();
  if (shouldNotify) {
    void sendHouseholdNotification({
      kind: "planning",
      title: id ? "תכנון משפחתי עודכן" : "תכנון חדש",
      body: `${values.title} · ${values.category}`,
      targetPage: "planning",
      entityId: savedWish.id,
      metadata: { category: values.category },
    }, { showNoRecipients: true });
  }
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
  const excludedDates = (Array.isArray(event.excludedDates) ? event.excludedDates : [])
    .map((date) => date.replaceAll("-", ""))
    .filter(Boolean);
  const exclusionLines = !excludedDates.length ? [] : event.allDay
    ? [`EXDATE;VALUE=DATE:${excludedDates.join(",")}`]
    : [`EXDATE:${excludedDates.map((date) => `${date}T${(event.startTime || "00:00").replace(":", "")}00`).join(",")}`];
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nihul Habayit//Family//HE", "CALSCALE:GREGORIAN", "METHOD:REQUEST",
    "BEGIN:VEVENT", `UID:${event.id}@nihul-habayit`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    ...dateLines,
    ...({ weekly: ["RRULE:FREQ=WEEKLY"], monthly: ["RRULE:FREQ=MONTHLY"], yearly: ["RRULE:FREQ=YEARLY"] }[event.recurring] || []),
    ...exclusionLines,
    `SUMMARY:${escapeIcs(event.title)}`, `LOCATION:${escapeIcs(event.location || "")}`, `DESCRIPTION:${escapeIcs(event.notes || "")}`,
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

dialog?.addEventListener("close", () => {
  if (!pendingWhatsNewSeenKey) return;
  localStorage.setItem(pendingWhatsNewSeenKey, APP_RELEASE.version);
  pendingWhatsNewSeenKey = "";
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => dialog.close()));
document.querySelector("#reset-demo").addEventListener("click", resetDemo);
window.addEventListener("hashchange", () => {
  const requestedScreen = location.hash.replace("#", "") || "home";
  currentScreen = availableNavItems().some((item) => item.id === requestedScreen)
    ? requestedScreen
    : (availableNavItems()[0]?.id || "home");
  render();
});

authForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  authMessage.textContent = "";
  authSubmit.disabled = true;
  authSubmit.textContent = "נכנסת…";
  const email = String(authEmail?.value || "").trim().toLowerCase();
  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password: authPassword.value,
  });
  authSubmit.disabled = false;
  authSubmit.textContent = "כניסה";
  if (error) authMessage.textContent = "האימייל או הסיסמה אינם נכונים.";
});

signOutButton?.addEventListener("click", signOutCurrentUser);

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
