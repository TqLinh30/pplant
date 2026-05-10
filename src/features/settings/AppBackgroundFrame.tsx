import type { ReactNode } from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';

import { useAppBackground } from './app-background';

type AppBackgroundFrameProps = {
  children: ReactNode;
};

export function AppBackgroundFrame({ children }: AppBackgroundFrameProps) {
  const background = useAppBackground();

  if (!background.photoUri) {
    return <>{children}</>;
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

const styles = StyleSheet.create({
  frame: {
    flex: 1,
  },
  image: {
    opacity: 0.88,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
  },
});
