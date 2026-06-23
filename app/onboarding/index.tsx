import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

const OPTIONS = [
  "I don't know where to start every day",
  "I keep making the same mistakes",
  "I feel overwhelmed by my thoughts",
  "I can't stay consistent with goals",
  "I don't see progress in my life",
];

export default function ProblemScreen() {
  const router = useRouter();
  const { updateData } = useOnboarding();
  const [selected, setSelected] = useState('');

  function handleNext() {
    updateData({ problem: selected });
    router.push('/onboarding/duration');
  }

  return (
    <View style={styles.container}>
      <View style={styles.progressRow}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(1 / 10) * 100}%` }]} />
        </View>
        <Text style={styles.stepLabel}>1/10</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>STEP 1</Text>
        <Text style={styles.title}>What's your biggest challenge right now?</Text>
        <Text style={styles.subtitle}>
          Most people start journaling because they're stuck in a cycle. You're not alone. What's your biggest struggle?
        </Text>

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
              {selected === opt && (
                <Feather name="check" size={16} color={Colors.textInverse} />
              )}
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
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
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
  optionText: { fontFamily: 'Inter-Medium', fontSize: FontSize.md, color: Colors.text, flex: 1, lineHeight: 22 },
  optionTextSelected: { color: Colors.textInverse },
  footer: { paddingTop: Spacing.sm },
  nextButton: {
    backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  nextButtonDisabled: { opacity: 0.3 },
  nextButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.textInverse },
});
