import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

interface Goal {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  goal_date: string;
}

export default function GoalsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'today' | 'week' | 'all'>('today');

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  const loadGoals = useCallback(async () => {
    if (!user) return;
    let query = supabase.from('goals').select('*').order('goal_date', { ascending: false });
    if (filter === 'today') query = query.eq('goal_date', today);
    else if (filter === 'week') query = query.gte('goal_date', weekAgo);
    const { data } = await query.limit(50);
    setGoals(data || []);
  }, [user, filter, today, weekAgo]);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  async function toggleGoal(goalId: string, completed: boolean, goalDate: string) {
    if (goalDate !== today) return; // only today's goals can be toggled
    setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, completed } : g)));
    await supabase.from('goals').update({ completed }).eq('id', goalId);
  }

  const completedCount = goals.filter((g) => g.completed).length;
  const completionRate = goals.length > 0 ? Math.round((completedCount / goals.length) * 100) : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadGoals(); setRefreshing(false); }} tintColor={colors.text} />}
    >
      <Text style={[styles.title, { color: colors.text }]}>Goals</Text>

      <View style={styles.statsRow}>
        {[
          { label: 'Completed', value: completedCount },
          { label: 'Total', value: goals.length },
          { label: 'Rate', value: `${completionRate}%`, good: completionRate >= 70 },
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.statNumber, { color: (s as any).good ? colors.success : colors.text }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.filterRow}>
        {(['today', 'week', 'all'] as const).map((f) => (
          <Pressable
            key={f}
            style={[
              styles.filterChip,
              { backgroundColor: colors.surface, borderColor: colors.border },
              filter === f && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[
              styles.filterText,
              { color: colors.textSecondary },
              filter === f && { color: colors.textInverse },
            ]}>
              {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'All Time'}
            </Text>
          </Pressable>
        ))}
      </View>

      {goals.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="target" size={36} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No goals yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Goals generate daily on the Today tab.</Text>
        </View>
      ) : (
        <View style={styles.goalsList}>
          {goals.map((goal) => {
            const isPastDay = goal.goal_date !== today;
            return (
            <Pressable
              key={goal.id}
              style={[
                styles.goalCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                goal.completed && { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight },
                isPastDay && { opacity: 0.7 },
              ]}
              onPress={() => !isPastDay && toggleGoal(goal.id, !goal.completed, goal.goal_date)}
              disabled={isPastDay}
            >
              <View style={[
                styles.checkbox,
                { borderColor: colors.border },
                goal.completed && { backgroundColor: colors.primary, borderColor: colors.primary },
                isPastDay && !goal.completed && { borderColor: colors.borderLight },
              ]}>
                {goal.completed && <Feather name="check" size={12} color={colors.textInverse} />}
              </View>
              <View style={styles.goalContent}>
                <Text style={[
                  styles.goalTitle,
                  { color: colors.text },
                  goal.completed && { textDecorationLine: 'line-through', color: colors.textTertiary },
                ]}>{goal.title}</Text>
                <Text style={[styles.goalMeta, { color: colors.textTertiary }]}>
                  {goal.goal_date}{isPastDay ? ' · past' : ''}
                </Text>
              </View>
            </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 64, paddingBottom: 100 },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xxl, marginBottom: Spacing.lg },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center',
  },
  statNumber: { fontFamily: 'Inter-Bold', fontSize: FontSize.xl },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  filterChip: {
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  filterText: { fontFamily: 'Inter-Medium', fontSize: FontSize.xs },
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
  goalMeta: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, marginTop: Spacing.sm },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, textAlign: 'center' },
});
