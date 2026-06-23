import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

export default function GrowthScreen() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();
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
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Feather name="arrow-left" size={18} color={Colors.text} />
        </Pressable>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(5 / 10) * 100}%` }]} />
        </View>
        <Text style={styles.stepLabel}>5/10</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>STEP 5 · CATEGORY {categoryIndex + 1} OF {totalCategories}</Text>
        <Text style={styles.title}>
          For{' '}<Text style={styles.categoryName}>"{category?.name}"</Text>:{'\n'}What does success look like?
        </Text>
        <Text style={styles.subtitle}>
          Describe in 1–2 sentences what progress means to you here.
        </Text>

        <View style={styles.dotsRow}>
          {data.categories.map((_, i) => (
            <View key={i} style={[styles.dot, i === categoryIndex && styles.dotActive, i < categoryIndex && styles.dotDone]} />
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder='e.g. "I want to speak up in meetings without second-guessing myself."'
          placeholderTextColor={Colors.textTertiary}
          value={currentDescription}
          onChangeText={updateDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          autoFocus
        />
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.nextButton, !currentDescription.trim() && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!currentDescription.trim()}
        >
          <Text style={styles.nextButtonText}>
            {isLast ? 'Continue' : `Next: "${data.categories[categoryIndex + 1]?.name}"`}
          </Text>
          <Feather name="arrow-right" size={16} color={Colors.textInverse} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
  backButton: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center', alignItems: 'center',
  },
  track: { flex: 1, height: 3, backgroundColor: Colors.borderLight, borderRadius: BorderRadius.full, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Colors.primary, borderRadius: BorderRadius.full },
  stepLabel: { fontFamily: 'Inter-Medium', fontSize: 11, color: Colors.textTertiary, minWidth: 28, textAlign: 'right' },
  content: { flex: 1 },
  label: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.textTertiary, letterSpacing: 1, marginBottom: Spacing.sm },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xl, color: Colors.text, lineHeight: 30, marginBottom: Spacing.sm },
  categoryName: { color: Colors.primary },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.lg },
  dotsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.borderLight },
  dotActive: { backgroundColor: Colors.primary, width: 20 },
  dotDone: { backgroundColor: Colors.textTertiary },
  input: {
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontFamily: 'Inter-Regular', fontSize: FontSize.md, color: Colors.text,
    minHeight: 120, lineHeight: 24,
  },
  footer: { paddingTop: Spacing.md },
  nextButton: {
    backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  nextButtonDisabled: { opacity: 0.3 },
  nextButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.textInverse, textTransform: 'capitalize' },
});
