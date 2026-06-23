import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
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

    // Save the entry first (no blocking on AI)
    const { data: savedEntry } = await supabase
      .from('journal_entries')
      .insert({ content: content.trim(), entry_date: today })
      .select().maybeSingle();

    if (!savedEntry) {
      setSaving(false);
      return;
    }

    setEntries((prev) => [savedEntry, ...prev]);
    setContent('');
    setIsWriting(false);
    setSaving(false);

    // One AI call after save — no retry, no loop
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
      const { data: { session } } = await supabase.auth.getSession();

      const recentEntries = entries.slice(0, 2).map(e => ({ content: e.content }));

      const res = await fetch(`${supabaseUrl}/functions/v1/generate-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || supabaseKey}`,
          Apikey: supabaseKey,
        },
        body: JSON.stringify({
          type: 'journal_summary',
          content: content.trim(),
          recentEntries,
          profile: {
            coaching_style: profile?.coaching_style,
            user_level: profile?.user_level,
            total_xp_earned: profile?.total_xp_earned,
          },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const aiSummary = json.summary || null;
        const aiReflection = json.reflection || null;
        const aiNextFocus = json.next_focus || null;

        if (aiSummary || aiReflection) {
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
    } catch (_) {}
  }

  const todayEntry = entries.find((e) => e.entry_date === today);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadEntries(); setRefreshing(false); }} tintColor={Colors.text} />}
      >
        <Text style={styles.title}>Journal</Text>
        <Text style={styles.subtitle}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {!isWriting && !todayEntry && (
          <Pressable style={styles.writePrompt} onPress={() => setIsWriting(true)}>
            <Text style={styles.promptQuestion}>{prompt}</Text>
            <View style={styles.writeCta}>
              <Feather name="edit-3" size={14} color={Colors.textTertiary} />
              <Text style={styles.writeCtaText}>Write today's entry</Text>
            </View>
          </Pressable>
        )}

        {isWriting && (
          <View style={styles.writeArea}>
            <Text style={styles.writeLabel}>{prompt}</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Write freely..."
              placeholderTextColor={Colors.textTertiary}
              value={content}
              onChangeText={setContent}
              multiline textAlignVertical="top" autoFocus
            />
            <View style={styles.writeActions}>
              <Pressable onPress={() => { setIsWriting(false); setContent(''); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveButton, !content.trim() && styles.disabled]}
                onPress={saveEntry}
                disabled={!content.trim() || saving}
              >
                <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Entry'}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {todayEntry && !isWriting && (
          <View style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <Feather name="check-circle" size={14} color={Colors.success} />
              <Text style={styles.todayLabel}>Today's Entry</Text>
            </View>
            <Text style={styles.todayContent} numberOfLines={4}>{todayEntry.content}</Text>
            {todayEntry.ai_summary && (
              <View style={styles.aiSummaryBox}>
                <Text style={styles.aiLabel}>AI INSIGHT</Text>
                <Text style={styles.aiSummaryText}>{todayEntry.ai_summary}</Text>
              </View>
            )}
            {todayEntry.ai_reflection && (
              <View style={[styles.aiSummaryBox, { marginTop: 4 }]}>
                <Text style={styles.aiLabel}>COACHING</Text>
                <Text style={styles.aiSummaryText}>{todayEntry.ai_reflection}</Text>
              </View>
            )}
            {todayEntry.ai_next_focus && (
              <View style={[styles.aiSummaryBox, { marginTop: 4 }]}>
                <Text style={styles.aiLabel}>NEXT FOCUS</Text>
                <Text style={styles.aiSummaryText}>{todayEntry.ai_next_focus}</Text>
              </View>
            )}
          </View>
        )}

        {entries.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Past Entries</Text>
            {entries.slice(todayEntry ? 1 : 0).map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <Text style={styles.entryDate}>
                  {new Date(entry.entry_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
                <Text style={styles.entryContent} numberOfLines={2}>{entry.content}</Text>
              </View>
            ))}
          </View>
        )}

        {entries.length === 0 && !isWriting && (
          <View style={styles.emptyState}>
            <Feather name="book-open" size={36} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Start your journal</Text>
            <Text style={styles.emptySubtitle}>Your first entry is waiting. Tap the prompt above.</Text>
          </View>
        )}
      </ScrollView>

      {!isWriting && todayEntry && (
        <Pressable style={styles.fab} onPress={() => setIsWriting(true)}>
          <Feather name="plus" size={22} color={Colors.textInverse} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 64, paddingBottom: 100 },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xxl, color: Colors.text },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 4, marginBottom: Spacing.lg },
  writePrompt: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg,
  },
  promptQuestion: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.text, lineHeight: 22, marginBottom: Spacing.md },
  writeCta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  writeCtaText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textTertiary },
  writeArea: {
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg,
  },
  writeLabel: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  textInput: {
    fontFamily: 'Inter-Regular', fontSize: FontSize.md, color: Colors.text,
    minHeight: 120, lineHeight: 24,
  },
  writeActions: {
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
    gap: Spacing.md, marginTop: Spacing.md, paddingTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  cancelText: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm, color: Colors.textSecondary },
  saveButton: {
    backgroundColor: Colors.primary, paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm,
  },
  disabled: { opacity: 0.35 },
  saveText: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm, color: Colors.textInverse },
  todayCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg,
  },
  todayHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  todayLabel: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.xs, color: Colors.success },
  todayContent: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
  aiSummaryBox: {
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.sm,
    padding: Spacing.sm + 2, marginTop: Spacing.sm,
  },
  aiLabel: { fontFamily: 'Inter-Bold', fontSize: 9, color: Colors.textTertiary, letterSpacing: 0.8, marginBottom: 4 },
  aiSummaryText: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16, fontStyle: 'italic' },
  historySection: { gap: Spacing.sm },
  historyTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.text, marginBottom: Spacing.xs },
  entryCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  entryDate: { fontFamily: 'Inter-Medium', fontSize: FontSize.xs, color: Colors.textTertiary, marginBottom: 4 },
  entryContent: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.text, marginTop: Spacing.sm },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 100, right: Spacing.lg, width: 52, height: 52,
    borderRadius: 26, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
});
