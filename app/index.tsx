import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useEffect } from 'react';
import { Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';
import Svg, { Path, Line, Circle, Polyline } from 'react-native-svg';

// Option 1: Exponential lift — baseline + exponential curve + arrowhead (current concept, refined)
function LogoOption1({ size = 22, color = 'white' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36">
      <Circle cx="5" cy="30" r="2.5" fill={color} />
      <Path d="M5,30 C8,29 16,22 33,4" stroke={color} strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <Path d="M26,3 L33,4 L32,11" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

// Option 2: Diverging fork — single path that branches into two, representing divergence
function LogoOption2({ size = 22, color = 'white' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36">
      <Path d="M18,32 L18,18" stroke={color} strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <Path d="M18,18 C16,14 10,11 5,6" stroke={color} strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <Path d="M18,18 C20,14 26,11 31,6" stroke={color} strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <Path d="M2,8 L5,6 L7,9" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M34,8 L31,6 L29,9" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

// Option 3: Breakout spike — flat line then sharp upward break, like a stock breaking out
function LogoOption3({ size = 22, color = 'white' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36">
      <Path d="M3,26 L13,26 L21,12 L29,5" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M23,4 L29,5 L28,11" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Line x1="29" y1="26" x2="33" y2="26" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
    </Svg>
  );
}

function DivergeLogo({ size = 22, color = 'white' }: { size?: number; color?: string }) {
  return <LogoOption1 size={size} color={color} />;
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
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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

          {/* Logo options preview */}
          <View style={[styles.logoPreviewCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
            <Text style={[styles.logoPreviewLabel, { color: colors.textTertiary }]}>LOGO OPTIONS</Text>
            <View style={styles.logoPreviewRow}>
              {([
                { Logo: LogoOption1, label: 'Option 1\nExponential' },
                { Logo: LogoOption2, label: 'Option 2\nDiverging Fork' },
                { Logo: LogoOption3, label: 'Option 3\nBreakout Spike' },
              ] as const).map(({ Logo, label }, i) => (
                <View key={i} style={styles.logoPreviewItem}>
                  <View style={[styles.logoPreviewMark, { backgroundColor: colors.primary }]}>
                    <Logo size={28} color={colors.textInverse} />
                  </View>
                  <Text style={[styles.logoPreviewItemLabel, { color: colors.textSecondary }]}>{label}</Text>
                </View>
              ))}
            </View>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 80, paddingBottom: 40 },
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
  logoPreviewCard: {
    borderWidth: 1, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.xl,
  },
  logoPreviewLabel: {
    fontFamily: 'Inter-Bold', fontSize: 10, letterSpacing: 1, marginBottom: Spacing.md,
  },
  logoPreviewRow: { flexDirection: 'row', justifyContent: 'space-around' },
  logoPreviewItem: { alignItems: 'center', gap: Spacing.sm },
  logoPreviewMark: {
    width: 52, height: 52, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
  },
  logoPreviewItemLabel: {
    fontFamily: 'Inter-Regular', fontSize: 11, textAlign: 'center', lineHeight: 16,
  },
  features: { gap: Spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  featureText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, flex: 1 },
  bottomActions: { gap: Spacing.sm, marginTop: Spacing.xl },
  primaryButton: {
    paddingVertical: 16, borderRadius: BorderRadius.md, alignItems: 'center',
  },
  primaryButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md },
  secondaryButton: { paddingVertical: Spacing.sm + 4, alignItems: 'center' },
  secondaryButtonText: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm },
});
