import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

export default function ObstacleScreen() {
  const router = useRouter();
  const { updateData } = useOnboarding();
  const { colors } = useTheme();
  const [text, setText] = useState('');

  function handleNext() {
    updateData({ biggestObstacle: text });
    router.push('/onboarding/success');
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
          <Pressable style={[styles.backButton, { backgroundColor: colors.surfaceElevated }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color={colors.text} />
          </Pressable>
          <View style={[styles.track, { backgroundColor: colors.borderLight }]}>
            <View style={[styles.fill, { width: `${(10 / 11) * 100}%`, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.stepLabel, { color: colors.textTertiary }]}>10/11</Text>
        </View>

        <Text style={[styles.label, { color: colors.textTertiary }]}>STEP 10</Text>
        <Text style={[styles.title, { color: colors.text }]}>What's your biggest obstacle?</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Every successful person has a barrier. What's yours?</Text>

        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
          placeholder={"e.g. \"I know what to do, I just don't do it.\""}
          placeholderTextColor={colors.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          autoFocus
        />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface }]}>
        <Pressable
          style={[styles.nextButton, { backgroundColor: colors.primary }, !text.trim() && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!text.trim()}
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
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.lg, flexGrow: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
  backButton: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  track: { flex: 1, height: 3, borderRadius: BorderRadius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: BorderRadius.full },
  stepLabel: { fontFamily: 'Inter-Medium', fontSize: 11, minWidth: 28, textAlign: 'right' },
  label: { fontFamily: 'Inter-Bold', fontSize: 10, letterSpacing: 1, marginBottom: Spacing.sm },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xl, lineHeight: 30, marginBottom: Spacing.sm },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, lineHeight: 22, marginBottom: Spacing.xl },
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
  nextButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md },
});
