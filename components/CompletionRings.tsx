import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';
import { FontSize, Spacing } from '@/lib/constants';

interface CompletionRingsProps {
  journal: boolean;
  goals: boolean;
  goalProgress: number; // 0–1
  // reflection prop kept for backward compat but unused
  reflection?: boolean;
}

const RING_COLOR = '#1A56A4';
const SIZE = 100;
const STROKE = 8;

export default function CompletionRings({ journal, goals, goalProgress }: CompletionRingsProps) {
  const { colors } = useTheme();
  const r = (SIZE - STROKE) / 2;
  const circ = 2 * Math.PI * r;

  // Journal = 50%, goals progress = 50%
  const combined = (journal ? 0.5 : 0) + goalProgress * 0.5;
  const offset = circ - Math.min(1, Math.max(0, combined)) * circ;
  const isDone = journal && goals;

  return (
    <View style={styles.container}>
      <View style={[styles.ringWrap, { width: SIZE, height: SIZE }]}>
        <Svg width={SIZE} height={SIZE} style={styles.svg}>
          <Circle
            cx={SIZE / 2} cy={SIZE / 2} r={r}
            stroke={colors.borderLight} strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={SIZE / 2} cy={SIZE / 2} r={r}
            stroke={isDone ? RING_COLOR : RING_COLOR + 'BB'}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
        </Svg>
        <View style={styles.center}>
          {isDone ? (
            <Text style={[styles.doneText, { color: RING_COLOR }]}>✓</Text>
          ) : (
            <Text style={[styles.pctText, { color: combined > 0 ? RING_COLOR : colors.textTertiary }]}>
              {Math.round(combined * 100)}%
            </Text>
          )}
        </View>
      </View>

      <View style={styles.labels}>
        <View style={styles.labelRow}>
          <View style={[styles.dot, { backgroundColor: journal ? '#1D6A3A' : colors.borderLight }]} />
          <Text style={[styles.labelText, { color: journal ? colors.text : colors.textTertiary }]}>
            Journal{journal ? ' ✓' : ''}
          </Text>
        </View>
        <View style={styles.labelRow}>
          <View style={[styles.dot, { backgroundColor: goals ? RING_COLOR : colors.borderLight }]} />
          <Text style={[styles.labelText, { color: goals ? colors.text : colors.textTertiary }]}>
            Goals{goals ? ' ✓' : goalProgress > 0 ? ` ${Math.round(goalProgress * 100)}%` : ''}
          </Text>
        </View>
        {isDone && (
          <Text style={[styles.doneLabel, { color: colors.success }]}>Day Complete</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
  },
  ringWrap: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  svg: { position: 'absolute', top: 0, left: 0 },
  center: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  doneText: { fontFamily: 'Inter-Bold', fontSize: 24 },
  pctText: { fontFamily: 'Inter-Bold', fontSize: 15 },
  labels: { flex: 1, gap: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  labelText: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm },
  doneLabel: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.xs, marginTop: 2, letterSpacing: 0.3 },
});
