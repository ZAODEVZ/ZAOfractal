import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '../../ui/TabBar';
import { c } from '../../ui/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg }, animation: 'fade' }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="ranks" />
      <Tabs.Screen name="votes" />
      <Tabs.Screen name="read" />
    </Tabs>
  );
}
