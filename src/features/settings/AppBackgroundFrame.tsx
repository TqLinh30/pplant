import type { ReactNode } from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { useAppBackground } from './app-background';

type AppBackgroundFrameProps = {
  children: ReactNode;
};

export function AppBackgroundFrame({ children }: AppBackgroundFrameProps) {
  const background = useAppBackground();

  if (!background.photoUri) {
    return (
      <View style={[styles.frame, { backgroundColor: background.colors.appBackground }]}>
        <DefaultBackgroundDecor />
        {children}
      </View>
    );
  }

  return (
    <ImageBackground
      imageStyle={styles.image}
      resizeMode="cover"
      source={{ uri: background.photoUri }}
      style={styles.frame}
    >
      <View pointerEvents="none" style={styles.scrim} />
      {children}
    </ImageBackground>
  );
}

function DefaultBackgroundDecor() {
  return (
    <View pointerEvents="none" style={styles.decorLayer}>
      <Svg
        height="88"
        preserveAspectRatio="none"
        style={styles.headerDecor}
        viewBox="0 0 390 88"
        width="100%"
      >
        <G opacity="0.52">
          <Circle cx="327" cy="22" fill="#B8F0ED" r="5" />
          <Path
            d="M117 18 C119 10 127 10 129 18 C137 18 141 23 137 28 H111 C107 23 109 18 117 18 Z"
            fill="#FFFFFF"
          />
          <Path
            d="M298 3 C301 12 303 14 311 17 C303 20 301 23 298 32 C295 23 293 20 285 17 C293 14 295 12 298 3 Z"
            fill="#FFFFFF"
          />
          <Path
            d="M307 35 C309 41 311 43 316 45 C311 47 309 49 307 55 C305 49 303 47 298 45 C303 43 305 41 307 35 Z"
            fill="#FFFFFF"
          />
        </G>
      </Svg>
      <Svg
        height="160"
        preserveAspectRatio="none"
        style={styles.bottomDecor}
        viewBox="0 0 390 160"
        width="100%"
      >
        <Path
          d="M0 70 C30 54 38 24 68 42 C96 58 98 94 128 88 C160 82 167 40 201 48 C236 57 240 102 275 94 C306 88 311 52 339 55 C363 58 374 84 390 91 V160 H0 Z"
          fill="#E9D8FF"
          opacity="0.62"
        />
        <Path
          d="M0 112 C24 92 41 101 55 122 C73 93 99 92 111 124 C136 96 163 99 174 132 C203 108 230 112 244 139 C271 116 300 118 316 145 C344 128 368 132 390 148 V160 H0 Z"
          fill="#D9F9F8"
          opacity="0.92"
        />
        <Path
          d="M0 138 C26 124 43 129 57 153 C78 128 101 132 112 158 H0 Z"
          fill="#FFF5BD"
          opacity="0.78"
        />
        <Path
          d="M302 158 C312 128 344 126 355 151 C368 133 382 132 390 143 V160 H302 Z"
          fill="#FFD9EE"
          opacity="0.85"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomDecor: {
    bottom: 0,
    left: 0,
    opacity: 0.9,
    position: 'absolute',
    right: 0,
  },
  decorLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  frame: {
    flex: 1,
  },
  headerDecor: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  image: {
    opacity: 0.88,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
  },
});
