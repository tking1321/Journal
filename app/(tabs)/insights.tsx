import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

interface WeekPoint {
  label: string;
  entries: number;
  goals: number;
}

interface IslandData {
  buildings_count: number;
}

interface AchievementRow {
  key: string;
  label: string;
  unlocked_at: string;
}

export default function InsightsScreen() {
  const { user, profile } = useAuth();
  const [weeklyData, setWeeklyData] = useState<{ summary: string; patterns: string; reflection?: string; next_focus?: string } | null>(null);
  const [stats, setStats] = useState({ entries: 0, goalsCompleted: 0, streak: 0, longestStreak: 0, completion: 0 });
  const [prevStats, setPrevStats] = useState({ entries: 0 });
  const [chartPoints, setChartPoints] = useState<WeekPoint[]>([]);
  const [island, setIsland] = useState<IslandData | null>(null);
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);
  const dayOfMonth = new Date().getDate();

  const loadData = useCallback(async () => {
    if (!user) return;

    const [entriesRes, goalsRes, oldEntriesRes, streakRes, islandRes, achievementsRes] = await Promise.all([
      supabase.from('journal_entries').select('content, entry_date').gte('entry_date', weekAgo),
      supabase.from('goals').select('completed, goal_date').gte('goal_date', weekAgo),
      supabase.from('journal_entries').select('entry_date').gte('entry_date', monthAgo).lt('entry_date', weekAgo),
      supabase.from('streaks').select('*').maybeSingle(),
      supabase.from('island_progress').select('buildings_count').eq('month_year', thisMonth).maybeSingle(),
      supabase.from('achievements').select('key, label, unlocked_at').order('unlocked_at', { ascending: false }),
    ]);

    const entries = entriesRes.data || [];
    const goals = goalsRes.data || [];
    const oldEntries = oldEntriesRes.data || [];
    const streak = streakRes.data;
    const goalsCompleted = goals.filter((g) => g.completed).length;
    const completion = goals.length > 0 ? Math.round((goalsCompleted / goals.length) * 100) : 0;

    setStats({
      entries: entries.length,
      goalsCompleted,
      streak: streak?.current_streak || 0,
      longestStreak: streak?.longest_streak || 0,
      completion,
    });

    setPrevStats({ entries: oldEntries.length });
    setIsland(islandRes.data);
    setAchievements(achievementsRes.data || []);

    // Build 7-day chart points
    const points: WeekPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayEntries = entries.filter((e) => e.entry_date === dateStr).length;
      const dayGoals = goals.filter((g) => g.goal_date === dateStr && g.completed).length;
      points.push({ label: dayLabel, entries: dayEntries, goals: dayGoals });
    }
    setChartPoints(points);

    // Use cached weekly summary if available from this week
    const cachedResponse = profile?.last_ai_response_json as Record<string, unknown> | null;
    const cachedIsThisWeek = profile?.last_ai_request_type === 'weekly_summary' &&
      profile?.last_ai_request_date &&
      profile.last_ai_request_date >= weekAgo;

    if (cachedIsThisWeek && cachedResponse?.summary) {
      setWeeklyData({
        summary: cachedResponse.summary as string,
        patterns: cachedResponse.insight as string || '',
        reflection: cachedResponse.reflection as string || undefined,
        next_focus: cachedResponse.next_focus as string || undefined,
      });
    }
  }, [user, profile, weekAgo, monthAgo, thisMonth]);

  async function generateWeeklySummary() {
    if (!user || generatingSummary) return;
    setGeneratingSummary(true);

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
      const { data: { session } } = await supabase.auth.getSession();

      const { data: entries } = await supabase
        .from('journal_entries').select('content, entry_date').gte('entry_date', weekAgo);
      const { data: goals } = await supabase
        .from('goals').select('completed, goal_date').gte('goal_date', weekAgo);
      const { data: streak } = await supabase.from('streaks').select('*').maybeSingle();

      const goalsCompleted = (goals || []).filter((g) => g.completed).length;
      const totalGoals = (goals || []).length;

      const res = await fetch(`${supabaseUrl}/functions/v1/generate-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || supabaseKey}`,
          Apikey: supabaseKey,
        },
        body: JSON.stringify({
          type: 'weekly_summary',
          entries: entries || [],
          goalsCompleted,
          totalGoals,
          profile: {
            coaching_style: profile?.coaching_style,
            user_level: profile?.user_level,
            total_xp_earned: profile?.total_xp_earned,
          },
          streakData: streak ? { current_streak: streak.current_streak, longest_streak: streak.longest_streak } : null,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.summary) {
          setWeeklyData({
            summary: json.summary,
            patterns: json.insight || '',
            reflection: json.reflection || undefined,
            next_focus: json.next_focus || undefined,
          });
          setGeneratingSummary(false);
          return;
        }
      }
    } catch (_) {}

    // Fallback
    const completion = stats.entries > 0 ? Math.round((stats.goalsCompleted / Math.max(stats.entries, 1)) * 100) : 0;
    setWeeklyData({
      summary: `You journaled ${stats.entries} time${stats.entries !== 1 ? 's' : ''} and completed ${stats.goalsCompleted} goals this week. ${stats.completion >= 70 ? 'Strong execution.' : 'Keep building consistency.'}`,
      patterns: stats.entries >= 3
        ? "You're developing a regular reflection practice."
        : 'Building the journaling habit is your current edge.',
    });
    void completion;
    setGeneratingSummary(false);
  }

  useEffect(() => { loadData(); }, [loadData]);

  // Consistency comparison
  const weeklyRate = stats.entries;
  const prevWeeklyRate = prevStats.entries;
  const consistencyMultiplier = prevWeeklyRate > 0
    ? Math.round((weeklyRate / (prevWeeklyRate / 3)) * 10) / 10
    : null;

  // Chart max
  const chartMax = Math.max(1, ...chartPoints.map((p) => p.entries + p.goals));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} tintColor={Colors.text} />}
    >
      <Text style={styles.title}>Insights</Text>
      <Text style={styles.subtitle}>Last 7 days</Text>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Feather name="edit-3" size={16} color={Colors.text} />
            <Text style={styles.statNumber}>{stats.entries}</Text>
            <Text style={styles.statLabel}>Entries</Text>
          </View>
          <View style={styles.statCard}>
            <Feather name="check-square" size={16} color={Colors.text} />
            <Text style={styles.statNumber}>{stats.goalsCompleted}</Text>
            <Text style={styles.statLabel}>Goals Done</Text>
          </View>
          <View style={styles.statCard}>
            <Feather name="zap" size={16} color={Colors.accent} />
            <Text style={[styles.statNumber, stats.streak > 0 && styles.accentNumber]}>{stats.streak}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Feather name="percent" size={16} color={Colors.text} />
            <Text style={styles.statNumber}>{stats.completion}%</Text>
            <Text style={styles.statLabel}>Done rate</Text>
          </View>
        </View>
      </View>

      {/* Competence feedback */}
      <View style={styles.sectionLabel}>
        <Text style={styles.sectionLabelText}>YOUR GROWTH</Text>
      </View>

      <View style={styles.competenceGrid}>
        {stats.longestStreak > 0 && (
          <View style={styles.competenceCard}>
            <Text style={styles.competenceNumber}>{stats.longestStreak}</Text>
            <Text style={styles.competenceLabel}>Personal record{'\n'}(longest streak)</Text>
            {stats.longestStreak === stats.streak && stats.streak > 0 && (
              <View style={styles.prBadge}>
                <Text style={styles.prBadgeText}>NEW RECORD</Text>
              </View>
            )}
          </View>
        )}

        {consistencyMultiplier !== null && consistencyMultiplier > 1 && (
          <View style={styles.competenceCard}>
            <Text style={styles.competenceNumber}>{consistencyMultiplier}x</Text>
            <Text style={styles.competenceLabel}>More consistent{'\n'}than last period</Text>
          </View>
        )}

        <View style={styles.competenceCard}>
          <Text style={styles.competenceNumber}>{stats.completion}%</Text>
          <Text style={styles.competenceLabel}>Goal completion{'\n'}this week</Text>
          {stats.completion >= 80 && (
            <View style={[styles.prBadge, styles.prBadgeGold]}>
              <Text style={styles.prBadgeText}>STRONG WEEK</Text>
            </View>
          )}
        </View>
      </View>

      {/* 7-day trend chart */}
      {chartPoints.length > 0 && (
        <>
          <View style={styles.sectionLabel}>
            <Text style={styles.sectionLabelText}>7-DAY ACTIVITY</Text>
          </View>
          <View style={styles.chartCard}>
            <View style={styles.chartBars}>
              {chartPoints.map((point, i) => {
                const total = point.entries + point.goals;
                const barHeight = chartMax > 0 ? (total / chartMax) * 56 : 0;
                const isToday = i === 6;
                return (
                  <View key={i} style={styles.chartCol}>
                    <View style={styles.barWrap}>
                      <View
                        style={[
                          styles.bar,
                          { height: Math.max(3, barHeight) },
                          isToday && styles.barToday,
                          total === 0 && styles.barEmpty,
                        ]}
                      />
                    </View>
                    <Text style={[styles.chartLabel, isToday && styles.chartLabelToday]}>
                      {point.label}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                <Text style={styles.legendText}>Journal + Goals</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Monthly chapter / island */}
      <View style={styles.sectionLabel}>
        <Text style={styles.sectionLabelText}>THIS MONTH'S CHAPTER</Text>
      </View>
      <View style={styles.islandCard}>
        <View style={styles.islandHeader}>
          <Feather name="map" size={16} color={Colors.text} />
          <Text style={styles.islandTitle}>Growth Island</Text>
          <Text style={styles.islandProgress}>Day {dayOfMonth}/30</Text>
        </View>
        <View style={styles.islandGrid}>
          {Array.from({ length: 30 }).map((_, i) => {
            const buildings = island?.buildings_count || 0;
            const isFilled = i < buildings;
            const isCurrent = i === buildings && i < dayOfMonth;
            return (
              <View
                key={i}
                style={[
                  styles.islandBlock,
                  isFilled && styles.islandBlockFilled,
                  isCurrent && styles.islandBlockCurrent,
                ]}
              />
            );
          })}
        </View>
        <Text style={styles.islandCaption}>
          {island?.buildings_count || 0} complete days this month
        </Text>
      </View>

      {/* AI weekly summary */}
      <View style={styles.sectionLabel}>
        <Text style={styles.sectionLabelText}>WEEKLY REVIEW</Text>
      </View>

      {weeklyData ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardText}>{weeklyData.summary}</Text>
          </View>
          {weeklyData.patterns ? (
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>PATTERN INSIGHT</Text>
              <Text style={styles.cardText}>{weeklyData.patterns}</Text>
            </View>
          ) : null}
          {weeklyData.reflection ? (
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>COACHING FOR NEXT WEEK</Text>
              <Text style={styles.cardText}>{weeklyData.reflection}</Text>
            </View>
          ) : null}
          {weeklyData.next_focus ? (
            <View style={[styles.card, styles.focusCard]}>
              <Text style={styles.cardEyebrow}>NEXT FOCUS</Text>
              <Text style={styles.focusText}>{weeklyData.next_focus}</Text>
            </View>
          ) : null}
        </>
      ) : (
        <Pressable
          style={[styles.generateBtn, generatingSummary && styles.generateBtnDisabled]}
          onPress={generateWeeklySummary}
          disabled={generatingSummary}
        >
          {generatingSummary ? (
            <>
              <ActivityIndicator size="small" color={Colors.textInverse} />
              <Text style={styles.generateBtnText}>Generating...</Text>
            </>
          ) : (
            <>
              <Feather name="cpu" size={14} color={Colors.textInverse} />
              <Text style={styles.generateBtnText}>Generate Weekly Review</Text>
            </>
          )}
        </Pressable>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <>
          <View style={styles.sectionLabel}>
            <Text style={styles.sectionLabelText}>ACHIEVEMENTS</Text>
          </View>
          <View style={styles.achievementsList}>
            {achievements.slice(0, 6).map((a) => (
              <View key={a.key} style={styles.achievementRow}>
                <View style={styles.achievementIcon}>
                  <Feather name="award" size={14} color={Colors.accent} />
                </View>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementLabel}>{a.label}</Text>
                  <Text style={styles.achievementDate}>
                    {new Date(a.unlocked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {stats.entries === 0 && stats.goalsCompleted === 0 && (
        <View style={styles.emptyState}>
          <Feather name="bar-chart-2" size={36} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptySubtitle}>Start journaling and completing goals to see patterns here.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 64, paddingBottom: 100 },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xxl, color: Colors.text },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 4, marginBottom: Spacing.lg },

  sectionLabel: { marginBottom: Spacing.sm, marginTop: Spacing.lg },
  sectionLabelText: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.textTertiary, letterSpacing: 1 },

  statsGrid: { marginBottom: Spacing.xs },
  statRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1, borderRadius: BorderRadius.md, padding: Spacing.sm + 2, alignItems: 'center',
    gap: 4, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight,
  },
  statNumber: { fontFamily: 'Inter-Bold', fontSize: FontSize.lg, color: Colors.text },
  accentNumber: { color: Colors.accent },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 10, color: Colors.textSecondary },

  competenceGrid: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  competenceCard: {
    flex: 1, minWidth: 100, backgroundColor: Colors.surface, borderWidth: 1,
    borderColor: Colors.borderLight, borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  competenceNumber: { fontFamily: 'Inter-Bold', fontSize: FontSize.xl, color: Colors.text, marginBottom: 2 },
  competenceLabel: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  prBadge: {
    marginTop: Spacing.xs, backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.xs + 2, paddingVertical: 2,
    borderRadius: BorderRadius.sm, alignSelf: 'flex-start',
  },
  prBadgeGold: { backgroundColor: Colors.accent + '20' },
  prBadgeText: { fontFamily: 'Inter-Bold', fontSize: 8, color: Colors.success, letterSpacing: 0.5 },

  chartCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
  },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 80, paddingBottom: 20 },
  chartCol: { flex: 1, alignItems: 'center' },
  barWrap: { flex: 1, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: {
    width: '70%', backgroundColor: Colors.text, borderRadius: 3, minHeight: 3,
  },
  barToday: { backgroundColor: Colors.primary },
  barEmpty: { backgroundColor: Colors.borderLight },
  chartLabel: {
    fontFamily: 'Inter-Regular', fontSize: 9, color: Colors.textTertiary,
    position: 'absolute', bottom: 0,
  },
  chartLabelToday: { color: Colors.text, fontFamily: 'Inter-SemiBold' },
  chartLegend: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textSecondary },

  islandCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
  },
  islandHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  islandTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.sm, color: Colors.text, flex: 1 },
  islandProgress: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textTertiary },
  islandGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: Spacing.sm },
  islandBlock: {
    width: 14, height: 14, borderRadius: 3,
    backgroundColor: Colors.borderLight,
  },
  islandBlockFilled: { backgroundColor: Colors.primary },
  islandBlockCurrent: { backgroundColor: Colors.primary + '50' },
  islandCaption: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textTertiary },

  card: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight,
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  cardEyebrow: { fontFamily: 'Inter-Bold', fontSize: 9, color: Colors.textTertiary, letterSpacing: 1, marginBottom: Spacing.sm },
  cardText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.text, lineHeight: 22 },

  achievementsList: { gap: Spacing.sm, marginBottom: Spacing.lg },
  achievementRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
  },
  achievementIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.accent + '15', justifyContent: 'center', alignItems: 'center',
  },
  achievementInfo: { flex: 1 },
  achievementLabel: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm, color: Colors.text },
  achievementDate: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 1 },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.text, marginTop: Spacing.sm },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  generateBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: 14, paddingHorizontal: Spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.sm, color: Colors.textInverse },
  focusCard: { borderColor: Colors.accent + '40', borderWidth: 1 },
  focusText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.text, lineHeight: 22 },
});
