const STORAGE_KEY = "qt-notification-enabled";
const LAST_NOTIFIED_KEY = "qt-last-notified-date";

export function isNotificationSupported(): boolean {
  return "Notification" in window;
}

export function getNotificationEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function setNotificationEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, String(enabled));
}

export async function requestPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

export function getPermissionStatus(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

function getTodayKey(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Show a reminder notification if:
 * 1. Notifications are enabled by user
 * 2. Permission is granted
 * 3. Haven't already notified today
 */
export function showQtReminder() {
  if (!getNotificationEnabled()) return;
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;

  const today = getTodayKey();
  const lastNotified = localStorage.getItem(LAST_NOTIFIED_KEY);
  if (lastNotified === today) return;

  localStorage.setItem(LAST_NOTIFIED_KEY, today);

  new Notification("QT Connect", {
    body: "오늘의 큐티를 아직 작성하지 않았어요. 말씀과 함께 하루를 시작해보세요!",
    icon: "/logo.svg",
    tag: "qt-daily-reminder",
  });
}

/**
 * Reset the "already notified" flag (e.g., after writing QT)
 */
export function clearTodayNotification() {
  localStorage.removeItem(LAST_NOTIFIED_KEY);
}
