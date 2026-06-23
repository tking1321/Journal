import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

const BENEFITS = [
  'Personalized daily goals from your focus areas',
  'AI coaching tuned to your personality',
  'Private journal with AI-generated reflections',
  'Streak tracking and weekly progress insights',
  'Your growth plan, built around your answers',
];

export default function PaywallIntroScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconWrap}>
          <Feather name="trending-up" size={28} color={Colors.textInverse} />
        </View>

        <Text style={styles.title}>Start free.{'\n'}See your growth in 7 days.</Text>
        <Text style={styles.subtitle}>
          No charge today. Cancel before day 8 and you owe nothing.
        </Text>

        <View style={styles.benefitsList}>
          {BENEFITS.map((benefit, i) => (
            <View key={i} style={styles.benefitRow}>
              <View style={styles.checkWrap}>
                <Feather name="check" size={13} color={Colors.textInverse} />
              </View>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.ctaButton} onPress={() => router.push('/paywall/plans')}>
          <Text style={styles.ctaText}>Choose Your Plan</Text>
          <Feather name="arrow-right" size={16} color={Colors.textInverse} />
        </Pressable>
        <Text style={styles.footnote}>7-day free trial. Cancel anytime. No commitment.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 72, paddingBottom: Spacing.xl },
  iconWrap: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xl,
  },
  title: { fontFamily: 'Inter-Bold', fontSize: 30, color: Colors.text, lineHeight: 38, marginBottom: Spacing.md },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 24, marginBottom: Spacing.xl },
  benefitsList: { gap: Spacing.md },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  checkWrap: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  benefitText: { fontFamily: 'Inter-Regular', fontSize: FontSize.md, color: Colors.text, flex: 1, lineHeight: 22 },
  footer: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingBottom: 36, gap: Spacing.sm },
  ctaButton: {
    backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  ctaText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.textInverse },
  footnote: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textTertiary, textAlign: 'center' },
});
