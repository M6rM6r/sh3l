// Haptic feedback for mobile — uses Vibration API with graceful fallback
const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

export const haptics = {
  light: () => canVibrate && navigator.vibrate(10),
  medium: () => canVibrate && navigator.vibrate(25),
  heavy: () => canVibrate && navigator.vibrate(50),
  success: () => canVibrate && navigator.vibrate([15, 50, 15]),
  error: () => canVibrate && navigator.vibrate([50, 30, 50, 30, 50]),
  selection: () => canVibrate && navigator.vibrate(5),
  doubleClick: () => canVibrate && navigator.vibrate([10, 40, 10]),
  warning: () => canVibrate && navigator.vibrate([30, 50, 30]),
  streak: (count: number) => {
    if (!canVibrate) return;
    const pattern = Array.from({ length: Math.min(count, 5) }, () => [12, 30]).flat();
    navigator.vibrate(pattern);
  },
} as const;
