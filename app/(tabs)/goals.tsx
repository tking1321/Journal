import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
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

  async function toggleGoal(goalId: string, completed: boolean) {
    setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, completed } : g)));
    await supabase.from('goals').update({ completed }).eq('id', goalId);
  }

  const completedCount = goals.filter((g) => g.completed).length;
  const completionRate = goals.length > 0 ? Math.round((completedCount / goals.length) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadGoals(); setRefreshing(false); }} tintColor={Colors.text} />}
    >
      <Text style={styles.title}>Goals</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{goals.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, completionRate >= 70 && styles.statNumberGood]}>{completionRate}%</Text>
          <Text style={styles.statLabel}>Rate</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {(['today', 'week', 'all'] as const).map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'All Time'}
            </Text>
          </Pressable>
        ))}
      </View>

      {goals.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="target" size={36} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No goals yet</Text>
          <Text style={styles.emptySubtitle}>Goals generate daily on the Today tab.</Text>
        </View>
      ) : (
        <View style={styles.goalsList}>
          {goals.map((goal) => (
            <Pressable
              key={goal.id}
              style={[styles.goalCard, goal.completed && styles.goalCardDone]}
              onPress={() => toggleGoal(goal.id, !goal.completed)}
            >
              <View style={[styles.checkbox, goal.completed && styles.checkboxDone]}>
                {goal.completed && <Feather name="check" size={12} color={Colors.textInverse} />}
              </View>
              <View style={styles.goalContent}>
                <Text style={[styles.goalTitle, goal.completed && styles.goalTitleDone]}>{goal.title}</Text>
                <Text style={styles.goalMeta}>{goal.goal_date}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 64, paddingBottom: 100 },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xxl, color: Colors.text, marginBottom: Spacing.lg },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center',
  },
  statNumber: { fontFamily: 'Inter-Bold', fontSize: FontSize.xl, color: Colors.text },
  statNumberGood: { color: Colors.success },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  filterChip: {
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontFamily: 'Inter-Medium', fontSize: FontSize.xs, color: Colors.textSecondary },
  filterTextActive: { color: Colors.textInverse },
  goalsList: { gap: Spacing.sm },
  goalCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    backgroundColor: Colors.surface, padding: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border,
  },
  goalCardDone: { backgroundColor: Colors.surfaceElevated, borderColor: Colors.borderLight },
  checkbox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  checkboxDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  goalContent: { flex: 1 },
  goalTitle: { fontFamily: 'Inter-Medium', fontSize: FontSize.md, color: Colors.text, lineHeight: 22 },
  goalTitleDone: { textDecorationLine: 'line-through', color: Colors.textTertiary },
  goalMeta: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.text, marginTop: Spacing.sm },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
});
