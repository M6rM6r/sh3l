import { useEffect, useCallback, useRef } from 'react';
import { getDueGames } from '../utils/spacedRepetition';
import {
  requestNotificationPermission,
  scheduleStreakReminder,
  scheduleDueReviewReminder,
  processScheduledNotifications,
} from '../utils/notifications';

const LAST_VISIT_KEY = 'ygy_last_visit';
const ENGAGEMENT_KEY = 'ygy_engagement';

interface EngagementState {
  totalVisits: number;
  daysActive: number;
  lastVisit: string;
  comebackAfterDays: number;
}

function getEngagement(): EngagementState {
  try {
    return JSON.parse(localStorage.getItem(ENGAGEMENT_KEY) || 'null') ?? {
      totalVisits: 0,
      daysActive: 0,
      lastVisit: '',
      comebackAfterDays: 0,
    };
  } catch {
    return { totalVisits: 0, daysActive: 0, lastVisit: '', comebackAfterDays: 0 };
  }
}

export function useEngagement() {
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const eng = getEngagement();
    const today = new Date().toISOString().slice(0, 10);
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY) || '';

    // Calculate days since last visit
    let daysSinceLastVisit = 0;
    if (lastVisit) {
      daysSinceLastVisit = Math.floor(
        (Date.now() - new Date(lastVisit).getTime()) / 86400000
      );
    }

    // Update engagement state
    eng.totalVisits++;
    if (eng.lastVisit !== today) {
      eng.daysActive++;
    }
    eng.lastVisit = today;
    eng.comebackAfterDays = daysSinceLastVisit;

    localStorage.setItem(ENGAGEMENT_KEY, JSON.stringify(eng));
    localStorage.setItem(LAST_VISIT_KEY, today);

    // Schedule notifications
    const dueGames = getDueGames();
    if (dueGames.length > 0) {
      scheduleDueReviewReminder(dueGames);
    }
    scheduleStreakReminder();
    processScheduledNotifications();

    // Request notification permission after 3rd visit
    if (eng.totalVisits >= 3) {
      requestNotificationPermission();
    }
  }, []);

  const getInsights = useCallback(() => {
    const eng = getEngagement();
    const dueGames = getDueGames();
    return {
      ...eng,
      dueGames,
      isComeback: eng.comebackAfterDays >= 3,
      shouldPromptNotifications: eng.totalVisits >= 3 && Notification?.permission === 'default',
    };
  }, []);

  return { getInsights };
}
