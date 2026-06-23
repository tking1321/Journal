import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const router = useRouter();
  const { session, profile, loading } = useAuth();

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
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoMark}>
            <Text style={styles.logoChar}>G</Text>
          </View>
          <Text style={styles.logoName}>Grow</Text>
        </View>

        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Build the person{'\n'}you intend to be.</Text>
          <Text style={styles.heroSubtitle}>
            Daily AI-powered goals, guided journaling, and streak-based accountability — built for ambitious people.
          </Text>
        </View>

        <View style={styles.features}>
          {[
            { icon: 'target', text: 'Personalized daily goals from your categories' },
            { icon: 'edit-3', text: 'AI reflections that sharpen your thinking' },
            { icon: 'trending-up', text: 'Streak tracking to reinforce consistency' },
          ].map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <Feather name={feature.icon as any} size={16} color={Colors.textTertiary} />
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bottomActions}>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/auth?mode=signup')}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/auth?mode=signin')}>
          <Text style={styles.secondaryButtonText}>Already have an account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingTop: 80,
    paddingBottom: 40,
  },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: 'Inter-Medium', fontSize: FontSize.md, color: Colors.textSecondary },
  content: { flex: 1, justifyContent: 'center' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xxl },
  logoMark: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  logoChar: { fontFamily: 'Inter-Bold', fontSize: 20, color: Colors.textInverse },
  logoName: { fontFamily: 'Inter-Bold', fontSize: FontSize.xl, color: Colors.text },
  heroSection: { marginBottom: Spacing.xl },
  heroTitle: {
    fontFamily: 'Inter-Bold', fontSize: FontSize.hero, color: Colors.text,
    lineHeight: 44, marginBottom: Spacing.md,
  },
  heroSubtitle: {
    fontFamily: 'Inter-Regular', fontSize: FontSize.md, color: Colors.textSecondary,
    lineHeight: 24,
  },
  features: { gap: Spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  featureText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  bottomActions: { gap: Spacing.sm },
  primaryButton: {
    backgroundColor: Colors.primary, paddingVertical: 16,
    borderRadius: BorderRadius.md, alignItems: 'center',
  },
  primaryButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.textInverse },
  secondaryButton: { paddingVertical: Spacing.sm + 4, alignItems: 'center' },
  secondaryButtonText: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm, color: Colors.textSecondary },
});
