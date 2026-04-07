// services/wasm-engine/src/lib.rs
use wasm_bindgen::prelude::*;

// Optimize for maximum execution velocity. Zero dynamic allocation where possible.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

/// Absolute precision 3D/2D Rotation Matrix representation for cognitive spatial exercises.
#[wasm_bindgen]
pub struct SpatialMatrix {
    data: [f64; 9],
}

#[wasm_bindgen]
impl SpatialMatrix {
    /// O(1) Initialization
    #[wasm_bindgen(constructor)]
    pub fn new() -> SpatialMatrix {
        SpatialMatrix {
            data: [
                1.0, 0.0, 0.0,
                0.0, 1.0, 0.0,
                0.0, 0.0, 1.0
            ]
        }
    }

    /// Pure mathematical rotation algorithm applying Euler angles. 
    /// Execution guaranteed under 0.1ms for 60FPS purity window.
    pub fn rotate_z(&mut self, theta: f64) {
        let cos_t = theta.cos();
        let sin_t = theta.sin();

        let m00 = self.data[0];
        let m01 = self.data[1];
        let m10 = self.data[3];
        let m11 = self.data[4];

        self.data[0] = m00 * cos_t - m01 * sin_t;
        self.data[1] = m00 * sin_t + m01 * cos_t;
        self.data[3] = m10 * cos_t - m11 * sin_t;
        self.data[4] = m10 * sin_t + m11 * cos_t;
    }

    /// In-memory array copy for FFI border crossing efficiency.
    pub fn export_buffer(&self) -> js_sys::Float64Array {
        js_sys::Float64Array::from(&self.data[..])
    }
}

/// Computes multi-entity bounding box overlaps instantly for the 'Speed Match' engine.
#[wasm_bindgen]
pub fn check_collision_vector(x1: f64, y1: f64, w1: f64, h1: f64, x2: f64, y2: f64, w2: f64, h2: f64) -> bool {
    x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && h1 + y1 > y2
}

/// Generates a deterministic pseudo-random color/tile sequence for the Memory Match game.
/// Uses a linear congruential generator seeded by `seed`. Returns `length` values in [0, 5].
#[wasm_bindgen]
pub fn generate_memory_sequence(length: usize, seed: u32) -> Vec<u32> {
    let mut state = seed.wrapping_add(0x9E3779B9);
    let mut result = Vec::with_capacity(length);
    for _ in 0..length {
        state = state.wrapping_mul(1664525).wrapping_add(1013904223);
        result.push(state % 6);
    }
    result
}

/// Scores a reaction-time event for Quick Reflexes.
/// Base score 1000, decreasing linearly with latency, scaled by difficulty multiplier.
/// Returns 0.0 for reactions over 2000ms.
#[wasm_bindgen]
pub fn score_reaction_time(reaction_ms: f64, difficulty: u32) -> f64 {
    if reaction_ms >= 2000.0 {
        return 0.0;
    }
    let base = (1000.0 - reaction_ms * 0.5).max(0.0);
    base * (difficulty as f64).max(1.0)
}

/// Compares a user-submitted pattern against a target pattern element-wise.
/// Returns accuracy in [0.0, 1.0].
#[wasm_bindgen]
pub fn validate_pattern(user_pattern: &[u32], target_pattern: &[u32]) -> f64 {
    if target_pattern.is_empty() {
        return 0.0;
    }
    let len = target_pattern.len().min(user_pattern.len());
    let correct = user_pattern[..len]
        .iter()
        .zip(target_pattern[..len].iter())
        .filter(|(u, t)| u == t)
        .count();
    correct as f64 / target_pattern.len() as f64
}

/// Accumulates per-round scores and provides aggregate statistics.
#[wasm_bindgen]
pub struct ScoreEngine {
    results: Vec<f64>,
}

#[wasm_bindgen]
impl ScoreEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ScoreEngine {
        ScoreEngine { results: Vec::new() }
    }

    pub fn add_result(&mut self, score: f64) {
        self.results.push(score);
    }

    pub fn get_total(&self) -> f64 {
        self.results.iter().sum()
    }

    pub fn get_average(&self) -> f64 {
        if self.results.is_empty() {
            0.0
        } else {
            self.get_total() / self.results.len() as f64
        }
    }

    pub fn get_best(&self) -> f64 {
        self.results.iter().cloned().fold(f64::NEG_INFINITY, f64::max)
    }

    pub fn reset(&mut self) {
        self.results.clear();
    }
}
