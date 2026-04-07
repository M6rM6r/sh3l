// Spaced-repetition scheduling using SM-2 algorithm variant
// Tracks which games need reinforcement based on performance decay

interface ReviewItem {
  gameType: string;
  ease: number;       // 1.3–2.5 multiplier
  interval: number;   // days until next review
  lastPlayed: number; // timestamp ms
  reps: number;       // consecutive successful reps
  score: number;      // last score 0-100 normalized
}

const STORAGE_KEY = 'ygy_sr_schedule';
const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

function load(): ReviewItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function save(items: ReviewItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// quality: 0-5 (0=total failure, 3=correct with difficulty, 5=perfect)
function qualityFromScore(score: number, accuracy: number): number {
  const normalized = (score / 1000) * 0.6 + (accuracy / 100) * 0.4;
  return Math.round(Math.min(5, Math.max(0, normalized * 5)));
}

export function recordGameResult(gameType: string, score: number, accuracy: number) {
  const items = load();
  const quality = qualityFromScore(score, accuracy);
  let item = items.find(i => i.gameType === gameType);

  if (!item) {
    item = { gameType, ease: DEFAULT_EASE, interval: 1, lastPlayed: Date.now(), reps: 0, score: 0 };
    items.push(item);
  }

  item.score = score;
  item.lastPlayed = Date.now();

  if (quality < 3) {
    // Failed — reset
    item.reps = 0;
    item.interval = 1;
  } else {
    item.reps += 1;
    if (item.reps === 1) item.interval = 1;
    else if (item.reps === 2) item.interval = 3;
    else item.interval = Math.round(item.interval * item.ease);
  }

  // Update ease factor (SM-2 formula)
  item.ease = Math.max(MIN_EASE, item.ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  save(items);
}

export function getDueGames(): string[] {
  const items = load();
  const now = Date.now();
  return items
    .filter(item => {
      const dueAt = item.lastPlayed + item.interval * 86400000;
      return now >= dueAt;
    })
    .sort((a, b) => a.lastPlayed - b.lastPlayed)
    .map(i => i.gameType);
}

export function getSchedule(): ReviewItem[] {
  return load().sort((a, b) => {
    const aDue = a.lastPlayed + a.interval * 86400000;
    const bDue = b.lastPlayed + b.interval * 86400000;
    return aDue - bDue;
  });
}

export function getWeaknessGames(topN = 3): string[] {
  return load()
    .filter(i => i.reps > 0)
    .sort((a, b) => a.ease - b.ease)
    .slice(0, topN)
    .map(i => i.gameType);
}
