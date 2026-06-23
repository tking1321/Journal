import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

export default function SuccessScreen() {
  const router = useRouter();
  const { updateData } = useOnboarding();
  const [text, setText] = useState('');

  function handleNext() {
    updateData({ successVision: text });
    router.push('/onboarding/preview');
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={Colors.text} />
        </Pressable>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(10 / 11) * 100}%` }]} />
        </View>
        <Text style={styles.stepLabel}>10/11</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>STEP 10</Text>
        <Text style={styles.title}>What does success look like in 30 days?</Text>
        <Text style={styles.subtitle}>If you stick with this, what will change?</Text>

        <TextInput
          style={styles.input}
          placeholder={"e.g. \"I wake up with clarity, I ship work I'm proud of, I feel in control.\""}
          placeholderTextColor={Colors.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          autoFocus
        />
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.nextButton, !text.trim() && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!text.trim()}
        >
          <Text style={styles.nextButtonText}>See your plan</Text>
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
  subtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.xl },
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
  nextButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.textInverse },
});
