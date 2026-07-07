import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

const COACHING_OPTIONS = [
  { value: 'strict coach', label: 'Strict coach', desc: 'Pushes me hard, no excuses' },
  { value: 'gentle coach', label: 'Gentle coach', desc: 'Empathetic, supportive' },
  { value: 'reflective prompts', label: 'Reflective prompts', desc: 'Asks questions, not answers' },
  { value: 'direct action', label: 'Direct action', desc: 'Clear steps, no fluff' },
];

const JOURNALING_OPTIONS = [
  { value: 'structured reflection', label: 'Structured reflection', desc: 'Guided prompts with clear format' },
  { value: 'free writing', label: 'Free writing', desc: 'Open canvas, no constraints' },
  { value: 'gratitude focus', label: 'Gratitude focus', desc: 'Emphasise what went well' },
  { value: 'challenge based', label: 'Challenge-based', desc: 'Push through discomfort' },
];

const TIME_OPTIONS = [
  { value: '15 minutes', label: '15 min', desc: 'Light touch' },
  { value: '30 minutes', label: '30 min', desc: 'Balanced' },
  { value: '45 minutes', label: '45 min', desc: 'Committed' },
  { value: '60+ minutes', label: '60+ min', desc: 'All in' },
];

const GOAL_LIMIT_OPTIONS = [
  { value: 3, label: '3 goals', desc: '1 easy, 1 medium, 1 hard' },
  { value: 4, label: '4 goals', desc: '2 easy, 1 medium, 1 hard' },
  { value: 5, label: '5 goals', desc: '2 easy, 2 medium, 1 hard' },
  { value: 6, label: '6 goals', desc: '3 easy, 2 medium, 1 hard' },
];

interface Category {
  id: string;
  name: string;
  growth_description: string | null;
}

