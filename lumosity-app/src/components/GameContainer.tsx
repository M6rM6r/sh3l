import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { GameType, OldGameType, NewGameType, VoiceGameType, SimpleGameType, AdvancedGameType } from '../types';
import type { RootState } from '../store/store';

const GameResultScreen = lazy(() => import('./GameResultScreen'));

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
import DualNBack from './games/DualNBack';
import MapNavigator from './games/MapNavigator';
import MentalRotation3D from './games/MentalRotation3D';
import PerspectiveShift from './games/PerspectiveShift';
import StroopChallenge from './games/StroopChallenge';
import TaskSwitcher from './games/TaskSwitcher';
import TowerPlanner from './games/TowerPlanner';
import LogicGridPuzzle from './games/LogicGridPuzzle';
import ChessTactics from './games/ChessTactics';
import PatternSequence from './games/PatternSequence';
import ResourceManagement from './games/ResourceManagement';
import DeductionChain from './games/DeductionChain';
import CipherBreaker from './games/CipherBreaker';
import Sudoku from './games/Sudoku';
import SyllogismEngine from './games/SyllogismEngine';
import SystemsCascade from './games/SystemsCascade';
import BinaryMatrix from './games/BinaryMatrix';
import GraphPathfinder from './games/GraphPathfinder';
import Cryptogram from './games/Cryptogram';
import StrategicConquest from './games/StrategicConquest';

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
import VoiceCommandGame from './games/VoiceCommandGame';
import VoiceMathGame from './games/VoiceMathGame';
import VoiceMemoryGame from './games/VoiceMemoryGame';
import VoiceSpellingGame from './games/VoiceSpellingGame';

// ── Imported games (voice-style props) ────────────────────────────────────────
import FocusGrid from './games/FocusGrid';
import WordUnscramble from './games/WordUnscramble';
import SlidingPuzzle from './games/SlidingPuzzle';
import AttentionGrid from './games/AttentionGrid';
import SpeedReaction from './games/SpeedReaction';
import MathBlitz from './games/MathBlitz';

import { upsertLeaderboardScore } from '../services/supabase';

import TutorialOverlay from './TutorialOverlay';
import PauseOverlay from './PauseOverlay';
import { hasSeenTutorial, markTutorialSeen } from '../utils/storage';
import { audioManager } from '../utils/audio';
import { apiService } from '../services/api';
import { adaptiveEngine } from '../utils/adaptiveDifficulty';
import { useGameLifecycle } from '../hooks/useGameLifecycle';

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

// ── Voice/Simple game prop interface ───────────────────────────────────────
type VoiceGameProps = { onComplete: (points: number) => void };

// ── Advanced game prop interface (score + accuracy, no extras) ─────────────
type AdvancedGameProps = { onComplete: (score: number, accuracy: number) => void };

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

const voiceGameComponents: Partial<Record<VoiceGameType | SimpleGameType, React.FC<VoiceGameProps>>> = {
  voice_command: VoiceCommandGame as React.FC<VoiceGameProps>,
  voice_math: VoiceMathGame as React.FC<VoiceGameProps>,
  voice_memory: VoiceMemoryGame as React.FC<VoiceGameProps>,
  voice_spelling: VoiceSpellingGame as React.FC<VoiceGameProps>,
  focus_grid: FocusGrid as React.FC<VoiceGameProps>,
  word_unscramble: WordUnscramble as React.FC<VoiceGameProps>,
  sliding_puzzle: SlidingPuzzle as React.FC<VoiceGameProps>,
  attention_grid: AttentionGrid as React.FC<VoiceGameProps>,
  speed_reaction: SpeedReaction as React.FC<VoiceGameProps>,
  math_blitz: MathBlitz as React.FC<VoiceGameProps>,
};

const advancedGameComponents: Partial<Record<AdvancedGameType, React.FC<AdvancedGameProps>>> = {
  dual_n_back: DualNBack,
  map_navigator: MapNavigator,
  mental_rotation_3d: MentalRotation3D,
  perspective_shift: PerspectiveShift,
  stroop_challenge: StroopChallenge,
  task_switcher: TaskSwitcher,
  tower_planner: TowerPlanner,
  logic_grid_puzzle: LogicGridPuzzle,
  chess_tactics: ChessTactics,
  pattern_sequence: PatternSequence,
  resource_management: ResourceManagement,
  deduction_chain: DeductionChain,
  cipher_breaker: CipherBreaker,
  sudoku: Sudoku,
  syllogism_engine: SyllogismEngine,
  systems_cascade: SystemsCascade,
  binary_matrix: BinaryMatrix,
  graph_pathfinder: GraphPathfinder,
  cryptogram: Cryptogram,
  strategic_conquest: StrategicConquest,
};

