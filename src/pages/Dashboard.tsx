import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { RootState } from '../store/store';

const DashboardContainer = styled.div`
  padding: 1rem 0;
`;

const WelcomeSection = styled.div`
  margin-bottom: 2rem;
  
  h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    
    span {
      color: #a5b4fc;
    }
  }
  
  p {
    color: rgba(255, 255, 255, 0.7);
  }
`;

const DailyGoal = styled(motion.div)`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  h3 {
    font-size: 1.1rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const ProgressBar = styled.div`
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.75rem;
  
  .fill {
    height: 100%;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    border-radius: 6px;
    transition: width 0.5s ease;
  }
`;

const ProgressText = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2.5rem;
`;

const StatCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  .icon {
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
  }
  
  .value {
    font-size: 2rem;
    font-weight: 700;
    color: white;
    margin-bottom: 0.25rem;
  }
  
  .label {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
  }
`;

const Section = styled.div`
  margin-bottom: 2.5rem;
  
  h2 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const GamesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
`;

const GameCard = styled(Link)<{ $color: string }>`
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid ${props => props.$color};
  border-radius: 16px;
  padding: 1.5rem;
  text-decoration: none;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }
  
  .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  .name {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  
  .score {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.6);
  }
`;

const Dashboard = () => {
  const { profile, dailyProgress } = useSelector((state: RootState) => state.user as {
    profile: { name: string; level: number; xp: number; streak: number; totalGamesPlayed: number; cognitiveProfile: { memory: number; language: number; focus: number; math: number; logic: number } };
    dailyProgress: { gamesCompleted: number; targetGames: number };
  });
  const { games } = useSelector((state: RootState) => state.game as { games: { id: string; color: string; icon: string; name: string; highScore: number }[] });

  const progressPercent = (dailyProgress.gamesCompleted / dailyProgress.targetGames) * 100;

  return (
    <DashboardContainer>
      <WelcomeSection>
        <h1>Welcome back, <span>{profile.name}</span>! 👋</h1>
        <p>Ready to train your brain today?</p>
      </WelcomeSection>

      <DailyGoal
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h3>🎯 Daily Goal</h3>
        <ProgressBar>
          <div className="fill" style={{ width: `${Math.min(progressPercent, 100)}%` }} />
        </ProgressBar>
        <ProgressText>
          <span>{dailyProgress.gamesCompleted} / {dailyProgress.targetGames} games</span>
          <span>{Math.round(progressPercent)}%</span>
        </ProgressText>
      </DailyGoal>

      <StatsGrid>
        <StatCard whileHover={{ scale: 1.02 }}>
          <div className="icon">⭐</div>
          <div className="value">{profile.level}</div>
          <div className="label">Level</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <div className="icon">🔥</div>
          <div className="value">{profile.streak}</div>
          <div className="label">Day Streak</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <div className="icon">🧠</div>
          <div className="value">{profile.totalGamesPlayed}</div>
          <div className="label">Games Played</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <div className="icon">💎</div>
          <div className="value">{profile.xp}</div>
          <div className="label">XP Points</div>
        </StatCard>
      </StatsGrid>

      <Section>
        <h2>🎮 Your Games</h2>
        <GamesGrid>
          {games.slice(0, 4).map((game) => (
            <GameCard key={game.id} to={`/game/${game.id}`} $color={game.color}>
              <div className="icon">{game.icon}</div>
              <div className="name">{game.name}</div>
              <div className="score">Best: {game.highScore}</div>
            </GameCard>
          ))}
        </GamesGrid>
      </Section>
    </DashboardContainer>
  );
};

export default Dashboard;