export default function PreferencesScreen() {
  const router = useRouter();
  const { user, profile, updateProfile } = useAuth();
  const { colors } = useTheme();

  const [coachingStyle, setCoachingStyle] = useState('');
  const [journalingStyle, setJournalingStyle] = useState('');
  const [dailyTime, setDailyTime] = useState('');
  const [goalLimit, setGoalLimit] = useState(0);
  const [biggestObstacle, setBiggestObstacle] = useState('');
  const [successVision, setSuccessVision] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('categories').select('*').order('created_at');
    setCategories(data || []);
  }, [user]);

  useEffect(() => {
    if (profile) {
      setCoachingStyle(profile.coaching_style || '');
      setJournalingStyle(profile.journaling_style || '');
      setDailyTime(profile.daily_time_commitment || '');
      setGoalLimit(profile.daily_goal_limit || 0);
      setBiggestObstacle(profile.biggest_obstacle || '');
      setSuccessVision(profile.success_vision || '');
    }
    loadCategories();
  }, [profile, loadCategories]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        coaching_style: coachingStyle || null,
        journaling_style: journalingStyle || null,
        daily_time_commitment: dailyTime || null,
        daily_goal_limit: goalLimit || 5,
        biggest_obstacle: biggestObstacle.trim() || null,
        success_vision: successVision.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function addCategory() {
    if (!newCategory.trim() || categories.length >= 5) return;
    const { data } = await supabase.from('categories').insert({ name: newCategory.trim() }).select().maybeSingle();
    if (data) { setCategories((prev) => [...prev, data]); setNewCategory(''); }
  }

  async function deleteCategory(id: string) {
    await supabase.from('categories').delete().eq('id', id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    await supabase.from('categories').update({
      name: editName.trim(),
      growth_description: editDesc.trim() || null,
    }).eq('id', id);
    setCategories((prev) => prev.map((c) =>
      c.id === id ? { ...c, name: editName.trim(), growth_description: editDesc.trim() || null } : c
    ));
    setEditingId(null);
    setEditName('');
    setEditDesc('');
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.growth_description || '');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable style={[styles.backButton, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Edit Preferences</Text>
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }]}>
            <Feather name="alert-circle" size={14} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {/* Growth Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Growth Categories</Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>Areas of your life you want to improve. Your AI coach uses these to generate relevant goals.</Text>

          <View style={styles.categoryList}>
            {categories.map((cat) => (
              <View key={cat.id} style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                {editingId === cat.id ? (
                  <View style={styles.editBlock}>
                    <TextInput
                      style={[styles.editInput, { color: colors.text, borderBottomColor: colors.primary }]}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Category name"
                      placeholderTextColor={colors.textTertiary}
                      autoFocus
                    />
                    <TextInput
                      style={[styles.editDescInput, { color: colors.textSecondary, borderBottomColor: colors.borderLight }]}
                      value={editDesc}
                      onChangeText={setEditDesc}
                      placeholder="Description (optional)"
                      placeholderTextColor={colors.textTertiary}
                      multiline
                    />
                    <View style={styles.editActions}>
                      <Pressable style={[styles.editSaveBtn, { backgroundColor: colors.primary }]} onPress={() => saveEdit(cat.id)}>
                        <Text style={[styles.editSaveBtnText, { color: colors.textInverse }]}>Save</Text>
                      </Pressable>
                      <Pressable hitSlop={8} onPress={() => setEditingId(null)}>
                        <Text style={[styles.editCancelText, { color: colors.textTertiary }]}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.categoryRow}>
                    <View style={styles.categoryInfo}>
                      <Text style={[styles.categoryName, { color: colors.text }]}>{cat.name}</Text>
                      {cat.growth_description ? (
                        <Text style={[styles.categoryDesc, { color: colors.textSecondary }]} numberOfLines={2}>{cat.growth_description}</Text>
                      ) : null}
                    </View>
                    <View style={styles.categoryActions}>
                      <Pressable hitSlop={8} onPress={() => startEdit(cat)}>
                        <Feather name="edit-2" size={14} color={colors.textTertiary} />
                      </Pressable>
                      <Pressable hitSlop={8} onPress={() => deleteCategory(cat.id)}>
                        <Feather name="trash-2" size={14} color={colors.error} />
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            ))}

            {categories.length < 5 && (
              <View style={styles.addRow}>
                <TextInput
                  style={[styles.addInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Add a category..."
                  placeholderTextColor={colors.textTertiary}
                  value={newCategory}
                  onChangeText={setNewCategory}
                  onSubmitEditing={addCategory}
                />
                <Pressable
                  style={[styles.addButton, { backgroundColor: colors.primary }, !newCategory.trim() && styles.disabled]}
                  onPress={addCategory}
                  disabled={!newCategory.trim()}
                >
                  <Feather name="plus" size={16} color={colors.textInverse} />
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Coaching Style */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Coaching Style</Text>
          <View style={styles.optionGrid}>
            {COACHING_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.border },
                  coachingStyle === opt.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setCoachingStyle(coachingStyle === opt.value ? '' : opt.value)}
              >
                <Text style={[styles.optionLabel, { color: colors.text }, coachingStyle === opt.value && { color: colors.textInverse }]}>{opt.label}</Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }, coachingStyle === opt.value && { color: 'rgba(255,255,255,0.7)' }]}>{opt.desc}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Journaling Style */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Journaling Style</Text>
          <View style={styles.optionGrid}>
            {JOURNALING_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.border },
                  journalingStyle === opt.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setJournalingStyle(journalingStyle === opt.value ? '' : opt.value)}
              >
                <Text style={[styles.optionLabel, { color: colors.text }, journalingStyle === opt.value && { color: colors.textInverse }]}>{opt.label}</Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }, journalingStyle === opt.value && { color: 'rgba(255,255,255,0.7)' }]}>{opt.desc}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Daily Time Commitment */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Time Commitment</Text>
          <View style={styles.pillRow}>
            {TIME_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.pill, { backgroundColor: colors.surface, borderColor: colors.border },
                  dailyTime === opt.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setDailyTime(dailyTime === opt.value ? '' : opt.value)}
              >
                <Text style={[styles.pillText, { color: colors.text }, dailyTime === opt.value && { color: colors.textInverse }]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Daily Goal Limit */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Goal Count</Text>
          <View style={styles.pillRow}>
            {GOAL_LIMIT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.pill, { backgroundColor: colors.surface, borderColor: colors.border },
                  goalLimit === opt.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setGoalLimit(goalLimit === opt.value ? 0 : opt.value)}
              >
                <Text style={[styles.pillText, { color: colors.text }, goalLimit === opt.value && { color: colors.textInverse }]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Biggest Obstacle */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Biggest Obstacle</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={biggestObstacle}
            onChangeText={setBiggestObstacle}
            placeholder="What's the main thing holding you back?"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Success Vision */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Success Vision</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={successVision}
            onChangeText={setSuccessVision}
            placeholder="What does success look like for you in 6 months?"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Save button */}
        <Pressable
          style={[styles.saveButton, { backgroundColor: colors.primary }, (saving || saved) && styles.disabled]}
          onPress={handleSave}
          disabled={saving || saved}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <>
              <Feather name={saved ? 'check' : 'save'} size={16} color={colors.textInverse} />
              <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>{saved ? 'Saved!' : 'Save Changes'}</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: 100 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },
  backButton: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xl },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderRadius: BorderRadius.sm, padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm, flex: 1 },

  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, marginBottom: 4 },
  sectionDesc: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, lineHeight: 18, marginBottom: Spacing.md },

  categoryList: { gap: Spacing.sm },
  categoryCard: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md },
  categoryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  categoryInfo: { flex: 1 },
  categoryName: { fontFamily: 'Inter-Medium', fontSize: FontSize.md, textTransform: 'capitalize' },
  categoryDesc: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, lineHeight: 16, marginTop: 2 },
  categoryActions: { flexDirection: 'row', gap: Spacing.md, paddingTop: 2 },

  editBlock: { gap: Spacing.sm },
  editInput: {
    fontFamily: 'Inter-Medium', fontSize: FontSize.md,
    borderBottomWidth: 1, paddingVertical: 4,
  },
  editDescInput: {
    fontFamily: 'Inter-Regular', fontSize: FontSize.sm,
    borderBottomWidth: 1, paddingVertical: 4, minHeight: 40,
  },
  editActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: 4 },
  editSaveBtn: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.sm },
  editSaveBtnText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.sm },
  editCancelText: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm },

  addRow: { flexDirection: 'row', gap: Spacing.sm },
  addInput: {
    flex: 1, borderWidth: 1, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    fontFamily: 'Inter-Regular', fontSize: FontSize.md,
  },
  addButton: { width: 38, height: 38, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.4 },

  optionGrid: { gap: Spacing.sm },
  optionCard: {
    borderWidth: 1.5, borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  optionLabel: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md },
  optionDesc: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, marginTop: 2 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  pill: {
    borderWidth: 1.5, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  pillText: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm },

  textArea: {
    borderWidth: 1, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontFamily: 'Inter-Regular', fontSize: FontSize.md, lineHeight: 22, minHeight: 80,
  },

  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 16, borderRadius: BorderRadius.md,
  },
  saveButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md },
});
