import { useState } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import OnboardingShell from '@/components/OnboardingShell';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

const OPTIONS = [
  { value: '6:00 AM', label: '6:00 AM', desc: 'Pre-day clarity' },
  { value: '8:00 AM', label: '8:00 AM', desc: 'Morning intention' },
  { value: '12:00 PM', label: '12:00 PM', desc: 'Midday reset' },
  { value: '6:00 PM', label: '6:00 PM', desc: 'End-of-day review' },
  { value: '9:00 PM', label: '9:00 PM', desc: 'Evening wind-down' },
];

export default function RemindersScreen() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();
  const [selected, setSelected] = useState(data.reminderTime);

  function handleNext() {
    updateData({ reminderTime: selected });
    router.push('/onboarding/preview');
  }

  return (
    <OnboardingShell
      step={8} totalSteps={8}
      title="When should we check in?"
      subtitle="Pick the time that fits your daily rhythm."
      encouragement="Consistency starts with a protected time slot."
      onBack={() => router.back()}
      onNext={handleNext}
      nextDisabled={!selected}
      nextLabel="See My Plan"
    >
      <View style={styles.options}>
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.option, selected === opt.value && styles.optionSelected]}
            onPress={() => setSelected(opt.value)}
          >
            <View style={styles.optionContent}>
              <Text style={[styles.optionLabel, selected === opt.value && styles.optionLabelSelected]}>{opt.label}</Text>
              <Text style={styles.optionDesc}>{opt.desc}</Text>
            </View>
            {selected === opt.value && <Feather name="check" size={16} color={Colors.text} />}
          </Pressable>
        ))}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  options: { gap: Spacing.sm },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  optionSelected: { borderColor: Colors.primary, backgroundColor: Colors.surfaceElevated },
  optionContent: { flex: 1 },
  optionLabel: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.text },
  optionLabelSelected: { color: Colors.text },
  optionDesc: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
});
