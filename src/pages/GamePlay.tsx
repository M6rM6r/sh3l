import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { startGame, endGame, updateScore, nextLevel, updateTime } from '../store/slices/gameSlice';
import type { RootState } from '../store/store';
import type { GameType } from '../store/slices/gameSlice';
import MemoryGame from '../games/MemoryGame';
import LanguageGame from '../games/LanguageGame';
import FocusGame from '../games/FocusGame';
import MathGame from '../games/MathGame';
import LogicGame from '../games/LogicGame';

const GameContainer = styled.div`
  padding: 1rem 0;
  max-width: 800px;
  margin: 0 auto;
`;

const GameHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  
  .game-info {
    h2 {
      font-size: 1.5rem;
      margin-bottom: 0.25rem;
    }
    
    .level {
      color: rgba(255, 255, 255, 0.7);
    }
  }
  
  .stats {
    display: flex;
    gap: 2rem;
    
    .stat {
      text-align: center;
      
      .value {
        font-size: 1.75rem;
        font-weight: 700;
        color: #a5b4fc;
      }
      
      .label {
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.6);
      }
    }
  }
`;

const Timer = styled.div<{ $urgent?: boolean }>`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${props => props.$urgent ? '#f87171' : '#a5b4fc'};
`;

const GameArea = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  padding: 2rem;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const StartScreen = styled(motion.div)`
  text-align: center;
  
  .icon {
    font-size: 5rem;
    margin-bottom: 1.5rem;
  }
  
  h2 {
    font-size: 2rem;
    margin-bottom: 1rem;
  }
  
  p {
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 2rem;
    max-width: 400px;
  }
`;

const Button = styled.button`
  padding: 1rem 2.5rem;
  border-radius: 50px;
  border: none;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);
  }
`;

const gameComponents: Record<GameType, React.FC<{ onComplete: (points: number) => void }>> = {
  memory: MemoryGame,
  language: LanguageGame,
  focus: FocusGame,
  math: MathGame,
  logic: LogicGame,
};

const GamePlay = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const dispatch = useDispatch();
  const { score, level, timeRemaining, isPlaying } = useSelector(
    (state: RootState) => state.game as { score: number; level: number; timeRemaining: number; isPlaying: boolean }
  );
  
  const [gameStarted, setGameStarted] = useState(false);
  
  const game = gameId as GameType;
  const GameComponent = gameComponents[game];
  
  useEffect(() => {
    if (isPlaying && timeRemaining > 0) {
      const timer = setInterval(() => {
        dispatch(updateTime(timeRemaining - 1));
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeRemaining === 0 && isPlaying) {
      dispatch(endGame());
    }
  }, [isPlaying, timeRemaining, dispatch]);
  
  const handleStart = () => {
    setGameStarted(true);
    dispatch(startGame(game));
  };
  
  const handleGameComplete = (points: number) => {
    dispatch(updateScore(points));
    dispatch(nextLevel());
  };
  
  if (!GameComponent) {
    return <div>Game not found</div>;
  }
  
  const gameTitles: Record<GameType, string> = {
    memory: 'Memory Match',
    language: 'Word Flow',
    focus: 'Focus Zone',
    math: 'Quick Math',
    logic: 'Puzzle Master',
  };
  
  const gameDescriptions: Record<GameType, string> = {
    memory: 'Match pairs and test your memory skills',
    language: 'Build vocabulary and language skills',
    focus: 'Train your attention and concentration',
    math: 'Solve math problems as fast as you can',
    logic: 'Solve logic puzzles and patterns',
  };
  
  return (
    <GameContainer>
      <AnimatePresence mode="wait">
        {!gameStarted ? (
          <GameArea key="start">
            <StartScreen
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="icon">
                {game === 'memory' && '🧠'}
                {game === 'language' && '📝'}
                {game === 'focus' && '🎯'}
                {game === 'math' && '🔢'}
                {game === 'logic' && '🧩'}
              </div>
              <h2>{gameTitles[game]}</h2>
              <p>{gameDescriptions[game]}</p>
              <Button onClick={handleStart}>Start Game</Button>
            </StartScreen>
          </GameArea>
        ) : (
          <>
            <GameHeader>
              <div className="game-info">
                <h2>{gameTitles[game]}</h2>
                <div className="level">Level {level}</div>
              </div>
              
              <div className="stats">
                <div className="stat">
                  <div className="value">{score}</div>
                  <div className="label">Score</div>
                </div>
                <div className="stat">
                  <Timer $urgent={timeRemaining <= 10}>{timeRemaining}s</Timer>
                  <div className="label">Time</div>
                </div>
              </div>
            </GameHeader>
            
            <GameArea>
              <GameComponent onComplete={handleGameComplete} />
            </GameArea>
          </>
        )}
      </AnimatePresence>
    </GameContainer>
  );
};

export default GamePlay;
