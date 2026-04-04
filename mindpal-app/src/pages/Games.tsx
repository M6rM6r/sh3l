import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import type { GameType } from '../store/slices/gameSlice';

const GamesContainer = styled.div`
  padding: 1rem 0;
`;

const Header = styled.div`
  margin-bottom: 2rem;
  
  h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }
  
  p {
    color: rgba(255, 255, 255, 0.7);
  }
`;

const CategoryFilter = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  
  button {
    padding: 0.6rem 1.25rem;
    border-radius: 50px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.05);
    color: white;
    cursor: pointer;
    font-size: 0.95rem;
    transition: all 0.3s;
    
    &.active, &:hover {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-color: transparent;
    }
  }
`;

const GamesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
`;

const GameCard = styled(motion(Link))<{ $color: string }>`
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid ${props => props.$color};
  border-radius: 20px;
  padding: 2rem;
  text-decoration: none;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
  }
  
  .icon {
    font-size: 3.5rem;
    margin-bottom: 1rem;
  }
  
  .name {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  
  .description {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 1.5rem;
  }
  
  .stats {
    display: flex;
    gap: 1.5rem;
    margin-top: auto;
    
    .stat {
      text-align: center;
      
      .value {
        font-size: 1.25rem;
        font-weight: 700;
        color: ${props => props.$color};
      }
      
      .label {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.6);
      }
    }
  }
`;

interface Game {
  id: GameType;
  color: string;
  icon: string;
  name: string;
  description: string;
  highScore: number;
  timesPlayed: number;
}

const Games = () => {
  const { games } = useSelector((state: RootState) => state.game as { games: Game[] });

  return (
    <GamesContainer>
      <Header>
        <h1>🎮 All Games</h1>
        <p>Choose a game and start training your brain</p>
      </Header>
      
      <CategoryFilter>
        <button className="active">All</button>
        <button>Memory</button>
        <button>Language</button>
        <button>Focus</button>
        <button>Math</button>
        <button>Logic</button>
      </CategoryFilter>
      
      <GamesGrid>
        {games.map((game) => (
          <GameCard
            key={game.id}
            to={`/game/${game.id}`}
            $color={game.color}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="icon">{game.icon}</div>
            <div className="name">{game.name}</div>
            <div className="description">{game.description}</div>
            <div className="stats">
              <div className="stat">
                <div className="value">{game.highScore}</div>
                <div className="label">Best</div>
              </div>
              <div className="stat">
                <div className="value">{game.timesPlayed}</div>
                <div className="label">Played</div>
              </div>
            </div>
          </GameCard>
        ))}
      </GamesGrid>
    </GamesContainer>
  );
};

export default Games;
