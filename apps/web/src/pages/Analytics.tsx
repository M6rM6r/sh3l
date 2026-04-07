import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RealTimeAnalytics } from '../components/RealTimeAnalytics';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Analytics: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="analytics-page">
      <nav className="nav">
        <Link to="/" className="logo">
          Ygy<span>Clone</span>
        </Link>
        <ul className="nav-links">
          <li><Link to="/">{t('nav.home')}</Link></li>
          <li><Link to="/dashboard">{t('nav.dashboard')}</Link></li>
          <li><Link to="/insights">{t('nav.insights')}</Link></li>
          <li><Link to="/analytics" className="active">{t('nav.analytics')}</Link></li>
          <li><LanguageSwitcher /></li>
        </ul>
      </nav>

      <RealTimeAnalytics />
    </div>
  );
};

export default Analytics;


