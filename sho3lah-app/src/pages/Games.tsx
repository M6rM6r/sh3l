import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

const GamesContainer = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
  
  h1 {
    font-size: 32px;
    color: #ffd700;
    margin-bottom: 10px;
  }
  
  p {
    color: #a0a0a0;
    font-size: 18px;
  }
`;

const GamesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 25px;
`;

const GameCardLink = styled(Link)<{ color: string }>`
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid ${props => props.color};
  border-radius: 20px;
  padding: 30px;
  text-decoration: none;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.3s ease;
  height: 100%;
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
  }
  
  .icon {
    font-size: 60px;
    margin-bottom: 15px;
  }
  
  .name {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 10px;
  }
  
  .description {
    font-size: 14px;
    color: #a0a0a0;
    margin-bottom: 20px;
  }
  
  .stats {
    display: flex;
    gap: 20px;
    margin-top: auto;
    
    .stat {
      text-align: center;
      
      .value {
        font-size: 20px;
        font-weight: 700;
        color: ${props => props.color};
      }
      
      .label {
        font-size: 12px;
        color: #a0a0a0;
      }
    }
  }
`;

const GameCard = ({ game }: { game: Game }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      style={{ height: '100%' }}
    >
      <GameCardLink to={`/game/${game.id}`} color={game.color}>
        <div className="icon">{game.icon}</div>
        <div className="name">{game.name}</div>
        <div className="description">{game.description}</div>
        <div className="stats">
          <div className="stat">
            <div className="value">{game.highScore}</div>
            <div className="label">أفضل</div>
          </div>
          <div className="stat">
            <div className="value">{game.timesPlayed}</div>
            <div className="label">مرات</div>
          </div>
        </div>
      </GameCardLink>
    </motion.div>
  );
};

interface Game {
  id: string;
  color: string;
  icon: string;
  name: string;
  description: string;
  highScore: number;
  timesPlayed: number;
}

const CategoryFilter = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  flex-wrap: wrap;
  justify-content: center;
  
  button {
    padding: 10px 20px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.05);
    color: white;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.3s;
    
    &.active, &:hover {
      background: linear-gradient(135deg, #ff6b35, #f7931e);
      border-color: transparent;
    }
  }
`;

const Games = () => {
  const { games } = useSelector((state: RootState) => state.game as { games: Game[] });

  return (
    <GamesContainer>
      <Header>
        <h1>🎮 الألعاب</h1>
        <p>اختر لعبة وابدأ بتدريب عقلك</p>
      </Header>
      
      <CategoryFilter>
        <button className="active">الكل</button>
        <button>الذاكرة</button>
        <button>التركيز</button>
        <button>السرعة</button>
        <button>المنطق</button>
      </CategoryFilter>
      
      <GamesGrid>
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </GamesGrid>
    </GamesContainer>
  );
};

export default Games;
