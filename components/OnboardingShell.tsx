import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

interface OnboardingShellProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  encouragement?: string;
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  children: React.ReactNode;
}

export default function OnboardingShell({
  step, totalSteps, title, subtitle, encouragement,
  onBack, onNext, nextDisabled, nextLabel = 'Continue', children,
}: OnboardingShellProps) {
  const progress = (step / totalSteps) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {onBack ? (
          <Pressable style={styles.backButton} onPress={onBack}>
            <Feather name="arrow-left" size={18} color={Colors.text} />
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
        <View style={styles.progressContainer}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress}%` }]} />
          </View>
        </View>
        <Text style={styles.stepLabel}>{step}/{totalSteps}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        <View style={styles.childrenContainer}>{children}</View>
      </View>

      <View style={styles.footer}>
        {encouragement && <Text style={styles.encouragement}>{encouragement}</Text>}
        <Pressable
          style={[styles.nextButton, nextDisabled && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={nextDisabled}
        >
          <Text style={styles.nextButtonText}>{nextLabel}</Text>
          <Feather name="arrow-right" size={16} color={Colors.textInverse} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: 32,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, marginBottom: Spacing.xl,
  },
  backButton: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center', alignItems: 'center',
  },
  progressContainer: { flex: 1 },
  track: {
    height: 3, backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.full, overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: Colors.primary, borderRadius: BorderRadius.full },
  stepLabel: { fontFamily: 'Inter-Medium', fontSize: 11, color: Colors.textTertiary, minWidth: 28, textAlign: 'right' },
  content: { flex: 1 },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xl, color: Colors.text, marginBottom: Spacing.xs },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.lg },
  childrenContainer: { flex: 1 },
  footer: { gap: Spacing.sm },
  encouragement: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  nextButton: {
    backgroundColor: Colors.primary, paddingVertical: 16,
    borderRadius: BorderRadius.md, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  nextButtonDisabled: { opacity: 0.3 },
  nextButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.textInverse },
});
