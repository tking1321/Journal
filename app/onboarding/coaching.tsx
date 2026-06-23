import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

const OPTIONS = [
  {
    value: 'strict coach',
    label: 'Strict coach',
    desc: 'Pushes me hard, no excuses',
  },
  {
    value: 'gentle coach',
    label: 'Gentle coach',
    desc: 'Empathetic, supportive',
  },
  {
    value: 'reflective prompts',
    label: 'Reflective prompts',
    desc: 'Asks questions, not answers',
  },
  {
    value: 'direct action',
    label: 'Direct action',
    desc: 'Clear steps, no fluff',
  },
];

export default function CoachingScreen() {
  const router = useRouter();
  const { updateData } = useOnboarding();
  const [selected, setSelected] = useState('');

  function handleNext() {
    updateData({ coachingStyle: selected });
    router.push('/onboarding/journaling');
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={Colors.text} />
        </Pressable>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(8 / 11) * 100}%` }]} />
        </View>
        <Text style={styles.stepLabel}>8/11</Text>
      </View>

      <Text style={styles.label}>STEP 8</Text>
      <Text style={styles.title}>What kind of support do you want?</Text>
      <Text style={styles.subtitle}>No two people grow the same way. How do you want your coach to be?</Text>

      <View style={styles.options}>
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.option, selected === opt.value && styles.optionSelected]}
            onPress={() => setSelected(opt.value)}
          >
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, selected === opt.value && styles.optionLabelSelected]}>
                {opt.label}
              </Text>
              <Text style={[styles.optionDesc, selected === opt.value && styles.optionDescSelected]}>
                {opt.desc}
              </Text>
            </View>
            {selected === opt.value && <Feather name="check" size={16} color={Colors.textInverse} />}
          </Pressable>
        ))}
      </View>

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
  label: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.textTertiary, letterSpacing: 1, marginBottom: Spacing.sm },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xl, color: Colors.text, lineHeight: 30, marginBottom: Spacing.sm },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.xl },
  options: { flex: 1, gap: Spacing.sm },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  optionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionText: { flex: 1 },
  optionLabel: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.text },
  optionLabelSelected: { color: Colors.textInverse },
  optionDesc: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  optionDescSelected: { color: 'rgba(255,255,255,0.7)' },
  footer: { paddingTop: Spacing.md },
  nextButton: {
    backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  nextButtonDisabled: { opacity: 0.3 },
  nextButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.textInverse },
});
