import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

interface DayStatus {
  date: string;
  journal: boolean;
  goals: boolean;
  complete: boolean;
}

interface AchievementRow {
  key: string;
  label: string;
  unlocked_at: string;
}

interface IslandData {
  buildings_count: number;
}

export default function InsightsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [stats, setStats] = useState({ entries: 0, goalsCompleted: 0, goalsTotal: 0, streak: 0, longestStreak: 0, completion: 0 });
  const [prevStats, setPrevStats] = useState({ entries: 0 });
  const [calendarDays, setCalendarDays] = useState<DayStatus[]>([]);
  const [island, setIsland] = useState<IslandData | null>(null);
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);
  const dayOfMonth = new Date().getDate();

  // Build calendar: current month days
  const calendarYear = parseInt(today.slice(0, 4), 10);
  const calendarMonth = parseInt(today.slice(5, 7), 10) - 1;
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay(); // 0=Sun

  const loadData = useCallback(async () => {
    if (!user) return;

    const monthStart = today.slice(0, 7) + '-01';

    const [entriesRes, goalsRes, oldEntriesRes, streakRes, islandRes, achievementsRes, ringsRes] = await Promise.all([
      supabase.from('journal_entries').select('content, entry_date').gte('entry_date', weekAgo),
      supabase.from('goals').select('completed, goal_date').gte('goal_date', weekAgo),
      supabase.from('journal_entries').select('entry_date').gte('entry_date', monthAgo).lt('entry_date', weekAgo),
      supabase.from('streaks').select('*').maybeSingle(),
      supabase.from('island_progress').select('buildings_count').eq('month_year', thisMonth).maybeSingle(),
      supabase.from('achievements').select('key, label, unlocked_at').order('unlocked_at', { ascending: false }),
      supabase.from('daily_rings').select('ring_date, journal_done, goals_done, day_complete').gte('ring_date', monthStart),
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
      goalsTotal: goals.length,
      streak: streak?.current_streak || 0,
      longestStreak: streak?.longest_streak || 0,
      completion,
    });

    setPrevStats({ entries: oldEntries.length });
    setIsland(islandRes.data);
    setAchievements(achievementsRes.data || []);

    // Build calendar days for the current month
    const ringsMap = new Map<string, { journal: boolean; goals: boolean; complete: boolean }>();
    for (const r of (ringsRes.data || [])) {
      ringsMap.set(r.ring_date, {
        journal: r.journal_done,
        goals: r.goals_done,
        complete: r.day_complete,
      });
    }

    const days: DayStatus[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(calendarMonth + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${calendarYear}-${mm}-${dd}`;
      const ring = ringsMap.get(dateStr);
      days.push({
        date: dateStr,
        journal: ring?.journal || false,
        goals: ring?.goals || false,
        complete: ring?.complete || false,
      });
    }
    setCalendarDays(days);
  }, [user, weekAgo, monthAgo, thisMonth, daysInMonth, calendarMonth, calendarYear, today]);

  useEffect(() => { loadData(); }, [loadData]);

  const weeklyRate = stats.entries;
  const prevWeeklyRate = prevStats.entries;
  const consistencyMultiplier = prevWeeklyRate > 0
    ? Math.round((weeklyRate / (prevWeeklyRate / 3)) * 10) / 10
    : null;

  const monthName = new Date(calendarYear, calendarMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  function getDayColor(day: DayStatus): string {
    if (day.date > today) return colors.borderLight;
    if (day.complete) return '#1A56A4';
    if (day.journal || day.goals) return '#1A56A4' + '60';
    return colors.borderLight;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} tintColor={colors.text} />}
    >
      <Text style={[styles.title, { color: colors.text }]}>Insights</Text>
      <Text style={[styles.subtitle, { color: colors.textTertiary }]}>Your progress at a glance</Text>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Feather name="edit-3" size={16} color={colors.text} />
            <Text style={[styles.statNumber, { color: colors.text }]}>{stats.entries}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Entries</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Feather name="check-square" size={16} color={colors.text} />
            <Text style={[styles.statNumber, { color: colors.text }]}>{stats.goalsCompleted}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Goals Done</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Feather name="zap" size={16} color={colors.accent} />
            <Text style={[styles.statNumber, { color: stats.streak > 0 ? colors.accent : colors.text }]}>{stats.streak}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Feather name="percent" size={16} color={colors.text} />
            <Text style={[styles.statNumber, { color: colors.text }]}>{stats.completion}%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Done rate</Text>
          </View>
        </View>
      </View>

      {/* Growth stats */}
      <View style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>
        <Text style={[styles.sectionLabelText, { color: colors.textTertiary }]}>YOUR GROWTH</Text>
      </View>

      <View style={styles.competenceGrid}>
        {stats.longestStreak > 0 && (
          <View style={[styles.competenceCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.competenceNumber, { color: colors.text }]}>{stats.longestStreak}</Text>
            <Text style={[styles.competenceLabel, { color: colors.textSecondary }]}>Personal record{'\n'}(longest streak)</Text>
            {stats.longestStreak === stats.streak && stats.streak > 0 && (
              <View style={[styles.prBadge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.prBadgeText, { color: colors.success }]}>NEW RECORD</Text>
              </View>
            )}
          </View>
        )}

        {consistencyMultiplier !== null && consistencyMultiplier > 1 && (
          <View style={[styles.competenceCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.competenceNumber, { color: colors.text }]}>{consistencyMultiplier}x</Text>
            <Text style={[styles.competenceLabel, { color: colors.textSecondary }]}>More consistent{'\n'}than last period</Text>
          </View>
        )}

        <View style={[styles.competenceCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.competenceNumber, { color: colors.text }]}>{stats.completion}%</Text>
          <Text style={[styles.competenceLabel, { color: colors.textSecondary }]}>Goal completion{'\n'}this week</Text>
          {stats.completion >= 80 && (
            <View style={[styles.prBadge, { backgroundColor: colors.accent + '20' }]}>
              <Text style={[styles.prBadgeText, { color: colors.accent }]}>STRONG WEEK</Text>
            </View>
          )}
        </View>
      </View>

      {/* Monthly Calendar */}
      <View style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>
        <Text style={[styles.sectionLabelText, { color: colors.textTertiary }]}>MONTHLY ACTIVITY</Text>
      </View>

      <View style={[styles.calendarCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.calendarHeader}>
          <Feather name="calendar" size={14} color={colors.text} />
          <Text style={[styles.calendarMonthTitle, { color: colors.text }]}>{monthName}</Text>
          <Text style={[styles.calendarDayCount, { color: colors.textTertiary }]}>Day {dayOfMonth}/{daysInMonth}</Text>
        </View>

        {/* Weekday labels */}
        <View style={styles.calendarWeekRow}>
          {weekDays.map((wd) => (
            <Text key={wd} style={[styles.calendarWeekLabel, { color: colors.textTertiary }]}>{wd}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {/* Leading empty cells */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.calendarCell} />
          ))}
          {calendarDays.map((day) => {
            const d = parseInt(day.date.slice(8), 10);
            const isToday = day.date === today;
            const isFuture = day.date > today;
            const dotColor = getDayColor(day);
            return (
              <View key={day.date} style={[styles.calendarCell, isToday && styles.calendarCellToday, isToday && { borderColor: colors.primary }]}>
                <View style={[styles.calendarDot, { backgroundColor: dotColor }]} />
                <Text style={[
                  styles.calendarDayNum,
                  { color: isFuture ? colors.textTertiary : colors.text },
                  isToday && { color: colors.primary, fontFamily: 'Inter-Bold' },
                ]}>
                  {d}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.calendarLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#1A56A4' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Complete day</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#1A56A4' + '60' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Partial</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.borderLight }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Empty</Text>
          </View>
        </View>
      </View>

      {/* Monthly chapter / island */}
      <View style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>
        <Text style={[styles.sectionLabelText, { color: colors.textTertiary }]}>THIS MONTH'S CHAPTER</Text>
      </View>
      <View style={[styles.islandCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.islandHeader}>
          <Feather name="map" size={16} color={colors.text} />
          <Text style={[styles.islandTitle, { color: colors.text }]}>Growth Island</Text>
          <Text style={[styles.islandProgress, { color: colors.textTertiary }]}>Day {dayOfMonth}/30</Text>
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
                  { backgroundColor: colors.borderLight },
                  isFilled && { backgroundColor: colors.primary },
                  isCurrent && { backgroundColor: colors.primary + '50' },
                ]}
              />
            );
          })}
        </View>
        <Text style={[styles.islandCaption, { color: colors.textTertiary }]}>
          {island?.buildings_count || 0} complete days this month
        </Text>
      </View>

      {/* Achievements */}
      {achievements.length > 0 && (
        <>
          <View style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>
            <Text style={[styles.sectionLabelText, { color: colors.textTertiary }]}>ACHIEVEMENTS</Text>
          </View>
          <View style={styles.achievementsList}>
            {achievements.slice(0, 6).map((a) => (
              <View key={a.key} style={[styles.achievementRow, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <View style={[styles.achievementIcon, { backgroundColor: colors.accent + '15' }]}>
                  <Feather name="award" size={14} color={colors.accent} />
                </View>
                <View style={styles.achievementInfo}>
                  <Text style={[styles.achievementLabel, { color: colors.text }]}>{a.label}</Text>
                  <Text style={[styles.achievementDate, { color: colors.textTertiary }]}>
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
          <Feather name="bar-chart-2" size={36} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No data yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Start journaling and completing goals to see patterns here.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 64, paddingBottom: 100 },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xxl },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, marginTop: 4, marginBottom: Spacing.lg },

  sectionLabel: { marginBottom: Spacing.sm },
  sectionLabelText: { fontFamily: 'Inter-Bold', fontSize: 10, letterSpacing: 1 },

  statsGrid: { marginBottom: Spacing.xs },
  statRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1, borderRadius: BorderRadius.md, padding: Spacing.sm + 2, alignItems: 'center',
    gap: 4, borderWidth: 1,
  },
  statNumber: { fontFamily: 'Inter-Bold', fontSize: FontSize.lg },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 10 },

  competenceGrid: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  competenceCard: {
    flex: 1, minWidth: 100, borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  competenceNumber: { fontFamily: 'Inter-Bold', fontSize: FontSize.xl, marginBottom: 2 },
  competenceLabel: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, lineHeight: 16 },
  prBadge: {
    marginTop: Spacing.xs, paddingHorizontal: Spacing.xs + 2, paddingVertical: 2,
    borderRadius: BorderRadius.sm, alignSelf: 'flex-start',
  },
  prBadgeText: { fontFamily: 'Inter-Bold', fontSize: 8, letterSpacing: 0.5 },

  calendarCard: {
    borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.md,
  },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  calendarMonthTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.sm, flex: 1 },
  calendarDayCount: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs },
  calendarWeekRow: { flexDirection: 'row', marginBottom: Spacing.xs },
  calendarWeekLabel: { flex: 1, textAlign: 'center', fontFamily: 'Inter-Medium', fontSize: 10 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: {
    width: `${100 / 7}%` as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 2, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: 'transparent',
  },
  calendarCellToday: { borderWidth: 1 },
  calendarDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 2 },
  calendarDayNum: { fontFamily: 'Inter-Regular', fontSize: 10 },
  calendarLegend: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs },

  islandCard: { borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.md },
  islandHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  islandTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.sm, flex: 1 },
  islandProgress: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs },
  islandGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: Spacing.sm },
  islandBlock: { width: 14, height: 14, borderRadius: 3 },
  islandCaption: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs },

  achievementsList: { gap: Spacing.sm, marginBottom: Spacing.lg },
  achievementRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
  },
  achievementIcon: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  achievementInfo: { flex: 1 },
  achievementLabel: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm },
  achievementDate: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, marginTop: 1 },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, marginTop: Spacing.sm },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
});
