import { Modal, View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { LEVEL_ICONS, Spacing, BorderRadius, FontSize } from '@/lib/constants';

interface LevelsModalProps {
  visible: boolean;
  currentLevel: number;
  onClose: () => void;
}

const TIER_LABELS: Record<number, string> = {
  1:  'Lime Green',
  6:  'Green',
  11: 'Forest',
  16: 'Teal',
  21: 'Deep Teal',
  26: 'Sky Blue',
  31: 'Blue',
  36: 'Deep Blue',
  41: 'Royal Blue',
  46: 'Gold',
  51: 'Deep Gold',
  56: 'Orange',
  61: 'Deep Orange',
  66: 'Red',
  71: 'Crimson',
  76: 'Deep Crimson',
  81: 'Dark Red',
  86: 'Very Dark Red',
  91: 'Elite',
  96: 'Diverge',
};

export default function LevelsModal({ visible, currentLevel, onClose }: LevelsModalProps) {
  const { colors, isDark } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.title, { color: colors.text }]}>Level System</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {LEVEL_ICONS.map((entry, idx) => {
              const level = idx + 1;
              const isCurrent = level === currentLevel;
              const tierLabel = TIER_LABELS[level];

              return (
                <View key={level}>
                  {tierLabel && (
                    <View style={[styles.tierRow, { backgroundColor: entry.color + '14' }]}>
                      <View style={[styles.tierDot, { backgroundColor: entry.color }]} />
                      <Text style={[styles.tierLabel, { color: entry.color }]}>{tierLabel}</Text>
                      <Text style={[styles.tierRange, { color: colors.textTertiary }]}>
                        Lv {level}–{Math.min(level + 4, 100)}
                      </Text>
                    </View>
                  )}
                  <Pressable
                    style={[
                      styles.row,
                      { borderBottomColor: colors.borderLight },
                      isCurrent && { backgroundColor: entry.color + '12' },
                    ]}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: entry.color + '20', borderColor: entry.color + '50' }]}>
                      <Feather name={entry.icon as any} size={15} color={entry.color} />
                    </View>
                    <Text style={[styles.levelNum, { color: isCurrent ? entry.color : colors.textTertiary }]}>
                      {level}
                    </Text>
                    <Text style={[styles.levelName, { color: isCurrent ? colors.text : colors.textSecondary }]}>
                      {entry.label}
                    </Text>
                    {isCurrent && (
                      <View style={[styles.currentBadge, { backgroundColor: entry.color + '20' }]}>
                        <Text style={[styles.currentText, { color: entry.color }]}>YOU</Text>
                      </View>
                    )}
                    <View style={[styles.colorSwatch, { backgroundColor: entry.color }]} />
                  </Pressable>
                </View>
              );
            })}
            <View style={styles.bottomPad} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: FontSize.lg,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.xs,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    gap: Spacing.sm,
  },
  tierDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tierLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSize.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
  },
  tierRange: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSize.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelNum: {
    fontFamily: 'Inter-Bold',
    fontSize: FontSize.xs,
    width: 24,
    textAlign: 'center',
  },
  levelName: {
    fontFamily: 'Inter-Medium',
    fontSize: FontSize.sm,
    flex: 1,
  },
  currentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  currentText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  colorSwatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  bottomPad: {
    height: Platform.OS === 'ios' ? 34 : 16,
  },
});
