import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { GameType, OldGameType, NewGameType } from '../types';
import type { RootState } from '../store/store';

// ── Original games (old-style props) ─────────────────────────────────────────
import MemoryMatrix from './games/MemoryMatrix';
import SpeedMatch from './games/SpeedMatch';
import TrainOfThought from './games/TrainOfThought';
import ColorMatch from './games/ColorMatch';
import PatternRecall from './games/PatternRecall';
import ChalkboardChallenge from './games/ChalkboardChallenge';
import FishFoodFrenzy from './games/FishFoodFrenzy';
import WordBubble from './games/WordBubble';
import LostInMigration from './games/LostInMigration';
import RotationRecall from './games/RotationRecall';
import MemoryGame from './games/MemoryGame';

// ── New games (new-style props: onComplete(score,level,duration) + onBack) ───
import { BubbleSort } from './games/BubbleSort';
import { CodeBreaker } from './games/CodeBreaker';
import { ColorHarmony } from './games/ColorHarmony';
import { LogicGrid } from './games/LogicGrid';
import { MathMarathon } from './games/MathMarathon';
import { MazeRunner } from './games/MazeRunner';
import { MemoryMatch } from './games/MemoryMatch';
import { NumberSequence } from './games/NumberSequence';
import { PatternRecognition } from './games/PatternRecognition';
import { PipeConnection } from './games/PipeConnection';
import { QuickReflexes } from './games/QuickReflexes';
import { RhythmBlocks } from './games/RhythmBlocks';
import { ShapeShifter } from './games/ShapeShifter';
import { TowerOfHanoi } from './games/TowerOfHanoi';
import { Chess } from './games/Chess';

// ── Voice games (voice-style props: onComplete(points) only) ─────────────────
import VoiceCommandGame from '../games/VoiceCommandGame';
import VoiceMathGame from '../games/VoiceMathGame';
import VoiceMemoryGame from '../games/VoiceMemoryGame';
import VoiceSpellingGame from '../games/VoiceSpellingGame';

import { upsertLeaderboardScore } from '../services/supabase';

import TutorialOverlay from './TutorialOverlay';
import PauseOverlay from './PauseOverlay';
import { hasSeenTutorial, markTutorialSeen } from '../utils/storage';
import { audioManager } from '../utils/audio';
import { apiService } from '../services/api';
import { adaptiveEngine } from '../utils/adaptiveDifficulty';

interface GameContainerProps {
  gameType: GameType;
  onComplete: (score: number, accuracy: number) => void;
  onExit: () => void;
}

// ── Old-style prop interface ───────────────────────────────────────────────
type OldGameProps = {
  onComplete: (score: number, accuracy: number) => void;
  isPractice?: boolean;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
};

// ── New-style prop interface ───────────────────────────────────────────────
type NewGameProps = {
  onComplete: (score: number, level: number, duration: number) => void;
  onBack: () => void;
};

const gameComponents: Partial<Record<OldGameType, React.FC<OldGameProps>>> = {
  memory: MemoryMatrix,
  speed: SpeedMatch,
  attention: TrainOfThought,
  flexibility: ColorMatch,
  problemSolving: PatternRecall,
  math: ChalkboardChallenge,
  reaction: FishFoodFrenzy,
  word: WordBubble,
  visual: LostInMigration,
  spatial: RotationRecall,
  memorySequence: MemoryGame,
};

const NEW_GAME_TYPES = new Set<NewGameType>([
  'memory_match', 'number_sequence', 'pipe_connection', 'pattern_recognition',
  'logic_grid', 'code_breaker', 'tower_of_hanoi', 'color_harmony',
  'math_marathon', 'shape_shifter', 'rhythm_blocks', 'maze_runner',
  'bubble_sort', 'quick_reflexes', 'chess',
  'voice_command', 'voice_math', 'voice_memory', 'voice_spelling',
]);

const VOICE_GAME_TYPES = new Set<NewGameType>([
  'voice_command', 'voice_math', 'voice_memory', 'voice_spelling',
]);

const isNewGameType = (gameType: GameType): gameType is NewGameType => {
  return NEW_GAME_TYPES.has(gameType as NewGameType);
};

type VoiceGameProps = { onComplete: (points: number) => void };

const voiceGameComponents: Partial<Record<NewGameType, React.FC<VoiceGameProps>>> = {
  voice_command: VoiceCommandGame as React.FC<VoiceGameProps>,
  voice_math: VoiceMathGame as React.FC<VoiceGameProps>,
  voice_memory: VoiceMemoryGame as React.FC<VoiceGameProps>,
  voice_spelling: VoiceSpellingGame as React.FC<VoiceGameProps>,
};

const newGameComponents: Partial<Record<NewGameType, React.FC<NewGameProps>>> = {
  memory_match: MemoryMatch,
  number_sequence: NumberSequence,
  pipe_connection: PipeConnection,
  pattern_recognition: PatternRecognition,
  logic_grid: LogicGrid,
  code_breaker: CodeBreaker,
  tower_of_hanoi: TowerOfHanoi,
  color_harmony: ColorHarmony,
  math_marathon: MathMarathon,
  shape_shifter: ShapeShifter,
  rhythm_blocks: RhythmBlocks,
  maze_runner: MazeRunner,
  bubble_sort: BubbleSort as unknown as React.FC<NewGameProps>,
  quick_reflexes: QuickReflexes,
  chess: Chess,
};

