import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

const COACH_LABELS: Record<string, string> = {
  'strict coach': 'Strict Coach — pushes hard, no excuses',
  'gentle coach': 'Gentle Coach — empathetic, supportive',
  'reflective prompts': 'Reflective Prompts — questions over answers',
  'direct action': 'Direct Action — clear steps, no fluff',
};

export default function PreviewScreen() {
  const router = useRouter();
  const { data } = useOnboarding();
  const { user, updateProfile } = useAuth();

  async function handleContinue() {
    if (!user) return;

    await updateProfile({
      coaching_style: data.coachingStyle,
      journaling_style: data.journalingStyle,
      daily_time_commitment: data.timeCommitment,
      biggest_obstacle: data.biggestObstacle,
      success_vision: data.successVision,
      daily_goal_limit: data.dailyGoalLimit,
      onboarding_completed: true,
    });

    for (const cat of data.categories) {
      await supabase.from('categories').insert({
        name: cat.name,
        growth_description: cat.growthDescription,
      });
    }

    const existing = await supabase.from('streaks').select('id').eq('user_id', user.id).maybeSingle();
    if (!existing.data) {
      await supabase.from('streaks').insert({});
    }

    router.replace('/paywall');
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.badge}>
          <Feather name="check" size={14} color={Colors.textInverse} />
          <Text style={styles.badgeText}>YOUR PERSONALIZED PLAN</Text>
        </View>

        <Text style={styles.title}>Your plan is ready.</Text>
        <Text style={styles.subtitle}>Based on your answers, here's exactly what you'll work on.</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YOUR CATEGORIES</Text>
          {data.categories.map((cat, i) => (
            <View key={i} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryBullet}>
                  <Text style={styles.categoryBulletNum}>{i + 1}</Text>
                </View>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </View>
              {cat.growthDescription ? (
                <Text style={styles.categoryVision}>{cat.growthDescription}</Text>
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YOUR DAILY ROUTINE</Text>
          <View style={styles.routineCard}>
            <View style={styles.routineRow}>
              <Feather name="target" size={14} color={Colors.text} />
              <Text style={styles.routineText}>1–3 daily AI-generated goals</Text>
            </View>
            <View style={styles.routineRow}>
              <Feather name="edit-3" size={14} color={Colors.text} />
              <Text style={styles.routineText}>{data.timeCommitment} of journaling</Text>
            </View>
            <View style={styles.routineRow}>
              <Feather name="bar-chart-2" size={14} color={Colors.text} />
              <Text style={styles.routineText}>Weekly AI insights on your progress</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YOUR COACH STYLE</Text>
          <View style={styles.coachCard}>
            <Text style={styles.coachLabel}>
              {COACH_LABELS[data.coachingStyle] || data.coachingStyle}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WHAT YOU'LL GET</Text>
          <View style={styles.benefitsCard}>
            {[
              'AI goals matched to your categories every day',
              'A coaching voice built from your answers',
              'Streak tracking to stay consistent',
              'Private, secure journal with AI summaries',
              'Weekly insights to see what\'s actually working',
            ].map((benefit, i) => (
              <View key={i} style={styles.benefitRow}>
                <Feather name="check" size={13} color={Colors.text} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.ctaButton} onPress={handleContinue}>
          <Text style={styles.ctaText}>Continue to Premium</Text>
          <Feather name="arrow-right" size={16} color={Colors.textInverse} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 64, paddingBottom: Spacing.xl },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 6, borderRadius: BorderRadius.full, alignSelf: 'flex-start', marginBottom: Spacing.lg,
  },
  badgeText: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.textInverse, letterSpacing: 0.8 },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xxl, color: Colors.text, lineHeight: 34, marginBottom: Spacing.xs },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.xl },
  section: { marginBottom: Spacing.xl },
  sectionLabel: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.textTertiary, letterSpacing: 1, marginBottom: Spacing.sm },
  categoryCard: {
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  categoryBullet: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  categoryBulletNum: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.textInverse },
  categoryName: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.text, textTransform: 'capitalize', flex: 1 },
  categoryVision: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, paddingLeft: 28 },
  routineCard: {
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.sm,
  },
  routineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  routineText: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm, color: Colors.text },
  coachCard: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  coachLabel: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.textInverse, textTransform: 'capitalize' },
  benefitsCard: {
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.sm,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  benefitText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1, lineHeight: 20 },
  footer: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingBottom: 36 },
  ctaButton: {
    backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  ctaText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.textInverse },
});
