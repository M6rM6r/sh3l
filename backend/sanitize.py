"""
Input sanitization and data validation middleware.
Prevents injection, enforces schema constraints, sanitizes user-generated content.
"""
import re
import html
from typing import Any
from pydantic import BaseModel, field_validator


# ── String sanitizers ──────────────────────────────────────────────────────

_SCRIPT_RE = re.compile(r"<script[\s\S]*?</script>", re.IGNORECASE)
_TAG_RE = re.compile(r"<[^>]+>")
_SQL_INJECT_RE = re.compile(
    r"(?:--|;|/\*|\*/|xp_|exec\s|union\s+select|drop\s+table|insert\s+into|delete\s+from)",
    re.IGNORECASE,
)


def sanitize_string(value: str, max_length: int = 500) -> str:
    """Strip tags, escape HTML entities, truncate."""
    value = _SCRIPT_RE.sub("", value)
    value = _TAG_RE.sub("", value)
    value = html.escape(value.strip())
    return value[:max_length]


def is_safe_identifier(value: str) -> bool:
    """Check if a string is safe for use as a game_type or dimension identifier."""
    return bool(re.match(r"^[a-zA-Z][a-zA-Z0-9_]{1,50}$", value))


def sanitize_game_type(value: str) -> str:
    """Validate and normalize a game_type string. Preserves case for camelCase identifiers."""
    cleaned = value.strip()
    if not is_safe_identifier(cleaned):
        raise ValueError(f"Invalid game type identifier: {value}")
    return cleaned


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


# ── Pydantic validators for common patterns ────────────────────────────────

class SafeGameSession(BaseModel):
    game_type: str
    score: int
    accuracy: float
    duration_seconds: int
    difficulty_level: int = 1

    @field_validator("game_type")
    @classmethod
    def validate_game_type(cls, v: str) -> str:
        return sanitize_game_type(v)

    @field_validator("score")
    @classmethod
    def validate_score(cls, v: int) -> int:
        return int(clamp(v, 0, 100_000))

    @field_validator("accuracy")
    @classmethod
    def validate_accuracy(cls, v: float) -> float:
        return round(clamp(v, 0.0, 100.0), 2)

    @field_validator("duration_seconds")
    @classmethod
    def validate_duration(cls, v: int) -> int:
        return int(clamp(v, 0, 7200))  # max 2 hours

    @field_validator("difficulty_level")
    @classmethod
    def validate_difficulty(cls, v: int) -> int:
        return int(clamp(v, 1, 10))


class SafeUserInput(BaseModel):
    username: str
    email: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        cleaned = sanitize_string(v, max_length=30)
        if not re.match(r"^[a-zA-Z0-9_\-]{3,30}$", cleaned):
            raise ValueError("Username must be 3-30 chars: letters, numbers, _ -")
        return cleaned

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if _SQL_INJECT_RE.search(v):
            raise ValueError("Invalid email")
        return v


# ── Rate limiting helpers ──────────────────────────────────────────────────

def check_score_anomaly(score: int, game_type: str, avg_score: float) -> bool:
    """
    Returns True if the score is suspiciously high (>5x average).
    Used to flag potential cheating.
    """
    if avg_score <= 0:
        return score > 50_000
    return score > avg_score * 5


def normalize_score(score: int, game_type: str) -> float:
    """Normalize score to 0-100 scale based on game-specific maximums."""
    max_scores: dict[str, int] = {
        "memory": 2000,
        "speed": 1500,
        "math": 3000,
        "chess": 5000,
        "reaction": 1000,
    }
    cap = max_scores.get(game_type, 2000)
    return min(100.0, (score / cap) * 100)
