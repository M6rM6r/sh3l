import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { audioManager } from '../utils/audio';

const GameContainer = styled.div`
  width: 100%;
  max-width: 100%;
  padding: 0 16px;
`;

const GameArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(20px, 5vw, 30px);
`;

const Target = styled.div<{ $active: boolean }>`
  width: clamp(120px, 40vw, 150px);
  height: clamp(120px, 40vw, 150px);
  border-radius: 50%;
  background: ${(props: { $active: boolean }) => 
    props.$active 
      ? 'linear-gradient(135deg, #2ecc71, #27ae60)' 
      : 'rgba(255, 255, 255, 0.1)'};
  cursor: ${(props: { $active: boolean }) => props.$active ? 'pointer' : 'default'};
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(36px, 10vw, 48px);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  box-shadow: ${(props: { $active: boolean }) => 
    props.$active 
      ? '0 0 30px rgba(46, 204, 113, 0.5), 0 0 60px rgba(46, 204, 113, 0.3)' 
      : 'none'};
  
  &:active {
    transform: ${(props: { $active: boolean }) => props.$active ? 'scale(0.92)' : 'none'};
  }
`;

const Status = styled.div`
  text-align: center;
  font-size: clamp(20px, 6vw, 24px);
  color: #ffd700;
  font-weight: 600;
  min-height: 32px;
`;

const ReactionTime = styled.div`
  font-size: clamp(16px, 4vw, 18px);
  color: #a0a0a0;
  text-align: center;
  
  .time {
    font-size: clamp(28px, 8vw, 32px);
    font-weight: 700;
    color: #ff6b35;
  }
  
  .round-info {
    margin-top: 8px;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
  }
`;

const Instructions = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  max-width: 300px;
  line-height: 1.4;
`;

interface SpeedGameProps {
  onComplete: (points: number) => void;
}

const SpeedGame = ({ onComplete }: SpeedGameProps) => {
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [reactionTime, setReactionTime] = useState(0);
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [waiting, setWaiting] = useState(false);
  
  const startRound = useCallback(() => {
    setIsActive(false);
    setWaiting(true);
    const delay = 1000 + Math.random() * 3000;
    
    audioManager.playCardSelect();
    
    const timer = setTimeout(() => {
      setIsActive(true);
      setStartTime(Date.now());
      setWaiting(false);
      audioManager.playCorrect();
      // Haptic pulse when target appears
      if (navigator.vibrate) {
        navigator.vibrate([50, 100, 50]);
      }
    }, delay);
    
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    const cleanup = startRound();
    return cleanup;
  }, [startRound, round]);
  
  const handleClick = () => {
    if (!isActive) {
      // Clicked too early
      setReactionTime(0);
      audioManager.playWrong();
      if (navigator.vibrate) navigator.vibrate(100);
      setRound(round + 1);
      return;
    }
    
    const time = Date.now() - startTime;
    setReactionTime(time);
    setIsActive(false);
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
    
    const points = Math.max(0, 1000 - time);
    const newTotal = totalScore + points;
    setTotalScore(newTotal);
    
    if (round >= 5) {
      audioManager.playGameOver();
      onComplete(newTotal);
    } else {
      setTimeout(() => setRound(round + 1), 1000);
    }
  };
  
  const getStatusText = () => {
    if (waiting) return 'Get Ready...';
    if (isActive) return 'Tap Now!';
    return 'Wait for green';
  };

  return (
    <GameContainer>
      <GameArea>
        <Status>{getStatusText()}</Status>
        
        <Target 
          $active={isActive} 
          onClick={handleClick}
          role="button"
          aria-label={isActive ? 'Tap now!' : 'Wait for signal'}
        >
          {isActive ? '⚡' : '⏳'}
        </Target>
        
        <ReactionTime>
          <div>Time: <span className="time">{reactionTime > 0 ? `${reactionTime}ms` : '-'}</span></div>
          <div className="round-info">Round {round} / 5 | Score: {totalScore}</div>
        </ReactionTime>
        
        <Instructions>
          Wait for the circle to turn green, then tap as fast as you can!
        </Instructions>
      </GameArea>
    </GameContainer>
  );
};

export default SpeedGame;


