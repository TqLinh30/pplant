import { Tabs, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppLanguage } from '@/i18n/strings';
import { typography } from '@/ui/tokens/typography';

type MoneyNoteTabIconName = 'calendar' | 'entry' | 'journal' | 'more' | 'report';

function MoneyNoteTabIcon({ color, name }: { color: string; name: MoneyNoteTabIconName }) {
  if (name === 'entry') {
    return <MaterialCommunityIcons color={color} name="pencil-plus-outline" size={30} />;
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

  if (name === 'journal') {
    return <MaterialCommunityIcons color={color} name="book-heart-outline" size={28} />;
  }

  return (
    <View style={tabIconStyles.moreDots}>
      <View style={[tabIconStyles.moreDot, { backgroundColor: color }]} />
      <View style={[tabIconStyles.moreDot, { backgroundColor: color }]} />
      <View style={[tabIconStyles.moreDot, { backgroundColor: color }]} />
    </View>
  );
}

function FloatingCameraTabButton() {
  return (
    <Pressable
      accessibilityLabel="Chụp ảnh nhật ký"
      accessibilityRole="button"
      hitSlop={10}
      onPress={() => router.push('/journal/new')}
      style={tabIconStyles.captureButton}
    >
      <View style={tabIconStyles.captureButtonInner}>
        <MaterialCommunityIcons color="#FFFFFF" name="camera-plus" size={32} />
      </View>
    </Pressable>
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
          journal: 'Journal',
          more: 'More',
          report: 'Report',
        }
      : {
          calendar: 'Lịch',
          entry: 'Nhập vào',
          more: 'Khác',
          report: 'Báo cáo',
        };

  const bottomPadding = Math.max(insets.bottom, 6);
  const tabBarHeight = 58 + bottomPadding;
  const journalTitle = appLanguage === 'en' ? 'Journal' : 'Nhật ký';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#5CC4BA',
        tabBarInactiveTintColor: '#A8A8A8',
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: {
          justifyContent: 'center',
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          ...typography.tabLabel,
          marginTop: 0,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#DDE7E7',
          height: tabBarHeight,
          paddingBottom: bottomPadding,
          paddingTop: 2,
        },
      }}
    >
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
        name="journal-action"
        options={{
          tabBarButton: () => <FloatingCameraTabButton />,
          tabBarLabel: () => null,
          title: '',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ color }) => <MoneyNoteTabIcon color={color} name="report" />,
          title: titles.report,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          tabBarIcon: ({ color }) => <MoneyNoteTabIcon color={color} name="journal" />,
          title: journalTitle,
        }}
      />
      <Tabs.Screen name="review" options={{ href: null }} />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
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
  captureButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E6F2F1',
    borderRadius: 38,
    borderWidth: 2,
    elevation: 9,
    height: 74,
    justifyContent: 'center',
    marginTop: -34,
    shadowColor: '#253030',
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.22,
    shadowRadius: 13,
    width: 74,
  },
  captureButtonInner: {
    alignItems: 'center',
    backgroundColor: '#5CC4BA',
    borderRadius: 31,
    height: 62,
    justifyContent: 'center',
    width: 62,
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
