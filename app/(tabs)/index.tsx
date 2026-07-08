import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl,
  Animated, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { generateDailyGoals, refreshDailyGoals, generateTodayCoaching } from '@/lib/ai';
import { Spacing, BorderRadius, FontSize, getLevelIcon } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';
import CompletionRings from '@/components/CompletionRings';
import LevelsModal from '@/components/LevelsModal';

interface Goal {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  goal_date: string;
  difficulty: string;
  xp_value: number;
  user_note: string | null;
  is_regenerated: boolean;
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
const MAX_LEVEL = 100;

function getThresholdForLevel(level: number): number {
  if (level <= LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[level - 1];
  const lastBase = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const extra = level - LEVEL_THRESHOLDS.length;
  let sum = lastBase;
  for (let i = 0; i < extra; i++) sum += 40 + (LEVEL_THRESHOLDS.length + i) * 5;
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
  while (getThresholdForLevel(lvl + 1) <= totalXp) lvl++;
  return lvl;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#1D6A3A', medium: '#A0620A', hard: '#C0392B',
};

function getLocalToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const DIFFICULTY_BG_LIGHT: Record<string, string> = {
  easy: '#EDF5F0', medium: '#FFF4E6', hard: '#FDE8E6',
};
const DIFFICULTY_BG_DARK: Record<string, string> = {
  easy: '#1a2e20', medium: '#2e2010', hard: '#2e1210',
};

export default function TodayScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [rings, setRings] = useState<DailyRing>({ journal_done: false, goals_done: false, day_complete: false });
  const [coachNote, setCoachNote] = useState('');
  const [aiInsight, setAiInsight] = useState('');
  const [nextFocus, setNextFocus] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [xpGain, setXpGain] = useState<{ amount: number; visible: boolean }>({ amount: 0, visible: false });
  const [recentEntries, setRecentEntries] = useState<{ content: string; entry_date: string }[]>([]);
  const celebrationOpacity = useRef(new Animated.Value(0)).current;

  // Goal modal
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalComment, setGoalComment] = useState('');
  const [goalRegenerating, setGoalRegenerating] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [levelsModalVisible, setLevelsModalVisible] = useState(false);
  const [goalSaved, setGoalSaved] = useState(false);

  // Auto-gen guards
  const goalAutoRef = useRef(false);
  const coachAutoRef = useRef(false);

  const [today, setToday] = useState(getLocalToday);

  const userLevel = profile?.user_level || 1;
  const totalXp = profile?.total_xp_earned || 0;
  const currentXpInLevel = getXpInCurrentLevel(totalXp, userLevel);
  const xpNeeded = getXpForNextLevel(userLevel);
  const levelIcon = getLevelIcon(userLevel);

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
    setRecentEntries(entries);

    if (fetchedRings) setRings(fetchedRings);

    const hasJournalToday = entries.some((e) => e.entry_date === today);
    if (hasJournalToday && fetchedRings && !fetchedRings.journal_done) {
      await updateRing({ journal_done: true }, fetchedRings);
    }

    setGoals(fetchedGoals);

    if (fetchedGoals.length > 0 && fetchedGoals.every((g) => g.completed)) {
      if (fetchedRings && !fetchedRings.goals_done) {
        await updateRing({ goals_done: true }, fetchedRings);
      }
    }

    const cachedResponse = profile?.last_ai_response_json as Record<string, unknown> | null;
    const lastType = (profile as Record<string, unknown>)?.last_ai_request_type as string | null;
    const lastDate = (profile as Record<string, unknown>)?.last_ai_request_date as string | null;

    if (profile?.last_coaching_generation_date === today && profile?.last_coaching_note) {
      setCoachNote(profile.last_coaching_note);
    } else if (lastDate === today && cachedResponse) {
      if (lastType === 'today_coaching') {
        if (cachedResponse.coach_note) setCoachNote(cachedResponse.coach_note as string);
        if (cachedResponse.next_focus) setNextFocus(cachedResponse.next_focus as string);
        if (cachedResponse.insight) setAiInsight(cachedResponse.insight as string);
      } else if (lastType === 'daily_goals') {
        if (cachedResponse.coach_note) setCoachNote(cachedResponse.coach_note as string);
        if (cachedResponse.insight) setAiInsight(cachedResponse.insight as string);
      }
    }

