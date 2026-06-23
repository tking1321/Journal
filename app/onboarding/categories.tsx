import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

export default function CategoriesScreen() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();
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

  const canContinue = categories.length >= 2;
  const atMax = categories.length >= 4;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={Colors.text} />
        </Pressable>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(4 / 10) * 100}%` }]} />
        </View>
        <Text style={styles.stepLabel}>4/10</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>STEP 4</Text>
        <Text style={styles.title}>What self-improvement categories do you want to focus on?</Text>
        <Text style={styles.subtitle}>
          Create your own categories. These are personal areas you want to grow in.{'\n'}
          <Text style={styles.hint}>Add 2–4 categories to continue.</Text>
        </Text>

        <View style={styles.examplesRow}>
          {['"better communicator"', '"morning runner"', '"less anxious"'].map((ex) => (
            <View key={ex} style={styles.exampleChip}>
              <Text style={styles.exampleText}>{ex}</Text>
            </View>
          ))}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type a category..."
            placeholderTextColor={Colors.textTertiary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={addCategory}
            returnKeyType="done"
            editable={!atMax}
          />
          <Pressable
            style={[styles.addButton, (!input.trim() || atMax) && styles.disabled]}
            onPress={addCategory}
            disabled={!input.trim() || atMax}
          >
            <Feather name="plus" size={18} color={Colors.textInverse} />
          </Pressable>
        </View>

        <View style={styles.categoryList}>
          {categories.map((cat, i) => (
            <View key={i} style={styles.categoryItem}>
              <View style={styles.categoryBullet}>
                <Text style={styles.categoryBulletNum}>{i + 1}</Text>
              </View>
              <Text style={styles.categoryName}>{cat.name}</Text>
              <Pressable onPress={() => removeCategory(i)} hitSlop={10}>
                <Feather name="x" size={14} color={Colors.textTertiary} />
              </Pressable>
            </View>
          ))}
        </View>

        {atMax && (
          <Text style={styles.maxNote}>Maximum of 4 categories reached.</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {!canContinue && categories.length > 0 && (
          <Text style={styles.requireNote}>Add at least one more category to continue</Text>
        )}
        <Pressable
          style={[styles.nextButton, !canContinue && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!canContinue}
        >
          <Text style={styles.nextButtonText}>Continue</Text>
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
  scroll: { flex: 1 },
  label: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.textTertiary, letterSpacing: 1, marginBottom: Spacing.sm },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xl, color: Colors.text, lineHeight: 30, marginBottom: Spacing.sm },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.md },
  hint: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.sm, color: Colors.text },
  examplesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.lg },
  exampleChip: {
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.borderLight,
    borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4,
  },
  exampleText: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textSecondary },
  inputRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  input: {
    flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 13,
    fontFamily: 'Inter-Regular', fontSize: FontSize.md, color: Colors.text,
  },
  addButton: {
    width: 46, height: 46, borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  disabled: { opacity: 0.35 },
  categoryList: { gap: Spacing.sm, marginBottom: Spacing.sm },
  categoryItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
  },
  categoryBullet: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  categoryBulletNum: { fontFamily: 'Inter-Bold', fontSize: 11, color: Colors.textInverse },
  categoryName: { fontFamily: 'Inter-Medium', fontSize: FontSize.md, color: Colors.text, flex: 1, textTransform: 'capitalize' },
  maxNote: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textTertiary, marginBottom: Spacing.sm },
  footer: { paddingTop: Spacing.sm, gap: Spacing.sm },
  requireNote: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center' },
  nextButton: {
    backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  nextButtonDisabled: { opacity: 0.3 },
  nextButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.textInverse },
});
