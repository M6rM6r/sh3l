import React from 'react';

export const GameCardSkeleton: React.FC = () => (
  <div className="skeleton-card">
    <div className="skeleton-preview skeleton-pulse" />
    <div className="skeleton-info">
      <div className="skeleton-line skeleton-pulse" style={{ width: '70%' }} />
      <div className="skeleton-line skeleton-pulse" style={{ width: '90%', height: 10 }} />
      <div className="skeleton-line skeleton-pulse" style={{ width: '40%', height: 10 }} />
    </div>
  </div>
);

export const LandingSkeleton: React.FC = () => (
  <div className="landing skeleton-landing">
    <nav className="nav">
      <div className="skeleton-logo skeleton-pulse" />
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="skeleton-btn skeleton-pulse" />
        <div className="skeleton-btn skeleton-pulse" />
      </div>
    </nav>
    <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
      <div className="skeleton-line skeleton-pulse" style={{ width: 200, height: 28, margin: '0 auto 8px' }} />
      <div className="skeleton-line skeleton-pulse" style={{ width: 300, height: 14, margin: '0 auto' }} />
    </div>
    <div style={{ display: 'flex', gap: 8, padding: '0 1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="skeleton-tab skeleton-pulse" />
      ))}
    </div>
    <div className="landing-games-grid" style={{ padding: '1rem' }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <GameCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export const PageSkeleton: React.FC = () => (
  <div className="skeleton-page">
    <div className="skeleton-line skeleton-pulse" style={{ width: 180, height: 24, marginBottom: 16 }} />
    <div className="skeleton-line skeleton-pulse" style={{ width: '100%', height: 120, borderRadius: 12, marginBottom: 12 }} />
    <div className="skeleton-line skeleton-pulse" style={{ width: '100%', height: 80, borderRadius: 12, marginBottom: 12 }} />
    <div className="skeleton-line skeleton-pulse" style={{ width: '60%', height: 16, marginBottom: 8 }} />
    <div className="skeleton-line skeleton-pulse" style={{ width: '80%', height: 16 }} />
  </div>
);

export default LandingSkeleton;
