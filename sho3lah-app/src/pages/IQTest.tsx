import styled from 'styled-components';
import { motion } from 'framer-motion';

const Container = styled.div`
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 32px;
  color: #ffd700;
  margin-bottom: 30px;
`;

const IQCircle = styled(motion.div)`
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b35, #ffd700);
  margin: 0 auto 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20px 60px rgba(255, 107, 53, 0.4);
  
  .score {
    font-size: 48px;
    font-weight: 800;
    color: white;
  }
  
  .label {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.9);
  }
`;

const Description = styled.p`
  font-size: 18px;
  color: #a0a0a0;
  margin-bottom: 30px;
  line-height: 1.6;
`;

const Button = styled.button`
  padding: 16px 40px;
  border-radius: 30px;
  border: none;
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  color: white;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.3s;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 30px rgba(255, 107, 53, 0.4);
  }
`;

const Features = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-top: 40px;
`;

const Feature = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  
  .icon {
    font-size: 32px;
    margin-bottom: 10px;
  }
  
  .label {
    font-size: 14px;
    color: #a0a0a0;
  }
`;

const IQTest = () => {
  return (
    <Container>
      <Title>اختبار معدل الذكاء</Title>
      
      <IQCircle
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <span className="score">120</span>
        <span className="label">IQ</span>
      </IQCircle>
      
      <Description>
        اكتشف معدل ذكائك من خلال سلسلة من الاختبارات العلمية المصممة لتقييم قدراتك المعرفية
      </Description>
      
      <Button>ابدأ الاختبار</Button>
      
      <Features>
        <Feature>
          <div className="icon">🧠</div>
          <div className="label">الذاكرة</div>
        </Feature>
        <Feature>
          <div className="icon">⚡</div>
          <div className="label">السرعة</div>
        </Feature>
        <Feature>
          <div className="icon">🎯</div>
          <div className="label">التركيز</div>
        </Feature>
        <Feature>
          <div className="icon">🧩</div>
          <div className="label">المنطق</div>
        </Feature>
      </Features>
    </Container>
  );
};

export default IQTest;
