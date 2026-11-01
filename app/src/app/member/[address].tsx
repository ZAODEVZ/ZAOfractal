import { useMemo } from 'react';
import { FlatList, Linking, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BackBar, Empty, Eyebrow, Glyph, Tap } from '../../ui/kit';
import { c, f, LINKS } from '../../ui/theme';
import { members } from '../../lib/data';
import { num, shortAddress } from '../../lib/format';

/** Respect by session, oldest to newest, as a row of bars. */
function Spark({ values }: { values: number[] }) {
  const top = Math.max(1, ...values);
  return (
    <View style={s.spark}>
      {values.map((v, i) => (
        <View key={i} style={{ flex: 1, height: `${Math.max(6, (v / top) * 100)}%`, backgroundColor: i === values.length - 1 ? c.gold : c.gold, borderRadius: 2, maxWidth: 14 }} />
      ))}
    </View>
  );
}

export default function MemberScreen() {
  const { address = '' } = useLocalSearchParams<{ address: string }>();
  const insets = useSafeAreaInsets();
  const m = members[address.toLowerCase()];
  const history = m?.h ?? [];
  const spark = useMemo(() => history.slice(0, 24).map((x) => x.r ?? 0).reverse(), [history]);

  return (
    <View style={s.root}>
      <BackBar label="Holder" />
      <FlatList
        data={history}
        keyExtractor={(x, i) => `${x.s}-${i}`}
        contentContainerStyle={[s.column, { paddingBottom: insets.bottom + 40 }]}
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.duration(360)}>
            <View style={s.head}>
              <Glyph address={address} size={112} />
              <Text style={s.addr}>{shortAddress(address)}</Text>
              <Tap label="View on explorer" onPress={() => Linking.openURL(LINKS.address(address))} scale={0.95}>
                <Text style={s.link}>View on explorer</Text>
              </Tap>
            </View>
            <View style={s.totals}>
              <View style={s.total}>
                <Text style={s.totalValue}>{num(m?.z ?? 0)}</Text>
                <Eyebrow>ZOR Respect</Eyebrow>
              </View>
              <View style={s.total}>
                <Text style={s.totalValue}>{num(m?.o ?? 0)}</Text>
                <Eyebrow>OG Respect</Eyebrow>
              </View>
            </View>
            {spark.length > 1 && <Spark values={spark} />}
            {history.length > 0 && <Eyebrow style={{ marginTop: 26, marginBottom: 4 }}>{history.length} ZOR awards</Eyebrow>}
          </Animated.View>
        }
        ListEmptyComponent={<Empty title="No ZOR awards yet" body="This wallet's Respect comes from the OG era, or its first ZOR award is still to come." />}
        renderItem={({ item }) => (
          <View style={s.row}>
            <Text style={s.session}>Fractal {item.s}</Text>
            <Text style={s.date}>{item.d}</Text>
            <Text style={s.earned}>{item.r != null ? `+${num(item.r)}` : ''}</Text>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  column: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 20 },
  head: { alignItems: 'center', gap: 10, marginTop: 10 },
  addr: { fontFamily: f.monoBold, fontSize: 20, color: c.ink, marginTop: 6 },
  link: { fontFamily: f.uiMid, fontSize: 13, color: c.gold, padding: 6 },
  totals: { flexDirection: 'row', gap: 10, marginTop: 18 },
  total: { flex: 1, gap: 4, backgroundColor: c.elev, borderRadius: 16, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: c.rule },
  totalValue: { fontFamily: f.display, fontSize: 30, color: c.ink, letterSpacing: -1 },
  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 64, marginTop: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  session: { fontFamily: f.uiMid, fontSize: 15, color: c.ink, flex: 1 },
  date: { fontFamily: f.mono, fontSize: 11, color: c.dim, marginRight: 14 },
  earned: { fontFamily: f.monoBold, fontSize: 14, color: c.ink, minWidth: 48, textAlign: 'right' },
});
