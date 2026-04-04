import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { startGame, endGame, updateScore, nextLevel, updateTime } from '../store/slices/gameSlice';
import type { RootState } from '../store/store';
import type { GameType } from '../store/slices/gameSlice';
import MemoryGame from '../games/MemoryGame';
import SpeedGame from '../games/SpeedGame';
import AttentionGame from '../games/AttentionGame';
import LogicGame from '../games/LogicGame';
import MathGame from '../games/MathGame';

const GameContainer = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  min-height: 80vh;
  display: flex;
  flex-direction: column;
`;

const GameHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  
  .game-info {
    h2 {
      font-size: 24px;
      color: #ffd700;
      margin-bottom: 5px;
    }
    
    .level {
      color: #a0a0a0;
    }
  }
  
  .stats {
    display: flex;
    gap: 30px;
    
    .stat {
      text-align: center;
      
      .value {
        font-size: 28px;
        font-weight: 700;
        color: #ff6b35;
      }
      
      .label {
        font-size: 12px;
        color: #a0a0a0;
      }
    }
  }
`;

const Timer = styled.div<{ $urgent?: boolean }>`
  font-size: 32px;
  font-weight: 700;
  color: ${props => props.$urgent ? '#f87171' : '#ffd700'};
  animation: ${props => props.$urgent ? 'pulse 0.5s infinite' : 'none'};
`;

const GameArea = styled.div`
  flex: 1;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 24px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const StartScreen = styled(motion.div)`
  text-align: center;
  
  .icon {
    font-size: 80px;
    margin-bottom: 20px;
  }
  
  h2 {
    font-size: 32px;
    margin-bottom: 15px;
  }
  
  p {
    color: #a0a0a0;
    margin-bottom: 30px;
    max-width: 400px;
  }
`;

const Button = styled.button`
  padding: 16px 40px;
  border-radius: 30px;
  border: none;
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  color: white;
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.3s;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 10px 30px rgba(255, 107, 53, 0.4);
  }
`;

const gameComponents: Record<GameType, React.FC<{ onComplete: (points: number) => void }>> = {
  memory: MemoryGame,
  speed: SpeedGame,
  attention: AttentionGame,
  logic: LogicGame,
  math: MathGame,
};

const GamePlay = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const dispatch = useDispatch();
  const { score, level, timeRemaining, isPlaying } = useSelector(
    (state: RootState) => state.game as { currentGame: GameType | null; score: number; level: number; timeRemaining: number; isPlaying: boolean }
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
    return <div>اللعبة غير موجودة</div>;
  }
  
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
                {game === 'speed' && '⚡'}
                {game === 'attention' && '🎯'}
                {game === 'logic' && '🧩'}
                {game === 'math' && '🔢'}
              </div>
              <h2>
                {game === 'memory' && 'لعبة الذاكرة'}
                {game === 'speed' && 'لعبة السرعة'}
                {game === 'attention' && 'لعبة التركيز'}
                {game === 'logic' && 'لعبة المنطق'}
                {game === 'math' && 'لعبة الحساب'}
              </h2>
              <p>
                {game === 'memory' && 'تذكر الأنماط وكررها بالترتيب الصحيح'}
                {game === 'speed' && 'اضغط بأسرع ما يمكن عند ظهور الإشارة'}
                {game === 'attention' && 'ركز واعثر على الاختلافات'}
                {game === 'logic' && 'حل الألغاز المنطقية'}
                {game === 'math' && 'أجب على مسائل الحساب بسرعة'}
              </p>
              <Button onClick={handleStart}>ابدأ اللعب</Button>
            </StartScreen>
          </GameArea>
        ) : (
          <>
            <GameHeader>
              <div className="game-info">
                <h2>
                  {game === 'memory' && 'الذاكرة'}
                  {game === 'speed' && 'السرعة'}
                  {game === 'attention' && 'التركيز'}
                  {game === 'logic' && 'المنطق'}
                  {game === 'math' && 'الحساب'}
                </h2>
                <div className="level">المستوى {level}</div>
              </div>
              
              <div className="stats">
                <div className="stat">
                  <div className="value">{score}</div>
                  <div className="label">النقاط</div>
                </div>
                <div className="stat">
                  <Timer $urgent={timeRemaining <= 10}>{timeRemaining}s</Timer>
                  <div className="label">الوقت</div>
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
