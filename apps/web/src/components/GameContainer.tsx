import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameType } from '../types';
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
import TutorialOverlay from './TutorialOverlay';
import PauseOverlay from './PauseOverlay';
import { hasSeenTutorial, markTutorialSeen } from '../utils/storage';
import { audioManager } from '../utils/audio';
import { apiService } from '../services/api';

interface GameContainerProps {
  gameType: GameType;
  onComplete: (score: number, accuracy: number) => void;
  onExit: () => void;
}

const gameComponents: Record<GameType, React.FC<{
  onComplete: (score: number, accuracy: number) => void;
  isPractice?: boolean;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}>> = {
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
  memorySequence: MemoryGame
};

const GameContainer: React.FC<GameContainerProps> = ({ gameType, onComplete, onExit }) => {
  const { t } = useTranslation();
  const [showTutorial, setShowTutorial] = useState(false);
  const [isPractice, setIsPractice] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentTime, setCurrentTime] = useState(60);
  const [isMuted, setIsMuted] = useState(audioManager.isAudioMuted());

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
        const cognitiveAreaMapping: Record<GameType, string> = {
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
          difficulty_level: 1,
          cognitive_area: cognitiveArea,
        });

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
  const handleQuit = () => onExit();

  const toggleSound = () => {
    audioManager.initAudio();
    const newMuted = !isMuted;
    audioManager.setMuted(newMuted);
    setIsMuted(newMuted);
  };

  const GameComponent = gameComponents[gameType];

  return (
    <div className="game-container">
      {showTutorial && (
        <TutorialOverlay
          gameType={gameType}
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
      
      {gameStarted && (
        <>
          <div className="game-header">
            <button 
            className="exit-btn" 
            onClick={onExit}
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


