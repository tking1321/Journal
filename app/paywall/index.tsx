import { View, Text, StyleSheet, Pressable, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';
import { usePurchases } from '@/contexts/PurchasesContext';
import { useState } from 'react';

const BENEFITS = [
  'Personalized daily goals from your focus areas',
  'AI coaching tuned to your personality',
  'Private journal with AI-generated reflections',
  'Streak tracking and weekly progress insights',
  'Your growth plan, built around your answers',
];

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

export default function PaywallIntroScreen() {
  const router = useRouter();
  const { presentPaywall } = usePurchases();
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    if (!isNative || loading) return;
    setLoading(true);
    try {
      const purchased = await presentPaywall();
      if (purchased) {
        router.replace('/(tabs)');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconWrap}>
          <Feather name="trending-up" size={28} color={Colors.textInverse} />
        </View>

        <Text style={styles.title}>{'Start free.\nSee your growth in 7 days.'}</Text>
        <Text style={styles.subtitle}>
          {'No charge today. Cancel before day 8 and you owe nothing.'}
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

        {!isNative && (
          <View style={styles.webNotice}>
            <Feather name="smartphone" size={18} color={Colors.textSecondary} />
            <Text style={styles.webNoticeText}>
              Subscriptions are available on iOS and Android only. Download the app to get started.
            </Text>
          </View>
        )}
      </ScrollView>

      {isNative && (
        <View style={styles.footer}>
          <Pressable style={[styles.ctaButton, loading && { opacity: 0.6 }]} onPress={handleSubscribe} disabled={loading}>
            {loading
              ? <ActivityIndicator size="small" color={Colors.textInverse} />
              : <>
                  <Text style={styles.ctaText}>Start Free Trial</Text>
                  <Feather name="arrow-right" size={16} color={Colors.textInverse} />
                </>
            }
          </Pressable>
          <Text style={styles.footnote}>7-day free trial. Cancel anytime. No commitment.</Text>
        </View>
      )}
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
  webNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    marginTop: Spacing.xxl, padding: Spacing.md,
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  webNoticeText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, flex: 1 },
  footer: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingBottom: 36, gap: Spacing.sm },
  ctaButton: {
    backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  ctaText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.textInverse },
  footnote: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textTertiary, textAlign: 'center' },
});
