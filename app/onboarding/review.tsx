import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

// Replace these IDs once you publish to the stores
const IOS_APP_ID = '0000000000';
const ANDROID_PACKAGE = 'com.diverge.app';

function getStoreUrl(): string {
  if (Platform.OS === 'ios') {
    return `itms-apps://itunes.apple.com/app/id${IOS_APP_ID}?action=write-review`;
  }
  if (Platform.OS === 'android') {
    return `market://details?id=${ANDROID_PACKAGE}&showAllReviews=true`;
  }
  // Web fallback — Google Play web link
  return `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}&reviewId=0`;
}

export default function ReviewScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [selected, setSelected] = useState(0);

  async function handleLeaveReview() {
    const url = getStoreUrl();
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
    // Continue regardless of whether review was left
    router.push('/onboarding/preview');
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.progressRow}>
        <View style={[styles.track, { backgroundColor: colors.borderLight }]}>
          <View style={[styles.fill, { width: `${(10 / 11) * 100}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.stepLabel, { color: colors.textTertiary }]}>10/11</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '15' }]}>
          <Feather name="star" size={32} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Enjoying Diverge so far?</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your review helps other people find the app and keeps us building. It takes less than 30 seconds.
        </Text>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setSelected(n)} hitSlop={8}>
              <Feather
                name={n <= selected ? 'star' : 'star'}
                size={38}
                color={n <= selected ? '#F59E0B' : colors.borderLight}
              />
            </Pressable>
          ))}
        </View>

        {selected > 0 && (
          <Text style={[styles.starLabel, { color: colors.textSecondary }]}>
            {selected === 5 ? 'Amazing! Thank you!' : selected >= 3 ? 'Thanks for your feedback!' : 'We appreciate your honesty.'}
          </Text>
        )}

        <Pressable
          style={[styles.reviewButton, { backgroundColor: colors.primary }, selected === 0 && styles.reviewButtonMuted]}
          onPress={handleLeaveReview}
        >
          <Feather name="star" size={16} color={colors.textInverse} />
          <Text style={[styles.reviewButtonText, { color: colors.textInverse }]}>Leave a Review</Text>
        </Pressable>

        <Pressable style={styles.skipButton} onPress={() => router.push('/onboarding/preview')}>
          <Text style={[styles.skipText, { color: colors.textTertiary }]}>Maybe later</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: 36 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
  track: { flex: 1, height: 3, borderRadius: BorderRadius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: BorderRadius.full },
  stepLabel: { fontFamily: 'Inter-Medium', fontSize: 11, minWidth: 28, textAlign: 'right' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xl,
  },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xl, textAlign: 'center', lineHeight: 30, marginBottom: Spacing.sm },
  subtitle: {
    fontFamily: 'Inter-Regular', fontSize: FontSize.md, textAlign: 'center',
    lineHeight: 24, marginBottom: Spacing.xl, maxWidth: 300,
  },
  starsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  starLabel: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm, marginBottom: Spacing.xl },
  reviewButton: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 16, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md,
    marginTop: Spacing.md, width: '100%', justifyContent: 'center',
  },
  reviewButtonMuted: { opacity: 0.6 },
  reviewButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md },
  skipButton: { marginTop: Spacing.lg, paddingVertical: Spacing.sm },
  skipText: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm },
});
