import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const LandingContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  position: relative;
  overflow: hidden;
`;

const FlameContainer = styled(motion.div)`
  width: 120px;
  height: 150px;
  background: linear-gradient(to top, #ff6b35 0%, #f7931e 50%, #ffd700 100%);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  box-shadow: 0 0 60px rgba(255, 107, 53, 0.6), 0 0 100px rgba(247, 147, 30, 0.4);
  margin-bottom: 30px;
  animation: flame 1.5s ease-in-out infinite;
`;

const Title = styled(motion.h1)`
  font-size: 48px;
  font-weight: 800;
  color: #ffd700;
  margin-bottom: 10px;
  text-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
  font-family: 'Tajawal', sans-serif;
`;

const Subtitle = styled(motion.p)`
  font-size: 20px;
  color: #a0a0a0;
  margin-bottom: 40px;
  max-width: 400px;
`;

const ButtonGroup = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  max-width: 300px;
`;

const Button = styled(Link)<{ $variant?: 'primary' | 'secondary' }>`
  padding: 16px 32px;
  border-radius: 30px;
  font-size: 18px;
  font-weight: 600;
  text-decoration: none;
  text-align: center;
  transition: all 0.3s ease;
  font-family: 'Noto Sans Arabic', sans-serif;
  background: ${props => props.$variant === 'primary' ? 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)' : 'transparent'};
  color: ${props => props.$variant === 'primary' ? 'white' : '#ffd700'};
  border: ${props => props.$variant === 'primary' ? 'none' : '2px solid #ffd700'};
  box-shadow: ${props => props.$variant === 'primary' ? '0 4px 20px rgba(255, 107, 53, 0.4)' : 'none'};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.$variant === 'primary' ? '0 6px 30px rgba(255, 107, 53, 0.6)' : 'none'};
    background: ${props => props.$variant === 'primary' ? 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)' : 'rgba(255, 215, 0, 0.1)'};
  }
`;

const Features = styled(motion.div)`
  display: flex;
  gap: 30px;
  margin-top: 50px;
  flex-wrap: wrap;
  justify-content: center;
`;

const Feature = styled.div`
  text-align: center;
  
  .icon {
    font-size: 32px;
    margin-bottom: 10px;
  }
  
  .label {
    font-size: 14px;
    color: #a0a0a0;
  }
`;

const Landing = () => {
  return (
    <LandingContainer>
      <FlameContainer
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      
      <Title
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        شعلة
      </Title>
      
      <Subtitle
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        درّب عقلك يومياً بألعاب ذكاء مبنية على دراسات علمية
      </Subtitle>
      
      <ButtonGroup
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.6 }}
      >
        <Button to="/auth" $variant="primary">
          ابدأ الآن
        </Button>
        <Button to="/auth" $variant="secondary">
          تسجيل الدخول
        </Button>
      </ButtonGroup>
      
      <Features
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }}
      >
        <Feature>
          <div className="icon">🧠</div>
          <div className="label">تدريب العقل</div>
        </Feature>
        <Feature>
          <div className="icon">📊</div>
          <div className="label">تتبع التقدم</div>
        </Feature>
        <Feature>
          <div className="icon">🏆</div>
          <div className="label">المنافسة</div>
        </Feature>
      </Features>
    </LandingContainer>
  );
};

export default Landing;
