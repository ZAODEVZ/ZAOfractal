import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Tap } from '../../ui/kit';
import { TAB_BAR_SPACE } from '../../ui/TabBar';
import { c, f } from '../../ui/theme';
import { chapters } from '../../lib/whitepaper';

export default function Read() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const total = chapters.reduce((n, x) => n + x.minutes, 0);
  return (
    <FlatList
      style={s.root}
      data={chapters}
      keyExtractor={(x) => x.id}
      contentContainerStyle={[s.column, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + TAB_BAR_SPACE }]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={{ marginBottom: 14 }}>
          <Text style={s.h1}>The Whitepaper</Text>
          <Text style={s.lead}>Why governance should follow contribution, and how a music community runs it every Monday. About {Math.round(total / 6) * 6 >= 60 ? `${Math.round(total / 60)} hours` : `${total} minutes`} in all, offline.</Text>
        </View>
      }
      renderItem={({ item, index }) => (
        <Animated.View entering={index < 9 ? FadeInDown.delay(index * 35).duration(320) : undefined}>
          <Tap label={item.title} onPress={() => router.push(`/chapter/${item.id}`)} style={s.row} scale={0.985}>
            <Text style={s.num}>{item.num ? item.num.padStart(2, '0') : '00'}</Text>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.meta}>{item.minutes} min</Text>
            </View>
          </Tap>
        </Animated.View>
      )}
    />
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  column: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 20 },
  h1: { fontFamily: f.display, fontSize: 44, lineHeight: 48, color: c.ink, letterSpacing: -1.5 },
  lead: { fontFamily: f.read, fontSize: 16, lineHeight: 23, color: c.muted, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  num: { fontFamily: f.display, fontSize: 34, color: '#3B6798', width: 56, letterSpacing: -1 },
  title: { fontFamily: f.readMid, fontSize: 18, lineHeight: 24, color: c.ink },
  meta: { fontFamily: f.mono, fontSize: 11, color: c.dim },
});