    setLoading(false);
  }, [user, profile, today]);

  // On focus: refresh goals/streak/rings from DB without triggering AI
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      async function refreshFromDb() {
        const [goalsRes, streakRes, ringsRes, journalRes] = await Promise.all([
          supabase.from('goals').select('*').eq('goal_date', today).order('created_at'),
          supabase.from('streaks').select('*').maybeSingle(),
          supabase.from('daily_rings').select('*').eq('ring_date', today).maybeSingle(),
          supabase.from('journal_entries').select('entry_date').eq('entry_date', today).limit(1),
        ]);
        setGoals(goalsRes.data || []);
        if (streakRes.data) setStreak(streakRes.data);
        if (ringsRes.data) {
          const freshRings = ringsRes.data;
          setRings(freshRings);
          const hasJournal = (journalRes.data || []).length > 0;
          if (hasJournal && !freshRings.journal_done) {
            await updateRing({ journal_done: true }, freshRings);
          }
        }
      }
      refreshFromDb();
    }, [user, today])
  );

  // Auto-generate goals once per day if none exist
  useEffect(() => {
    if (!loading && goals.length === 0 && categories.length > 0 && !generating && !goalAutoRef.current) {
      goalAutoRef.current = true;
      handleGenerateGoals(false);
    }
  }, [loading, goals.length, categories.length, generating]);

  // Auto-fetch coaching once per day if not yet done today
  useEffect(() => {
    if (!loading && !coachingLoading && !coachAutoRef.current && user) {
      if (profile?.last_coaching_generation_date === today) {
        coachAutoRef.current = true;
        return;
      }
      if (!coachNote) {
        coachAutoRef.current = true;
        handleGetCoaching();
      }
    }
  }, [loading, coachNote, coachingLoading, profile?.last_coaching_generation_date]);

  // Reset state at local midnight so goals and rings refresh for the new day
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    const timer = setTimeout(() => {
      const newToday = getLocalToday();
      setToday(newToday);
      goalAutoRef.current = false;
      coachAutoRef.current = false;
      setGoals([]);
      setRings({ journal_done: false, goals_done: false, day_complete: false });
      setCoachNote('');
      setAiInsight('');
      setNextFocus('');
    }, msUntilMidnight);
    return () => clearTimeout(timer);
  }, [today]);

  async function upsertRing(updates: Partial<DailyRing>): Promise<DailyRing> {
    const current = rings;
    const merged = { ...current, ...updates };
    const allDone = merged.journal_done && merged.goals_done;
    const wasDayComplete = current.day_complete;
    merged.day_complete = allDone;

    await supabase.from('daily_rings').upsert({
      ring_date: today, ...merged,
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
      ring_date: today, ...merged,
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

    await checkAchievements(newCurrent, newLongest);
  }

  async function checkAchievements(currentStreak: number, longestStreak: number) {
    if (!user) return;
    const milestones = [
      { key: 'streak_7', label: 'First 7-day streak unlocked', threshold: 7 },
      { key: 'streak_14', label: '14-day streak — momentum is real', threshold: 14 },
      { key: 'streak_30', label: '30-day streak — exceptional consistency', threshold: 30 },
    ];
    for (const m of milestones) {
      if (currentStreak === m.threshold || (longestStreak === m.threshold && currentStreak >= m.threshold)) {
        const { data: existing } = await supabase.from('achievements').select('key').eq('key', m.key).maybeSingle();
        if (!existing) {
          await supabase.from('achievements').insert({ key: m.key, label: m.label });
          setNewAchievement({ key: m.key, label: m.label, unlocked_at: new Date().toISOString() });
          setTimeout(() => setNewAchievement(null), 4000);
        }
      }
    }
  }

  async function handleGenerateGoals(isRefresh = false) {
    if (generating) return;
    if (!user || categories.length === 0) return;

    setGenerating(true);

    try {
      if (isRefresh) {
        await supabase.from('goals').delete().eq('goal_date', today).eq('user_id', user.id);
        setGoals([]);
        await supabase.from('profiles').update({ last_goal_refresh_date: today }).eq('id', user.id);
        await refreshProfile();
      }

      const { data: previousGoals } = await supabase
        .from('goals').select('title, completed, difficulty').order('created_at', { ascending: false }).limit(12);

      const aiParams = {
        categories,
        recentEntries,
        previousGoals: previousGoals || [],
        streakData: streak ? { current_streak: streak.current_streak, longest_streak: streak.longest_streak } : null,
        profile: {
          coaching_style: profile?.coaching_style,
          journaling_style: profile?.journaling_style,
          biggest_obstacle: profile?.biggest_obstacle,
          success_vision: profile?.success_vision,
          user_level: profile?.user_level,
          total_xp_earned: profile?.total_xp_earned,
          daily_goal_limit: profile?.daily_goal_limit,
        },
      };

      const result = isRefresh ? await refreshDailyGoals(aiParams) : await generateDailyGoals(aiParams);

      // Guard: if goals were already inserted by a parallel call, don't duplicate
      if (!isRefresh) {
        const { data: existingToday } = await supabase.from('goals').select('id').eq('goal_date', today);
        if (existingToday && existingToday.length > 0) {
          const { data: freshGoals } = await supabase.from('goals').select('*').eq('goal_date', today).order('created_at');
          setGoals(freshGoals || []);
          return;
        }
      }

      const goalCount = profile?.daily_goal_limit || 3;

      if (result && result.daily_goals && result.daily_goals.length > 0) {
        const inserts = result.daily_goals.slice(0, goalCount).map((g) => ({
          title: g.text,
          description: '',
          goal_date: today,
          category_id: categories.find((c) => c.name === g.categoryName)?.id || null,
          difficulty: g.difficulty || 'easy',
          xp_value: g.xp || 5,
        }));
        const { data: newGoals } = await supabase.from('goals').insert(inserts).select();
        setGoals(newGoals || []);
        if (result.coach_note) setCoachNote(result.coach_note);
        if (result.insight) setAiInsight(result.insight);
      } else {
        const fallbackGoals = categories.slice(0, goalCount).map((cat, i) => ({
          title: `Focused time on: ${cat.name}`,
          description: cat.growth_description || `Build your ${cat.name} practice today`,
          goal_date: today,
          category_id: cat.id,
          difficulty: i === 0 ? 'hard' : i === 1 ? 'medium' : 'easy',
          xp_value: i === 0 ? 20 : i === 1 ? 10 : 5,
        }));
        const { data: newGoals } = await supabase.from('goals').insert(fallbackGoals).select();
        setGoals(newGoals || []);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleGetCoaching() {
    if (coachingLoading) return;
    if (!user) return;
    if (profile?.last_coaching_generation_date === today) return;

    setCoachingLoading(true);
    try {
      const { result } = await generateTodayCoaching({
        recentEntries,
        profile: {
          coaching_style: profile?.coaching_style,
          success_vision: profile?.success_vision,
          biggest_obstacle: profile?.biggest_obstacle,
        },
      });

      if (result) {
        if (result.coach_note) setCoachNote(result.coach_note);
        if (result.next_focus) setNextFocus(result.next_focus);
        if (result.insight) setAiInsight(result.insight);

        await supabase.from('profiles').update({
          last_coaching_generation_date: today,
          last_coaching_note: result.coach_note || null,
        }).eq('id', user.id);
        await refreshProfile();
      }
    } finally {
      setCoachingLoading(false);
    }
  }

  async function awardXp(xpAmount: number) {
    if (!user || !profile) return;
    if ((profile.user_level || 1) >= MAX_LEVEL) {
      setXpGain({ amount: xpAmount, visible: true });
      setTimeout(() => setXpGain({ amount: 0, visible: false }), 2000);
      return;
    }
    const newTotal = (profile.total_xp_earned || 0) + xpAmount;
    const newLevel = Math.min(calculateLevel(newTotal), MAX_LEVEL);
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

  function openGoalModal(goal: Goal) {
    setSelectedGoal(goal);
    setGoalComment(goal.user_note || '');
    setGoalSaved(false);
    setGoalModalVisible(true);
  }

  async function closeGoalModal() {
    if (selectedGoal && goalComment.trim() !== (selectedGoal.user_note || '')) {
      await saveGoalNote();
    }
    setGoalModalVisible(false);
    setSelectedGoal(null);
    setGoalComment('');
    setGoalSaved(false);
  }

  async function handleCompleteFromModal(completed: boolean) {
    if (!selectedGoal || !user) return;
    const goal = selectedGoal;

    if (goalComment.trim() !== (goal.user_note || '')) {
      await saveGoalNote();
    }

    const updated = { ...goal, completed };
    setSelectedGoal(updated);
    setGoals((prev) => prev.map((g) => g.id === goal.id ? updated : g));
    await supabase.from('goals').update({ completed }).eq('id', goal.id);

    if (completed) {
      await awardXp(goal.xp_value);
    } else {
      if ((profile?.user_level || 1) < MAX_LEVEL) {
        const newTotal = Math.max(0, (profile?.total_xp_earned || 0) - goal.xp_value);
        const newLevel = calculateLevel(newTotal);
        await supabase.from('profiles').update({
          current_xp: getXpInCurrentLevel(newTotal, newLevel),
          total_xp_earned: newTotal,
          user_level: newLevel,
        }).eq('id', user.id);
        await refreshProfile();
      }
    }

    const updatedGoals = goals.map((g) => g.id === goal.id ? updated : g);
    const allDone = updatedGoals.every((g) => g.completed) && updatedGoals.length > 0;
    if (allDone && !rings.goals_done) {
      await upsertRing({ goals_done: true });
    } else if (!allDone && rings.goals_done) {
      await upsertRing({ goals_done: false });
    }
  }

  async function saveGoalNote() {
    if (!selectedGoal) return;
    const note = goalComment.trim();
    await supabase.from('goals').update({ user_note: note || null }).eq('id', selectedGoal.id);
    const updated = { ...selectedGoal, user_note: note || null };
    setSelectedGoal(updated);
    setGoals((prev) => prev.map((g) => g.id === selectedGoal.id ? updated : g));
  }

  async function handleSaveGoal() {
    if (!selectedGoal || savingGoal || goalSaved) return;
    setSavingGoal(true);

    const note = goalComment.trim();

    // Persist note to goals table if changed
    if (note && note !== (selectedGoal.user_note || '')) {
      await supabase.from('goals').update({ user_note: note }).eq('id', selectedGoal.id);
      const updated = { ...selectedGoal, user_note: note };
      setSelectedGoal(updated);
      setGoals((prev) => prev.map((g) => g.id === selectedGoal.id ? updated : g));
    }

    const { data: savedRow } = await supabase.from('saved_goals').insert({
      original_goal_id: selectedGoal.id,
      title: selectedGoal.title,
      difficulty: selectedGoal.difficulty,
      xp_value: selectedGoal.xp_value,
      goal_date: selectedGoal.goal_date,
    }).select().maybeSingle();

    // Copy note as a comment on the saved goal
    if (savedRow && note) {
      await supabase.from('goal_comments').insert({ saved_goal_id: savedRow.id, text: note });
    }

    setGoalSaved(true);
    setSavingGoal(false);
  }

  async function regenerateSingleGoal() {
    if (!selectedGoal || goalRegenerating || !user) return;
    setGoalRegenerating(true);

    if (goalComment.trim() !== (selectedGoal.user_note || '')) {
      await saveGoalNote();
    }

    const goalId = selectedGoal.id;
    await supabase.from('goals').delete().eq('id', goalId);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));

    const { data: previousGoals } = await supabase
      .from('goals').select('title, completed, difficulty').order('created_at', { ascending: false }).limit(12);

    const result = await refreshDailyGoals({
      categories,
      recentEntries,
      previousGoals: previousGoals || [],
      streakData: streak ? { current_streak: streak.current_streak, longest_streak: streak.longest_streak } : null,
      profile: {
        coaching_style: profile?.coaching_style,
        journaling_style: profile?.journaling_style,
        biggest_obstacle: profile?.biggest_obstacle,
        success_vision: profile?.success_vision,
        user_level: profile?.user_level,
        total_xp_earned: profile?.total_xp_earned,
        daily_goal_limit: 1,
      },
    });

    if (result && result.daily_goals && result.daily_goals.length > 0) {
      const g = result.daily_goals[0];
      const { data: newGoal } = await supabase.from('goals').insert({
        title: g.text,
        description: '',
        goal_date: today,
        category_id: categories.find((c) => c.name === g.categoryName)?.id || null,
        difficulty: g.difficulty || 'easy',
        xp_value: g.xp || 5,
        is_regenerated: true,
      }).select().maybeSingle();
      if (newGoal) setGoals((prev) => [...prev, newGoal]);
    }

    setGoalRegenerating(false);
    closeGoalModal();
  }

  async function onRefresh() {
    setRefreshing(true);
    goalAutoRef.current = false;
    coachAutoRef.current = false;
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

        {/* Level & XP */}
        <Pressable
          style={[styles.levelCard, { backgroundColor: colors.surface, borderColor: colors.accent + '40' }]}
          onPress={() => setLevelsModalVisible(true)}
        >
          <View style={styles.levelHeader}>
            <View style={styles.levelLeft}>
              <View style={[styles.levelIconWrap, { backgroundColor: levelIcon.color + '18', borderColor: levelIcon.color + '40' }]}>
                <Feather name={levelIcon.icon as any} size={16} color={levelIcon.color} />
              </View>
              <View>
                <View style={styles.levelBadgeRow}>
                  <Text style={[styles.levelBadgeText, { color: colors.text }]}>Level {userLevel}</Text>
                  <View style={[styles.levelLabel, { backgroundColor: levelIcon.color + '18' }]}>
                    <Text style={[styles.levelLabelText, { color: levelIcon.color }]}>{levelIcon.label}</Text>
                  </View>
                </View>
                <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>
                  {userLevel >= 100 ? 'Max Level' : `${currentXpInLevel} / ${xpNeeded} XP to next level`}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={14} color={colors.textTertiary} />
          </View>
          {userLevel < 100 && (
            <View style={[styles.xpBarTrack, { backgroundColor: colors.borderLight }]}>
              <View style={[styles.xpBarFill, { width: `${xpProgressPercent * 100}%` as any, backgroundColor: levelIcon.color }]} />
            </View>
          )}
          <Text style={[styles.totalXpText, { color: colors.textTertiary }]}>Total XP: {totalXp}</Text>
        </Pressable>

        <LevelsModal
          visible={levelsModalVisible}
          currentLevel={userLevel}
          onClose={() => setLevelsModalVisible(false)}
        />

        {/* Completion Rings */}
        <View style={[styles.ringsCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <CompletionRings journal={rings.journal_done} goals={rings.goals_done} goalProgress={goalProgress} levelColor={levelIcon.color} />
          {rings.day_complete ? (
            <View style={styles.dayCompleteRow}>
              <Feather name="check-circle" size={14} color={colors.success} />
              <Text style={[styles.dayCompleteText, { color: colors.success }]}>Day Complete</Text>
            </View>
          ) : (
            <Text style={[styles.ringsHint, { color: colors.textTertiary }]}>Complete journal and all goals to close your day</Text>
          )}
        </View>

        {/* Streak */}
        {streak && (
          <View style={[styles.streakBar, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Feather name="zap" size={14} color={colors.accent} />
            <Text style={[styles.streakText, { color: colors.text }]}>
              {streak.current_streak} {streak.current_streak === 1 ? 'day' : 'days'}
            </Text>
            <Text style={[styles.streakSep, { color: colors.borderLight }]}>|</Text>
            <Text style={[styles.streakBest, { color: colors.textTertiary }]}>Best: {streak.longest_streak}</Text>
          </View>
        )}

        {/* Coaching */}
        {coachingLoading ? (
          <View style={[styles.coachingLoading, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.coachingLoadingText, { color: colors.textSecondary }]}>Getting your daily insight...</Text>
          </View>
        ) : coachNote ? (
          <View style={[styles.coachingCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
            <Text style={[styles.coachingLabel, { color: colors.textTertiary }]}>TODAY'S COACHING</Text>
            <Text style={[styles.coachingText, { color: colors.text }]}>{coachNote}</Text>
            {nextFocus ? (
              <View style={[styles.nextFocusRow, { borderTopColor: colors.borderLight }]}>
                <Text style={[styles.nextFocusLabel, { color: colors.textTertiary }]}>NEXT FOCUS</Text>
                <Text style={[styles.nextFocusText, { color: colors.text }]}>{nextFocus}</Text>
              </View>
            ) : null}
            {aiInsight ? (
              <View style={[styles.nextFocusRow, { borderTopColor: colors.borderLight }]}>
                <Text style={[styles.nextFocusLabel, { color: colors.textTertiary }]}>INSIGHT</Text>
                <Text style={[styles.insightText, { color: colors.textSecondary }]}>{aiInsight}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Goals</Text>
          {goals.length > 0 && (
            <Text style={[styles.progressText, { color: colors.textTertiary }]}>{completedCount}/{goals.length} done</Text>
          )}
        </View>

        {/* Goals content */}
        {generating ? (
          <View style={[styles.generatingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.generatingText, { color: colors.textSecondary }]}>Diverge is generating your goals...</Text>
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
                onPress={() => openGoalModal(goal)}
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
                  ]}>{goal.title}</Text>
                  {goal.user_note ? (
                    <Text style={[styles.goalNote, { color: colors.textTertiary }]} numberOfLines={1}>{goal.user_note}</Text>
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
                <Feather name="chevron-right" size={16} color={colors.textTertiary} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* XP toast */}
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

      {/* Goal Detail Modal */}
      <Modal
        visible={goalModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeGoalModal}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.goalModalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.borderLight }]} />

            {/* Modal header */}
            <View style={styles.goalModalHeader}>
              <Text style={[styles.goalModalTitle, { color: colors.text }]} numberOfLines={2}>
                {selectedGoal?.title}
              </Text>
              <Pressable
                style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
                onPress={closeGoalModal}
              >
                <Feather name="x" size={16} color={colors.text} />
              </Pressable>
            </View>

            {/* Badges */}
            {selectedGoal && (
              <View style={styles.goalBadgeRow}>
                <View style={[styles.difficultyBadge, { backgroundColor: diffBg[selectedGoal.difficulty] || diffBg.easy }]}>
                  <Text style={[styles.difficultyText, { color: DIFFICULTY_COLORS[selectedGoal.difficulty] || DIFFICULTY_COLORS.easy }]}>
                    {selectedGoal.difficulty}
                  </Text>
                </View>
                <Text style={[styles.xpValueText, { color: colors.accent }]}>+{selectedGoal.xp_value} XP</Text>
              </View>
            )}

            {/* Reflection field */}
            <Text style={[styles.commentLabel, { color: colors.textTertiary }]}>YOUR REFLECTION</Text>
            <TextInput
              style={[styles.commentInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Add a note or reflection about this goal..."
              placeholderTextColor={colors.textTertiary}
              value={goalComment}
              onChangeText={setGoalComment}
              multiline
              textAlignVertical="top"
              onBlur={saveGoalNote}
            />

            {/* Actions */}
            <View style={styles.goalModalActions}>
              {!selectedGoal?.is_regenerated && (
                <Pressable
                  style={[styles.regenBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }, goalRegenerating && styles.buttonDisabled]}
                  onPress={regenerateSingleGoal}
                  disabled={goalRegenerating}
                >
                  {goalRegenerating ? (
                    <ActivityIndicator size="small" color={colors.textSecondary} />
                  ) : (
                    <Feather name="refresh-cw" size={14} color={colors.textSecondary} />
                  )}
                  <Text style={[styles.regenBtnText, { color: colors.textSecondary }]}>
                    {goalRegenerating ? 'Regenerating...' : 'New Goal'}
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={[
                  styles.saveBtn,
                  { backgroundColor: goalSaved ? colors.surfaceElevated : colors.accent + '18', borderColor: goalSaved ? colors.borderLight : colors.accent + '60' },
                  savingGoal && styles.buttonDisabled,
                ]}
                onPress={handleSaveGoal}
                disabled={savingGoal || goalSaved}
              >
                <Feather name="bookmark" size={14} color={goalSaved ? colors.textTertiary : colors.accent} />
                <Text style={[styles.saveBtnText, { color: goalSaved ? colors.textTertiary : colors.accent }]}>
                  {goalSaved ? 'Saved' : 'Save'}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.completeBtn,
                  selectedGoal?.completed
                    ? { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }
                    : { backgroundColor: colors.primary },
                ]}
                onPress={() => handleCompleteFromModal(!selectedGoal?.completed)}
              >
                <Feather
                  name={selectedGoal?.completed ? 'x-circle' : 'check-circle'}
                  size={16}
                  color={selectedGoal?.completed ? colors.textSecondary : colors.textInverse}
                />
                <Text style={[
                  styles.completeBtnText,
                  { color: selectedGoal?.completed ? colors.textSecondary : colors.textInverse },
                ]}>
                  {selectedGoal?.completed ? 'Undo' : 'Complete'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  levelCard: { borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  levelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  levelLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  levelIconWrap: {
    width: 38, height: 38, borderRadius: BorderRadius.md, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  levelBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 2 },
  levelBadgeText: { fontFamily: 'Inter-Bold', fontSize: FontSize.md },
  levelLabel: { paddingHorizontal: Spacing.xs + 2, paddingVertical: 2, borderRadius: BorderRadius.sm },
  levelLabelText: { fontFamily: 'Inter-SemiBold', fontSize: 10, letterSpacing: 0.3 },
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
  streakText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.sm },
  streakSep: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, marginHorizontal: 2 },
  streakBest: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs },

  coachingLoading: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg,
    justifyContent: 'center',
  },
  coachingLoadingText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm },

  coachingCard: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  coachingLabel: { fontFamily: 'Inter-Bold', fontSize: 9, letterSpacing: 1, marginBottom: 8 },
  coachingText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, lineHeight: 22 },
  nextFocusRow: { borderTopWidth: 1, marginTop: Spacing.md, paddingTop: Spacing.md },
  nextFocusLabel: { fontFamily: 'Inter-Bold', fontSize: 9, letterSpacing: 1, marginBottom: 4 },
  nextFocusText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.sm, lineHeight: 20 },
  insightText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, lineHeight: 20, fontStyle: 'italic' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md },
  progressText: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs },
  buttonDisabled: { opacity: 0.45 },

  goalsList: { gap: Spacing.sm },
  goalCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  goalContent: { flex: 1 },
  goalTitle: { fontFamily: 'Inter-Medium', fontSize: FontSize.md, lineHeight: 22 },
  goalNote: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, marginTop: 2, fontStyle: 'italic' },
  goalMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 6 },
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

  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  goalModalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 20,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
  goalModalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  goalModalTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.lg, lineHeight: 26, flex: 1 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  goalBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  commentLabel: { fontFamily: 'Inter-Bold', fontSize: 10, letterSpacing: 1, marginBottom: Spacing.sm },
  commentInput: {
    borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md,
    fontFamily: 'Inter-Regular', fontSize: FontSize.md, lineHeight: 22,
    minHeight: 80, marginBottom: Spacing.lg,
  },
  goalModalActions: { flexDirection: 'row', gap: Spacing.sm },
  regenBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    borderWidth: 1, borderRadius: BorderRadius.md, paddingVertical: 12,
  },
  regenBtnText: { fontFamily: 'Inter-Medium', fontSize: FontSize.xs },
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    borderWidth: 1, borderRadius: BorderRadius.md, paddingVertical: 12,
  },
  saveBtnText: { fontFamily: 'Inter-Medium', fontSize: FontSize.xs },
  completeBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    borderWidth: 1, borderRadius: BorderRadius.md, paddingVertical: 12,
    borderColor: 'transparent',
  },
  completeBtnText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.sm },
});
