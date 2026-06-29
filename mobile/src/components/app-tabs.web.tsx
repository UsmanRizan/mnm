import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, useColorScheme, View, StyleSheet, Text } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>🏠 Home</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href={'/explore' as any} asChild>
            <TabButton>🔍 Explore</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View
        style={[
          styles.tabButtonView,
          { backgroundColor: isFocused ? colors.backgroundSelected : colors.backgroundElement },
        ]}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: isFocused ? '700' : '400',
            color: isFocused ? colors.text : colors.textSecondary,
          }}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <View {...props} style={styles.tabListContainer}>
      <View
        style={[
          styles.innerContainer,
          { backgroundColor: colors.backgroundElement },
        ]}>
        <Text
          style={{
            fontWeight: '700',
            fontSize: 13,
            color: colors.text,
            marginRight: 'auto',
          }}>
          Gemstone 💎
        </Text>

        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: 8,
    maxWidth: 800,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
});
