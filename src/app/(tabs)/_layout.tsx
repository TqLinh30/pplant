import { Tabs, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppBackground } from '@/features/settings/app-background';
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

function CaptureCameraIcon() {
  return (
    <Svg height={66} viewBox="0 0 96 96" width={66}>
      <Defs>
        <LinearGradient id="captureIconBg" x1="15" x2="81" y1="12" y2="86">
          <Stop offset="0" stopColor="#68E7D8" />
          <Stop offset="1" stopColor="#44C7BB" />
        </LinearGradient>
      </Defs>
      <Circle cx={48} cy={48} fill="url(#captureIconBg)" r={46} />
      <Circle cx={48} cy={48} fill="none" opacity={0.18} r={42} stroke="#1FAFA5" strokeWidth={2} />
      <Path
        d="M21 45C21 40.1 25.1 36 30 36h9.5l3-5.4c1-1.9 3-3 5.1-3h9c2.1 0 4.1 1.1 5.1 3l3 5.4H66c4.9 0 9 4.1 9 9v18c0 4.9-4.1 9-9 9H30c-4.9 0-9-4.1-9-9V45Z"
        fill="#FFFFFF"
      />
      <Circle cx={48} cy={55} fill="url(#captureIconBg)" r={12.5} />
      <Path d="M48 47.5v15M40.5 55h15" stroke="#FFFFFF" strokeLinecap="round" strokeWidth={6} />
      <Path
        d="M65.6 43.5h4.1c1.8 0 3.3 1.5 3.3 3.3s-1.5 3.3-3.3 3.3h-4.1c-1.8 0-3.3-1.5-3.3-3.3s1.5-3.3 3.3-3.3Z"
        fill="url(#captureIconBg)"
      />
    </Svg>
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
        <CaptureCameraIcon />
      </View>
    </Pressable>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const appLanguage = useAppLanguage();
  const appBackground = useAppBackground();
  const titles = {
    en: {
      calendar: 'Calendar',
      entry: 'Entry',
      journal: 'Journal',
      more: 'More',
      report: 'Report',
    },
    vi: {
      calendar: 'Lịch',
      entry: 'Nhập vào',
      journal: 'Nhật ký',
      more: 'Khác',
      report: 'Báo cáo',
    },
    'zh-Hant': {
      calendar: '日曆',
      entry: '輸入',
      journal: '日記',
      more: '更多',
      report: '報告',
    },
  }[appLanguage];

  const bottomPadding = Math.max(insets.bottom, 6);
  const tabBarHeight = 58 + bottomPadding;
  const journalTitle = titles.journal;
  const tabBarBackgroundColor = appBackground.photoUri
    ? 'rgba(255, 255, 255, 0.88)'
    : appBackground.colors.appBackground;

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
          backgroundColor: tabBarBackgroundColor,
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
    borderColor: '#EEF8F7',
    borderRadius: 44,
    borderWidth: 6,
    elevation: 10,
    height: 88,
    justifyContent: 'center',
    marginTop: -43,
    shadowColor: '#5CC4BA',
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    width: 88,
  },
  captureButtonInner: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 72,
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
