import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Empty, SnapshotNote, Tap, haptic } from '../../ui/kit';
import { TAB_BAR_SPACE } from '../../ui/TabBar';
import { c, f, stageColor } from '../../ui/theme';
import { proposals, proposalTitle, summary, type Proposal } from '../../lib/data';
import { formatDate, num, stageLabel } from '../../lib/format';

const FILTERS: { id: string; label: string; test: (p: Proposal) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'open', label: 'Open', test: (p) => p.stage === 'Voting' || p.stage === 'Veto' || p.stage === 'Executable' },
  { id: 'done', label: 'Executed', test: (p) => p.stage === 'Executed' },
  { id: 'failed', label: 'Did not land', test: (p) => p.stage === 'Failed' || p.stage === 'ExecutionFailed' },
];

export function TallyBar({ yes, no }: { yes: number; no: number }) {
  const total = yes + no;
  if (total === 0) return <View style={s.tally} />;
  return (
    <View style={s.tally}>
      <View style={{ flex: yes, backgroundColor: c.gold }} />
      {no > 0 && <View style={{ flex: no, backgroundColor: c.muted }} />}
    </View>
  );
}

function Card({ p, onOpen }: { p: Proposal; onOpen: () => void }) {
  const color = stageColor[p.stage] ?? c.dim;
  return (
    <Tap label={proposalTitle(p)} onPress={onOpen} style={s.card} scale={0.985}>
      <View style={s.cardTop}>
        <View style={s.stage}>
          <View style={[s.dot, { backgroundColor: color }]} />
          <Text style={[s.stageText, { color }]}>{stageLabel(p.stage)}</Text>
        </View>
        <Text style={s.date}>{formatDate(p.at)}</Text>
      </View>
      <Text style={s.title} numberOfLines={3}>{proposalTitle(p)}</Text>
      <TallyBar yes={p.yes} no={p.no} />
      <View style={s.cardFoot}>
        <Text style={s.tallyText}>{num(p.yes)} yes</Text>
        <Text style={s.tallyText}>{num(p.no)} no</Text>
        {p.minted != null && <Text style={[s.tallyText, { marginLeft: 'auto', color: c.gold }]}>{num(p.minted)} Respect</Text>}
      </View>
    </Tap>
  );
}

export default function Votes() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const rows = useMemo(() => proposals.filter(FILTERS.find((x) => x.id === filter)!.test), [filter]);

  return (
    <FlatList
      style={s.root}
      data={rows}
      keyExtractor={(p) => p.id}
      contentContainerStyle={[s.column, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + TAB_BAR_SPACE }]}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 16 }}>
          <Text style={s.h1}>Votes</Text>
          <Text style={s.lead}>
            The latest {proposals.length} of {num(summary.proposals)} proposals on the OREC contract. Weight is OG Respect.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {FILTERS.map((x) => {
              const on = x.id === filter;
              return (
                <Tap
                  key={x.id}
                  label={x.label}
                  scale={0.94}
                  onPress={() => {
                    haptic.tick();
                    setFilter(x.id);
                  }}
                  style={[s.chip, on && s.chipOn]}
                >
                  <Text style={[s.chipText, on && { color: c.bg }]}>{x.label}</Text>
                </Tap>
              );
            })}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={<Empty title="Nothing here right now" body="No recent proposals in this group. Try another filter." />}
      ListFooterComponent={
        <View style={{ marginTop: 18 }}>
          <SnapshotNote date={formatDate(summary.pulledAt)} />
        </View>
      }
      renderItem={({ item, index }) => (
        <Animated.View entering={index < 7 ? FadeInDown.delay(index * 45).duration(340) : undefined}>
          <Card p={item} onOpen={() => router.push(`/proposal/${item.id}`)} />
        </Animated.View>
      )}
    />
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  column: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 20 },
  h1: { fontFamily: f.display, fontSize: 44, color: c.ink, letterSpacing: -1.5 },
  lead: { fontFamily: f.read, fontSize: 16, lineHeight: 23, color: c.muted, marginTop: 4, marginBottom: 16 },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: 18, justifyContent: 'center', backgroundColor: c.elev, borderWidth: StyleSheet.hairlineWidth, borderColor: c.rule },
  chipOn: { backgroundColor: c.ink, borderColor: c.ink },
  chipText: { fontFamily: f.uiMid, fontSize: 13, color: c.muted },
  card: { backgroundColor: c.elev, borderRadius: 16, padding: 16, gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stage: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  stageText: { fontFamily: f.mono, fontSize: 11, letterSpacing: 0.5 },
  date: { fontFamily: f.mono, fontSize: 11, color: c.dim },
  title: { fontFamily: f.displayMid, fontSize: 17, lineHeight: 23, color: c.ink },
  tally: { flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: c.line, gap: 2 },
  cardFoot: { flexDirection: 'row', gap: 14 },
  tallyText: { fontFamily: f.mono, fontSize: 11, color: c.muted },
});
