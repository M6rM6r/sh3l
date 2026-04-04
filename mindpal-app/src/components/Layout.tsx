import { Outlet, Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const LayoutContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 1rem 2rem;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Logo = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: white;
  font-weight: 700;
  font-size: 1.5rem;
  
  span {
    font-size: 1.5rem;
  }
`;

const Nav = styled.nav`
  display: flex;
  gap: 2rem;
  
  a {
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.3s;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    
    &:hover, &.active {
      color: white;
      background: rgba(255, 255, 255, 0.1);
    }
  }
`;

const Main = styled.main`
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

const Footer = styled.footer`
  background: rgba(255, 255, 255, 0.05);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
`;

const Layout = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path ? 'active' : '';
  
  return (
    <LayoutContainer>
      <Header>
        <HeaderContent>
          <Logo to="/dashboard">
            <span>🧠</span>
            MindPal
          </Logo>
          
          <Nav>
            <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
            <Link to="/games" className={isActive('/games')}>Games</Link>
            <Link to="/profile" className={isActive('/profile')}>Profile</Link>
          </Nav>
        </HeaderContent>
      </Header>
      
      <Main>
        <Outlet />
      </Main>
      
      <Footer>
        © 2024 MindPal - Train Your Brain Daily
      </Footer>
    </LayoutContainer>
  );
};

export default Layout;
