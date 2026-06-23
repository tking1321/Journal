import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

export default function CategoriesScreen() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();
  const { colors } = useTheme();
  const [input, setInput] = useState('');
  const [categories, setCategories] = useState(data.categories);

  function addCategory() {
    const trimmed = input.trim();
    if (!trimmed || categories.length >= 4) return;
    setCategories([...categories, { name: trimmed, growthDescription: '' }]);
    setInput('');
  }

  function removeCategory(index: number) {
    setCategories(categories.filter((_, i) => i !== index));
  }

  function handleNext() {
    updateData({ categories });
    router.push('/onboarding/growth');
  }

  const canContinue = categories.length >= 1;
  const atMax = categories.length >= 4;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <View style={[styles.headerRow, { paddingHorizontal: Spacing.lg, paddingTop: 56 }]}>
        <Pressable style={[styles.backButton, { backgroundColor: colors.surfaceElevated }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.text} />
        </Pressable>
        <View style={[styles.track, { backgroundColor: colors.borderLight }]}>
          <View style={[styles.fill, { width: `${(4 / 10) * 100}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.stepLabel, { color: colors.textTertiary }]}>4/10</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: Spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.label, { color: colors.textTertiary }]}>STEP 4</Text>
        <Text style={[styles.title, { color: colors.text }]}>What self-improvement categories do you want to focus on?</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Create your own categories. These are personal areas you want to grow in.{'\n'}
          <Text style={[styles.hint, { color: colors.text }]}>Add at least one category to continue.</Text>
        </Text>

        <View style={styles.examplesRow}>
          {['"better communicator"', '"morning runner"', '"less anxious"'].map((ex) => (
            <View key={ex} style={[styles.exampleChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
              <Text style={[styles.exampleText, { color: colors.textSecondary }]}>{ex}</Text>
            </View>
          ))}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Type a category..."
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={addCategory}
            returnKeyType="done"
            editable={!atMax}
          />
          <Pressable
            style={[styles.addButton, { backgroundColor: colors.primary }, (!input.trim() || atMax) && styles.disabled]}
            onPress={addCategory}
            disabled={!input.trim() || atMax}
          >
            <Feather name="plus" size={18} color={colors.textInverse} />
          </Pressable>
        </View>

        <View style={styles.categoryList}>
          {categories.map((cat, i) => (
            <View key={i} style={[styles.categoryItem, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
              <View style={[styles.categoryBullet, { backgroundColor: colors.primary }]}>
                <Text style={[styles.categoryBulletNum, { color: colors.textInverse }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.categoryName, { color: colors.text }]}>{cat.name}</Text>
              <Pressable onPress={() => removeCategory(i)} hitSlop={10}>
                <Feather name="x" size={14} color={colors.textTertiary} />
              </Pressable>
            </View>
          ))}
        </View>

        {atMax && (
          <Text style={[styles.maxNote, { color: colors.textTertiary }]}>Maximum of 4 categories reached.</Text>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, paddingHorizontal: Spacing.lg }]}>
        <Pressable
          style={[styles.nextButton, { backgroundColor: colors.primary }, !canContinue && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!canContinue}
        >
          <Text style={[styles.nextButtonText, { color: colors.textInverse }]}>Continue</Text>
          <Feather name="arrow-right" size={16} color={colors.textInverse} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  backButton: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  track: { flex: 1, height: 3, borderRadius: BorderRadius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: BorderRadius.full },
  stepLabel: { fontFamily: 'Inter-Medium', fontSize: 11, minWidth: 28, textAlign: 'right' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.lg },
  label: { fontFamily: 'Inter-Bold', fontSize: 10, letterSpacing: 1, marginBottom: Spacing.sm },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xl, lineHeight: 30, marginBottom: Spacing.sm },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, lineHeight: 22, marginBottom: Spacing.md },
  hint: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.sm },
  examplesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.lg },
  exampleChip: {
    borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4,
  },
  exampleText: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs },
  inputRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  input: {
    flex: 1, borderWidth: 1, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 13,
    fontFamily: 'Inter-Regular', fontSize: FontSize.md,
  },
  addButton: {
    width: 46, height: 46, borderRadius: BorderRadius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  disabled: { opacity: 0.35 },
  categoryList: { gap: Spacing.sm, marginBottom: Spacing.sm },
  categoryItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderWidth: 1, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
  },
  categoryBullet: {
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  categoryBulletNum: { fontFamily: 'Inter-Bold', fontSize: 11 },
  categoryName: { fontFamily: 'Inter-Medium', fontSize: FontSize.md, flex: 1, textTransform: 'capitalize' },
  maxNote: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, marginBottom: Spacing.sm },
  footer: { paddingTop: Spacing.sm, paddingBottom: 36 },
  nextButton: {
    paddingVertical: 16, borderRadius: BorderRadius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  nextButtonDisabled: { opacity: 0.3 },
  nextButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md },
});
