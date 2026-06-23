import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

export default function GrowthScreen() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();
  const { colors } = useTheme();
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [descriptions, setDescriptions] = useState<string[]>(
    data.categories.map((c) => c.growthDescription || '')
  );

  const category = data.categories[categoryIndex];
  const currentDescription = descriptions[categoryIndex] || '';
  const totalCategories = data.categories.length;
  const isLast = categoryIndex === totalCategories - 1;

  function updateDescription(text: string) {
    const updated = [...descriptions];
    updated[categoryIndex] = text;
    setDescriptions(updated);
  }

  function handleNext() {
    if (!isLast) {
      setCategoryIndex(categoryIndex + 1);
    } else {
      const updatedCategories = data.categories.map((cat, i) => ({
        ...cat,
        growthDescription: descriptions[i] || '',
      }));
      updateData({ categories: updatedCategories });
      router.push('/onboarding/time');
    }
  }

  function handleBack() {
    if (categoryIndex > 0) {
      setCategoryIndex(categoryIndex - 1);
    } else {
      router.back();
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable style={[styles.backButton, { backgroundColor: colors.surfaceElevated }]} onPress={handleBack}>
            <Feather name="arrow-left" size={18} color={colors.text} />
          </Pressable>
          <View style={[styles.track, { backgroundColor: colors.borderLight }]}>
            <View style={[styles.fill, { width: `${(5 / 10) * 100}%`, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.stepLabel, { color: colors.textTertiary }]}>5/10</Text>
        </View>

        <Text style={[styles.label, { color: colors.textTertiary }]}>STEP 5 · CATEGORY {categoryIndex + 1} OF {totalCategories}</Text>
        <Text style={[styles.title, { color: colors.text }]}>
          For{' '}<Text style={{ color: colors.primary }}>"{category?.name}"</Text>:{'\n'}What does success look like?
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Describe in 1–2 sentences what progress means to you here.
        </Text>

        <View style={styles.dotsRow}>
          {data.categories.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: colors.borderLight },
                i === categoryIndex && { backgroundColor: colors.primary, width: 20 },
                i < categoryIndex && { backgroundColor: colors.textTertiary },
              ]}
            />
          ))}
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
          placeholder='e.g. "I want to speak up in meetings without second-guessing myself."'
          placeholderTextColor={colors.textTertiary}
          value={currentDescription}
          onChangeText={updateDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          autoFocus
        />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface }]}>
        <Pressable
          style={[styles.nextButton, { backgroundColor: colors.primary }, !currentDescription.trim() && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!currentDescription.trim()}
        >
          <Text style={[styles.nextButtonText, { color: colors.textInverse }]}>
            {isLast ? 'Continue' : `Next: "${data.categories[categoryIndex + 1]?.name}"`}
          </Text>
          <Feather name="arrow-right" size={16} color={colors.textInverse} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.lg, flexGrow: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
  backButton: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  track: { flex: 1, height: 3, borderRadius: BorderRadius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: BorderRadius.full },
  stepLabel: { fontFamily: 'Inter-Medium', fontSize: 11, minWidth: 28, textAlign: 'right' },
  label: { fontFamily: 'Inter-Bold', fontSize: 10, letterSpacing: 1, marginBottom: Spacing.sm },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xl, lineHeight: 30, marginBottom: Spacing.sm },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, lineHeight: 22, marginBottom: Spacing.lg },
  dotsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4 },
  input: {
    borderWidth: 1, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontFamily: 'Inter-Regular', fontSize: FontSize.md,
    minHeight: 120, lineHeight: 24,
  },
  footer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: 36 },
  nextButton: {
    paddingVertical: 16, borderRadius: BorderRadius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  nextButtonDisabled: { opacity: 0.3 },
  nextButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, textTransform: 'capitalize' },
});
