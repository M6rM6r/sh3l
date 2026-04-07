"""
Enhanced Cognitive Profiling Engine
Provides comprehensive cognitive assessment, brain age calculation, and predictive analytics.
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CognitiveDomain(Enum):
    MEMORY = "memory"
    ATTENTION = "attention"
    SPEED = "speed"
    FLEXIBILITY = "flexibility"
    PROBLEM_SOLVING = "problem_solving"
    SPATIAL = "spatial"
    LANGUAGE = "language"
    EXECUTIVE = "executive"

@dataclass
class CognitiveScore:
    domain: CognitiveDomain
    score: float
    percentile: float
    age_equivalent: float
    trend: str
    confidence: float

@dataclass
class BrainAgeProfile:
    chronological_age: int
    brain_age: float
    cognitive_reserve: float
    domains: Dict[str, CognitiveScore]
    overall_health_score: float
    recommendations: List[str]

@dataclass
class AssessmentResult:
    profile: BrainAgeProfile
    completion_time: int
    reliability_score: float
    fatigue_index: float
    next_assessment_recommended: datetime


class EnhancedCognitiveProfilingEngine:
    """
    Advanced cognitive profiling with brain age calculation and predictive analytics.
    """
    
    # Normative data by age group (percentile 50 scores)
    NORMATIVE_DATA = {
        18: {d.value: 85 for d in CognitiveDomain},
        25: {d.value: 88 for d in CognitiveDomain},
        35: {d.value: 86 for d in CognitiveDomain},
        45: {d.value: 83 for d in CognitiveDomain},
        55: {d.value: 79 for d in CognitiveDomain},
        65: {d.value: 74 for d in CognitiveDomain},
        75: {d.value: 68 for d in CognitiveDomain},
    }
    
    # Standard deviations for each domain by age
    DOMAIN_STDS = {
        CognitiveDomain.MEMORY.value: 12,
        CognitiveDomain.ATTENTION.value: 10,
        CognitiveDomain.SPEED.value: 15,
        CognitiveDomain.FLEXIBILITY.value: 11,
        CognitiveDomain.PROBLEM_SOLVING.value: 13,
        CognitiveDomain.SPATIAL.value: 14,
        CognitiveDomain.LANGUAGE.value: 9,
        CognitiveDomain.EXECUTIVE.value: 12,
    }
    
    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.assessment_history: Dict[int, List[AssessmentResult]] = {}
        
    def run_comprehensive_assessment(
        self,
        user_id: int,
        chronological_age: int,
        game_results: List[Dict[str, Any]]
    ) -> AssessmentResult:
        """
        Run 15-minute comprehensive cognitive assessment across all domains.
        """
        logger.info(f"Starting comprehensive assessment for user {user_id}")
        
        start_time = datetime.now()
        
        # Calculate domain scores from game results
        domain_scores = self._calculate_domain_scores(game_results)
        
        # Calculate brain age
        brain_age = self._calculate_brain_age(chronological_age, domain_scores)
        
        # Calculate cognitive reserve
        cognitive_reserve = self._calculate_cognitive_reserve(
            chronological_age, brain_age, domain_scores
        )
        
        # Calculate percentiles
        domain_percentiles = self._calculate_percentiles(chronological_age, domain_scores)
        
        # Calculate age equivalents
        age_equivalents = self._calculate_age_equivalents(domain_scores)
        
        # Calculate trends
        trends = self._calculate_domain_trends(user_id, domain_scores)
        
        # Build cognitive scores
        cognitive_scores = {}
        for domain, score in domain_scores.items():
            cognitive_scores[domain] = CognitiveScore(
                domain=CognitiveDomain(domain),
                score=score,
                percentile=domain_percentiles.get(domain, 50),
                age_equivalent=age_equivalents.get(domain, chronological_age),
                trend=trends.get(domain, 'stable'),
                confidence=self._calculate_confidence(game_results, domain)
            )
        
        # Calculate overall health score
        health_score = self._calculate_overall_health_score(cognitive_scores)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            cognitive_scores, brain_age, chronological_age
        )
        
        # Calculate assessment metrics
        completion_time = int((datetime.now() - start_time).total_seconds())
        reliability = self._calculate_reliability_score(game_results)
        fatigue = self._detect_fatigue_during_assessment(game_results)
        
        profile = BrainAgeProfile(
            chronological_age=chronological_age,
            brain_age=brain_age,
            cognitive_reserve=cognitive_reserve,
            domains=cognitive_scores,
            overall_health_score=health_score,
            recommendations=recommendations
        )
        
        result = AssessmentResult(
            profile=profile,
            completion_time=completion_time,
            reliability_score=reliability,
            fatigue_index=fatigue,
            next_assessment_recommended=datetime.now() + timedelta(days=30)
        )
        
        # Store in history
        if user_id not in self.assessment_history:
            self.assessment_history[user_id] = []
        self.assessment_history[user_id].append(result)
        
        # Cache result
        if self.redis:
            self.redis.setex(
                f"cognitive_profile:{user_id}",
                86400 * 30,  # 30 days
                json.dumps(self._serialize_assessment(result), default=str)
            )
        
        return result
    
    def _calculate_domain_scores(self, game_results: List[Dict]) -> Dict[str, float]:
        """Calculate normalized scores for each cognitive domain."""
        domain_scores = {d.value: [] for d in CognitiveDomain}
        
        for result in game_results:
            domain = result.get('cognitive_domain')
            score = result.get('normalized_score')
            if domain and score is not None:
                domain_scores[domain].append(score)
        
        # Average scores per domain
        return {
            domain: np.mean(scores) if scores else 50.0
            for domain, scores in domain_scores.items()
        }
    
    def _calculate_brain_age(
        self,
        chronological_age: int,
        domain_scores: Dict[str, float]
    ) -> float:
        """
        Calculate brain age based on performance compared to normative data.
        Uses weighted average of all domains.
        """
        age_estimates = []
        
        for domain, score in domain_scores.items():
            # Find closest age groups in normative data
            ages = sorted(self.NORMATIVE_DATA.keys())
            for i, age in enumerate(ages):
                if i == 0:
                    continue
                
                prev_age = ages[i-1]
                prev_norm = self.NORMATIVE_DATA[prev_age].get(domain, 70)
                curr_norm = self.NORMATIVE_DATA[age].get(domain, 70)
                
                if prev_norm >= score >= curr_norm:
                    # Interpolate age
                    ratio = (prev_norm - score) / (prev_norm - curr_norm)
                    estimated_age = prev_age + ratio * (age - prev_age)
                    
                    # Weight by domain importance
                    weight = self._get_domain_weight(domain)
                    age_estimates.append((estimated_age, weight))
                    break
            else:
                # Extrapolate beyond known ranges
                if score > self.NORMATIVE_DATA[ages[0]].get(domain, 70):
                    age_estimates.append((ages[0] - 2, self._get_domain_weight(domain)))
                else:
                    age_estimates.append((ages[-1] + 5, self._get_domain_weight(domain)))
        
        if not age_estimates:
            return float(chronological_age)
        
        # Weighted average
        total_weight = sum(w for _, w in age_estimates)
        weighted_sum = sum(age * weight for age, weight in age_estimates)
        
        return weighted_sum / total_weight
    
    def _get_domain_weight(self, domain: str) -> float:
        """Get importance weight for each cognitive domain."""
        weights = {
            CognitiveDomain.EXECUTIVE.value: 1.5,
            CognitiveDomain.MEMORY.value: 1.3,
            CognitiveDomain.SPEED.value: 1.2,
            CognitiveDomain.PROBLEM_SOLVING.value: 1.2,
            CognitiveDomain.ATTENTION.value: 1.1,
            CognitiveDomain.FLEXIBILITY.value: 1.0,
            CognitiveDomain.SPATIAL.value: 0.9,
            CognitiveDomain.LANGUAGE.value: 0.9,
        }
        return weights.get(domain, 1.0)
    
    def _calculate_cognitive_reserve(
        self,
        chronological_age: int,
        brain_age: float,
        domain_scores: Dict[str, float]
    ) -> float:
        """
        Calculate cognitive reserve - the brain's resilience to aging.
        Higher values indicate better ability to maintain function despite aging.
        """
        age_difference = chronological_age - brain_age
        
        # Base reserve from age difference
        base_reserve = 50 + (age_difference * 2)
        
        # Bonus for consistent high performance
        score_consistency = 100 - np.std(list(domain_scores.values()))
        consistency_bonus = score_consistency * 0.2
        
        # Bonus for domain diversity (well-rounded cognition)
        domains_tested = len([s for s in domain_scores.values() if s > 0])
        diversity_bonus = domains_tested * 3
        
        cognitive_reserve = base_reserve + consistency_bonus + diversity_bonus
        return max(0, min(100, cognitive_reserve))
    
    def _calculate_percentiles(
        self,
        age: int,
        domain_scores: Dict[str, float]
    ) -> Dict[str, float]:
        """Calculate percentile rankings compared to age group."""
        percentiles = {}
        
        # Find closest age group
        closest_age = min(self.NORMATIVE_DATA.keys(), 
                         key=lambda x: abs(x - age))
        age_norms = self.NORMATIVE_DATA[closest_age]
        
        for domain, score in domain_scores.items():
            mean = age_norms.get(domain, 70)
            std = self.DOMAIN_STDS.get(domain, 12)
            
            # Calculate z-score
            z_score = (score - mean) / std
            
            # Convert to percentile
            percentile = 50 + (z_score * 34)  # Rough approximation
            percentiles[domain] = max(1, min(99, percentile))
        
        return percentiles
    
    def _calculate_age_equivalents(
        self,
        domain_scores: Dict[str, float]
    ) -> Dict[str, float]:
        """Calculate age-equivalent scores for each domain."""
        age_equivalents = {}
        
        for domain, score in domain_scores.items():
            ages = sorted(self.NORMATIVE_DATA.keys())
            for age in ages:
                norm_score = self.NORMATIVE_DATA[age].get(domain, 70)
                if score >= norm_score:
                    age_equivalents[domain] = float(age)
                    break
            else:
                # Score is below all age groups
                age_equivalents[domain] = float(ages[-1] + 5)
        
        return age_equivalents
    
    def _calculate_domain_trends(
        self,
        user_id: int,
        current_scores: Dict[str, float]
    ) -> Dict[str, str]:
        """Calculate trends by comparing to previous assessments."""
        trends = {domain: 'stable' for domain in current_scores.keys()}
        
        if user_id not in self.assessment_history:
            return trends
        
        previous = self.assessment_history[user_id][-1] if self.assessment_history[user_id] else None
        if not previous:
            return trends
        
        for domain, current_score in current_scores.items():
            prev_score = previous.profile.domains.get(domain)
            if prev_score:
                difference = current_score - prev_score.score
                if difference > 5:
                    trends[domain] = 'improving'
                elif difference < -5:
                    trends[domain] = 'declining'
        
        return trends
    
    def _calculate_confidence(
        self,
        game_results: List[Dict],
        domain: str
    ) -> float:
        """Calculate confidence score based on data quality."""
        domain_games = [r for r in game_results if r.get('cognitive_domain') == domain]
        
        if not domain_games:
            return 0.5
        
        # Factors affecting confidence
        game_count = len(domain_games)
        consistency = 100 - np.std([r.get('normalized_score', 50) for r in domain_games]) if game_count > 1 else 50
        
        # Confidence formula
        confidence = (min(game_count, 5) / 5) * 0.6 + (consistency / 100) * 0.4
        return min(0.95, confidence)
    
    def _calculate_overall_health_score(
        self,
        cognitive_scores: Dict[str, CognitiveScore]
    ) -> float:
        """Calculate overall cognitive health score (0-100)."""
        if not cognitive_scores:
            return 50.0
        
        # Weighted average of all domains
        weighted_sum = sum(
            score.score * self._get_domain_weight(domain)
            for domain, score in cognitive_scores.items()
        )
        total_weight = sum(
            self._get_domain_weight(domain)
            for domain in cognitive_scores.keys()
        )
        
        return round(weighted_sum / total_weight, 1)
    
    def _generate_recommendations(
        self,
        cognitive_scores: Dict[str, CognitiveScore],
        brain_age: float,
        chronological_age: int
    ) -> List[str]:
        """Generate personalized recommendations based on profile."""
        recommendations = []
        
        # Brain age recommendations
        age_diff = chronological_age - brain_age
        if age_diff > 5:
            recommendations.append(
                f"🎉 Excellent! Your cognitive performance is {abs(age_diff):.1f} years younger than your age. "
                "Keep maintaining your healthy habits!"
            )
        elif age_diff < -5:
            recommendations.append(
                f"💪 Focus Area: Your brain age appears {abs(age_diff):.1f} years older than your chronological age. "
                "Don't worry - consistent training can significantly improve this!"
            )
        
        # Domain-specific recommendations
        sorted_domains = sorted(
            cognitive_scores.items(),
            key=lambda x: x[1].score
        )
        
        # Address weakest area
        if sorted_domains:
            weakest = sorted_domains[0]
            recommendations.append(
                f"🎯 Priority Training: Your {weakest[0].value} skills show the most room for improvement. "
                f"Try our {weakest[0].value}-focused games 3-4 times per week."
            )
        
        # Highlight strength
        if len(sorted_domains) > 1:
            strongest = sorted_domains[-1]
            recommendations.append(
                f"⭐ Strength: Your {strongest[0].value} abilities are exceptional. "
                "Consider challenging yourself with advanced levels!"
            )
        
        # General lifestyle recommendations
        recommendations.extend([
            "🧠 Train for 15-20 minutes daily for optimal cognitive health",
            "😴 Prioritize 7-8 hours of sleep - crucial for memory consolidation",
            "🏃‍♂️ Regular exercise improves blood flow to the brain",
            "🥗 A Mediterranean-style diet supports long-term brain health"
        ])
        
        return recommendations
    
    def _calculate_reliability_score(self, game_results: List[Dict]) -> float:
        """Calculate reliability score for the assessment."""
        if not game_results:
            return 0.0
        
        # Check coverage of domains
        domains_covered = len(set(r.get('cognitive_domain') for r in game_results))
        coverage_score = min(1.0, domains_covered / 6)
        
        # Check for outlier responses
        scores = [r.get('normalized_score', 50) for r in game_results]
        if len(scores) > 2:
            q1, q3 = np.percentile(scores, [25, 75])
            iqr = q3 - q1
            outliers = sum(1 for s in scores if s < q1 - 1.5*iqr or s > q3 + 1.5*iqr)
            outlier_score = max(0, 1 - (outliers / len(scores)))
        else:
            outlier_score = 1.0
        
        # Check completion rate
        completion_score = sum(r.get('completed', True) for r in game_results) / len(game_results)
        
        return (coverage_score * 0.4 + outlier_score * 0.3 + completion_score * 0.3)
    
    def _detect_fatigue_during_assessment(self, game_results: List[Dict]) -> float:
        """Detect fatigue based on performance decline during assessment."""
        if len(game_results) < 5:
            return 0.0
        
        # Sort by time
        sorted_results = sorted(game_results, key=lambda x: x.get('timestamp', ''))
        
        # Compare first half to second half
        mid = len(sorted_results) // 2
        first_half = [r.get('normalized_score', 50) for r in sorted_results[:mid]]
        second_half = [r.get('normalized_score', 50) for r in sorted_results[mid:]]
        
        if not first_half or not second_half:
            return 0.0
        
        decline = np.mean(first_half) - np.mean(second_half)
        
        # Normalize to 0-1 scale
        fatigue_index = max(0, min(1, decline / 20))
        
        return fatigue_index
    
    def predict_future_performance(
        self,
        user_id: int,
        days_ahead: int = 30
    ) -> Dict[str, Any]:
        """
        Predict cognitive performance trends for the next N days.
        """
        if user_id not in self.assessment_history:
            return {'error': 'Insufficient data for prediction'}
        
        history = self.assessment_history[user_id]
        if len(history) < 2:
            return {'error': 'Need at least 2 assessments for trend analysis'}
        
        predictions = {}
        
        for domain in CognitiveDomain:
            # Extract historical scores
            scores = [
                assessment.profile.domains.get(domain.value, CognitiveScore(domain, 50, 50, 25, 'stable', 0.5))
                for assessment in history
            ]
            
            # Linear extrapolation
            x = np.arange(len(scores))
            y = [s.score for s in scores]
            
            if len(x) > 1:
                slope, intercept = np.polyfit(x, y, 1)
                
                # Predict future score
                future_x = len(scores) + (days_ahead / 30)  # Assuming monthly assessments
                predicted_score = slope * future_x + intercept
                
                predictions[domain.value] = {
                    'current_score': scores[-1].score,
                    'predicted_score': max(0, min(100, predicted_score)),
                    'trend': 'improving' if slope > 0.5 else ('declining' if slope < -0.5 else 'stable'),
                    'confidence': min(0.9, 0.5 + len(scores) * 0.1),
                    'days_to_target': self._estimate_days_to_target(scores[-1].score, slope, 80)
                }
        
        return {
            'predictions': predictions,
            'assessment_count': len(history),
            'prediction_horizon_days': days_ahead,
            'overall_trend': self._calculate_overall_trend(predictions)
        }
    
    def _estimate_days_to_target(
        self,
        current_score: float,
        slope: float,
        target: float
    ) -> Optional[int]:
        """Estimate days to reach target score."""
        if slope <= 0:
            return None
        
        score_needed = target - current_score
        if score_needed <= 0:
            return 0
        
        # Assuming monthly assessments (30 days)
        assessments_needed = score_needed / (slope * 30)
        return int(assessments_needed * 30)
    
    def _calculate_overall_trend(self, predictions: Dict) -> str:
        """Calculate overall trend across all domains."""
        trends = [p.get('trend') for p in predictions.values()]
        
        improving = sum(1 for t in trends if t == 'improving')
        declining = sum(1 for t in trends if t == 'declining')
        
        if improving > len(trends) / 2:
            return 'improving'
        elif declining > len(trends) / 2:
            return 'declining'
        return 'stable'
    
    def get_progress_report(
        self,
        user_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Generate comprehensive progress report."""
        if user_id not in self.assessment_history:
            return {'error': 'No assessment history found'}
        
        history = self.assessment_history[user_id]
        
        if start_date:
            history = [h for h in history if h.profile.timestamp >= start_date]
        if end_date:
            history = [h for h in history if h.profile.timestamp <= end_date]
        
        if not history:
            return {'error': 'No assessments in specified date range'}
        
        # Calculate improvements
        first = history[0]
        latest = history[-1]
        
        improvements = {}
        for domain in CognitiveDomain:
            first_score = first.profile.domains.get(domain.value)
            latest_score = latest.profile.domains.get(domain.value)
            
            if first_score and latest_score:
                improvements[domain.value] = {
                    'absolute_change': round(latest_score.score - first_score.score, 1),
                    'percent_change': round(
                        ((latest_score.score - first_score.score) / first_score.score) * 100, 1
                    ),
                    'start_score': first_score.score,
                    'current_score': latest_score.score,
                    'start_percentile': first_score.percentile,
                    'current_percentile': latest_score.percentile,
                }
        
        return {
            'report_period': {
                'start': history[0].profile.timestamp if hasattr(history[0].profile, 'timestamp') else 'N/A',
                'end': history[-1].profile.timestamp if hasattr(history[-1].profile, 'timestamp') else 'N/A',
                'assessments_count': len(history)
            },
            'brain_age_progression': [
                {
                    'date': h.profile.timestamp if hasattr(h.profile, 'timestamp') else 'N/A',
                    'brain_age': h.profile.brain_age,
                    'chronological_age': h.profile.chronological_age
                }
                for h in history
            ],
            'domain_improvements': improvements,
            'cognitive_reserve_change': (
                latest.profile.cognitive_reserve - first.profile.cognitive_reserve
            ),
            'overall_health_change': (
                latest.profile.overall_health_score - first.profile.overall_health_score
            ),
            'achievements': self._identify_achievements(history)
        }
    
    def _identify_achievements(self, history: List[AssessmentResult]) -> List[str]:
        """Identify cognitive achievements from assessment history."""
        achievements = []
        
        if len(history) < 2:
            return achievements
        
        first = history[0]
        latest = history[-1]
        
        # Brain age improvement
        age_improvement = first.profile.chronological_age - first.profile.brain_age
        current_improvement = latest.profile.chronological_age - latest.profile.brain_age
        
        if current_improvement > age_improvement + 3:
            achievements.append("🧠 Brain Age Rejuvenation: Reduced brain age by 3+ years")
        
        # Domain mastery
        for domain in CognitiveDomain:
            latest_score = latest.profile.domains.get(domain.value)
            if latest_score and latest_score.percentile >= 90:
                achievements.append(f"🏆 {domain.value.title()} Master: Top 10% performance")
        
        # Consistency achievement
        if len(history) >= 3:
            recent = history[-3:]
            all_improving = all(
                r.profile.overall_health_score > first.profile.overall_health_score
                for r in recent
            )
            if all_improving:
                achievements.append("📈 Consistent Growth: 3+ consecutive improvements")
        
        return achievements
    
    def _serialize_assessment(self, result: AssessmentResult) -> Dict:
        """Serialize assessment result for JSON storage."""
        return {
            'profile': {
                'chronological_age': result.profile.chronological_age,
                'brain_age': result.profile.brain_age,
                'cognitive_reserve': result.profile.cognitive_reserve,
                'overall_health_score': result.profile.overall_health_score,
                'recommendations': result.profile.recommendations,
                'domains': {
                    domain: {
                        'score': score.score,
                        'percentile': score.percentile,
                        'age_equivalent': score.age_equivalent,
                        'trend': score.trend,
                        'confidence': score.confidence
                    }
                    for domain, score in result.profile.domains.items()
                }
            },
            'completion_time': result.completion_time,
            'reliability_score': result.reliability_score,
            'fatigue_index': result.fatigue_index,
            'next_assessment_recommended': result.next_assessment_recommended.isoformat()
        }


# Singleton instance
_cognitive_profiling_engine: Optional[EnhancedCognitiveProfilingEngine] = None

def get_profiling_engine(redis_client=None) -> EnhancedCognitiveProfilingEngine:
    """Get or create singleton instance of profiling engine."""
    global _cognitive_profiling_engine
    if _cognitive_profiling_engine is None:
        _cognitive_profiling_engine = EnhancedCognitiveProfilingEngine(redis_client)
    return _cognitive_profiling_engine
