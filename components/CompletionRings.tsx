import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, FontSize, Spacing } from '@/lib/constants';

interface RingConfig {
  progress: number; // 0–1
  color: string;
  label: string;
  done: boolean;
}

interface CompletionRingsProps {
  journal: boolean;
  goals: boolean;
  reflection: boolean;
  goalProgress: number; // 0–1 for goals ring partial fill
}

const RING_COLORS = {
  journal: '#1D6A3A',    // green
  goals: '#1A56A4',      // blue
  reflection: '#6B3FA0', // purple
};

const SIZE = 72;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function Ring({ progress, color, label, done, size = SIZE }: RingConfig & { size?: number }) {
  const r = (size - STROKE) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - Math.min(1, Math.max(0, progress)) * circ;

  return (
    <View style={[ringStyles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={ringStyles.svg}>
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={Colors.borderLight} strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={done ? color : color + '99'}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={ringStyles.center}>
        {done ? (
          <Text style={[ringStyles.checkmark, { color }]}>+</Text>
        ) : (
          <Text style={[ringStyles.pct, { color: progress > 0 ? color : Colors.textTertiary }]}>
            {Math.round(progress * 100)}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function CompletionRings({ journal, goals, goalProgress, reflection }: CompletionRingsProps) {
  const rings: Array<RingConfig & { key: string }> = [
    { key: 'journal', progress: journal ? 1 : 0, color: RING_COLORS.journal, label: 'Journal', done: journal },
    { key: 'goals', progress: goals ? 1 : goalProgress, color: RING_COLORS.goals, label: 'Goals', done: goals },
    { key: 'reflection', progress: reflection ? 1 : 0, color: RING_COLORS.reflection, label: 'Reflect', done: reflection },
  ];

  return (
    <View style={styles.container}>
      {rings.map((ring) => (
        <View key={ring.key} style={styles.ringWrap}>
          <Ring {...ring} />
          <Text style={[styles.label, ring.done && { color: ring.color }]}>{ring.label}</Text>
        </View>
      ))}
    </View>
  );
}

const ringStyles = StyleSheet.create({
  wrap: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  svg: { position: 'absolute', top: 0, left: 0 },
  center: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  checkmark: { fontFamily: 'Inter-Bold', fontSize: 20, lineHeight: 24 },
  pct: { fontFamily: 'Inter-Bold', fontSize: 11 },
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  ringWrap: { alignItems: 'center', gap: 6 },
  label: {
    fontFamily: 'Inter-Medium', fontSize: FontSize.xs,
    color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5,
  },
});
