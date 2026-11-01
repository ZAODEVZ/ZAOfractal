import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { c, f } from './theme';
import { Eyebrow } from './kit';
import { hexaflake, outsideIn, pathOf } from '../lib/flake';
import { countdownTo, meetingInSession, nextMeeting, weekProgress } from '../lib/time';
import { formatMeetingLocal, formatMeetingNy } from '../lib/format';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CELLS = outsideIn(hexaflake(100, 3));

/** One cell for every half hour or so of the week. They light from the rim to the core. */
function Flake({ size, progress }: { size: number; progress: number }) {
  const litCount = Math.floor(progress * CELLS.length);
  const { lit, rest, head } = useMemo(
    () => ({
      lit: pathOf(CELLS.slice(0, litCount)),
      rest: pathOf(CELLS.slice(litCount + 1)),
      head: pathOf(CELLS.slice(litCount, litCount + 1)),
    }),
    [litCount],
  );
  const pulse = useSharedValue(0.25);
  const turn = useSharedValue(0);
  const grow = useSharedValue(0.92);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(0.25, { duration: 900, easing: Easing.inOut(Easing.sin) })),
      -1,
    );
    turn.value = withRepeat(withTiming(360, { duration: 240000, easing: Easing.linear }), -1);
    grow.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [pulse, turn, grow]);
  const headProps = useAnimatedProps(() => ({ fillOpacity: pulse.value }));
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }, { scale: grow.value }] }));
  return (
    <Animated.View style={[{ width: size, height: size }, spin]}>
      <Svg width={size} height={size} viewBox="-104 -104 208 208">
        <Defs>
          <RadialGradient id="glow" cx="0" cy="0" r="104" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FFE27A" />
            <Stop offset="0.5" stopColor="#F5C518" />
            <Stop offset="1" stopColor="#B8890A" />
          </RadialGradient>
          {/* Keeps the big number legible as the core lights up late in the week. */}
          <RadialGradient id="veil" cx="0" cy="0" r="62" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#03182F" stopOpacity={0.72} />
            <Stop offset="1" stopColor="#03182F" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Path d={rest} fill="#0B2C52" />
        <Path d={lit} fill="url(#glow)" />
        <AnimatedPath d={head} fill="#FFF3C4" animatedProps={headProps} />
        <Path d="M-62 0a62 62 0 1 0 124 0a62 62 0 1 0 -124 0" fill="url(#veil)" />
      </Svg>
    </Animated.View>
  );
}

/** A digit that rolls up when it changes. */
function Digit({ value, size }: { value: string; size: number }) {
  const y = useSharedValue(0);
  const o = useSharedValue(1);
  useEffect(() => {
    y.value = size * 0.28;
    o.value = 0.15;
    y.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
    o.value = withTiming(1, { duration: 200 });
  }, [value, y, o, size]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  return (
    <View style={{ overflow: 'hidden', height: size * 1.16 }}>
      <Animated.Text style={[{ fontFamily: f.monoBold, fontSize: size, lineHeight: size * 1.16, color: c.ink }, anim]}>{value}</Animated.Text>
    </View>
  );
}

function Unit({ value, label, size, accent }: { value: number; label: string; size: number; accent?: boolean }) {
  const text = String(value).padStart(2, '0');
  return (
    <View style={s.unit}>
      <View style={{ flexDirection: 'row' }}>
        {text.split('').map((d, i) => (
          <Digit key={i} value={d} size={size} />
        ))}
      </View>
      <Text style={[s.unitLabel, accent && { color: c.gold }]}>{label}</Text>
    </View>
  );
}

export function Hero() {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 520);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const live = meetingInSession(now);
  const meeting = live ?? nextMeeting(now);
  const left = countdownTo(meeting.startsAt, now);
  const flakeSize = w * 1.08;
  const digit = Math.min(44, (w - 48) / 6.4);

  return (
    <Animated.View entering={FadeIn.duration(500)} style={s.wrap}>
      <View style={[s.flake, { width: flakeSize, height: flakeSize, left: (w - flakeSize) / 2 }]}>
        <Flake size={flakeSize} progress={live ? 1 : weekProgress(now)} />
      </View>
      <View style={[s.centre, { height: flakeSize * 0.92 }]}>
        <Eyebrow color={live ? c.gold : c.muted}>{live ? 'In the room now' : 'Next fractal'}</Eyebrow>
        <Text
          accessibilityLabel={`Fractal ${meeting.number}`}
          style={[s.number, { fontSize: w * 0.42, lineHeight: w * 0.46 }]}
        >
          {meeting.number}
        </Text>
      </View>
      <View style={s.when}>
        <Text style={s.local}>{formatMeetingLocal(meeting.startsAt)}</Text>
        <Text style={s.ny}>{formatMeetingNy(meeting.startsAt)}</Text>
      </View>
      {live ? null : (
        <View style={s.count}>
          <Unit value={left.days} label="Days" size={digit} />
          <View style={s.sep} />
          <Unit value={left.hours} label="Hours" size={digit} />
          <View style={s.sep} />
          <Unit value={left.minutes} label="Min" size={digit} />
          <View style={s.sep} />
          <Unit value={left.seconds} label="Sec" size={digit} accent />
        </View>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingTop: 4 },
  flake: { position: 'absolute', top: 0 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  number: {
    fontFamily: f.display,
    color: c.ink,
    letterSpacing: -6,
    textShadowColor: 'rgba(3,24,47,0.95)',
    textShadowRadius: 26,
    textShadowOffset: { width: 0, height: 2 },
  },
  when: { alignItems: 'center', gap: 3, marginTop: 6 },
  local: { fontFamily: f.uiMid, color: c.ink, fontSize: 16 },
  ny: { fontFamily: f.mono, color: c.dim, fontSize: 12, letterSpacing: 0.4 },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: c.rule,
  },
  unit: { alignItems: 'center', flex: 1, gap: 2 },
  unitLabel: { fontFamily: f.mono, fontSize: 10, letterSpacing: 2, color: c.dim, textTransform: 'uppercase' },
  sep: { width: StyleSheet.hairlineWidth, height: 40, backgroundColor: c.rule },
});
