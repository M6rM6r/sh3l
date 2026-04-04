import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import type { RootState } from '../store/store';

const ProfileContainer = styled.div`
  padding: 1rem 0;
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
  
  .avatar {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    margin: 0 auto 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    box-shadow: 0 10px 40px rgba(99, 102, 241, 0.4);
  }
  
  h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }
  
  .email {
    color: rgba(255, 255, 255, 0.7);
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2.5rem;
`;

const StatCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  .value {
    font-size: 1.75rem;
    font-weight: 700;
    color: #a5b4fc;
    margin-bottom: 0.25rem;
  }
  
  .label {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
  }
`;

const Section = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 1.75rem;
  margin-bottom: 1.5rem;
  
  h2 {
    font-size: 1.25rem;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const SkillBar = styled.div`
  margin-bottom: 1.25rem;
  
  .label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.95rem;
    
    span {
      color: rgba(255, 255, 255, 0.8);
    }
    
    .value {
      color: #a5b4fc;
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
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      border-radius: 5px;
      transition: width 0.5s ease;
    }
  }
`;

const Achievements = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const Achievement = styled.div`
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.4);
  border-radius: 50px;
  padding: 0.6rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
`;

const Profile = () => {
  const { profile } = useSelector((state: RootState) => state.user as { 
    profile: { name: string; email: string; level: number; xp: number; streak: number; totalGamesPlayed: number; cognitiveProfile: { memory: number; language: number; focus: number; math: number; logic: number }; achievements: string[] };
  });

  return (
    <ProfileContainer>
      <Header>
        <div className="avatar">{profile.name[0]?.toUpperCase() || '🧠'}</div>
        <h1>{profile.name}</h1>
        <div className="email">{profile.email}</div>
      </Header>

      <StatsGrid>
        <StatCard whileHover={{ scale: 1.02 }}>
          <div className="value">{profile.level}</div>
          <div className="label">Level</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <div className="value">{profile.xp}</div>
          <div className="label">XP Points</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <div className="value">{profile.streak}</div>
          <div className="label">Day Streak</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <div className="value">{profile.totalGamesPlayed}</div>
          <div className="label">Games Played</div>
        </StatCard>
      </StatsGrid>

      <Section>
        <h2>📊 Cognitive Skills</h2>
        <SkillBar>
          <div className="label">
            <span>Memory</span>
            <span className="value">{profile.cognitiveProfile.memory}%</span>
          </div>
          <div className="bar">
            <div className="fill" style={{ width: `${profile.cognitiveProfile.memory}%` }} />
          </div>
        </SkillBar>
        <SkillBar>
          <div className="label">
            <span>Language</span>
            <span className="value">{profile.cognitiveProfile.language}%</span>
          </div>
          <div className="bar">
            <div className="fill" style={{ width: `${profile.cognitiveProfile.language}%` }} />
          </div>
        </SkillBar>
        <SkillBar>
          <div className="label">
            <span>Focus</span>
            <span className="value">{profile.cognitiveProfile.focus}%</span>
          </div>
          <div className="bar">
            <div className="fill" style={{ width: `${profile.cognitiveProfile.focus}%` }} />
          </div>
        </SkillBar>
        <SkillBar>
          <div className="label">
            <span>Math</span>
            <span className="value">{profile.cognitiveProfile.math}%</span>
          </div>
          <div className="bar">
            <div className="fill" style={{ width: `${profile.cognitiveProfile.math}%` }} />
          </div>
        </SkillBar>
        <SkillBar>
          <div className="label">
            <span>Logic</span>
            <span className="value">{profile.cognitiveProfile.logic}%</span>
          </div>
          <div className="bar">
            <div className="fill" style={{ width: `${profile.cognitiveProfile.logic}%` }} />
          </div>
        </SkillBar>
      </Section>

      <Section>
        <h2>🏆 Achievements</h2>
        <Achievements>
          {profile.achievements.map((achievement) => (
            <Achievement key={achievement}>
              <span>🎯</span>
              <span>{achievement}</span>
            </Achievement>
          ))}
        </Achievements>
      </Section>
    </ProfileContainer>
  );
};

export default Profile;
