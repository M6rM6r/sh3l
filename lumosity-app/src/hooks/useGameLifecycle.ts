import { useCallback, useRef } from 'react';
import { haptics } from '../utils/haptics';
import { recordGameResult, getDueGames } from '../utils/spacedRepetition';
import { measureGameLoad, recordMetric } from '../utils/perfMetrics';

interface GameLifecycleOpts {
  gameType: string;
  onComplete?: (score: number, accuracy: number, duration: number) => void;
}

export function useGameLifecycle({ gameType, onComplete }: GameLifecycleOpts) {
  const startTime = useRef(Date.now());
  const endLoad = useRef<(() => void) | null>(null);

  const onGameReady = useCallback(() => {
    endLoad.current?.();
    haptics.selection();
  }, []);

  const onGameStart = useCallback(() => {
    startTime.current = Date.now();
    endLoad.current = measureGameLoad(gameType);
    haptics.medium();
  }, [gameType]);

  const onCorrect = useCallback(() => {
    haptics.light();
  }, []);

  const onWrong = useCallback(() => {
    haptics.error();
  }, []);

  const onGameEnd = useCallback((score: number, accuracy: number) => {
    const duration = (Date.now() - startTime.current) / 1000;
    haptics.success();
    recordGameResult(gameType, score, accuracy);
    recordMetric(`game:${gameType}:score`, score);
    recordMetric(`game:${gameType}:accuracy`, accuracy);
    recordMetric(`game:${gameType}:duration`, duration);
    onComplete?.(score, accuracy, duration);
  }, [gameType, onComplete]);

  const dueGames = getDueGames();
  const isDue = dueGames.includes(gameType);

  return {
    onGameReady,
    onGameStart,
    onCorrect,
    onWrong,
    onGameEnd,
    isDue,
    dueGames,
  };
}
