import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

const OPTIONS = [
  'Less than 1 month',
  '1–3 months',
  '3–6 months',
  '6–12 months',
  'Over a year',
];

export default function DurationScreen() {
  const router = useRouter();
  const { updateData } = useOnboarding();
  const [selected, setSelected] = useState('');

  function handleNext() {
    updateData({ duration: selected });
    router.push('/onboarding/attempts');
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={Colors.text} />
        </Pressable>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(2 / 10) * 100}%` }]} />
        </View>
        <Text style={styles.stepLabel}>2/10</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>STEP 2</Text>
        <Text style={styles.title}>How long have you been dealing with this?</Text>
        <Text style={styles.subtitle}>This helps us understand your journey.</Text>

        <View style={styles.options}>
          {OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              style={[styles.option, selected === opt && styles.optionSelected]}
              onPress={() => setSelected(opt)}
            >
              <Text style={[styles.optionText, selected === opt && styles.optionTextSelected]}>
                {opt}
              </Text>
              {selected === opt && <Feather name="check" size={16} color={Colors.textInverse} />}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.nextButton, !selected && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!selected}
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
  options: { gap: Spacing.sm, paddingBottom: Spacing.xl },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  optionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionText: { fontFamily: 'Inter-Medium', fontSize: FontSize.md, color: Colors.text, flex: 1 },
  optionTextSelected: { color: Colors.textInverse },
  footer: { paddingTop: Spacing.sm },
  nextButton: {
    backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  nextButtonDisabled: { opacity: 0.3 },
  nextButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.textInverse },
});
