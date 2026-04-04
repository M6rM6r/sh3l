import styled from 'styled-components';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { motion } from 'framer-motion';

const ProfileContainer = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
  
  .avatar {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: linear-gradient(135deg, #ff6b35, #ffd700);
    margin: 0 auto 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    box-shadow: 0 10px 40px rgba(255, 107, 53, 0.3);
  }
  
  h1 {
    font-size: 28px;
    color: #ffd700;
    margin-bottom: 10px;
  }
  
  .email {
    color: #a0a0a0;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
`;

const StatCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 25px;
  text-align: center;
  
  .value {
    font-size: 32px;
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
  background: rgba(255, 255, 255, 0.03);
  border-radius: 20px;
  padding: 25px;
  margin-bottom: 25px;
  
  h2 {
    font-size: 20px;
    color: #ffd700;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

const CognitiveBar = styled.div`
  margin-bottom: 20px;
  
  .label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    
    span {
      font-size: 14px;
      color: #a0a0a0;
    }
    
    .value {
      color: #ffd700;
      font-weight: 600;
    }
  }
  
  .bar {
    height: 10px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 5px;
    overflow: hidden;
    
    .fill {
      height: 100%;
      background: linear-gradient(90deg, #ff6b35, #ffd700);
      border-radius: 5px;
      transition: width 0.5s ease;
    }
  }
`;

const Achievements = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
`;

const Achievement = styled.div`
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 12px;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  
  .icon {
    font-size: 24px;
  }
  
  .name {
    font-size: 14px;
    font-weight: 600;
  }
`;

const Profile = () => {
  const { profile, cognitiveProfile } = useSelector((state: RootState) => state.user as { 
    profile: { name: string; email: string; iqScore: number; totalGamesPlayed: number; totalScore: number; currentStreak: number; bestStreak: number; level: number; achievements: string[] };
    cognitiveProfile: { memory: number; speed: number; attention: number; logic: number; math: number };
  });

  return (
    <ProfileContainer>
      <Header>
        <div className="avatar">👤</div>
        <h1>{profile.name}</h1>
        <div className="email">{profile.email}</div>
      </Header>

      <StatsGrid>
        <StatCard whileHover={{ scale: 1.05 }}>
          <div className="value">{profile.iqScore}</div>
          <div className="label">معدل الذكاء</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.05 }}>
          <div className="value">{profile.level}</div>
          <div className="label">المستوى</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.05 }}>
          <div className="value">{profile.totalGamesPlayed}</div>
          <div className="label">الألعاب</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.05 }}>
          <div className="value">{profile.currentStreak}</div>
          <div className="label">الأيام المتتالية</div>
        </StatCard>
      </StatsGrid>

      <Section>
        <h2>📊 قدراتك المعرفية</h2>
        <CognitiveBar>
          <div className="label">
            <span>الذاكرة</span>
            <span className="value">{cognitiveProfile.memory}%</span>
          </div>
          <div className="bar">
            <div className="fill" style={{ width: `${cognitiveProfile.memory}%` }} />
          </div>
        </CognitiveBar>
        <CognitiveBar>
          <div className="label">
            <span>السرعة</span>
            <span className="value">{cognitiveProfile.speed}%</span>
          </div>
          <div className="bar">
            <div className="fill" style={{ width: `${cognitiveProfile.speed}%` }} />
          </div>
        </CognitiveBar>
        <CognitiveBar>
          <div className="label">
            <span>التركيز</span>
            <span className="value">{cognitiveProfile.attention}%</span>
          </div>
          <div className="bar">
            <div className="fill" style={{ width: `${cognitiveProfile.attention}%` }} />
          </div>
        </CognitiveBar>
        <CognitiveBar>
          <div className="label">
            <span>المنطق</span>
            <span className="value">{cognitiveProfile.logic}%</span>
          </div>
          <div className="bar">
            <div className="fill" style={{ width: `${cognitiveProfile.logic}%` }} />
          </div>
        </CognitiveBar>
        <CognitiveBar>
          <div className="label">
            <span>الحساب</span>
            <span className="value">{cognitiveProfile.math}%</span>
          </div>
          <div className="bar">
            <div className="fill" style={{ width: `${cognitiveProfile.math}%` }} />
          </div>
        </CognitiveBar>
      </Section>

      <Section>
        <h2>🏆 الإنجازات</h2>
        <Achievements>
          {profile.achievements.length > 0 ? (
            profile.achievements.map((achievement) => (
              <Achievement key={achievement}>
                <span className="icon">🎯</span>
                <span className="name">{achievement}</span>
              </Achievement>
            ))
          ) : (
            <p style={{ color: '#a0a0a0' }}>ابدأ اللعب لتحقق الإنجازات!</p>
          )}
        </Achievements>
      </Section>
    </ProfileContainer>
  );
};

export default Profile;
