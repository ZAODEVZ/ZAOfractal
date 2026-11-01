import { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { BackBar, Empty, Skeleton, Tap } from '../../ui/kit';
import { c, f } from '../../ui/theme';
import { chapters } from '../../lib/whitepaper';
import { parseBlocks, type Block, type Inline } from '../../lib/markdown';

function Spans({ spans }: { spans: Inline[] }) {
  return (
    <>
      {spans.map((x, i) => (
        <Text
          key={i}
          onPress={x.href ? () => Linking.openURL(x.href as string) : undefined}
          style={[
            x.bold && { fontFamily: f.readBold, color: c.ink },
            x.italic && { fontFamily: f.readIt },
            x.code && { fontFamily: f.mono, fontSize: 14, color: c.muted },
            x.href ? { color: c.gold, textDecorationLine: 'underline' } : null,
          ]}
        >
          {x.text}
        </Text>
      ))}
    </>
  );
}

function BlockView({ b }: { b: Block }) {
  switch (b.kind) {
    case 'h2':
      return <Text style={s.h2}>{b.text}</Text>;
    case 'h3':
      return <Text style={s.h3}>{b.text}</Text>;
    case 'p':
      return <Text style={s.p}><Spans spans={b.spans} /></Text>;
    case 'quote':
      return <View style={s.quote}><Text style={s.quoteText}><Spans spans={b.spans} /></Text></View>;
    case 'li':
      return (
        <View style={s.li}>
          <Text style={s.mark}>{b.ordered ? `${b.ordered}.` : '•'}</Text>
          <Text style={[s.p, s.liText]}><Spans spans={b.spans} /></Text>
        </View>
      );
    case 'code':
      return (
        <ScrollView horizontal style={s.code} showsHorizontalScrollIndicator={false}>
          <Text style={s.codeText}>{b.text}</Text>
        </ScrollView>
      );
    case 'table':
      return (
        <ScrollView horizontal style={s.table} showsHorizontalScrollIndicator={false}>
          <View>
            {b.rows.map((row, r) => (
              <View key={r} style={[s.tr, r === 0 && s.th]}>
                {row.map((cell, i) => (
                  <Text key={i} style={[s.td, r === 0 && { fontFamily: f.uiBold, color: c.ink }]}><Spans spans={cell} /></Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      );
    case 'rule':
      return <View style={s.rule} />;
  }
}

function Loading() {
  return (
    <View style={{ paddingHorizontal: 22, gap: 12, marginTop: 8 }}>
      <Skeleton width="100%" />
      <Skeleton width="94%" />
      <Skeleton width="98%" />
      <Skeleton width="62%" />
      <View style={{ height: 14 }} />
      <Skeleton width="96%" />
      <Skeleton width="100%" />
      <Skeleton width="80%" />
    </View>
  );
}

export default function ChapterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const index = chapters.findIndex((x) => x.id === id);
  const chapter = chapters[index];
  const next = chapters[index + 1];

  // Lay out after the push animation has had a moment, so the transition stays smooth on long chapters.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    const h = setTimeout(() => setReady(true), 220);
    return () => clearTimeout(h);
  }, [id]);
  const blocks = useMemo(() => (chapter && ready ? parseBlocks(chapter.body) : []), [chapter, ready]);

  const progress = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    const room = e.contentSize.height - e.layoutMeasurement.height;
    progress.value = room > 0 ? Math.min(1, Math.max(0, e.contentOffset.y / room)) : 0;
  });
  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  if (!chapter) {
    return (
      <View style={s.root}>
        <BackBar label="Whitepaper" />
        <Empty title="Chapter not found" body="Go back and pick one from the list." />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <BackBar label={chapter.num ? `Chapter ${chapter.num}` : 'Whitepaper'} />
      <View style={s.barTrack}><Animated.View style={[s.barFill, bar]} /></View>
      <Animated.FlatList<Block>
        data={blocks}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, i) => String(i)}
        initialNumToRender={16}
        windowSize={9}
        contentContainerStyle={[s.column, { paddingBottom: insets.bottom + 48 }]}
        ListHeaderComponent={
          <Animated.View entering={FadeIn.duration(300)}>
            <Text style={s.title}>{chapter.title}</Text>
            <Text style={s.meta}>{chapter.minutes} min read</Text>
            {!ready && <Loading />}
          </Animated.View>
        }
        renderItem={({ item }) => <View style={s.pad}><BlockView b={item} /></View>}
        ListFooterComponent={
          ready && next ? (
            <View style={s.pad}>
              <Tap label={`Next: ${next.title}`} onPress={() => router.replace(`/chapter/${next.id}`)} style={s.next}>
                <Text style={s.nextLabel}>Next chapter</Text>
                <Text style={s.nextTitle}>{next.title}</Text>
              </Tap>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  column: { width: '100%', maxWidth: 620, alignSelf: 'center' },
  pad: { paddingHorizontal: 22 },
  barTrack: { height: 2, backgroundColor: c.line },
  barFill: { height: 2, backgroundColor: c.gold },
  title: { fontFamily: f.display, fontSize: 36, lineHeight: 41, color: c.ink, letterSpacing: -1, paddingHorizontal: 22, marginTop: 22 },
  meta: { fontFamily: f.mono, fontSize: 11, color: c.dim, paddingHorizontal: 22, marginTop: 8, marginBottom: 18 },
  h2: { fontFamily: f.displayMid, fontSize: 23, lineHeight: 29, color: c.ink, marginTop: 30, marginBottom: 10 },
  h3: { fontFamily: f.uiBold, fontSize: 17, lineHeight: 23, color: c.muted, marginTop: 20, marginBottom: 6 },
  p: { fontFamily: f.read, fontSize: 18, lineHeight: 29, color: '#D6DFEB', marginBottom: 14 },
  quote: { borderLeftWidth: 2, borderLeftColor: c.gold, paddingLeft: 14, marginVertical: 6, marginBottom: 14 },
  quoteText: { fontFamily: f.readIt, fontSize: 18, lineHeight: 28, color: c.muted },
  li: { flexDirection: 'row', gap: 10 },
  mark: { fontFamily: f.mono, fontSize: 13, lineHeight: 29, color: c.gold, minWidth: 16 },
  liText: { flex: 1, marginBottom: 8 },
  code: { backgroundColor: c.elev, borderRadius: 10, padding: 14, marginBottom: 14 },
  codeText: { fontFamily: f.mono, fontSize: 13, lineHeight: 20, color: c.muted },
  table: { marginBottom: 16 },
  tr: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.rule },
  th: { backgroundColor: c.elev },
  td: { fontFamily: f.ui, fontSize: 13, lineHeight: 19, color: c.muted, width: 170, padding: 10 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: c.rule, marginVertical: 18 },
  next: { backgroundColor: c.elev, borderRadius: 16, padding: 18, marginTop: 22, gap: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: c.rule },
  nextLabel: { fontFamily: f.mono, fontSize: 11, letterSpacing: 1.5, color: c.gold, textTransform: 'uppercase' },
  nextTitle: { fontFamily: f.displayMid, fontSize: 18, lineHeight: 24, color: c.ink },
});
