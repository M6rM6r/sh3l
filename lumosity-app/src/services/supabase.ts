import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Only initialise Supabase when credentials are present
const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export interface SupabaseLeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  is_current_user: boolean;
}

/**
 * Fetch the top 50 leaderboard entries for a given game type.
 * Returns null when Supabase is not configured.
 */
export async function getLeaderboardFromSupabase(
  gameType: string,
  currentUserId?: string | null,
): Promise<SupabaseLeaderboardEntry[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('user_id, high_score, profiles(username)')
    .eq('game_type', gameType)
    .order('high_score', { ascending: false })
    .limit(50);

  if (error || !data) return null;

  return data.map((row: any, idx: number) => ({
    rank: idx + 1,
    username: row.profiles?.username ?? `Player ${idx + 1}`,
    score: row.high_score,
    is_current_user: currentUserId != null && row.user_id === currentUserId,
  }));
}

/**
 * Upsert a player's high score for a game. Silently ignores errors.
 */
export async function upsertLeaderboardScore(
  userId: string,
  gameType: string,
  score: number,
): Promise<void> {
  if (!supabase) return;

  // Only update if the new score is higher
  const { data: existing } = await supabase
    .from('leaderboard_entries')
    .select('id, high_score')
    .eq('user_id', userId)
    .eq('game_type', gameType)
    .maybeSingle();

  if (existing && existing.high_score >= score) return;

  await supabase.from('leaderboard_entries').upsert(
    { user_id: userId, game_type: gameType, high_score: score, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,game_type' },
  );
}

export { supabase };


