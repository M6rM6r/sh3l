import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const LandingContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
`;

const Logo = styled(motion.div)`
  font-size: 5rem;
  margin-bottom: 1rem;
`;

const Title = styled(motion.h1)`
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #fff 0%, #e0e7ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled(motion.p)`
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 2.5rem;
  max-width: 500px;
`;

const ButtonGroup = styled(motion.div)`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const Button = styled(Link)<{ $variant?: 'primary' | 'secondary' }>`
  padding: 1rem 2.5rem;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  background: ${props => props.$variant === 'primary' 
    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' 
    : 'rgba(255, 255, 255, 0.15)'};
  color: white;
  border: 2px solid ${props => props.$variant === 'primary' ? 'transparent' : 'rgba(255,255,255,0.3)'};
  box-shadow: ${props => props.$variant === 'primary' ? '0 4px 20px rgba(99, 102, 241, 0.4)' : 'none'};

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 30px rgba(99, 102, 241, 0.4);
  }
`;

const Features = styled(motion.div)`
  display: flex;
  gap: 2rem;
  margin-top: 4rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const Feature = styled.div`
  text-align: center;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  min-width: 120px;
  
  .icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }
  
  .label {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.8);
  }
`;

const Landing = () => {
  return (
    <LandingContainer>
      <Logo
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.8, type: 'spring' }}
      >
        🧠
      </Logo>
      
      <Title
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        MindPal
      </Title>
      
      <Subtitle
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        Train your brain with daily fun games. Join millions of users improving their memory, focus, and problem-solving skills!
      </Subtitle>
      
      <ButtonGroup
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.6 }}
      >
        <Button to="/auth" $variant="primary">Get Started</Button>
        <Button to="/auth" $variant="secondary">Sign In</Button>
      </ButtonGroup>
      
      <Features
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }}
      >
        <Feature>
          <div className="icon">🧩</div>
          <div className="label">Brain Games</div>
        </Feature>
        <Feature>
          <div className="icon">📊</div>
          <div className="label">Track Progress</div>
        </Feature>
        <Feature>
          <div className="icon">🏆</div>
          <div className="label">Achievements</div>
        </Feature>
      </Features>
    </LandingContainer>
  );
};

export default Landing;
