import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { generateJournalInsight } from '@/lib/ai';
import { Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

interface JournalEntry {
  id: string;
  content: string;
  ai_summary: string | null;
  ai_reflection: string | null;
  ai_next_focus: string | null;
  entry_date: string;
}

const PROMPTS = [
  'What did you build or move forward today?',
  'Where did you show up as your best self?',
  'What did you learn about yourself?',
  'What would you do differently?',
  'What are you most focused on right now?',
];

export default function JournalScreen() {
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [content, setContent] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

  const today = new Date().toISOString().split('T')[0];

  const loadEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('journal_entries').select('*')
      .order('created_at', { ascending: false }).limit(20);
    setEntries(data || []);
  }, [user]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  async function saveEntry() {
    if (!content.trim() || !user) return;
    setSaving(true);

    const { data: savedEntry } = await supabase
      .from('journal_entries')
      .insert({ content: content.trim(), entry_date: today })
      .select().maybeSingle();

    if (!savedEntry) {
      setSaving(false);
      return;
    }

    setEntries((prev) => [savedEntry, ...prev]);
    const savedContent = content.trim();
    setContent('');
    setIsWriting(false);
    setSaving(false);

    // One AI call after save — no retry, no loop
    const recentEntries = entries.slice(0, 2).map(e => ({ content: e.content }));
    const aiResult = await generateJournalInsight({
      userId: user.id,
      content: savedContent,
      recentEntries,
      profile: {
        coaching_style: profile?.coaching_style,
        user_level: profile?.user_level,
        total_xp_earned: profile?.total_xp_earned,
      },
    });

    if (aiResult && (aiResult.summary || aiResult.reflection)) {
      const aiSummary = aiResult.summary || null;
      const aiReflection = aiResult.reflection || null;
      const aiNextFocus = aiResult.next_focus || null;

      await supabase.from('journal_entries')
        .update({ ai_summary: aiSummary, ai_reflection: aiReflection, ai_next_focus: aiNextFocus })
        .eq('id', savedEntry.id);

      setEntries((prev) => prev.map((e) =>
        e.id === savedEntry.id
          ? { ...e, ai_summary: aiSummary, ai_reflection: aiReflection, ai_next_focus: aiNextFocus }
          : e
      ));
    }
  }

  const todayEntry = entries.find((e) => e.entry_date === today);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadEntries(); setRefreshing(false); }} tintColor={colors.text} />}
      >
        <Text style={[styles.title, { color: colors.text }]}>Journal</Text>
        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {!isWriting && !todayEntry && (
          <Pressable style={[styles.writePrompt, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setIsWriting(true)}>
            <Text style={[styles.promptQuestion, { color: colors.text }]}>{prompt}</Text>
            <View style={styles.writeCta}>
              <Feather name="edit-3" size={14} color={colors.textTertiary} />
              <Text style={[styles.writeCtaText, { color: colors.textTertiary }]}>Write today's entry</Text>
            </View>
          </Pressable>
        )}

        {isWriting && (
          <View style={[styles.writeArea, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <Text style={[styles.writeLabel, { color: colors.textSecondary }]}>{prompt}</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Write freely..."
              placeholderTextColor={colors.textTertiary}
              value={content}
              onChangeText={setContent}
              multiline textAlignVertical="top" autoFocus
            />
            <View style={[styles.writeActions, { borderTopColor: colors.borderLight }]}>
              <Pressable onPress={() => { setIsWriting(false); setContent(''); }}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveButton, { backgroundColor: colors.primary }, !content.trim() && styles.disabled]}
                onPress={saveEntry}
                disabled={!content.trim() || saving}
              >
                <Text style={[styles.saveText, { color: colors.textInverse }]}>{saving ? 'Saving...' : 'Save Entry'}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {todayEntry && !isWriting && (
          <View style={[styles.todayCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.todayHeader}>
              <Feather name="check-circle" size={14} color={colors.success} />
              <Text style={[styles.todayLabel, { color: colors.success }]}>Today's Entry</Text>
            </View>
            <Text style={[styles.todayContent, { color: colors.text }]} numberOfLines={4}>{todayEntry.content}</Text>
            {todayEntry.ai_summary && (
              <View style={[styles.aiSummaryBox, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.aiLabel, { color: colors.textTertiary }]}>AI INSIGHT</Text>
                <Text style={[styles.aiSummaryText, { color: colors.textSecondary }]}>{todayEntry.ai_summary}</Text>
              </View>
            )}
            {todayEntry.ai_reflection && (
              <View style={[styles.aiSummaryBox, { backgroundColor: colors.surfaceElevated, marginTop: 4 }]}>
                <Text style={[styles.aiLabel, { color: colors.textTertiary }]}>COACHING</Text>
                <Text style={[styles.aiSummaryText, { color: colors.textSecondary }]}>{todayEntry.ai_reflection}</Text>
              </View>
            )}
            {todayEntry.ai_next_focus && (
              <View style={[styles.aiSummaryBox, { backgroundColor: colors.surfaceElevated, marginTop: 4 }]}>
                <Text style={[styles.aiLabel, { color: colors.textTertiary }]}>NEXT FOCUS</Text>
                <Text style={[styles.aiSummaryText, { color: colors.textSecondary }]}>{todayEntry.ai_next_focus}</Text>
              </View>
            )}
          </View>
        )}

        {entries.length > 0 && (
          <View style={styles.historySection}>
            <Text style={[styles.historyTitle, { color: colors.text }]}>Past Entries</Text>
            {entries.slice(todayEntry ? 1 : 0).map((entry) => (
              <View key={entry.id} style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <Text style={[styles.entryDate, { color: colors.textTertiary }]}>
                  {new Date(entry.entry_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
                <Text style={[styles.entryContent, { color: colors.text }]} numberOfLines={2}>{entry.content}</Text>
              </View>
            ))}
          </View>
        )}

        {entries.length === 0 && !isWriting && (
          <View style={styles.emptyState}>
            <Feather name="book-open" size={36} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Start your journal</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Your first entry is waiting. Tap the prompt above.</Text>
          </View>
        )}
      </ScrollView>

      {!isWriting && todayEntry && (
        <Pressable style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => setIsWriting(true)}>
          <Feather name="plus" size={22} color={colors.textInverse} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 64, paddingBottom: 100 },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xxl },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, marginTop: 4, marginBottom: Spacing.lg },
  writePrompt: {
    borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg,
  },
  promptQuestion: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, lineHeight: 22, marginBottom: Spacing.md },
  writeCta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  writeCtaText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm },
  writeArea: {
    borderWidth: 1.5, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg,
  },
  writeLabel: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm, marginBottom: Spacing.sm },
  textInput: {
    fontFamily: 'Inter-Regular', fontSize: FontSize.md, minHeight: 120, lineHeight: 24,
  },
  writeActions: {
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
    gap: Spacing.md, marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1,
  },
  cancelText: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm },
  saveButton: {
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm,
  },
  disabled: { opacity: 0.35 },
  saveText: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm },
  todayCard: {
    borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg,
  },
  todayHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  todayLabel: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.xs },
  todayContent: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, lineHeight: 20 },
  aiSummaryBox: {
    borderRadius: BorderRadius.sm, padding: Spacing.sm + 2, marginTop: Spacing.sm,
  },
  aiLabel: { fontFamily: 'Inter-Bold', fontSize: 9, letterSpacing: 0.8, marginBottom: 4 },
  aiSummaryText: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, lineHeight: 16, fontStyle: 'italic' },
  historySection: { gap: Spacing.sm },
  historyTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, marginBottom: Spacing.xs },
  entryCard: {
    borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  entryDate: { fontFamily: 'Inter-Medium', fontSize: FontSize.xs, marginBottom: 4 },
  entryContent: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, lineHeight: 20 },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, marginTop: Spacing.sm },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 100, right: Spacing.lg, width: 52, height: 52,
    borderRadius: 26, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
});
