import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BackBar, Empty, Eyebrow, Glyph, Tap } from '../../ui/kit';
import { c, f, LINKS, stageColor } from '../../ui/theme';
import { proposals, proposalTitle } from '../../lib/data';
import { formatDate, num, shortAddress, stageLabel } from '../../lib/format';

function AddressRow({ a, right, rightColor, onOpen }: { a: string; right: string; rightColor?: string; onOpen: () => void }) {
  return (
    <Tap label={shortAddress(a)} onPress={onOpen} style={s.row} scale={0.985}>
      <Glyph address={a} size={26} />
      <Text style={s.addr}>{shortAddress(a)}</Text>
      <Text style={[s.right, rightColor ? { color: rightColor } : null]}>{right}</Text>
    </Tap>
  );
}

export default function ProposalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const p = proposals.find((x) => x.id === id);
  if (!p) {
    return (
      <View style={s.root}>
        <BackBar label="Proposal" />
        <Empty title="Proposal not found" body="It may have aged out of the latest list." />
      </View>
    );
  }
  const color = stageColor[p.stage] ?? c.dim;
  const total = p.yes + p.no;
  const open = (a: string) => router.push(`/member/${a}`);
  return (
    <View style={s.root}>
      <BackBar label={formatDate(p.at)} />
      <ScrollView contentContainerStyle={[s.column, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(340)}>
          <Text style={[s.stage, { color }]}>{stageLabel(p.stage)}</Text>
          <Text style={s.title}>{proposalTitle(p)}</Text>

          <View style={s.tally}>
            <View style={s.side}>
              <Text style={[s.big, { color: c.gold }]}>{num(p.yes)}</Text>
              <Eyebrow>Yes</Eyebrow>
            </View>
            <View style={[s.side, { alignItems: 'flex-end' }]}>
              <Text style={[s.big, { color: p.no > 0 ? c.muted : c.dim }]}>{num(p.no)}</Text>
              <Eyebrow>No</Eyebrow>
            </View>
          </View>
          <View style={s.bar}>
            {total > 0 && <View style={{ flex: p.yes, backgroundColor: c.gold }} />}
            {p.no > 0 && <View style={{ flex: p.no, backgroundColor: c.muted }} />}
          </View>

          {p.awards.length > 0 && (
            <View style={s.section}>
              <Eyebrow>{p.minted != null ? `${num(p.minted)} Respect awarded` : 'Awards'}</Eyebrow>
              {p.awards.map((x, i) => (
                <AddressRow key={`${x.a}-${i}`} a={x.a} right={`+${num(x.r)}`} rightColor={c.gold} onOpen={() => open(x.a)} />
              ))}
            </View>
          )}

          <View style={s.section}>
            <Eyebrow>{p.votes.length} weighted votes</Eyebrow>
            {p.votes.length === 0 ? (
              <Text style={s.none}>No weighted votes on this one.</Text>
            ) : (
              p.votes.map((v) => (
                <AddressRow
                  key={v.a}
                  a={v.a}
                  right={`${v.v} ${num(v.w)}`}
                  rightColor={v.v === 'Yes' ? c.gold : v.v === 'No' ? c.muted : c.dim}
                  onOpen={() => open(v.a)}
                />
              ))
            )}
          </View>

          {p.tx && (
            <Tap label="View transaction" onPress={() => Linking.openURL(LINKS.tx(p.tx as string))} style={s.tx}>
              <Text style={s.txText}>View transaction on explorer</Text>
            </Tap>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  column: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 20 },
  stage: { fontFamily: f.mono, fontSize: 12, letterSpacing: 0.6, marginTop: 10 },
  title: { fontFamily: f.display, fontSize: 30, lineHeight: 36, color: c.ink, letterSpacing: -0.8, marginTop: 8 },
  tally: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  side: { gap: 2 },
  big: { fontFamily: f.display, fontSize: 34, letterSpacing: -1 },
  bar: { flexDirection: 'row', gap: 2, height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: c.line, marginTop: 10 },
  section: { marginTop: 28 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  addr: { fontFamily: f.mono, fontSize: 13, color: c.ink, flex: 1 },
  right: { fontFamily: f.monoBold, fontSize: 13, color: c.muted },
  none: { fontFamily: f.read, fontSize: 15, color: c.dim, marginTop: 10 },
  tx: { marginTop: 24, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.elev, borderWidth: StyleSheet.hairlineWidth, borderColor: c.rule },
  txText: { fontFamily: f.uiMid, fontSize: 14, color: c.ink },
});
