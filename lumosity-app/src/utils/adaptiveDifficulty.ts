// Mock implementation for adaptive difficulty without TensorFlow
interface GameSession {
  score: number;
  accuracy: number;
  duration: number;
  difficulty: number;
}

interface DifficultyPrediction {
  recommendedDifficulty: number;
  confidence: number;
  expectedScore: number;
}

class AdaptiveDifficultyEngine {
  private sessions: GameSession[] = [];
  private readonly maxSessions = 50;

  constructor() {
    // No initialization needed for mock
  }

  addSession(session: GameSession): void {
    this.sessions.push(session);
    if (this.sessions.length > this.maxSessions) {
      this.sessions.shift();
    }
  }

  predictDifficulty(currentAccuracy: number, _currentDuration: number, currentDifficulty: number): DifficultyPrediction {
    // Simple mock prediction based on recent performance
    const recentSessions = this.sessions.slice(-5);
    if (recentSessions.length === 0) {
      return {
        recommendedDifficulty: Math.max(1, currentDifficulty),
        confidence: 0.5,
        expectedScore: 50
      };
    }

    const avgAccuracy = recentSessions.reduce((sum, s) => sum + s.accuracy, 0) / recentSessions.length;

    let recommendedDifficulty = currentDifficulty;

    if (currentAccuracy > 80 && avgAccuracy > 75) {
      recommendedDifficulty = Math.min(10, currentDifficulty + 0.5);
    } else if (currentAccuracy < 50 || avgAccuracy < 50) {
      recommendedDifficulty = Math.max(1, currentDifficulty - 0.5);
    }

    return {
      recommendedDifficulty,
      confidence: 0.7,
      expectedScore: Math.round(currentAccuracy * 0.8)
    };
  }

  getDifficultyHistory(): GameSession[] {
    return [...this.sessions];
  }

  async recommendFromBackend(
    gameType: string,
    score: number,
    accuracy: number,
    currentDifficulty: number,
    durationSeconds = 60,
  ): Promise<DifficultyPrediction> {
    this.addSession({ score, accuracy, duration: durationSeconds, difficulty: currentDifficulty });
    try {
      const { apiService } = await import('../services/api');
      const result = await apiService.getDifficultyRecommendation(
        gameType, score, accuracy, durationSeconds, currentDifficulty,
      );
      return {
        recommendedDifficulty: result.recommended_difficulty,
        confidence: result.confidence,
        expectedScore: Math.round(score * 0.9),
      };
    } catch {
      return this.predictDifficulty(accuracy, durationSeconds, currentDifficulty);
    }
  }
}

export const adaptiveEngine = new AdaptiveDifficultyEngine();
export default AdaptiveDifficultyEngine;