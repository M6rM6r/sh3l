import { Outlet, Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const LayoutContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 15px 20px;
  position: sticky;
  top: 0;
  z-index: 100;
  
  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    color: #ffd700;
    font-weight: 700;
    font-size: 24px;
    
    .flame {
      width: 30px;
      height: 40px;
      background: linear-gradient(to top, #ff6b35, #ffd700);
      border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
    }
  }
`;

const Nav = styled.nav`
  display: flex;
  gap: 30px;
  
  a {
    color: #a0a0a0;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.3s;
    
    &:hover, &.active {
      color: #ffd700;
    }
  }
`;

const Main = styled.main`
  flex: 1;
  padding: 20px;
`;

const Footer = styled.footer`
  background: rgba(22, 33, 62, 0.5);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px;
  text-align: center;
  color: #a0a0a0;
  font-size: 14px;
`;

const Layout = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path ? 'active' : '';
  
  return (
    <LayoutContainer>
      <Header>
        <div className="header-content">
          <Link to="/dashboard" className="logo">
            <div className="flame" />
            <span>شعلة</span>
          </Link>
          
          <Nav>
            <Link to="/dashboard" className={isActive('/dashboard')}>الرئيسية</Link>
            <Link to="/games" className={isActive('/games')}>الألعاب</Link>
            <Link to="/leaderboard" className={isActive('/leaderboard')}>المتصدرين</Link>
            <Link to="/profile" className={isActive('/profile')}>الحساب</Link>
          </Nav>
        </div>
      </Header>
      
      <Main>
        <Outlet />
      </Main>
      
      <Footer>
        © 2024 شعلة - تدريب العقل اليومي
      </Footer>
    </LayoutContainer>
  );
};

export default Layout;
