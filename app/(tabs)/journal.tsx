import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, RefreshControl, Modal, ActivityIndicator, Alert, useWindowDimensions, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { generateJournalInsight, JournalInsightResult } from '@/lib/ai';
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
  const { height } = useWindowDimensions();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [content, setContent] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

  // New-entry insight modal
  const [insightVisible, setInsightVisible] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightData, setInsightData] = useState<JournalInsightResult | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [insightEntryId, setInsightEntryId] = useState<string | null>(null);

  // Past-entry detail modal
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [entryInsightLoading, setEntryInsightLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  function formatEntryDate(entry: JournalEntry): string {
    const isToday = entry.entry_date === today;
    const date = isToday
      ? 'Today'
      : new Date(entry.entry_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return date;
  }

  const loadEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('journal_entries').select('*')
      .order('created_at', { ascending: false }).limit(30);
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

    if (!savedEntry) { setSaving(false); return; }

    setEntries((prev) => [savedEntry, ...prev]);
    const savedContent = content.trim();
    const entriesForAi = entries.slice(0, 2).map(e => ({ content: e.content }));
    setContent('');
    setIsWriting(false);
    setSaving(false);

    setInsightData(null);
    setInsightError(null);
    setInsightLoading(true);
    setInsightVisible(true);
    setInsightEntryId(savedEntry.id);

    const { result, error: aiError } = await generateJournalInsight({
      content: savedContent,
      recentEntries: entriesForAi,
      profile: {
        coaching_style: profile?.coaching_style,
        user_level: profile?.user_level,
        total_xp_earned: profile?.total_xp_earned,
      },
    });

    setInsightLoading(false);

    if (result && (result.summary || result.reflection)) {
      setInsightData(result);
      const aiSummary = result.summary || null;
      const aiReflection = result.reflection || null;
      const aiNextFocus = result.next_focus || result.action_step || null;

      await supabase.from('journal_entries')
        .update({ ai_summary: aiSummary, ai_reflection: aiReflection, ai_next_focus: aiNextFocus })
        .eq('id', savedEntry.id);

      setEntries((prev) => prev.map((e) =>
        e.id === savedEntry.id
          ? { ...e, ai_summary: aiSummary, ai_reflection: aiReflection, ai_next_focus: aiNextFocus }
          : e
      ));
    } else {
      setInsightError(aiError ?? 'Could not generate insight. Please try again later.');
    }
  }

  function openEntry(entry: JournalEntry) {
    setSelectedEntry(entry);
    setEditingContent(entry.content);
    setIsEditMode(false);
    setEntryModalVisible(true);
  }

  async function saveEdit() {
    if (!selectedEntry || !editingContent.trim()) return;
    setEditSaving(true);
    await supabase.from('journal_entries')
      .update({ content: editingContent.trim() })
      .eq('id', selectedEntry.id);
    const updated = { ...selectedEntry, content: editingContent.trim() };
    setSelectedEntry(updated);
    setEntries((prev) => prev.map((e) => e.id === selectedEntry.id ? updated : e));
    setIsEditMode(false);
    setEditSaving(false);
  }

  async function deleteEntry() {
    if (!selectedEntry) return;
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this journal entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await supabase.from('journal_entries').delete().eq('id', selectedEntry.id);
            setEntries((prev) => prev.filter((e) => e.id !== selectedEntry.id));
            setEntryModalVisible(false);
            setSelectedEntry(null);
          },
        },
      ]
    );
  }

  async function generateEntryInsight() {
    if (!selectedEntry || entryInsightLoading) return;
    setEntryInsightLoading(true);

    const recentEntries = entries
      .filter((e) => e.id !== selectedEntry.id)
      .slice(0, 2)
      .map((e) => ({ content: e.content }));

    const { result, error: aiError } = await generateJournalInsight({
      content: selectedEntry.content,
      recentEntries,
      profile: {
        coaching_style: profile?.coaching_style,
        user_level: profile?.user_level,
        total_xp_earned: profile?.total_xp_earned,
      },
    });

    setEntryInsightLoading(false);

    if (result && (result.summary || result.reflection)) {
      const aiSummary = result.summary || null;
      const aiReflection = result.reflection || null;
      const aiNextFocus = result.next_focus || result.action_step || null;

      await supabase.from('journal_entries')
        .update({ ai_summary: aiSummary, ai_reflection: aiReflection, ai_next_focus: aiNextFocus })
        .eq('id', selectedEntry.id);

      const updated = { ...selectedEntry, ai_summary: aiSummary, ai_reflection: aiReflection, ai_next_focus: aiNextFocus };
      setSelectedEntry(updated);
      setEntries((prev) => prev.map((e) => e.id === selectedEntry.id ? updated : e));
    }
  }

  const todayEntries = entries.filter((e) => e.entry_date === today);

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

        {!isWriting && (
          <Pressable style={[styles.writePrompt, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setIsWriting(true)}>
            <Text style={[styles.promptQuestion, { color: colors.text }]}>{prompt}</Text>
            <View style={styles.writeCta}>
              <Feather name="edit-3" size={14} color={colors.textTertiary} />
              <Text style={[styles.writeCtaText, { color: colors.textTertiary }]}>
                {todayEntries.length > 0 ? 'Write another entry' : "Write today's entry"}
              </Text>
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

        {entries.length > 0 && (
          <View style={styles.historySection}>
            {entries.map((entry) => (
              <Pressable
                key={entry.id}
                style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
                onPress={() => openEntry(entry)}
              >
                <View style={styles.entryCardHeader}>
                  <Text style={[styles.entryDate, { color: colors.textTertiary }]}>
                    {formatEntryDate(entry)}
                  </Text>
                  <View style={styles.entryCardRight}>
                    {entry.ai_summary && (
                      <View style={[styles.insightDot, { backgroundColor: colors.primary + '30' }]}>
                        <Feather name="zap" size={9} color={colors.primary} />
                      </View>
                    )}
                    <Feather name="chevron-right" size={14} color={colors.textTertiary} />
                  </View>
                </View>
                <Text style={[styles.entryContent, { color: colors.text }]} numberOfLines={2}>{entry.content}</Text>
              </Pressable>
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

      {!isWriting && (
        <Pressable style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => setIsWriting(true)}>
          <Feather name="plus" size={22} color={colors.textInverse} />
        </Pressable>
      )}

      {/* New-entry Diverge Insight Modal */}
      <Modal
        visible={insightVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => !insightLoading && setInsightVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, height: height * 0.75 }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.borderLight }]} />

            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBadge, { backgroundColor: colors.primary + '18' }]}>
                <Feather name="zap" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Diverge Insight</Text>
            </View>

            {insightLoading ? (
              <View style={styles.loadingBlock}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Reflecting on your entry...</Text>
              </View>
            ) : insightError ? (
              <View style={styles.errorBlock}>
                <Feather name="alert-circle" size={22} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.textSecondary }]}>{insightError}</Text>
              </View>
            ) : insightData ? (
              <ScrollView style={styles.insightScroll} showsVerticalScrollIndicator={false}>
                {insightData.summary ? (
                  <View style={[styles.insightSection, { borderBottomColor: colors.borderLight }]}>
                    <Text style={[styles.insightSectionLabel, { color: colors.textTertiary }]}>INSIGHT</Text>
                    <Text style={[styles.insightSectionText, { color: colors.text }]}>{insightData.summary}</Text>
                  </View>
                ) : null}
                {insightData.reflection ? (
                  <View style={[styles.insightSection, { borderBottomColor: colors.borderLight }]}>
                    <Text style={[styles.insightSectionLabel, { color: colors.textTertiary }]}>COACHING</Text>
                    <Text style={[styles.insightSectionText, { color: colors.text }]}>{insightData.reflection}</Text>
                  </View>
                ) : null}
                {(insightData.next_focus || insightData.action_step) ? (
                  <View style={[styles.insightSection, { borderBottomColor: 'transparent' }]}>
                    <Text style={[styles.insightSectionLabel, { color: colors.textTertiary }]}>NEXT FOCUS</Text>
                    <Text style={[styles.insightSectionText, { color: colors.text }]}>
                      {insightData.next_focus || insightData.action_step}
                    </Text>
                  </View>
                ) : null}
                {insightData.action_step && insightData.next_focus ? (
                  <View style={[styles.insightSection, { borderBottomColor: 'transparent' }]}>
                    <Text style={[styles.insightSectionLabel, { color: colors.textTertiary }]}>ACTION STEP</Text>
                    <Text style={[styles.insightSectionText, { color: colors.text }]}>{insightData.action_step}</Text>
                  </View>
                ) : null}
              </ScrollView>
            ) : null}

            <Pressable
              style={[styles.modalDoneButton, { backgroundColor: colors.primary }, insightLoading && styles.disabled]}
              onPress={() => setInsightVisible(false)}
              disabled={insightLoading}
            >
              <Text style={[styles.modalDoneText, { color: colors.textInverse }]}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Past-entry Detail Modal */}
      <Modal
        visible={entryModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => { setEntryModalVisible(false); setIsEditMode(false); }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.entryModalSheet, { backgroundColor: colors.surface, height: height * 0.88 }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.borderLight }]} />

            {/* Entry modal header */}
            <View style={styles.entryModalHeader}>
              <View style={styles.entryModalMeta}>
                <Feather name="calendar" size={13} color={colors.textTertiary} />
                <Text style={[styles.entryModalDate, { color: colors.textTertiary }]}>
                  {selectedEntry
                    ? new Date(selectedEntry.entry_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                    : ''}
                </Text>
              </View>
              <View style={styles.entryModalActions}>
                {!isEditMode && (
                  <>
                    <Pressable
                      style={[styles.entryActionBtn, { backgroundColor: colors.surfaceElevated }]}
                      onPress={() => { setIsEditMode(true); setEditingContent(selectedEntry?.content || ''); }}
                    >
                      <Feather name="edit-2" size={14} color={colors.text} />
                    </Pressable>
                    <Pressable
                      style={[styles.entryActionBtn, { backgroundColor: colors.error + '15' }]}
                      onPress={deleteEntry}
                    >
                      <Feather name="trash-2" size={14} color={colors.error} />
                    </Pressable>
                  </>
                )}
                <Pressable
                  style={[styles.entryActionBtn, { backgroundColor: colors.surfaceElevated }]}
                  onPress={() => { setEntryModalVisible(false); setIsEditMode(false); }}
                >
                  <Feather name="x" size={16} color={colors.text} />
                </Pressable>
              </View>
            </View>

            <ScrollView style={styles.entryModalScroll} showsVerticalScrollIndicator={false}>
              {isEditMode ? (
                <View>
                  <TextInput
                    style={[styles.editInput, { color: colors.text, borderColor: colors.primary, backgroundColor: colors.background }]}
                    value={editingContent}
                    onChangeText={setEditingContent}
                    multiline
                    textAlignVertical="top"
                    autoFocus
                    placeholderTextColor={colors.textTertiary}
                  />
                  <View style={styles.editActions}>
                    <Pressable
                      style={[styles.editCancelBtn, { borderColor: colors.border }]}
                      onPress={() => { setIsEditMode(false); setEditingContent(selectedEntry?.content || ''); }}
                    >
                      <Text style={[styles.editCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.editSaveBtn, { backgroundColor: colors.primary }, (!editingContent.trim() || editSaving) && styles.disabled]}
                      onPress={saveEdit}
                      disabled={!editingContent.trim() || editSaving}
                    >
                      <Text style={[styles.editSaveText, { color: colors.textInverse }]}>{editSaving ? 'Saving...' : 'Save Changes'}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Text style={[styles.entryModalContent, { color: colors.text }]}>{selectedEntry?.content}</Text>
              )}

              {/* Existing insights */}
              {!isEditMode && selectedEntry && (selectedEntry.ai_summary || selectedEntry.ai_reflection || selectedEntry.ai_next_focus) ? (
                <View style={[styles.existingInsights, { borderTopColor: colors.borderLight }]}>
                  <Text style={[styles.insightSectionLabel, { color: colors.textTertiary }]}>DIVERGE INSIGHTS</Text>
                  {selectedEntry.ai_summary && (
                    <View style={[styles.insightBlock, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
                      <Text style={[styles.insightBlockLabel, { color: colors.textTertiary }]}>INSIGHT</Text>
                      <Text style={[styles.insightBlockText, { color: colors.text }]}>{selectedEntry.ai_summary}</Text>
                    </View>
                  )}
                  {selectedEntry.ai_reflection && (
                    <View style={[styles.insightBlock, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
                      <Text style={[styles.insightBlockLabel, { color: colors.textTertiary }]}>COACHING</Text>
                      <Text style={[styles.insightBlockText, { color: colors.text }]}>{selectedEntry.ai_reflection}</Text>
                    </View>
                  )}
                  {selectedEntry.ai_next_focus && (
                    <View style={[styles.insightBlock, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
                      <Text style={[styles.insightBlockLabel, { color: colors.textTertiary }]}>NEXT FOCUS</Text>
                      <Text style={[styles.insightBlockText, { color: colors.text }]}>{selectedEntry.ai_next_focus}</Text>
                    </View>
                  )}
                </View>
              ) : !isEditMode && selectedEntry && !selectedEntry.ai_summary ? (
                <View style={[styles.existingInsights, { borderTopColor: colors.borderLight }]}>
                  <Pressable
                    style={[styles.generateInsightBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }, entryInsightLoading && styles.disabled]}
                    onPress={generateEntryInsight}
                    disabled={entryInsightLoading}
                  >
                    {entryInsightLoading ? (
                      <>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={[styles.generateInsightText, { color: colors.textSecondary }]}>Generating insight...</Text>
                      </>
                    ) : (
                      <>
                        <Feather name="zap" size={14} color={colors.primary} />
                        <Text style={[styles.generateInsightText, { color: colors.primary }]}>Generate Diverge Insight</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              ) : null}

              {/* Re-generate button removed — only initial generation is allowed */}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  todayHeaderRight: { flex: 1, alignItems: 'flex-end' },
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
  entryCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  entryCardRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  insightDot: { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  entryDate: { fontFamily: 'Inter-Medium', fontSize: FontSize.xs },
  entryContent: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, lineHeight: 20 },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, marginTop: Spacing.sm },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 100, right: Spacing.lg, width: 52, height: 52,
    borderRadius: 26, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },

  // New-entry insight modal
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 20,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },
  modalIconBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontFamily: 'Inter-Bold', fontSize: FontSize.lg },
  loadingBlock: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl },
  loadingText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm },
  errorBlock: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
  errorText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  insightScroll: { flex: 1, marginBottom: Spacing.md },
  insightSection: { paddingVertical: Spacing.md, borderBottomWidth: 1 },
  insightSectionLabel: { fontFamily: 'Inter-Bold', fontSize: 10, letterSpacing: 1, marginBottom: 6 },
  insightSectionText: { fontFamily: 'Inter-Regular', fontSize: FontSize.md, lineHeight: 24 },
  modalDoneButton: {
    marginTop: Spacing.md, paddingVertical: 14, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  modalDoneText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md },

  // Past-entry detail modal
  entryModalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 20,
  },
  entryModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  entryModalMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flex: 1 },
  entryModalDate: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm },
  entryModalActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  entryActionBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  entryModalScroll: { flex: 1 },
  entryModalContent: { fontFamily: 'Inter-Regular', fontSize: FontSize.md, lineHeight: 26, marginBottom: Spacing.xl },
  editInput: {
    fontFamily: 'Inter-Regular', fontSize: FontSize.md, lineHeight: 24,
    borderWidth: 1.5, borderRadius: BorderRadius.md, padding: Spacing.md,
    minHeight: 160, marginBottom: Spacing.md,
  },
  editActions: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  editCancelBtn: { flex: 1, borderWidth: 1, borderRadius: BorderRadius.md, paddingVertical: 12, alignItems: 'center' },
  editCancelText: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm },
  editSaveBtn: { flex: 1, borderRadius: BorderRadius.md, paddingVertical: 12, alignItems: 'center' },
  editSaveText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.sm },
  existingInsights: { borderTopWidth: 1, paddingTop: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md },
  insightBlock: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md },
  insightBlockLabel: { fontFamily: 'Inter-Bold', fontSize: 9, letterSpacing: 0.8, marginBottom: 6 },
  insightBlockText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, lineHeight: 20 },
  generateInsightBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderWidth: 1, borderRadius: BorderRadius.md, paddingVertical: Spacing.md,
  },
  generateInsightText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.sm },
  regenBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    borderTopWidth: 1, paddingTop: Spacing.md, marginTop: Spacing.sm,
  },
  regenBtnText: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs },
});
