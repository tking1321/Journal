import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, RefreshControl,
  TextInput, Modal, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

interface SavedGoal {
  id: string;
  title: string;
  difficulty: string;
  xp_value: number;
  goal_date: string | null;
  saved_at: string;
}

interface Comment {
  id: string;
  text: string;
  created_at: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#1D6A3A', medium: '#A0620A', hard: '#C0392B',
};
const DIFFICULTY_BG_LIGHT: Record<string, string> = {
  easy: '#EDF5F0', medium: '#FFF4E6', hard: '#FDE8E6',
};
const DIFFICULTY_BG_DARK: Record<string, string> = {
  easy: '#1a2e20', medium: '#2e2010', hard: '#2e1210',
};

export default function SavedGoalsScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [goals, setGoals] = useState<SavedGoal[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Detail modal
  const [selectedGoal, setSelectedGoal] = useState<SavedGoal | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const { data: savedGoals } = await supabase
      .from('saved_goals')
      .select('*')
      .order('saved_at', { ascending: false });

    const goalsData = savedGoals || [];
    setGoals(goalsData);

    if (goalsData.length > 0) {
      const { data: allComments } = await supabase
        .from('goal_comments')
        .select('*')
        .in('saved_goal_id', goalsData.map((g) => g.id))
        .order('created_at', { ascending: true });

      const grouped: Record<string, Comment[]> = {};
      for (const c of (allComments || [])) {
        if (!grouped[c.saved_goal_id]) grouped[c.saved_goal_id] = [];
        grouped[c.saved_goal_id].push(c);
      }
      setComments(grouped);
    }
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  async function openGoal(goal: SavedGoal) {
    setSelectedGoal(goal);
    setNewComment('');
    setModalVisible(true);
  }

  async function addComment() {
    if (!newComment.trim() || !selectedGoal || savingComment) return;
    setSavingComment(true);
    const { data } = await supabase
      .from('goal_comments')
      .insert({ saved_goal_id: selectedGoal.id, text: newComment.trim() })
      .select()
      .maybeSingle();
    if (data) {
      setComments((prev) => ({
        ...prev,
        [selectedGoal.id]: [...(prev[selectedGoal.id] || []), data],
      }));
      setNewComment('');
    }
    setSavingComment(false);
  }

  async function deleteComment(commentId: string, goalId: string) {
    await supabase.from('goal_comments').delete().eq('id', commentId);
    setComments((prev) => ({
      ...prev,
      [goalId]: (prev[goalId] || []).filter((c) => c.id !== commentId),
    }));
  }

  async function deleteGoal(goalId: string) {
    await supabase.from('saved_goals').delete().eq('id', goalId);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    setComments((prev) => {
      const next = { ...prev };
      delete next[goalId];
      return next;
    });
    setModalVisible(false);
    setSelectedGoal(null);
  }

  const diffBg = isDark ? DIFFICULTY_BG_DARK : DIFFICULTY_BG_LIGHT;

  if (loading) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
      </View>
    );
  }

  return (
    <View style={[styles.outer, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }}
            tintColor={colors.text}
          />
        }
      >
        <Text style={[styles.title, { color: colors.text }]}>Saved Goals</Text>
        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
          Goals you've bookmarked — yours permanently.
        </Text>

        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bookmark" size={36} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved goals yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Tap the bookmark icon on any daily goal to save it here permanently.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {goals.map((goal) => {
              const goalComments = comments[goal.id] || [];
              return (
                <Pressable
                  key={goal.id}
                  style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => openGoal(goal)}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardContent}>
                      <Text style={[styles.goalTitle, { color: colors.text }]} numberOfLines={2}>
                        {goal.title}
                      </Text>
                      <View style={styles.goalMeta}>
                        <View style={[styles.diffBadge, { backgroundColor: diffBg[goal.difficulty] || diffBg.easy }]}>
                          <Text style={[styles.diffText, { color: DIFFICULTY_COLORS[goal.difficulty] || DIFFICULTY_COLORS.easy }]}>
                            {goal.difficulty}
                          </Text>
                        </View>
                        <Text style={[styles.xpText, { color: colors.accent }]}>+{goal.xp_value} XP</Text>
                        {goal.goal_date && (
                          <Text style={[styles.dateText, { color: colors.textTertiary }]}>{goal.goal_date}</Text>
                        )}
                      </View>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.textTertiary} />
                  </View>

                  {goalComments.length > 0 && (
                    <View style={[styles.commentPreview, { borderTopColor: colors.borderLight }]}>
                      <Feather name="message-square" size={11} color={colors.textTertiary} />
                      <Text style={[styles.commentPreviewText, { color: colors.textTertiary }]} numberOfLines={1}>
                        {goalComments[goalComments.length - 1].text}
                      </Text>
                      {goalComments.length > 1 && (
                        <Text style={[styles.commentCount, { color: colors.textTertiary }]}>
                          +{goalComments.length - 1}
                        </Text>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Goal detail modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setModalVisible(false); setSelectedGoal(null); }}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.borderLight }]} />

            {selectedGoal && (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={3}>
                    {selectedGoal.title}
                  </Text>
                  <Pressable
                    style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
                    onPress={() => { setModalVisible(false); setSelectedGoal(null); }}
                  >
                    <Feather name="x" size={16} color={colors.text} />
                  </Pressable>
                </View>

                <View style={styles.badgeRow}>
                  <View style={[styles.diffBadge, { backgroundColor: diffBg[selectedGoal.difficulty] || diffBg.easy }]}>
                    <Text style={[styles.diffText, { color: DIFFICULTY_COLORS[selectedGoal.difficulty] || DIFFICULTY_COLORS.easy }]}>
                      {selectedGoal.difficulty}
                    </Text>
                  </View>
                  <Text style={[styles.xpText, { color: colors.accent }]}>+{selectedGoal.xp_value} XP</Text>
                  {selectedGoal.goal_date && (
                    <Text style={[styles.dateText, { color: colors.textTertiary }]}>
                      from {selectedGoal.goal_date}
                    </Text>
                  )}
                </View>

                <Text style={[styles.commentsLabel, { color: colors.textTertiary }]}>NOTES</Text>

                <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
                  {(comments[selectedGoal.id] || []).length === 0 ? (
                    <Text style={[styles.noComments, { color: colors.textTertiary }]}>No notes yet. Add one below.</Text>
                  ) : (
                    (comments[selectedGoal.id] || []).map((c) => (
                      <View key={c.id} style={[styles.commentItem, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
                        <Text style={[styles.commentText, { color: colors.text }]}>{c.text}</Text>
                        <View style={styles.commentFooter}>
                          <Text style={[styles.commentDate, { color: colors.textTertiary }]}>
                            {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </Text>
                          <Pressable
                            hitSlop={8}
                            onPress={() => deleteComment(c.id, selectedGoal.id)}
                          >
                            <Feather name="trash-2" size={12} color={colors.error} />
                          </Pressable>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>

                <View style={[styles.addCommentRow, { borderTopColor: colors.borderLight }]}>
                  <TextInput
                    style={[styles.commentInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    placeholder="Add a note..."
                    placeholderTextColor={colors.textTertiary}
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                  />
                  <Pressable
                    style={[styles.addBtn, { backgroundColor: colors.primary }, (!newComment.trim() || savingComment) && { opacity: 0.4 }]}
                    onPress={addComment}
                    disabled={!newComment.trim() || savingComment}
                  >
                    {savingComment
                      ? <ActivityIndicator size="small" color={colors.textInverse} />
                      : <Feather name="send" size={14} color={colors.textInverse} />
                    }
                  </Pressable>
                </View>

                <Pressable
                  style={[styles.deleteGoalBtn, { borderColor: colors.error + '30' }]}
                  onPress={() => deleteGoal(selectedGoal.id)}
                >
                  <Feather name="trash-2" size={14} color={colors.error} />
                  <Text style={[styles.deleteGoalText, { color: colors.error }]}>Remove from Saved</Text>
                </Pressable>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 64, paddingBottom: 100 },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xxl, marginBottom: 4 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, marginBottom: Spacing.xl },

  list: { gap: Spacing.sm },
  goalCard: {
    borderWidth: 1, borderRadius: BorderRadius.md, overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md,
  },
  cardContent: { flex: 1 },
  goalTitle: { fontFamily: 'Inter-Medium', fontSize: FontSize.md, lineHeight: 22, marginBottom: 8 },
  goalMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm },
  diffText: { fontFamily: 'Inter-SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  xpText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.xs },
  dateText: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs },

  commentPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  commentPreviewText: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, flex: 1, fontStyle: 'italic' },
  commentCount: { fontFamily: 'Inter-Medium', fontSize: FontSize.xs },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, marginTop: Spacing.sm },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },

  // Modal
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: 40,
    maxHeight: '85%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  sheetTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.lg, lineHeight: 26, flex: 1 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },

  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },

  commentsLabel: { fontFamily: 'Inter-Bold', fontSize: 10, letterSpacing: 1, marginBottom: Spacing.sm },
  commentsList: { maxHeight: 200, marginBottom: Spacing.sm },
  noComments: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, fontStyle: 'italic', paddingVertical: Spacing.sm },
  commentItem: {
    borderWidth: 1, borderRadius: BorderRadius.sm, padding: Spacing.sm + 2, marginBottom: Spacing.xs,
  },
  commentText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, lineHeight: 20 },
  commentFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  commentDate: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs },

  addCommentRow: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end',
    paddingTop: Spacing.md, borderTopWidth: 1, marginBottom: Spacing.md,
  },
  commentInput: {
    flex: 1, borderWidth: 1, borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2, fontFamily: 'Inter-Regular', fontSize: FontSize.sm,
    lineHeight: 20, maxHeight: 80,
  },
  addBtn: {
    width: 38, height: 38, borderRadius: BorderRadius.sm,
    justifyContent: 'center', alignItems: 'center',
  },

  deleteGoalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1,
  },
  deleteGoalText: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm },
});
