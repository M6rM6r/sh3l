import { useState, useEffect, useCallback } from 'react';
import { apiBaseUrl } from '../config/env';

const API_URL = apiBaseUrl || 'http://localhost:8000';

interface AdaptiveState {
  difficulty: number;   // 1–10
  confidence: number;   // 0–1
  loading: boolean;
}

interface UseAdaptiveDifficultyReturn {
  difficulty: number;
  confidence: number;
  loading: boolean;
  reportResult: (score: number, accuracy: number) => Promise<void>;
}

/**
 * Fetches a recommended difficulty from /api/difficulty/suggest/:gameType,
 * then exposes reportResult() to send feedback via /api/difficulty/adjust.
 * Falls back gracefully when unauthenticated or offline.
 */
export function useAdaptiveDifficulty(gameType: string): UseAdaptiveDifficultyReturn {
  const [state, setState] = useState<AdaptiveState>({
    difficulty: 5,
    confidence: 0,
    loading: true,
  });

  const token = localStorage.getItem('authToken');

  useEffect(() => {
    if (!token) {
      setState(s => ({ ...s, loading: false }));
      return;
    }

    let cancelled = false;

    const fetchSuggestion = async () => {
      try {
        const res = await fetch(`${API_URL}/api/difficulty/suggest/${encodeURIComponent(gameType)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        if (!cancelled) {
          setState({
            difficulty: typeof data.recommended_level === 'number' ? data.recommended_level : 5,
            confidence: typeof data.confidence === 'number' ? data.confidence : 0,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setState(s => ({ ...s, loading: false }));
        }
      }
    };

    fetchSuggestion();
    return () => { cancelled = true; };
  }, [gameType, token]);

  const reportResult = useCallback(async (score: number, accuracy: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/difficulty/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          game_type: gameType,
          score,
          accuracy,
          current_difficulty: state.difficulty,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setState({
        difficulty: typeof data.recommended_level === 'number' ? data.recommended_level : state.difficulty,
        confidence: typeof data.confidence === 'number' ? data.confidence : state.confidence,
        loading: false,
      });
    } catch {
      // silently ignore — non-critical
    }
  }, [gameType, token, state.difficulty, state.confidence]);

  return {
    difficulty: state.difficulty,
    confidence: state.confidence,
    loading: state.loading,
    reportResult,
  };
}
