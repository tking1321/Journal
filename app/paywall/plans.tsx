import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

export default function PlansScreen() {
  const router = useRouter();
  const { updateProfile } = useAuth();
  const [selected, setSelected] = useState<'annual' | 'monthly'>('annual');
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    if (loading) return;
    setLoading(true);
    try {
      if (selected === 'annual') {
        await updateProfile({
          subscription_status: 'trial',
          subscription_plan: 'annual',
          trial_start_date: new Date().toISOString(),
        });
      } else {
        await updateProfile({
          subscription_status: 'active',
          subscription_plan: 'monthly',
        });
      }
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={Colors.text} />
        </Pressable>

        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>Unlock everything Diverge has to offer.</Text>

        <View style={styles.plans}>
          {/* Annual card */}
          <Pressable
            style={[styles.planCard, selected === 'annual' && styles.planCardSelected]}
            onPress={() => setSelected('annual')}
          >
            <View style={styles.planTopRow}>
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>MOST POPULAR</Text>
              </View>
              <View style={styles.trialBadge}>
                <Feather name="gift" size={10} color="#fff" />
                <Text style={styles.trialBadgeText}>7-DAY FREE TRIAL</Text>
              </View>
            </View>
            <View style={styles.planRow}>
              <View style={[styles.radio, selected === 'annual' && styles.radioFilled]}>
                {selected === 'annual' && <View style={styles.radioDot} />}
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Annual</Text>
                <Text style={styles.planBilling}>Billed $59.99/year (~$5/month)</Text>
              </View>
              <View style={styles.planPricing}>
                <Text style={styles.planPrice}>$5</Text>
                <Text style={styles.planUnit}>/month</Text>
              </View>
            </View>
            <View style={styles.trialNote}>
              <Feather name="info" size={11} color={Colors.primary} />
              <Text style={styles.trialNoteText}>Free trial available on annual plan only</Text>
            </View>
          </Pressable>

          {/* Monthly card */}
          <Pressable
            style={[styles.planCard, selected === 'monthly' && styles.planCardSelected]}
            onPress={() => setSelected('monthly')}
          >
            <View style={styles.planRow}>
              <View style={[styles.radio, selected === 'monthly' && styles.radioFilled]}>
                {selected === 'monthly' && <View style={styles.radioDot} />}
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Monthly</Text>
                <Text style={styles.planBilling}>Billed each month</Text>
              </View>
              <View style={styles.planPricing}>
                <Text style={styles.planPrice}>$9.99</Text>
                <Text style={styles.planUnit}>/month</Text>
              </View>
            </View>
          </Pressable>
        </View>

        <View style={styles.features}>
          <Text style={styles.featuresTitle}>Everything included:</Text>
          {[
            'Unlimited Diverge-generated daily goals',
            'Personalized coaching voice and journal prompts',
            'Streak tracking and progress analytics',
            'Weekly Diverge insights on your patterns',
            'Private, encrypted journal',
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Feather name="check" size={14} color={Colors.text} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.ctaButton, loading && styles.ctaButtonDisabled]} onPress={handleSubscribe} disabled={loading}>
          <Text style={styles.ctaText}>
            {selected === 'annual' ? 'Start 7-Day Free Trial' : 'Subscribe Monthly'}
          </Text>
          <Feather name="arrow-right" size={16} color={Colors.textInverse} />
        </Pressable>
        {selected === 'annual' ? (
          <Text style={styles.footnote}>Annual plan only. No charge today. Cancel before day 8 and pay nothing.</Text>
        ) : (
          <Text style={styles.footnote}>Charged $9.99/month. Cancel anytime.</Text>
        )}
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
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xxl, color: Colors.text, marginBottom: Spacing.xs },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xl },
  plans: { gap: Spacing.sm, marginBottom: Spacing.xl },
  planCard: {
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.lg, padding: Spacing.md, overflow: 'hidden',
  },
  planCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.surfaceElevated },
  planTopRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  popularBadge: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.sm,
    paddingVertical: 4, borderRadius: BorderRadius.sm, alignSelf: 'flex-start',
  },
  popularText: { fontFamily: 'Inter-Bold', fontSize: 9, color: Colors.textInverse, letterSpacing: 0.6 },
  trialBadge: {
    backgroundColor: '#16a34a', paddingHorizontal: Spacing.sm,
    paddingVertical: 4, borderRadius: BorderRadius.sm, alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  trialBadgeText: { fontFamily: 'Inter-Bold', fontSize: 9, color: '#fff', letterSpacing: 0.6 },
  trialNote: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  trialNoteText: { fontFamily: 'Inter-Medium', fontSize: FontSize.xs, color: Colors.primary },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: Colors.border, justifyContent: 'center', alignItems: 'center',
  },
  radioFilled: { borderColor: Colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  planInfo: { flex: 1 },
  planName: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.text },
  planBilling: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  planPricing: { alignItems: 'flex-end' },
  planPrice: { fontFamily: 'Inter-Bold', fontSize: FontSize.lg, color: Colors.text },
  planUnit: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textSecondary },
  features: { gap: Spacing.sm, paddingBottom: Spacing.sm },
  featuresTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.text, marginBottom: Spacing.xs },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  featureText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textSecondary },
  footer: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingBottom: 36, gap: Spacing.sm },
  ctaButton: {
    backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  ctaButtonDisabled: { opacity: 0.5 },
  ctaText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.textInverse },
  footnote: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textTertiary, textAlign: 'center' },
});
