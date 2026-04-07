"""
NLP Games Service
Provides word-game helpers (difficulty-aware word selection, anagram
validation) and cognitive pattern analysis (fatigue detection,
consistency scoring) used by /api/games/word-prompt and
/api/analytics/pattern-analysis.
"""
import logging
import re
import string
from collections import Counter
from typing import List, Optional

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy NLTK bootstrap — download only on first use, never on import
# ---------------------------------------------------------------------------
_nltk_ready = False


def _ensure_nltk() -> bool:
    global _nltk_ready
    if _nltk_ready:
        return True
    try:
        import nltk
        for resource in ("wordnet", "words", "averaged_perceptron_tagger"):
            try:
                nltk.data.find(f"corpora/{resource}")
            except LookupError:
                nltk.download(resource, quiet=True)
        _nltk_ready = True
        return True
    except Exception as exc:
        logger.warning("NLTK unavailable: %s — falling back to built-in word list", exc)
        return False


# ---------------------------------------------------------------------------
# Fallback word lists by difficulty tier (used when NLTK is absent)
# ---------------------------------------------------------------------------
_FALLBACK_WORDS: dict[int, list[str]] = {
    1: ["cat", "dog", "sun", "red", "big"],
    2: ["apple", "brain", "chair", "dance", "eagle"],
    3: ["bridge", "castle", "design", "flight", "growth"],
    4: ["balance", "captain", "digital", "enhance", "forward"],
    5: ["abstract", "calendar", "dynamics", "elephant", "fragment"],
    6: ["beautiful", "calculate", "discovery", "elevation", "frequency"],
    7: ["ambiguous", "benchmark", "cognitive", "dimension", "elaborate"],
    8: ["accomplish", "biological", "complexity", "dictionary", "efficiency"],
    9: ["collaborate", "demonstrate", "fundamental", "infrastructure", "methodology"],
    10: ["approximately", "circumstances", "comprehensive", "disadvantageous", "extraordinary"],
}


class WordGameNLP:
    """
    Difficulty-aware word selection and anagram validation for word-based
    brain-training games.
    """

    def get_word_for_level(self, difficulty: int) -> str:
        """
        Return a word appropriate for the given difficulty (1–10).
        Uses NLTK WordNet syllable heuristic when available; falls back
        to curated word lists otherwise.
        """
        difficulty = max(1, min(10, difficulty))

        if _ensure_nltk():
            try:
                return self._nltk_word_for_level(difficulty)
            except Exception as exc:
                logger.debug("NLTK word selection failed: %s", exc)

        # Fallback
        tier = max(1, min(10, difficulty))
        words = _FALLBACK_WORDS.get(tier, _FALLBACK_WORDS[5])
        return words[np.random.randint(len(words))]

    def _nltk_word_for_level(self, difficulty: int) -> str:
        from nltk.corpus import wordnet as wn

        # Map difficulty to syllable range
        min_syl = max(1, difficulty - 1)
        max_syl = difficulty + 2

        candidates: list[str] = []
        for synset in wn.all_synsets("n"):
            for lemma in synset.lemma_names():
                if "_" in lemma or len(lemma) < 3:
                    continue
                syllables = self._count_syllables(lemma)
                if min_syl <= syllables <= max_syl:
                    candidates.append(lemma.lower())
            if len(candidates) >= 200:
                break

        if not candidates:
            tier = max(1, min(10, difficulty))
            words = _FALLBACK_WORDS.get(tier, _FALLBACK_WORDS[5])
            return words[np.random.randint(len(words))]

        return candidates[np.random.randint(len(candidates))]

    @staticmethod
    def _count_syllables(word: str) -> int:
        """Rough syllable counter via vowel-group heuristic."""
        word = word.lower().strip(string.punctuation)
        if not word:
            return 1
        vowels = "aeiouy"
        count = 0
        prev_vowel = False
        for ch in word:
            is_vowel = ch in vowels
            if is_vowel and not prev_vowel:
                count += 1
            prev_vowel = is_vowel
        # Silent final 'e'
        if word.endswith("e") and count > 1:
            count -= 1
        return max(1, count)

    def validate_anagram(self, word: str, letters: List[str]) -> bool:
        """
        Return True if `word` can be formed from the given `letters`.
        Letters are consumed (no reuse).
        """
        word_clean = re.sub(r"[^a-z]", "", word.lower())
        available = Counter(l.lower() for l in letters if l.isalpha())
        for ch in word_clean:
            if available[ch] <= 0:
                return False
            available[ch] -= 1
        return True

    def get_word_difficulty(self, word: str) -> float:
        """
        Return an estimated difficulty score 1.0–10.0 for the given word,
        based on length and syllable count.
        """
        word = word.strip().lower()
        length_score = min(10.0, len(word) * 0.8)
        syllable_score = min(10.0, self._count_syllables(word) * 1.5)
        return round((length_score + syllable_score) / 2, 2)

    def scramble_word(self, word: str) -> str:
        """Return a scrambled (but different) version of `word`."""
        chars = list(word)
        original = word
        for _ in range(20):
            np.random.shuffle(chars)
            candidate = "".join(chars)
            if candidate != original:
                return candidate
        return "".join(reversed(word))


# ---------------------------------------------------------------------------


class PatternAnalyzer:
    """
    Analyses user cognitive response patterns to detect fatigue and
    measure training consistency.
    """

    def detect_fatigue(self, response_times: List[float]) -> bool:
        """
        Return True if the player appears fatigued.
        Heuristic: the average of the *last third* of response times is
        ≥ 50 % slower than the average of the *first third*.
        Requires at least 6 data points.
        """
        if len(response_times) < 6:
            return False

        third = len(response_times) // 3
        early = np.mean(response_times[:third])
        late = np.mean(response_times[-third:])

        if early <= 0:
            return False
        return (late - early) / early >= 0.50

    def calculate_consistency_score(self, accuracies: List[float]) -> float:
        """
        Return a consistency score 0.0–100.0.
        100 = perfectly consistent; lower = more variance.
        Uses coefficient of variation (CV): consistency = max(0, 100 − CV*100).
        """
        if not accuracies:
            return 0.0
        arr = np.array(accuracies, dtype=float)
        mean = arr.mean()
        if mean == 0:
            return 0.0
        cv = arr.std() / mean  # coefficient of variation
        return round(max(0.0, 100.0 - cv * 100.0), 2)

    def trending_direction(self, scores: List[float]) -> str:
        """
        Return 'improving', 'declining', or 'stable' based on a linear
        regression slope over the last N scores.
        """
        if len(scores) < 3:
            return "stable"
        x = np.arange(len(scores), dtype=float)
        y = np.array(scores, dtype=float)
        slope = float(np.polyfit(x, y, 1)[0])
        if slope > 2.0:
            return "improving"
        if slope < -2.0:
            return "declining"
        return "stable"

    def predict_next_score(self, scores: List[float]) -> Optional[float]:
        """
        Simple linear extrapolation — predict score for the next session.
        Returns None if fewer than 3 data points.
        """
        if len(scores) < 3:
            return None
        x = np.arange(len(scores), dtype=float)
        y = np.array(scores, dtype=float)
        coeffs = np.polyfit(x, y, 1)
        predicted = float(np.polyval(coeffs, len(scores)))
        return round(max(0.0, predicted), 2)


# ---------------------------------------------------------------------------
# Module-level singletons
# ---------------------------------------------------------------------------
word_game_nlp = WordGameNLP()
pattern_analyzer = PatternAnalyzer()
