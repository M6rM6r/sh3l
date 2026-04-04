import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

const DashboardContainer = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 15px;
`;

const WelcomeText = styled.div`
  h1 {
    font-size: 28px;
    font-weight: 700;
    color: #ffd700;
    margin-bottom: 5px;
  }
  
  p {
    color: #a0a0a0;
    font-size: 16px;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  
  .icon {
    font-size: 32px;
    margin-bottom: 10px;
  }
  
  .value {
    font-size: 28px;
    font-weight: 700;
    color: #ffd700;
    margin-bottom: 5px;
  }
  
  .label {
    font-size: 14px;
    color: #a0a0a0;
  }
`;

const Section = styled.div`
  margin-bottom: 30px;
  
  h2 {
    font-size: 22px;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

const GamesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
`;

const GameCard = styled(Link)<{ $color: string }>`
  background: ${props => `${props.$color}20`};
  border: 2px solid ${props => props.$color};
  border-radius: 16px;
  padding: 20px;
  text-decoration: none;
  color: white;
  text-align: center;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }
  
  .icon {
    font-size: 40px;
    margin-bottom: 10px;
  }
  
  .name {
    font-weight: 600;
    font-size: 16px;
    margin-bottom: 5px;
  }
  
  .score {
    font-size: 12px;
    color: #a0a0a0;
  }
`;

const ProgressBar = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  height: 10px;
  overflow: hidden;
  margin-top: 10px;
  
  .fill {
    background: linear-gradient(90deg, #ff6b35, #ffd700);
    height: 100%;
    border-radius: 10px;
    transition: width 0.5s ease;
  }
`;

const DailyGoal = styled.div`
  background: rgba(255, 107, 53, 0.1);
  border: 1px solid rgba(255, 107, 53, 0.3);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 30px;
  
  h3 {
    font-size: 18px;
    color: #ff6b35;
    margin-bottom: 15px;
  }
  
  .progress-text {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    color: #a0a0a0;
    margin-top: 10px;
  }
`;

const Dashboard = () => {
  const { profile } = useSelector((state: RootState) => state.user as { profile: { name: string; level: number; xp: number; iqScore: number; currentStreak: number; totalScore: number; totalGamesPlayed: number } });
  const { games, dailyProgress } = useSelector((state: RootState) => state.game as { games: { id: string; color: string; icon: string; name: string; highScore: number }[]; dailyProgress: { gamesPlayed: number; targetGames: number } });

  const progressPercent = (dailyProgress.gamesPlayed / dailyProgress.targetGames) * 100;

  return (
    <DashboardContainer>
      <Header>
        <WelcomeText>
          <h1>أهلاً، {profile.name || 'مستخدم'}! 👋</h1>
          <p>مستوى {profile.level} • {profile.xp} نقطة خبرة</p>
        </WelcomeText>
      </Header>

      <DailyGoal>
        <h3>🎯 الهدف اليومي</h3>
        <ProgressBar>
          <div className="fill" style={{ width: `${Math.min(progressPercent, 100)}%` }} />
        </ProgressBar>
        <div className="progress-text">
          <span>{dailyProgress.gamesPlayed} / {dailyProgress.targetGames} ألعاب</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
      </DailyGoal>

      <StatsGrid>
        <StatCard whileHover={{ scale: 1.05 }}>
          <div className="icon">🧠</div>
          <div className="value">{profile.iqScore}</div>
          <div className="label">معدل الذكاء</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.05 }}>
          <div className="icon">🔥</div>
          <div className="value">{profile.currentStreak}</div>
          <div className="label">الأيام المتتالية</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.05 }}>
          <div className="icon">⭐</div>
          <div className="value">{profile.totalScore.toLocaleString()}</div>
          <div className="label">مجموع النقاط</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.05 }}>
          <div className="icon">🎮</div>
          <div className="value">{profile.totalGamesPlayed}</div>
          <div className="label">ألعاب منفذة</div>
        </StatCard>
      </StatsGrid>

      <Section>
        <h2>🎮 الألعاب</h2>
        <GamesGrid>
          {games.map((game: { id: string; color: string; icon: string; name: string; highScore: number }) => (
            <GameCard key={game.id} to={`/game/${game.id}`} $color={game.color}>
              <div className="icon">{game.icon}</div>
              <div className="name">{game.name}</div>
              <div className="score">أفضل: {game.highScore}</div>
            </GameCard>
          ))}
        </GamesGrid>
      </Section>
    </DashboardContainer>
  );
};

export default Dashboard;
