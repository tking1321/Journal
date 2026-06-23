import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Animated } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { generateGoals, generateDailyInsight } from '@/lib/ai';
import { Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';
import CompletionRings from '@/components/CompletionRings';

interface Goal {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  goal_date: string;
  difficulty: string;
  xp_value: number;
}

interface Category {
  id: string;
  name: string;
  growth_description: string | null;
}

interface Streak {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  streak_goal: number;
  freeze_uses_remaining: number;
  freeze_month: string | null;
}

interface DailyRing {
  id?: string;
  journal_done: boolean;
  goals_done: boolean;
  day_complete: boolean;
}

interface Achievement {
  key: string;
  label: string;
  unlocked_at: string;
}

const LEVEL_THRESHOLDS = [0, 20, 40, 65, 95, 130, 170];

function getThresholdForLevel(level: number): number {
  if (level <= LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[level - 1];
  const lastBase = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const extra = level - LEVEL_THRESHOLDS.length;
  let sum = lastBase;
  for (let i = 0; i < extra; i++) {
    sum += 40 + (LEVEL_THRESHOLDS.length + i) * 5;
  }
  return sum;
}

function getXpForNextLevel(level: number): number {
  return getThresholdForLevel(level + 1) - getThresholdForLevel(level);
}

function getXpInCurrentLevel(totalXp: number, level: number): number {
  return totalXp - getThresholdForLevel(level);
}

function calculateLevel(totalXp: number): number {
  let lvl = 1;
  while (getThresholdForLevel(lvl + 1) <= totalXp) {
    lvl++;
  }
  return lvl;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#1D6A3A',
  medium: '#A0620A',
  hard: '#C0392B',
};

const DIFFICULTY_BG_LIGHT: Record<string, string> = {
  easy: '#EDF5F0',
  medium: '#FFF4E6',
  hard: '#FDE8E6',
};

const DIFFICULTY_BG_DARK: Record<string, string> = {
  easy: '#1a2e20',
  medium: '#2e2010',
  hard: '#2e1210',
};

export default function TodayScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [rings, setRings] = useState<DailyRing>({ journal_done: false, goals_done: false, day_complete: false });
  const [aiInsight, setAiInsight] = useState('');
  const [aiNextFocus, setAiNextFocus] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [xpGain, setXpGain] = useState<{ amount: number; visible: boolean }>({ amount: 0, visible: false });
  const celebrationOpacity = useRef(new Animated.Value(0)).current;

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);

  const userLevel = profile?.user_level || 1;
  const totalXp = profile?.total_xp_earned || 0;
  const currentXpInLevel = getXpInCurrentLevel(totalXp, userLevel);
  const xpNeeded = getXpForNextLevel(userLevel);

  const loadData = useCallback(async () => {
    if (!user) return;

    const [goalsRes, catsRes, streakRes, entriesRes, ringsRes] = await Promise.all([
      supabase.from('goals').select('*').eq('goal_date', today).order('created_at'),
      supabase.from('categories').select('*'),
      supabase.from('streaks').select('*').maybeSingle(),
      supabase.from('journal_entries').select('content, entry_date').order('created_at', { ascending: false }).limit(5),
      supabase.from('daily_rings').select('*').eq('ring_date', today).maybeSingle(),
    ]);

    const fetchedGoals = goalsRes.data || [];
    const fetchedCats = catsRes.data || [];
    const fetchedStreak = streakRes.data;
    const entries = entriesRes.data || [];
    const fetchedRings = ringsRes.data;

    setCategories(fetchedCats);
    setStreak(fetchedStreak);

    if (fetchedRings) {
      setRings(fetchedRings);
    }

    const hasJournalToday = entries.some((e) => e.entry_date === today);
    if (hasJournalToday && fetchedRings && !fetchedRings.journal_done) {
      await updateRing({ journal_done: true }, fetchedRings);
    }

    const alreadyGeneratedToday = profile?.last_goal_generation_date === today;

    if (fetchedGoals.length === 0 && fetchedCats.length > 0 && !alreadyGeneratedToday) {
      setGenerating(true);
      await generateGoalsWithAI(fetchedCats, entries, fetchedStreak);
      setGenerating(false);
    } else {
      setGoals(fetchedGoals);
      if (fetchedGoals.length > 0 && fetchedGoals.every((g) => g.completed)) {
        if (fetchedRings && !fetchedRings.goals_done) {
          await updateRing({ goals_done: true }, fetchedRings);
        }
      }
    }

    // Load cached daily AI insight
    const cachedResponse = profile?.last_ai_response_json as Record<string, unknown> | null;
    const cachedIsToday = profile?.last_ai_request_date === today && cachedResponse;

    if (cachedIsToday) {
      const reflection = cachedResponse?.reflection as string | undefined;
      const insight = cachedResponse?.insight as string | undefined;
      const nextFocus = cachedResponse?.next_focus as string | undefined;
      if (reflection || insight) setAiInsight(reflection || insight || '');
      if (nextFocus) setAiNextFocus(nextFocus);
    } else {
      await fetchDailyInsight(entries);
    }

    setLoading(false);
  }, [user, profile, today]);

  async function upsertRing(updates: Partial<DailyRing>): Promise<DailyRing> {
    const current = rings;
    const merged = { ...current, ...updates };
    const allDone = merged.journal_done && merged.goals_done;
    const wasDayComplete = current.day_complete;

    merged.day_complete = allDone;

    await supabase.from('daily_rings').upsert({
      ring_date: today,
      ...merged,
    }, { onConflict: 'user_id,ring_date' });

    setRings(merged);

    if (allDone && !wasDayComplete) {
      triggerCelebration();
      await handleDayComplete();
    }

    return merged;
  }

  async function updateRing(updates: Partial<DailyRing>, base?: DailyRing) {
    const current = base || rings;
    const merged = { ...current, ...updates };
    const allDone = merged.journal_done && merged.goals_done;
    merged.day_complete = allDone;

    await supabase.from('daily_rings').upsert({
      ring_date: today,
      ...merged,
    }, { onConflict: 'user_id,ring_date' });

    setRings(merged);
  }

  function triggerCelebration() {
    celebrationOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(celebrationOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(celebrationOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }

  async function handleDayComplete() {
    if (!user || !streak) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const isConsecutive = streak.last_active_date === yesterday || streak.last_active_date === today;
    const newCurrent = isConsecutive ? streak.current_streak + 1 : 1;
    const newLongest = Math.max(newCurrent, streak.longest_streak);

    await supabase.from('streaks').update({
      current_streak: newCurrent,
      longest_streak: newLongest,
      last_active_date: today,
    }).eq('user_id', user.id);

    setStreak((prev) => prev ? { ...prev, current_streak: newCurrent, longest_streak: newLongest, last_active_date: today } : prev);

    const { data: island } = await supabase.from('island_progress')
      .select('buildings_count').eq('month_year', thisMonth).maybeSingle();

    if (island) {
      await supabase.from('island_progress').update({ buildings_count: island.buildings_count + 1 })
        .eq('month_year', thisMonth);
    } else {
      await supabase.from('island_progress').insert({ month_year: thisMonth, buildings_count: 1 });
    }

    await checkAchievements(newCurrent, newLongest);
  }

  async function checkAchievements(currentStreak: number, longestStreak: number) {
    if (!user) return;

    const milestones: Array<{ key: string; label: string; threshold: number }> = [
      { key: 'streak_7', label: 'First 7-day streak unlocked', threshold: 7 },
      { key: 'streak_14', label: '14-day streak — momentum is real', threshold: 14 },
      { key: 'streak_30', label: '30-day streak — exceptional consistency', threshold: 30 },
    ];

    for (const m of milestones) {
      if (currentStreak === m.threshold || (longestStreak === m.threshold && currentStreak >= m.threshold)) {
        const { data: existing } = await supabase.from('achievements')
          .select('key').eq('key', m.key).maybeSingle();
        if (!existing) {
          await supabase.from('achievements').insert({ key: m.key, label: m.label });
          setNewAchievement({ key: m.key, label: m.label, unlocked_at: new Date().toISOString() });
          setTimeout(() => setNewAchievement(null), 4000);
        }
      }
    }
  }

  async function generateGoalsWithAI(cats: Category[], entries: { content: string; entry_date: string }[], streakData: Streak | null) {
    const { data: previousGoals } = await supabase
      .from('goals')
      .select('title, completed, difficulty')
      .order('created_at', { ascending: false })
      .limit(12);

    const result = await generateGoals({
      userId: user!.id,
      categories: cats,
      recentEntries: entries,
      previousGoals: previousGoals || [],
      streakData: streakData ? { current_streak: streakData.current_streak, longest_streak: streakData.longest_streak } : null,
      profile: {
        coaching_style: profile?.coaching_style,
        journaling_style: profile?.journaling_style,
        biggest_obstacle: profile?.biggest_obstacle,
        success_vision: profile?.success_vision,
        user_level: profile?.user_level,
        total_xp_earned: profile?.total_xp_earned,
        daily_goal_limit: profile?.daily_goal_limit,
      },
      today,
    });

    if (result && result.goals.length > 0) {
      const inserts = result.goals.map((g) => ({
        title: g.title || g.text || 'Daily goal',
        description: g.description || '',
        goal_date: today,
        category_id: cats.find((c) => c.name === g.categoryName)?.id || null,
        difficulty: g.difficulty || 'easy',
        xp_value: g.xp || 5,
      }));
      const { data: newGoals } = await supabase.from('goals').insert(inserts).select();
      setGoals(newGoals || []);
      if (result.reflection) setAiInsight(result.reflection);
      if (result.next_focus) setAiNextFocus(result.next_focus);
      return;
    }

    // Fallback: generate simple goals without AI
    const fallbackGoals = cats.slice(0, profile?.daily_goal_limit || 3).map((cat, i) => ({
      title: `Focused time on: ${cat.name}`,
      description: cat.growth_description || `Build your ${cat.name} practice today`,
      goal_date: today,
      category_id: cat.id,
      difficulty: i === 0 ? 'hard' : i === 1 ? 'medium' : 'easy',
      xp_value: i === 0 ? 20 : i === 1 ? 10 : 5,
    }));
    const { data: newGoals } = await supabase.from('goals').insert(fallbackGoals).select();
    setGoals(newGoals || []);
    await supabase.from('profiles').update({ last_goal_generation_date: today }).eq('id', user!.id);
  }

  async function fetchDailyInsight(entries: { content: string }[]) {
    const result = await generateDailyInsight({
      userId: user!.id,
      recentEntries: entries,
      profile: {
        coaching_style: profile?.coaching_style,
        success_vision: profile?.success_vision,
      },
      today,
    });

    if (result?.reflection) setAiInsight(result.reflection);
    if (result?.next_focus) setAiNextFocus(result.next_focus);

    if (!result) {
      const fallback: Record<string, string[]> = {
        'strict coach': ['Show up. No excuses today.', 'Discipline beats motivation every time.'],
        'gentle coach': ["You're building something real.", 'Every small step compounds.'],
        'reflective prompts': ['What would your future self thank you for today?', 'What does progress look like right now?'],
        'direct action': ['Pick one thing. Do it completely.', "Clarity comes from action, not thinking."],
      };
      const phrases = fallback[profile?.coaching_style || 'gentle coach'] || fallback['gentle coach'];
      setAiInsight(phrases[Math.floor(Math.random() * phrases.length)]);
    }
  }

  async function awardXp(xpAmount: number) {
    if (!user || !profile) return;

    const newTotal = (profile.total_xp_earned || 0) + xpAmount;
    const newLevel = calculateLevel(newTotal);

    await supabase.from('profiles').update({
      current_xp: getXpInCurrentLevel(newTotal, newLevel),
      total_xp_earned: newTotal,
      user_level: newLevel,
    }).eq('id', user.id);

    setXpGain({ amount: xpAmount, visible: true });
    setTimeout(() => setXpGain({ amount: 0, visible: false }), 2000);

    await refreshProfile();
  }

  useEffect(() => { loadData(); }, [loadData]);

  async function toggleGoal(goalId: string, completed: boolean) {
    const goal = goals.find(g => g.id === goalId);
    const updated = goals.map((g) => (g.id === goalId ? { ...g, completed } : g));
    setGoals(updated);
    await supabase.from('goals').update({ completed }).eq('id', goalId);

    if (completed && goal) {
      await awardXp(goal.xp_value);
    } else if (!completed && goal) {
      const newTotal = Math.max(0, (profile?.total_xp_earned || 0) - goal.xp_value);
      const newLevel = calculateLevel(newTotal);
      await supabase.from('profiles').update({
        current_xp: getXpInCurrentLevel(newTotal, newLevel),
        total_xp_earned: newTotal,
        user_level: newLevel,
      }).eq('id', user!.id);
      await refreshProfile();
    }

    const allDone = updated.every((g) => g.completed) && updated.length > 0;
    if (allDone && !rings.goals_done) {
      await upsertRing({ goals_done: true });
    } else if (!allDone && rings.goals_done) {
      await upsertRing({ goals_done: false });
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Preparing your day...</Text>
      </View>
    );
  }

  const completedCount = goals.filter((g) => g.completed).length;
  const goalProgress = goals.length > 0 ? completedCount / goals.length : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const streakGoal = streak?.streak_goal || 7;
  const dayOfMonth = new Date().getDate();
  const xpProgressPercent = xpNeeded > 0 ? Math.min(1, currentXpInLevel / xpNeeded) : 0;
  const diffBg = isDark ? DIFFICULTY_BG_DARK : DIFFICULTY_BG_LIGHT;

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        <Text style={[styles.greeting, { color: colors.text }]}>{greeting}.</Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {/* Level & XP Card */}
        <View style={[styles.levelCard, { backgroundColor: colors.surface, borderColor: colors.accent + '40' }]}>
          <View style={styles.levelHeader}>
            <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.levelBadgeText, { color: colors.textInverse }]}>LVL {userLevel}</Text>
            </View>
            <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>
              {currentXpInLevel} / {xpNeeded} XP to next level
            </Text>
          </View>
          <View style={[styles.xpBarTrack, { backgroundColor: colors.borderLight }]}>
            <View style={[styles.xpBarFill, { width: `${xpProgressPercent * 100}%` as any, backgroundColor: colors.accent }]} />
          </View>
          <Text style={[styles.totalXpText, { color: colors.textTertiary }]}>Total XP: {totalXp}</Text>
        </View>

        {/* Completion Rings */}
        <View style={[styles.ringsCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <CompletionRings
            journal={rings.journal_done}
            goals={rings.goals_done}
            goalProgress={goalProgress}
          />
          {rings.day_complete ? (
            <View style={styles.dayCompleteRow}>
              <Feather name="check-circle" size={14} color={colors.success} />
              <Text style={[styles.dayCompleteText, { color: colors.success }]}>Day Complete</Text>
            </View>
          ) : (
            <Text style={[styles.ringsHint, { color: colors.textTertiary }]}>Complete journal and all goals to close your day</Text>
          )}
        </View>

        {/* Streak bar */}
        {streak && (
          <View style={[styles.streakBar, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Feather name="zap" size={14} color={colors.accent} />
            <Text style={[styles.streakText, { color: colors.text }]}>
              {streak.current_streak}/{streakGoal} days
            </Text>
            <View style={[styles.streakTrack, { backgroundColor: colors.borderLight }]}>
              <View style={[styles.streakFill, { width: `${Math.min(1, streak.current_streak / streakGoal) * 100}%` as any, backgroundColor: colors.accent }]} />
            </View>
            <Text style={[styles.streakBest, { color: colors.textTertiary }]}>Best: {streak.longest_streak}</Text>
          </View>
        )}

        {/* Daily Insights */}
        {aiInsight ? (
          <View style={[styles.insightsCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
            <Text style={[styles.insightsLabel, { color: colors.textTertiary }]}>DAILY INSIGHTS</Text>
            <Text style={[styles.insightsText, { color: colors.text }]}>{aiInsight}</Text>
            {aiNextFocus ? (
              <View style={[styles.nextFocusRow, { borderTopColor: colors.borderLight }]}>
                <Text style={[styles.nextFocusLabel, { color: colors.textTertiary }]}>NEXT FOCUS</Text>
                <Text style={[styles.nextFocusText, { color: colors.text }]}>{aiNextFocus}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Goals */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Goals</Text>
          {goals.length > 0 && (
            <Text style={[styles.progressText, { color: colors.textTertiary }]}>{completedCount}/{goals.length} done</Text>
          )}
        </View>

        {generating ? (
          <View style={[styles.generatingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="cpu" size={20} color={colors.textTertiary} />
            <Text style={[styles.generatingText, { color: colors.textSecondary }]}>AI is generating your goals...</Text>
          </View>
        ) : goals.length === 0 && categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="layers" size={32} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No categories yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Add categories in the Profile tab to generate daily goals</Text>
          </View>
        ) : (
          <View style={styles.goalsList}>
            {goals.map((goal) => (
              <Pressable
                key={goal.id}
                style={[
                  styles.goalCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  goal.completed && { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight },
                ]}
                onPress={() => toggleGoal(goal.id, !goal.completed)}
              >
                <View style={[
                  styles.checkbox,
                  { borderColor: colors.border },
                  goal.completed && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}>
                  {goal.completed && <Feather name="check" size={12} color={colors.textInverse} />}
                </View>
                <View style={styles.goalContent}>
                  <Text style={[
                    styles.goalTitle,
                    { color: colors.text },
                    goal.completed && { textDecorationLine: 'line-through', color: colors.textTertiary },
                  ]}>
                    {goal.title}
                  </Text>
                  {goal.description ? (
                    <Text style={[styles.goalDesc, { color: colors.textSecondary }]}>{goal.description}</Text>
                  ) : null}
                  <View style={styles.goalMeta}>
                    <View style={[styles.difficultyBadge, { backgroundColor: diffBg[goal.difficulty] || diffBg.easy }]}>
                      <Text style={[styles.difficultyText, { color: DIFFICULTY_COLORS[goal.difficulty] || DIFFICULTY_COLORS.easy }]}>
                        {goal.difficulty}
                      </Text>
                    </View>
                    <Text style={[styles.xpValueText, { color: colors.accent }]}>+{goal.xp_value} XP</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Monthly chapter hint */}
        <View style={styles.islandHint}>
          <Feather name="map" size={13} color={colors.textTertiary} />
          <Text style={[styles.islandHintText, { color: colors.textTertiary }]}>Day {dayOfMonth}/30 of this month's chapter</Text>
        </View>
      </ScrollView>

      {/* XP gain toast */}
      {xpGain.visible && (
        <View style={[styles.xpToast, { backgroundColor: colors.surface, borderColor: colors.accent + '60' }]}>
          <Feather name="trending-up" size={14} color={colors.accent} />
          <Text style={[styles.xpToastText, { color: colors.accent }]}>+{xpGain.amount} XP</Text>
        </View>
      )}

      {/* Celebration overlay */}
      {rings.day_complete && (
        <Animated.View style={[styles.celebrationOverlay, { opacity: celebrationOpacity }]} pointerEvents="none">
          <View style={[styles.celebrationCard, { backgroundColor: colors.surface, borderColor: colors.success + '40' }]}>
            <Feather name="check-circle" size={28} color={colors.success} />
            <Text style={[styles.celebrationTitle, { color: colors.text }]}>Day Complete</Text>
            <Text style={[styles.celebrationSub, { color: colors.textSecondary }]}>Both rings closed. Your streak continues.</Text>
          </View>
        </Animated.View>
      )}

      {/* Achievement toast */}
      {newAchievement && (
        <View style={[styles.achievementToast, { backgroundColor: colors.primary }]}>
          <Feather name="award" size={16} color={colors.textInverse} />
          <Text style={[styles.achievementText, { color: colors.textInverse }]}>{newAchievement.label}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1 },
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: 'Inter-Medium', fontSize: FontSize.md },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 64, paddingBottom: 32 },
  greeting: { fontFamily: 'Inter-Bold', fontSize: FontSize.xxl },
  date: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, marginTop: 4, marginBottom: Spacing.lg },

  levelCard: {
    borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md,
  },
  levelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  levelBadge: { paddingHorizontal: Spacing.sm + 4, paddingVertical: 4, borderRadius: BorderRadius.sm },
  levelBadgeText: { fontFamily: 'Inter-Bold', fontSize: 12, letterSpacing: 0.5 },
  xpLabel: { fontFamily: 'Inter-Medium', fontSize: FontSize.xs },
  xpBarTrack: { height: 6, borderRadius: BorderRadius.full, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: BorderRadius.full },
  totalXpText: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, marginTop: 6, textAlign: 'right' },

  ringsCard: {
    borderWidth: 1, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm,
    paddingBottom: Spacing.md, marginBottom: Spacing.md, alignItems: 'center',
  },
  dayCompleteRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 4 },
  dayCompleteText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.sm },
  ringsHint: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, marginTop: 4, textAlign: 'center' },

  streakBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2, marginBottom: Spacing.md,
  },
  streakText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.sm, minWidth: 52 },
  streakTrack: { flex: 1, height: 3, borderRadius: BorderRadius.full, overflow: 'hidden' },
  streakFill: { height: '100%', borderRadius: BorderRadius.full },
  streakBest: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs },

  insightsCard: {
    borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg,
  },
  insightsLabel: { fontFamily: 'Inter-Bold', fontSize: 9, letterSpacing: 1, marginBottom: 8 },
  insightsText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, lineHeight: 22 },
  nextFocusRow: { borderTopWidth: 1, marginTop: Spacing.md, paddingTop: Spacing.md },
  nextFocusLabel: { fontFamily: 'Inter-Bold', fontSize: 9, letterSpacing: 1, marginBottom: 4 },
  nextFocusText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.sm, lineHeight: 20 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md },
  progressText: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs },

  goalsList: { gap: Spacing.sm },
  goalCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  goalContent: { flex: 1 },
  goalTitle: { fontFamily: 'Inter-Medium', fontSize: FontSize.md, lineHeight: 22 },
  goalDesc: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, marginTop: 4, lineHeight: 18 },
  goalMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 8 },
  difficultyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm },
  difficultyText: { fontFamily: 'Inter-SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  xpValueText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.xs },

  generatingCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  generatingText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, textAlign: 'center' },

  islandHint: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    justifyContent: 'center', marginTop: Spacing.xl, paddingBottom: Spacing.md,
  },
  islandHintText: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs },

  xpToast: {
    position: 'absolute', top: 80, right: Spacing.lg,
    borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 6,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  xpToastText: { fontFamily: 'Inter-Bold', fontSize: FontSize.sm },

  celebrationOverlay: { position: 'absolute', bottom: 100, left: Spacing.lg, right: Spacing.lg, alignItems: 'center' },
  celebrationCard: {
    borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  celebrationTitle: { fontFamily: 'Inter-Bold', fontSize: FontSize.lg },
  celebrationSub: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, textAlign: 'center' },

  achievementToast: {
    position: 'absolute', bottom: 100, left: Spacing.lg, right: Spacing.lg,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  achievementText: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm, flex: 1 },
});
