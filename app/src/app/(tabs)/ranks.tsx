import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useAnimatedStyle, useDerivedValue, withSpring } from 'react-native-reanimated';
import { Glyph, Eyebrow, Empty, haptic, SnapshotNote, Tap } from '../../ui/kit';
import { TAB_BAR_SPACE } from '../../ui/TabBar';
import { c, f } from '../../ui/theme';
import { leaderboard, summary } from '../../lib/data';
import { formatDate, num, shortAddress } from '../../lib/format';

type Row = { a: string; r: number; n?: number };
type Board = 'zor' | 'og';
const BOARDS: { id: Board; label: string; blurb: string }[] = [
  { id: 'zor', label: 'ZOR', blurb: 'Fractal 74 onward. Soulbound, ERC-1155.' },
  { id: 'og', label: 'OG', blurb: 'Fractals 1 to 73. ERC-20.' },
];

function Segment({ value, onChange }: { value: Board; onChange: (b: Board) => void }) {
  const i = useDerivedValue(() => withSpring(value === 'zor' ? 0 : 1, { damping: 20, stiffness: 260 }));
  const slide = useAnimatedStyle(() => ({ left: `${i.value * 50}%` }));
  return (
    <View style={s.seg} accessibilityRole="tablist">
      <Animated.View style={[s.segPill, slide]} />
      {BOARDS.map((b) => (
        <Pressable
          key={b.id}
          style={s.segTab}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === b.id }}
          onPress={() => {
            if (value !== b.id) {
              haptic.tick();
              onChange(b.id);
            }
          }}
        >
          <Text style={[s.segText, value === b.id && { color: c.bg }]}>{b.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Podium({ rows, onOpen }: { rows: Row[]; onOpen: (a: string) => void }) {
  const [first, second, third] = rows;
  const Slot = ({ row, rank, height, color }: { row?: Row; rank: number; height: number; color: string }) =>
    row ? (
      <Tap label={`Rank ${rank}, ${shortAddress(row.a)}`} onPress={() => onOpen(row.a)} style={s.slot}>
        <Glyph address={row.a} size={rank === 1 ? 60 : 46} />
        <Text style={s.slotAddr} numberOfLines={1}>{shortAddress(row.a)}</Text>
        <View style={[s.plinth, { height, borderTopColor: color }]}>
          <Text style={[s.plinthRank, { color }]}>{rank}</Text>
          <Text style={s.plinthValue}>{num(row.r)}</Text>
        </View>
      </Tap>
    ) : (
      <View style={{ flex: 1 }} />
    );
  return (
    <View style={s.podium}>
      <Slot row={second} rank={2} height={92} color={c.muted} />
      <Slot row={first} rank={1} height={128} color={c.gold} />
      <Slot row={third} rank={3} height={72} color={c.gold} />
    </View>
  );
}

export default function Ranks() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [board, setBoard] = useState<Board>('zor');
  const rows: Row[] = leaderboard[board];
  const top = rows[0]?.r ?? 1;
  const open = (a: string) => router.push(`/member/${a}`);

  return (
    <FlatList
      key={board}
      style={s.root}
      data={rows.slice(3)}
      keyExtractor={(r) => r.a}
      initialNumToRender={14}
      contentContainerStyle={[s.column, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + TAB_BAR_SPACE }]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View>
          <Text style={s.h1}>Respect</Text>
          <Text style={s.lead}>{BOARDS.find((b) => b.id === board)?.blurb} Earned in the room, never bought.</Text>
          <Segment value={board} onChange={setBoard} />
          <Podium rows={rows} onOpen={open} />
          <Eyebrow style={{ marginTop: 26, marginBottom: 6 }}>{num(rows.length)} holders</Eyebrow>
        </View>
      }
      ListEmptyComponent={rows.length > 3 ? null : <Empty title="The board is forming" body="Holders show here after the next on-chain snapshot." />}
      ListFooterComponent={
        <View style={{ marginTop: 18 }}>
          <SnapshotNote date={formatDate(summary.pulledAt)} />
          <Text style={s.foot}>Shown by wallet address.</Text>
        </View>
      }
      renderItem={({ item, index }) => (
        <Animated.View entering={index < 12 ? FadeInDown.delay(index * 28).duration(320) : undefined}>
          <Tap label={`Rank ${index + 4}, ${shortAddress(item.a)}, ${item.r} Respect`} onPress={() => open(item.a)} style={s.row} scale={0.985}>
            <Text style={s.rank}>{index + 4}</Text>
            <Glyph address={item.a} size={30} />
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.addr}>{shortAddress(item.a)}</Text>
              <View style={s.track}>
                <View style={[s.fill, { width: `${Math.max(2, (item.r / top) * 100)}%` }]} />
              </View>
            </View>
            <Text style={s.value}>{num(item.r)}</Text>
          </Tap>
        </Animated.View>
      )}
    />
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  column: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 20 },
  h1: { fontFamily: f.display, fontSize: 44, color: c.ink, letterSpacing: -1.5 },
  lead: { fontFamily: f.read, fontSize: 16, lineHeight: 23, color: c.muted, marginTop: 4, marginBottom: 18 },
  seg: { flexDirection: 'row', height: 44, borderRadius: 14, backgroundColor: c.elev, padding: 0, overflow: 'hidden' },
  segPill: { position: 'absolute', top: 4, bottom: 4, width: '50%', borderRadius: 11, backgroundColor: c.ink },
  segTab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segText: { fontFamily: f.monoBold, fontSize: 13, letterSpacing: 1.5, color: c.muted },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 28 },
  slot: { alignItems: 'center', gap: 8 },
  slotAddr: { fontFamily: f.mono, fontSize: 10.5, color: c.muted },
  plinth: {
    alignSelf: 'stretch',
    backgroundColor: c.elev,
    borderTopWidth: 3,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plinthRank: { fontFamily: f.display, fontSize: 26 },
  plinthValue: { fontFamily: f.monoBold, fontSize: 13, color: c.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  rank: { fontFamily: f.mono, fontSize: 12, color: c.dim, width: 24 },
  addr: { fontFamily: f.mono, fontSize: 13, color: c.ink },
  track: { height: 3, backgroundColor: c.line, borderRadius: 2 },
  fill: { height: 3, backgroundColor: c.gold, borderRadius: 2 },
  value: { fontFamily: f.monoBold, fontSize: 14, color: c.ink, minWidth: 48, textAlign: 'right' },
  foot: { fontFamily: f.mono, fontSize: 10.5, color: c.dim, marginTop: 4 },
});
