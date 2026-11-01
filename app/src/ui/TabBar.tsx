import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { c, f } from './theme';
import { haptic } from './kit';

const ICONS: Record<string, string> = {
  index: 'M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5zM12 8v4.4l3 1.8',
  ranks: 'M5 20v-6M12 20V5M19 20v-10',
  votes: 'M4 12.5l5 5L20 6.5',
  read: 'M12 6.5C10 5 7 4.5 3.5 4.5v14c3.5 0 6.5.5 8.5 2 2-1.5 5-2 8.5-2v-14C17 4.5 14 5 12 6.5zM12 6.5v14',
};
const LABELS: Record<string, string> = { index: 'Now', ranks: 'Ranks', votes: 'Votes', read: 'Read' };

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const tabW = width / state.routes.length;
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withSpring(state.index * tabW, { damping: 20, stiffness: 240 });
  }, [state.index, tabW, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const inner = (
    <View style={s.row} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Animated.View style={[s.pillWrap, { width: tabW }, pill]}>
          <View style={s.pill} />
        </Animated.View>
      )}
      {state.routes.map((route, i) => {
        const on = state.index === i;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={LABELS[route.name]}
            style={s.tab}
            onPress={() => {
              if (!on) {
                haptic.tick();
                navigation.navigate(route.name);
              }
            }}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                d={ICONS[route.name]}
                stroke={on ? c.gold : c.dim}
                strokeWidth={1.9}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
            <Text style={[s.label, { color: on ? c.ink : c.dim }]}>{LABELS[route.name]}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View pointerEvents="box-none" style={[s.dock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={50} tint="dark" style={s.bar}>
          {inner}
        </BlurView>
      ) : (
        <View style={[s.bar, s.solid]}>{inner}</View>
      )}
    </View>
  );
}

export const TAB_BAR_SPACE = 96;

const s = StyleSheet.create({
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 16 },
  bar: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.rule,
  },
  solid: { backgroundColor: 'rgba(2,36,73,0.97)' },
  row: { flexDirection: 'row', height: 62 },
  pillWrap: { position: 'absolute', top: 0, bottom: 0, padding: 5 },
  pill: { flex: 1, borderRadius: 21, backgroundColor: 'rgba(245,197,24,0.14)' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontFamily: f.uiMid, fontSize: 11, letterSpacing: 0.2 },
});
