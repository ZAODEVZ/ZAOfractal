import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Hero } from '../../ui/Hero';
import { Eyebrow, haptic, SnapshotNote, Tap } from '../../ui/kit';
import { TAB_BAR_SPACE } from '../../ui/TabBar';
import { c, f, LINKS } from '../../ui/theme';
import { remindersSupported, syncReminders, turnOffReminders, turnOnReminders } from '../../lib/notifications';
import { summary } from '../../lib/data';
import { formatDate, num } from '../../lib/format';

function Arrow({ color = c.ink }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d="M7 17L17 7M9 7h8v8" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Reminders() {
  const [on, setOn] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(() => {
    syncReminders().then(setOn).catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const toggle = async (next: boolean) => {
    haptic.tick();
    setNote(null);
    setOn(next);
    try {
      if (!next) {
        await turnOffReminders();
        return;
      }
      if ((await turnOnReminders()) === 'denied') {
        setOn(false);
        setNote('Notifications are off for this app. Turn them on in your phone settings, then try again.');
        return;
      }
      haptic.done();
    } catch {
      setOn(!next);
      setNote('That did not save. Try again.');
    }
  };

  return (
    <View style={s.card}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.cardTitle}>Monday reminders</Text>
        <Text style={s.cardBody}>
          {remindersSupported
            ? note ?? 'One hour before and at the start, in your own time zone.'
            : 'Available in the phone app.'}
        </Text>
      </View>
      <Switch
        accessibilityLabel="Monday reminders"
        value={on}
        disabled={!remindersSupported}
        onValueChange={toggle}
        trackColor={{ false: c.line, true: c.gold }}
        thumbColor={c.ink}
      />
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export default function Now() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: insets.bottom + TAB_BAR_SPACE }}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.column}>
        <View style={s.top}>
          <Text style={s.brand}>
            <Text style={{ color: c.gold }}>ZAO</Text> Fractal
          </Text>
          <Eyebrow>Mondays 6 PM ET</Eyebrow>
        </View>

        <Hero />

        <Animated.View entering={FadeInDown.delay(150).duration(420)} style={s.block}>
          <Tap label="Join the room on Discord" onPress={() => Linking.openURL(LINKS.discord)} style={s.primary}>
            <Text style={s.primaryText}>Join the room on Discord</Text>
            <Arrow color={c.bg} />
          </Tap>
          <Tap label="Submit your breakout" onPress={() => Linking.openURL(LINKS.submit)} style={s.secondary}>
            <View style={{ gap: 2 }}>
              <Text style={s.secondaryText}>Submit your breakout</Text>
              <Text style={s.cardBody}>zao.frapps.xyz</Text>
            </View>
            <Arrow />
          </Tap>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).duration(420)} style={s.block}>
          <Reminders />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(330).duration(420)} style={s.block}>
          <View style={s.statsRow}>
            <Stat value={num(summary.respect)} label="ZOR Respect" />
            <Stat value={num(summary.holders)} label="Holders" />
            <Stat value={num(summary.executed)} label="Executed" />
          </View>
          <SnapshotNote date={formatDate(summary.pulledAt)} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(420)} style={s.about}>
          <Text style={s.quote}>Six people in a room. Everyone shares what they did. The room ranks it. Respect follows the work.</Text>
          <Tap label="Privacy" onPress={() => Linking.openURL(LINKS.privacy)} scale={1}>
            <Text style={s.fine}>Nothing leaves your phone. Privacy</Text>
          </Tap>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  column: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, zIndex: 2 },
  brand: { fontFamily: f.display, fontSize: 18, color: c.ink, letterSpacing: -0.4 },
  block: { paddingHorizontal: 20, marginTop: 20, gap: 10 },
  primary: {
    backgroundColor: c.gold,
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryText: { fontFamily: f.displayMid, fontSize: 16, color: c.bg },
  secondary: {
    backgroundColor: c.elev,
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.rule,
  },
  secondaryText: { fontFamily: f.uiBold, fontSize: 15, color: c.ink },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: c.elev,
    borderRadius: 16,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.rule,
  },
  cardTitle: { fontFamily: f.uiBold, fontSize: 15, color: c.ink },
  cardBody: { fontFamily: f.ui, fontSize: 13, color: c.dim, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 22, paddingTop: 6 },
  stat: { gap: 1 },
  statValue: { fontFamily: f.display, fontSize: 26, color: c.ink, letterSpacing: -0.6 },
  statLabel: { fontFamily: f.ui, fontSize: 12, color: c.dim },
  about: { paddingHorizontal: 20, marginTop: 30, gap: 12 },
  quote: { fontFamily: f.readIt, fontSize: 19, lineHeight: 27, color: c.muted },
  fine: { fontFamily: f.mono, fontSize: 11, color: c.dim, paddingVertical: 6 },
});
