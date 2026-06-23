import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

const FEATURES = [
  'Unlimited AI-generated daily goals',
  'Personalized coaching voice',
  'Private journal with AI reflections',
  'Streak tracking and analytics',
  'Weekly progress insights',
];

export default function TrialScreen() {
  const router = useRouter();
  const { updateProfile } = useAuth();

  async function handleStartTrial() {
    await updateProfile({
      subscription_status: 'trial',
      subscription_plan: 'annual',
      trial_start_date: new Date().toISOString(),
    });
    router.replace('/(tabs)');
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={Colors.text} />
        </Pressable>

        <Text style={styles.eyebrow}>ANNUAL PLAN — 7-DAY FREE TRIAL</Text>
        <Text style={styles.title}>Start building now.{'\n'}Pay nothing today.</Text>

        <View style={styles.card}>
          <View style={styles.cardPriceRow}>
            <Text style={styles.cardFree}>$0</Text>
            <Text style={styles.cardFreeLabel}>today</Text>
          </View>
          <View style={styles.cardDivider} />
          <Text style={styles.cardAfter}>$72/year after 7 days</Text>
          <Text style={styles.cardCancel}>Cancel anytime before day 8 — no charge</Text>

          <View style={styles.featureList}>
            {FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Feather name="check" size={14} color={Colors.textInverse} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.timeline}>
          <Text style={styles.timelineTitle}>How it works</Text>
          {[
            { day: 'Today', text: 'Full premium access, no charge' },
            { day: 'Day 5', text: 'Reminder before your trial ends' },
            { day: 'Day 8', text: 'First charge — $72 for the year' },
          ].map((step, i) => (
            <View key={i} style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineDay}>{step.day}</Text>
                <Text style={styles.timelineText}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.ctaButton} onPress={handleStartTrial}>
          <Text style={styles.ctaText}>Start 7-Day Free Trial</Text>
        </Pressable>
        <Text style={styles.terms}>
          Annual plan only. Cancel before day 8 to avoid charges.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.xl },
  backButton: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  eyebrow: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.textTertiary, letterSpacing: 1, marginBottom: Spacing.sm },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xxl, color: Colors.text, lineHeight: 36, marginBottom: Spacing.xl },
  card: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.xl,
  },
  cardPriceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs, marginBottom: Spacing.md },
  cardFree: { fontFamily: 'Inter-Bold', fontSize: 48, color: Colors.textInverse, lineHeight: 52 },
  cardFreeLabel: { fontFamily: 'Inter-Regular', fontSize: FontSize.md, color: 'rgba(255,255,255,0.6)', paddingBottom: 8 },
  cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: Spacing.md },
  cardAfter: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.textInverse, marginBottom: 4 },
  cardCancel: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: 'rgba(255,255,255,0.6)', marginBottom: Spacing.lg },
  featureList: { gap: Spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  featureText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: 'rgba(255,255,255,0.85)' },
  timeline: { gap: Spacing.md, paddingBottom: Spacing.xl },
  timelineTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.text, marginBottom: Spacing.xs },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.text, marginTop: 6, flexShrink: 0 },
  timelineContent: { flex: 1 },
  timelineDay: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.sm, color: Colors.text },
  timelineText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  footer: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingBottom: 36, gap: Spacing.sm },
  ctaButton: {
    backgroundColor: Colors.primary, paddingVertical: 16,
    borderRadius: BorderRadius.md, alignItems: 'center',
  },
  ctaText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.textInverse },
  terms: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textTertiary, textAlign: 'center', lineHeight: 16 },
});
