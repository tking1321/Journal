import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

const OPTIONS = [
  'Regular journaling apps (but I got inconsistent)',
  'Goal-setting apps (but goals felt generic)',
  'Therapy or coaching (but too expensive)',
  'Self-help books (but hard to apply)',
  'Nothing yet',
  'Other apps I can\'t remember',
];

export default function AttemptsScreen() {
  const router = useRouter();
  const { updateData } = useOnboarding();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(opt: string) {
    if (opt === 'Nothing yet') {
      setSelected(['Nothing yet']);
      return;
    }
    setSelected((prev) => {
      const withoutNothing = prev.filter((s) => s !== 'Nothing yet');
      if (withoutNothing.includes(opt)) {
        return withoutNothing.filter((s) => s !== opt);
      }
      return [...withoutNothing, opt];
    });
  }

  function handleNext() {
    updateData({ failedAttempts: selected });
    router.push('/onboarding/categories');
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={Colors.text} />
        </Pressable>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(3 / 10) * 100}%` }]} />
        </View>
        <Text style={styles.stepLabel}>3/10</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>STEP 3</Text>
        <Text style={styles.title}>What have you tried before?</Text>
        <Text style={styles.subtitle}>
          You've probably tried something. What worked (and what didn't)?{'\n'}
          <Text style={styles.hint}>Select all that apply.</Text>
        </Text>

        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const isSelected = selected.includes(opt);
            return (
              <Pressable
                key={opt}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => toggle(opt)}
              >
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Feather name="check" size={12} color={Colors.textInverse} />}
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.nextButton, selected.length === 0 && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={selected.length === 0}
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
  subtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.xl },
  hint: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textTertiary, fontStyle: 'italic' },
  options: { gap: Spacing.sm, paddingBottom: Spacing.xl },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  optionSelected: { borderColor: Colors.primary, backgroundColor: Colors.surfaceElevated },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  checkboxSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionText: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm, color: Colors.text, flex: 1, lineHeight: 20 },
  optionTextSelected: { color: Colors.text },
  footer: { paddingTop: Spacing.sm },
  nextButton: {
    backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  nextButtonDisabled: { opacity: 0.3 },
  nextButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.textInverse },
});
