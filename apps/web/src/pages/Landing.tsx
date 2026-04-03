import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Landing: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="landing">
      <nav className="nav">
        <a href="#" className="logo">Ygy</a>
        <ul className="nav-links">
          <li><a href="#">{t('landing.sections.games.title')}</a></li>
          <li><a href="#">How It Works</a></li>
          <li><a href="#">Science</a></li>
          <li><a href="#">Pricing</a></li>
          <li><a href="#">Log In</a></li>
          <li><LanguageSwitcher /></li>
          <li><Link to="/dashboard" className="btn-primary">{t('landing.hero.cta')}</Link></li>
        </ul>
      </nav>

      <div className="hero">
        <div className="hero-content">
          <div className="hero-badge">{t('landing.hero.badge')}</div>
          <h1>{t('landing.hero.title')}</h1>
          <p>{t('landing.hero.subtitle')}</p>
          <div className="hero-cta">
            <Link to="/dashboard" className="hero-cta-btn">{t('landing.hero.cta')}</Link>
            <span className="hero-sub-text">No credit card required · Cancel anytime</span>
          </div>
        </div>
        <div className="hero-right">
          <div className="game-card big">
            <div className="game-card-bg blue">
              <div className="game-icon">🧩</div>
              <div className="game-title">Train of Thought</div>
              <div className="game-tag">Attention</div>
            </div>
          </div>
          <div className="game-card">
            <div className="game-card-bg purple">
              <div className="game-icon">🔢</div>
              <div className="game-title">Memory Matrix</div>
              <div className="game-tag">Memory</div>
            </div>
          </div>
          <div className="game-card">
            <div className="game-card-bg green">
              <div className="game-icon">⚡</div>
              <div className="game-title">Speed Match</div>
              <div className="game-tag">Speed</div>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat-item"><div className="stat-number">100M+</div><div className="stat-label">People trained</div></div>
        <div className="stat-item"><div className="stat-number">60+</div><div className="stat-label">Brain games</div></div>
        <div className="stat-item"><div className="stat-number">40+</div><div className="stat-label">Cognitive researchers</div></div>
        <div className="stat-item"><div className="stat-number">20yrs</div><div className="stat-label">Neuroscience research</div></div>
      </div>

      <div className="section">
        <div className="section-label">Brain Areas</div>
        <div className="section-title">Train 5 core cognitive areas</div>
        <div className="section-sub">Each game targets specific cognitive skills that affect how you think, learn, and process the world.</div>
        <div className="areas-grid">
          <div className="area-card"><div className="area-icon">🧠</div><div className="area-name">Memory</div><div className="area-desc">Recall and retain information better</div></div>
          <div className="area-card"><div className="area-icon">🎯</div><div className="area-name">Attention</div><div className="area-desc">Stay focused and block distractions</div></div>
          <div className="area-card"><div className="area-icon">⚡</div><div className="area-name">Speed</div><div className="area-desc">Process information faster</div></div>
          <div className="area-card"><div className="area-icon">🔄</div><div className="area-name">Flexibility</div><div className="area-desc">Adapt and think creatively</div></div>
          <div className="area-card"><div className="area-icon">💡</div><div className="area-name">Problem Solving</div><div className="area-desc">Reason and plan strategically</div></div>
        </div>
      </div>

      <div className="section cta-section">
        <h2>Start training your brain today</h2>
        <p>Join over 100 million people using Lumosity to challenge their minds daily.</p>
        <Link to="/dashboard" className="hero-cta-btn">Get Started — It's Free</Link>
      </div>

      <footer>
        <a href="#" className="logo">lum<span>o</span>sity</a>
        <ul className="footer-links">
          <li><a href="#">About</a></li>
          <li><a href="#">Science</a></li>
          <li><a href="#">Privacy</a></li>
          <li><a href="#">Terms</a></li>
          <li><a href="#">Help</a></li>
        </ul>
        <div className="footer-copy">© 2025 Lumosity. All rights reserved.</div>
      </footer>
    </div>
  );
};

export default Landing;
