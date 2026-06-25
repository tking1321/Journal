import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useEffect } from 'react';
import { Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';

// Exponential lift: dot at origin, flat start curving up steeply near end, arrowhead
function DivergeLogo({ size = 22, color = 'white' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36">
      <Circle cx="5" cy="30" r="2.5" fill={color} />
      <Path d="M5,30 C18,30 26,8 33,4" stroke={color} strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <Path d="M26,3 L33,4 L32,11" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const { session, profile, loading } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    if (!loading && session && profile) {
      if (!profile.onboarding_completed) {
        router.replace('/onboarding');
      } else if (profile.subscription_status === 'free' || !profile.subscription_status) {
        router.replace('/paywall');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [loading, session, profile]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.surface }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
            <DivergeLogo size={22} color={colors.textInverse} />
          </View>
          <Text style={[styles.logoName, { color: colors.text }]}>Diverge</Text>
        </View>

        <View style={styles.heroSection}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Build the person{'\n'}you intend to be.</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Daily personalized goals, guided journaling, and streak-based accountability — built for ambitious people.
          </Text>
        </View>

        <View style={styles.features}>
          {[
            { icon: 'target', text: 'Personalized daily goals from your categories' },
            { icon: 'edit-3', text: 'Diverge insights that sharpen your thinking' },
            { icon: 'trending-up', text: 'Streak tracking to reinforce consistency' },
          ].map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <Feather name={feature.icon as any} size={16} color={colors.textTertiary} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>{feature.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bottomActions}>
        <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/auth?mode=signup')}>
          <Text style={[styles.primaryButtonText, { color: colors.textInverse }]}>Get Started</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/auth?mode=signin')}>
          <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Already have an account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 80,
    paddingBottom: 40,
  },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: 'Inter-Medium', fontSize: FontSize.md },
  content: { flex: 1, justifyContent: 'center' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xxl },
  logoMark: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  logoName: { fontFamily: 'Inter-Bold', fontSize: FontSize.xl },
  heroSection: { marginBottom: Spacing.xl },
  heroTitle: {
    fontFamily: 'Inter-Bold', fontSize: FontSize.hero,
    lineHeight: 44, marginBottom: Spacing.md,
  },
  heroSubtitle: {
    fontFamily: 'Inter-Regular', fontSize: FontSize.md, lineHeight: 24,
  },
  features: { gap: Spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  featureText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, flex: 1 },
  bottomActions: { gap: Spacing.sm },
  primaryButton: {
    paddingVertical: 16, borderRadius: BorderRadius.md, alignItems: 'center',
  },
  primaryButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md },
  secondaryButton: { paddingVertical: Spacing.sm + 4, alignItems: 'center' },
  secondaryButtonText: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm },
});
