import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppLanguage } from '@/i18n/strings';
import { typography } from '@/ui/tokens/typography';

type MoneyNoteTabIconName = 'calendar' | 'entry' | 'more' | 'report';

function MoneyNoteTabIcon({
  color,
  name,
}: {
  color: string;
  name: MoneyNoteTabIconName;
}) {
  if (name === 'entry') {
    return (
      <View style={tabIconStyles.pencilBox}>
        <View style={[tabIconStyles.pencilShaft, { backgroundColor: color }]} />
        <View style={[tabIconStyles.pencilTip, { borderLeftColor: color }]} />
      </View>
    );
  }

  if (name === 'calendar') {
    return (
      <View style={[tabIconStyles.calendar, { borderColor: color }]}>
        <View style={[tabIconStyles.calendarTop, { backgroundColor: color }]} />
        <View style={tabIconStyles.calendarDots}>
          <View style={[tabIconStyles.calendarDot, { backgroundColor: color }]} />
          <View style={[tabIconStyles.calendarDot, { backgroundColor: color }]} />
          <View style={[tabIconStyles.calendarDot, { backgroundColor: color }]} />
        </View>
      </View>
    );
  }

  if (name === 'report') {
    return (
      <View style={[tabIconStyles.reportCircle, { borderColor: color }]}>
        <View style={[tabIconStyles.reportSlice, { backgroundColor: color }]} />
      </View>
    );
  }

  return (
    <View style={tabIconStyles.moreDots}>
      <View style={[tabIconStyles.moreDot, { backgroundColor: color }]} />
      <View style={[tabIconStyles.moreDot, { backgroundColor: color }]} />
      <View style={[tabIconStyles.moreDot, { backgroundColor: color }]} />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const appLanguage = useAppLanguage();
  const titles =
    appLanguage === 'en'
      ? {
          calendar: 'Calendar',
          entry: 'Entry',
          more: 'More',
          report: 'Report',
        }
      : {
          calendar: 'Lịch',
          entry: 'Nhập vào',
          more: 'Khác',
          report: 'Báo cáo',
        };

  const bottomPadding = Math.max(insets.bottom, 12);
  const tabBarHeight = 72 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#12A7DF',
        tabBarInactiveTintColor: '#A8A8A8',
        tabBarItemStyle: {
          justifyContent: 'center',
          paddingVertical: 6,
        },
        tabBarLabelStyle: {
          ...typography.tabLabel,
          marginTop: 0,
        },
        tabBarStyle: {
          backgroundColor: '#FAFAFA',
          borderTopColor: '#E4E4E4',
          height: tabBarHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <MoneyNoteTabIcon color={color} name="entry" />,
          title: titles.entry,
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          tabBarIcon: ({ color }) => <MoneyNoteTabIcon color={color} name="calendar" />,
          title: titles.calendar,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ color }) => <MoneyNoteTabIcon color={color} name="report" />,
          title: titles.report,
        }}
      />
      <Tabs.Screen name="review" options={{ href: null }} />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color }) => <MoneyNoteTabIcon color={color} name="more" />,
          title: titles.more,
        }}
      />
    </Tabs>
  );
}

const tabIconStyles = StyleSheet.create({
  calendar: {
    borderRadius: 3,
    borderWidth: 2,
    height: 24,
    overflow: 'hidden',
    width: 28,
  },
  calendarDot: {
    borderRadius: 2,
    height: 4,
    width: 4,
  },
  calendarDots: {
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
    paddingTop: 5,
  },
  calendarTop: {
    height: 5,
    width: '100%',
  },
  moreDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  moreDots: {
    flexDirection: 'row',
    gap: 5,
    paddingTop: 12,
  },
  pencilBox: {
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  pencilShaft: {
    borderRadius: 2,
    height: 6,
    transform: [{ rotate: '-38deg' }],
    width: 25,
  },
  pencilTip: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 4,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderTopWidth: 4,
    height: 0,
    position: 'absolute',
    right: 0,
    top: 7,
    transform: [{ rotate: '-38deg' }],
    width: 0,
  },
  reportCircle: {
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    overflow: 'hidden',
    width: 28,
  },
  reportSlice: {
    height: 14,
    marginLeft: 13,
    width: 14,
  },
});