const NEW_GAME_TYPES = new Set<NewGameType>([
  'memory_match', 'number_sequence', 'pipe_connection', 'pattern_recognition',
  'logic_grid', 'code_breaker', 'tower_of_hanoi', 'color_harmony',
  'math_marathon', 'shape_shifter', 'rhythm_blocks', 'maze_runner',
  'bubble_sort', 'quick_reflexes', 'chess',
]);

const VOICE_GAME_TYPES = new Set<VoiceGameType | SimpleGameType>([
  'voice_command', 'voice_math', 'voice_memory', 'voice_spelling',
  'focus_grid', 'word_unscramble', 'sliding_puzzle', 'attention_grid', 'speed_reaction', 'math_blitz',
]);

const ADVANCED_GAME_TYPES = new Set<AdvancedGameType>([
  'dual_n_back', 'map_navigator', 'mental_rotation_3d', 'perspective_shift',
  'stroop_challenge', 'task_switcher', 'tower_planner',
  'logic_grid_puzzle', 'chess_tactics', 'pattern_sequence', 'resource_management', 'deduction_chain',
  'cipher_breaker', 'sudoku', 'syllogism_engine', 'systems_cascade',
  'binary_matrix', 'graph_pathfinder', 'cryptogram', 'strategic_conquest',
]);

const isNewGameType = (gameType: string): gameType is NewGameType =>
  NEW_GAME_TYPES.has(gameType as NewGameType);

const isVoiceGameType = (gameType: string): gameType is VoiceGameType | SimpleGameType =>
  VOICE_GAME_TYPES.has(gameType as VoiceGameType | SimpleGameType);

const isAdvancedGameType = (gameType: string): gameType is AdvancedGameType =>
  ADVANCED_GAME_TYPES.has(gameType as AdvancedGameType);

const GameContainer: React.FC<GameContainerProps> = ({ gameType, onComplete, onExit }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userId = useSelector((state: RootState) => state.user.id);

  const lifecycle = useGameLifecycle({
    gameType,
    onComplete: (score, accuracy) => onComplete(score, accuracy),
  });

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
  const [gameResult, setGameResult] = useState<{ score: number; accuracy: number } | null>(null);

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
    lifecycle.onGameStart();
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
          dual_n_back: 'executive',
          map_navigator: 'spatial',
          mental_rotation_3d: 'spatial',
          perspective_shift: 'spatial',
          stroop_challenge: 'executive',
          task_switcher: 'executive',
          tower_planner: 'executive',
          logic_grid_puzzle: 'logic',
          chess_tactics: 'strategy',
          pattern_sequence: 'abstract',
          resource_management: 'strategy',
          deduction_chain: 'logic',
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

      setGameResult({ score: Math.round(score), accuracy });
    }
    lifecycle.onGameEnd(score, accuracy);
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

  // ── Game Result Screen ────────────────────────────────────────────────────
  if (gameResult) {
    const personalBest = Number(localStorage.getItem(`ygy-best-${gameType}`) || '0');
    if (gameResult.score > personalBest) {
      localStorage.setItem(`ygy-best-${gameType}`, String(gameResult.score));
    }

    const gameName = gameType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
      <Suspense fallback={null}>
        <GameResultScreen
          score={gameResult.score}
          accuracy={gameResult.accuracy}
          gameName={gameName}
          personalBest={personalBest}
          onPlayAgain={() => {
            setGameResult(null);
            setGameStarted(true);
          }}
          onExit={() => {
            onComplete(gameResult.score, gameResult.accuracy);
          }}
        />
      </Suspense>
    );
  }

  // ── Advanced game: render with score+accuracy adapter ─────────────────────
  if (isAdvancedGameType(gameType)) {
    const AdvComp = advancedGameComponents[gameType];
    if (AdvComp) {
      return (
        <div className="game-container game-container--voice">
          <div className="game-header">
            <button className="exit-btn" onClick={handleExit} aria-label="Exit game">← Back</button>
          </div>
          <AdvComp
            onComplete={(score, accuracy) => {
              handleGameComplete(score, accuracy);
            }}
          />
        </div>
      );
    }
  }

  // ── Voice/Simple game: render with voice-style adapter ──────────────────
  if (isVoiceGameType(gameType)) {
    const VoiceComp = voiceGameComponents[gameType];
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