const GameContainer: React.FC<GameContainerProps> = ({ gameType, onComplete, onExit }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userId = useSelector((state: RootState) => state.user.id);

  const handleExit = () => {
    onExit();
    navigate(-1);
  };
  const [showTutorial, setShowTutorial] = useState(false);
  const [isPractice, setIsPractice] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentTime, setCurrentTime] = useState(60);
  const [isMuted, setIsMuted] = useState(audioManager.isAudioMuted());
  const [difficultyLevel, setDifficultyLevel] = useState(1.0);

  useEffect(() => {
    const seen = hasSeenTutorial(gameType);
    if (!seen) {
      setShowTutorial(true);
    } else {
      setGameStarted(true);
    }
  }, [gameType]);

  // Keyboard shortcuts for pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStarted && !showTutorial && (e.key === 'Escape' || e.key === ' ')) {
        e.preventDefault();
        setIsPaused(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, showTutorial]);

  const handleStartPractice = () => {
    audioManager.initAudio();
    audioManager.playGameStart();
    setIsPractice(true);
    setShowTutorial(false);
    setGameStarted(true);
  };

  const handleStartGame = () => {
    audioManager.initAudio();
    audioManager.playGameStart();
    markTutorialSeen(gameType);
    setIsPractice(false);
    setShowTutorial(false);
    setGameStarted(true);
  };

  const handleSkipTutorial = () => {
    audioManager.initAudio();
    markTutorialSeen(gameType);
    setIsPractice(false);
    setShowTutorial(false);
    setGameStarted(true);
  };

  const handleGameComplete = async (score: number, accuracy: number) => {
    if (isPractice) {
      setGameStarted(false);
      setIsPractice(false);
      setShowTutorial(true);
    } else {
      audioManager.playGameOver();

      // Save score to backend API
      try {
        // Map game type to cognitive area
        const cognitiveAreaMapping: Partial<Record<GameType, string>> = {
          memory: 'memory',
          speed: 'speed',
          attention: 'attention',
          flexibility: 'flexibility',
          problemSolving: 'problem_solving',
          math: 'problem_solving',
          reaction: 'speed',
          word: 'memory',
          visual: 'attention',
          spatial: 'problem_solving',
          memorySequence: 'memory',
        };

        const cognitiveArea = cognitiveAreaMapping[gameType] ?? 'memory';

        await apiService.recordGameSession({
          game_type: gameType,
          score: Math.round(score),
          accuracy,
          duration_seconds: 60,
          difficulty_level: Math.round(difficultyLevel),
          cognitive_area: cognitiveArea,
        });

        // Upsert score to Supabase leaderboard
        if (userId) {
          await upsertLeaderboardScore(userId, gameType, Math.round(score));
        }

        const rec = await adaptiveEngine.recommendFromBackend(
          gameType, score, accuracy, difficultyLevel,
        );
        setDifficultyLevel(Math.min(10, Math.max(1, rec.recommendedDifficulty)));

        await apiService.getRecommendations();
        // Silent success - no console output in production

      } catch (error) {
        // Silent fail - continue with game completion even if API fails
        // Error is not logged to avoid console noise in production
      }

      onComplete(score, accuracy);
    }
  };

  const handlePause = () => setIsPaused(true);
  const handleResume = () => setIsPaused(false);
  const handleQuit = () => handleExit();

  const toggleSound = () => {
    audioManager.initAudio();
    const newMuted = !isMuted;
    audioManager.setMuted(newMuted);
    setIsMuted(newMuted);
  };

  // ── Voice game: render with voice-style adapter ─────────────────────────
  if (isNewGameType(gameType) && VOICE_GAME_TYPES.has(gameType as NewGameType)) {
    const VoiceComp = voiceGameComponents[gameType as NewGameType];
    if (VoiceComp) {
      return (
        <div className="game-container game-container--voice">
          <div className="game-header">
            <button className="exit-btn" onClick={handleExit} aria-label="Exit game">← Back</button>
          </div>
          <VoiceComp
            onComplete={(points) => {
              onComplete(points, 1);
            }}
          />
        </div>
      );
    }
  }

  // ── New-style game: render directly with adapter ──────────────────────────
  if (isNewGameType(gameType)) {
    const NewComp = newGameComponents[gameType];
    if (NewComp) {
      return (
        <div className="game-container game-container--new">
          <NewComp
            onComplete={(score, _level, _duration) => {
              onComplete(score, 1);
            }}
            onBack={handleExit}
          />
        </div>
      );
    }
  }

  const GameComponent = gameComponents[gameType as OldGameType];

  return (
    <div className="game-container">
      {showTutorial && (
        <TutorialOverlay
          gameType={gameType as OldGameType}
          onStartPractice={handleStartPractice}
          onStartGame={handleStartGame}
          onSkip={handleSkipTutorial}
        />
      )}
      
      {isPaused && (
        <PauseOverlay
          onResume={handleResume}
          onQuit={handleQuit}
          score={currentScore}
          timeLeft={currentTime}
        />
      )}
      
      {gameStarted && GameComponent && (
        <>
          <div className="game-header">
            <button 
            className="exit-btn" 
            onClick={handleExit}
            aria-label={t('games.exit')}
          >✕</button>
            <h2>{t(`games.${gameType}`)}{isPractice && ` (${t('games.practice')})`}</h2>
            <div className="game-header-controls">
              <button 
                className={`sound-btn-header ${isMuted ? 'muted' : ''}`} 
                onClick={toggleSound}
                title={isMuted ? t('games.unmute') : t('games.mute')}
                aria-label={isMuted ? t('games.unmute') : t('games.mute')}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
              <button 
                className="pause-btn-header" 
                onClick={handlePause}
                aria-label={t('games.pause')}
              >⏸</button>
            </div>
          </div>
          <GameComponent 
            onComplete={handleGameComplete} 
            isPractice={isPractice}
            isPaused={isPaused}
            onScoreChange={setCurrentScore}
            onTimeChange={setCurrentTime}
          />
        </>
      )}
    </div>
  );
};

export default GameContainer;
