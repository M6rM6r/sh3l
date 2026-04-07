import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

const GameArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
`;

const Target = styled.div<{ $active: boolean }>`
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: ${(props: { $active: boolean }) => 
    props.$active 
      ? 'linear-gradient(135deg, #2ecc71, #27ae60)' 
      : 'rgba(255, 255, 255, 0.1)'};
  cursor: ${(props: { $active: boolean }) => props.$active ? 'pointer' : 'default'};
  transition: all 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  
  &:active {
    transform: ${(props: { $active: boolean }) => props.$active ? 'scale(0.95)' : 'none'};
  }
`;

const Status = styled.div`
  text-align: center;
  font-size: 24px;
  color: #ffd700;
`;

const ReactionTime = styled.div`
  font-size: 18px;
  color: #a0a0a0;
  
  .time {
    font-size: 32px;
    font-weight: 700;
    color: #ff6b35;
  }
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
    
    const timer = setTimeout(() => {
      setIsActive(true);
      setStartTime(Date.now());
      setWaiting(false);
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
      setRound(round + 1);
      return;
    }
    
    const time = Date.now() - startTime;
    setReactionTime(time);
    setIsActive(false);
    
    const points = Math.max(0, 1000 - time);
    const newTotal = totalScore + points;
    setTotalScore(newTotal);
    
    if (round >= 5) {
      onComplete(newTotal);
    } else {
      setTimeout(() => setRound(round + 1), 1000);
    }
  };
  
  return (
    <GameArea>
      <Status>
        {waiting ? 'استعد...' : isActive ? 'اضغط الآن!' : 'انتظر الإشارة'}
      </Status>
      
      <Target $active={isActive} onClick={handleClick}>
        {isActive ? '⚡' : '⏳'}
      </Target>
      
      <ReactionTime>
        <div>الوقت: <span className="time">{reactionTime > 0 ? `${reactionTime}ms` : '-'}</span></div>
        <div>الجولة: {round} / 5</div>
      </ReactionTime>
    </GameArea>
  );
};

export default SpeedGame;


