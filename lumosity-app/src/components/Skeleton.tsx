import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

/** Single animated shimmer bar */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 6,
  className = '',
  style,
}) => (
  <div
    className={`skeleton-shimmer ${className}`}
    style={{
      width,
      height,
      borderRadius,
      ...style,
    }}
    aria-hidden="true"
  />
);

/** A full leaderboard loading placeholder — 8 rows */
export const LeaderboardSkeleton: React.FC = () => (
  <div className="skeleton-list">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="skeleton-row">
        <Skeleton width={28} height={28} borderRadius={14} />
        <Skeleton width="40%" height={14} />
        <Skeleton width="20%" height={14} />
      </div>
    ))}
  </div>
);

/** Analytics card loading placeholder */
export const AnalyticsSkeleton: React.FC = () => (
  <div className="skeleton-analytics">
    <div className="skeleton-row">
      <Skeleton width="30%" height={80} borderRadius={12} />
      <Skeleton width="30%" height={80} borderRadius={12} />
      <Skeleton width="30%" height={80} borderRadius={12} />
    </div>
    <Skeleton width="100%" height={200} borderRadius={12} style={{ marginTop: 16 }} />
    <Skeleton width="100%" height={120} borderRadius={12} style={{ marginTop: 12 }} />
  </div>
);

/** Insights overview loading placeholder */
export const InsightsSkeleton: React.FC = () => (
  <div className="skeleton-analytics">
    <div className="skeleton-row">
      <Skeleton width="18%" height={100} borderRadius={12} />
      <Skeleton width="18%" height={100} borderRadius={12} />
      <Skeleton width="18%" height={100} borderRadius={12} />
      <Skeleton width="18%" height={100} borderRadius={12} />
      <Skeleton width="18%" height={100} borderRadius={12} />
    </div>
    <Skeleton width="100%" height={260} borderRadius={12} style={{ marginTop: 20 }} />
  </div>
);

export default Skeleton;


