// Push notification manager — handles subscription, permission, and scheduled reminders
// Uses Web Push API with graceful fallback to in-app notifications

const PERMISSION_KEY = 'ygy_notif_perm';
const SCHEDULE_KEY = 'ygy_notif_schedule';

export type NotifType = 'streak_reminder' | 'due_review' | 'achievement' | 'daily_goal' | 'comeback';

interface ScheduledNotif {
  type: NotifType;
  title: string;
  body: string;
  scheduledFor: number; // timestamp ms
  fired: boolean;
}

export function hasNotificationPermission(): boolean {
  if (!('Notification' in window)) return false;
  return Notification.permission === 'granted';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();

  localStorage.setItem(PERMISSION_KEY, result);
  return result === 'granted';
}

export function showNotification(title: string, body: string, icon = '🧠') {
  if (!hasNotificationPermission()) return;
  try {
    new Notification(title, {
      body,
      icon: `/favicon.svg`,
      badge: `/favicon.svg`,
      tag: `ygy-${Date.now()}`,
      data: { icon },
    });
  } catch {
    // SW notification fallback
    navigator.serviceWorker?.ready.then(reg => {
      reg.showNotification(title, { body, badge: '/favicon.svg' });
    });
  }
}

export function scheduleStreakReminder() {
  const schedules = getSchedules();
  const now = Date.now();
  const tonight = new Date();
  tonight.setHours(20, 0, 0, 0); // 8 PM
  let target = tonight.getTime();
  if (target <= now) target += 86400000; // tomorrow

  const existing = schedules.find(s => s.type === 'streak_reminder' && !s.fired && s.scheduledFor > now);
  if (existing) return;

  schedules.push({
    type: 'streak_reminder',
    title: '🔥 Keep your streak alive!',
    body: 'Play one game before midnight to maintain your streak.',
    scheduledFor: target,
    fired: false,
  });
  saveSchedules(schedules);
}

export function scheduleDueReviewReminder(gameNames: string[]) {
  if (gameNames.length === 0) return;
  const schedules = getSchedules();
  const now = Date.now();
  const inOneHour = now + 3600000;

  schedules.push({
    type: 'due_review',
    title: '📝 Games due for review',
    body: `${gameNames.slice(0, 3).join(', ')} need practice to maintain your skills.`,
    scheduledFor: inOneHour,
    fired: false,
  });
  saveSchedules(schedules);
}

export function processScheduledNotifications() {
  const schedules = getSchedules();
  const now = Date.now();
  let changed = false;

  for (const s of schedules) {
    if (!s.fired && s.scheduledFor <= now) {
      showNotification(s.title, s.body);
      s.fired = true;
      changed = true;
    }
  }

  if (changed) {
    // Prune old fired notifications
    saveSchedules(schedules.filter(s => !s.fired || s.scheduledFor > now - 86400000));
  }
}

function getSchedules(): ScheduledNotif[] {
  try {
    return JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSchedules(s: ScheduledNotif[]) {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(s));
}

// Auto-process on visibility change
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      processScheduledNotifications();
    }
  });
}
