import { useEffect, useMemo, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { c, f } from './theme';
import { hexaflake, hexPath } from '../lib/flake';
import { addressSeed } from '../lib/format';

export const haptic = {
  tick() {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
  },
  press() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  done() {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};

/** A pressable that gives under the finger, with a light haptic. */
export function Tap({
  onPress,
  children,
  style,
  label,
  scale = 0.97,
}: {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  label?: string;
  scale?: number;
}) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.press();
        onPress?.();
      }}
      onPressIn={() => {
        s.value = withSpring(scale, { damping: 18, stiffness: 420 });
      }}
      onPressOut={() => {
        s.value = withSpring(1, { damping: 14, stiffness: 260 });
      }}
    >
      <Animated.View style={[anim, style]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Eyebrow({ children, color = c.dim, style }: { children: ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.eyebrow, { color }, style]}>{children}</Text>;
}

/** A generated mark for a wallet: seven hexagons, lit by the address. Same wallet, same mark. */
const GLYPH_CELLS = hexaflake(10, 1);
const GLYPH_COLORS = [c.gold, c.ink, '#7FA6D6', c.muted, '#FFE27A'];

export function Glyph({ address, size = 34 }: { address: string; size?: number }) {
  const { lit, dim, color } = useMemo(() => {
    const seed = addressSeed(address);
    const on: string[] = [];
    const off: string[] = [];
    GLYPH_CELLS.forEach((cell, i) => {
      const isOn = i === 0 ? seed % 2 === 0 : (seed >> i) & 1 || (seed >> (i + 7)) & 1;
      (isOn ? on : off).push(hexPath(cell, 0.9));
    });
    return { lit: on.join(''), dim: off.join(''), color: GLYPH_COLORS[(seed >> 16) % GLYPH_COLORS.length] };
  }, [address]);
  return (
    <Svg width={size} height={size} viewBox="-11 -11 22 22">
      <Path d={dim} fill={c.line} />
      <Path d={lit} fill={color} />
    </Svg>
  );
}

/** Shimmering placeholder for the moments we are laying out a long chapter. */
export function Skeleton({ width, height = 14, style }: { width: number | `${number}%`; height?: number; style?: StyleProp<ViewStyle> }) {
  const o = useSharedValue(0.35);
  useEffect(() => {
    o.value = withRepeat(
      withSequence(withTiming(0.8, { duration: 700, easing: Easing.inOut(Easing.quad) }), withTiming(0.35, { duration: 700 })),
      -1,
    );
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width, height, borderRadius: 4, backgroundColor: c.line }, anim, style]} />;
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <View style={s.empty}>
      <Svg width={72} height={72} viewBox="-33 -33 66 66">
        <Path d={hexaflake(30, 2).map((x) => hexPath(x, 0.8)).join('')} fill={c.line} />
      </Svg>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyBody}>{body}</Text>
    </View>
  );
}

/** Top bar for pushed screens: a real back control and the screen's eyebrow. */
export function BackBar({ label }: { label: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.back, { paddingTop: insets.top + 8 }]}>
      <Tap
        label="Back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={s.backBtn}
        scale={0.9}
      >
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path d="M15 5l-7 7 7 7" stroke={c.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Tap>
      <Eyebrow>{label}</Eyebrow>
    </View>
  );
}

export function SnapshotNote({ date }: { date: string }) {
  return <Text style={s.snapshot}>On-chain snapshot from {date}. OP Mainnet.</Text>;
}

const s = StyleSheet.create({
  eyebrow: { fontFamily: f.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  empty: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontFamily: f.displayMid, fontSize: 18, color: c.ink, marginTop: 8 },
  emptyBody: { fontFamily: f.ui, fontSize: 14, color: c.dim, textAlign: 'center', lineHeight: 20 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.elev,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.rule,
  },
  snapshot: { fontFamily: f.mono, fontSize: 10.5, color: c.dim, letterSpacing: 0.3 },
});
