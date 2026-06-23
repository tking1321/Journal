import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

export default function PlansScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<'annual' | 'monthly'>('annual');

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={Colors.text} />
        </Pressable>

        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>Both plans include a 7-day free trial.</Text>

        <View style={styles.plans}>
          <Pressable
            style={[styles.planCard, selected === 'annual' && styles.planCardSelected]}
            onPress={() => setSelected('annual')}
          >
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>MOST POPULAR</Text>
            </View>
            <View style={styles.planRow}>
              <View style={[styles.radio, selected === 'annual' && styles.radioFilled]}>
                {selected === 'annual' && <View style={styles.radioDot} />}
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Annual</Text>
                <Text style={styles.planBilling}>Billed $72/year</Text>
              </View>
              <View style={styles.planPricing}>
                <Text style={styles.planPrice}>$6</Text>
                <Text style={styles.planUnit}>/month</Text>
              </View>
            </View>
          </Pressable>

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
                <Text style={styles.planPrice}>$12</Text>
                <Text style={styles.planUnit}>/month</Text>
              </View>
            </View>
          </Pressable>
        </View>

        <View style={styles.features}>
          <Text style={styles.featuresTitle}>Everything included:</Text>
          {[
            'Unlimited AI-generated daily goals',
            'Personalized coaching voice and journal prompts',
            'Streak tracking and progress analytics',
            'Weekly AI insights on your patterns',
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
        <Pressable style={styles.ctaButton} onPress={() => router.push('/paywall/trial')}>
          <Text style={styles.ctaText}>Start 7-Day Free Trial</Text>
          <Feather name="arrow-right" size={16} color={Colors.textInverse} />
        </Pressable>
        <Text style={styles.footnote}>No charge today. Cancel before day 8 and pay nothing.</Text>
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
  popularBadge: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.sm,
    paddingVertical: 4, borderRadius: BorderRadius.sm, alignSelf: 'flex-start', marginBottom: Spacing.sm,
  },
  popularText: { fontFamily: 'Inter-Bold', fontSize: 9, color: Colors.textInverse, letterSpacing: 0.6 },
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
  ctaText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.textInverse },
  footnote: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textTertiary, textAlign: 'center' },
});
