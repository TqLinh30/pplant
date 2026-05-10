import type { ReactNode } from 'react';
import Svg, { Circle, Ellipse, G, Path, Text as SvgText } from 'react-native-svg';

import type { JournalMoodId } from '@/domain/journal/types';

type MoodFaceIconProps = {
  moodId: JournalMoodId;
  size?: number;
};

type MoodPalette = {
  base: string;
  blush: string;
  deco: string;
  line: string;
  rim: string;
};

const palettes: Record<JournalMoodId, MoodPalette> = {
  calm: {
    base: '#BFF2EA',
    blush: '#8FE3D6',
    deco: '#86E3D7',
    line: '#2AAEA3',
    rim: '#8FE7DE',
  },
  excited: {
    base: '#FFE08D',
    blush: '#FF8DA1',
    deco: '#F5A51A',
    line: '#20292B',
    rim: '#FFC84F',
  },
  love: {
    base: '#FF9FB6',
    blush: '#FF6E92',
    deco: '#F25073',
    line: '#6A3547',
    rim: '#FF86A8',
  },
  neutral: {
    base: '#E8F1F0',
    blush: '#D4E3E1',
    deco: '#A9B9B7',
    line: '#61706E',
    rim: '#CAD8D6',
  },
  sad: {
    base: '#CFE6FF',
    blush: '#9CCBFF',
    deco: '#5D92D9',
    line: '#4D78BB',
    rim: '#AED2FA',
  },
  sleepy: {
    base: '#D8D0FF',
    blush: '#C4BAF5',
    deco: '#8C83D8',
    line: '#4F4779',
    rim: '#B9B0F0',
  },
  stressed: {
    base: '#FFD1CC',
    blush: '#FF9E95',
    deco: '#EB746B',
    line: '#B94E4E',
    rim: '#FFB4AC',
  },
  tired: {
    base: '#F4D7C6',
    blush: '#E8B698',
    deco: '#B37B5D',
    line: '#714638',
    rim: '#E7BEA5',
  },
};

function Sparkle({ color, x, y }: { color: string; x: number; y: number }) {
  return (
    <Path
      d={`M${x} ${y - 7} L${x + 2.5} ${y - 2.5} L${x + 7} ${y} L${x + 2.5} ${y + 2.5} L${x} ${y + 7} L${x - 2.5} ${y + 2.5} L${x - 7} ${y} L${x - 2.5} ${y - 2.5} Z`}
      fill={color}
    />
  );
}

function SmallHeart({
  color,
  scale = 1,
  x,
  y,
}: {
  color: string;
  scale?: number;
  x: number;
  y: number;
}) {
  const s = scale;

  return (
    <Path
      d={`M${x} ${y + 2 * s} C${x - 7 * s} ${y - 6 * s} ${x - 17 * s} ${y + 1 * s} ${x - 12 * s} ${y + 11 * s} C${x - 9 * s} ${y + 17 * s} ${x} ${y + 21 * s} ${x} ${y + 21 * s} C${x} ${y + 21 * s} ${x + 9 * s} ${y + 17 * s} ${x + 12 * s} ${y + 11 * s} C${x + 17 * s} ${y + 1 * s} ${x + 7 * s} ${y - 6 * s} ${x} ${y + 2 * s} Z`}
      fill={color}
    />
  );
}

function FaceShell({ children, moodId }: { children: ReactNode; moodId: JournalMoodId }) {
  const palette = palettes[moodId];

  return (
    <G>
      <Circle cx="50" cy="51" fill={palette.rim} opacity="0.35" r="44" />
      <Circle cx="50" cy="50" fill={palette.base} r="39" />
      <Circle
        cx="50"
        cy="50"
        fill="none"
        opacity="0.45"
        r="35"
        stroke={palette.rim}
        strokeWidth="5"
      />
      <Ellipse cx="37" cy="32" fill="#FFFFFF" opacity="0.28" rx="17" ry="10" />
      <Ellipse cx="50" cy="70" fill={palette.line} opacity="0.08" rx="25" ry="8" />
      {children}
    </G>
  );
}

function Expression({ moodId }: { moodId: JournalMoodId }) {
  const palette = palettes[moodId];

  switch (moodId) {
    case 'love':
      return (
        <G>
          <SmallHeart color={palette.deco} scale={0.62} x={25} y={24} />
          <SmallHeart color={palette.deco} scale={0.44} x={77} y={22} />
          <SmallHeart color={palette.deco} scale={0.42} x={18} y={64} />
          <SmallHeart color={palette.deco} scale={0.48} x={82} y={60} />
          <SmallHeart color="#E93C68" scale={0.9} x={38} y={38} />
          <SmallHeart color="#E93C68" scale={0.9} x={62} y={38} />
          <Ellipse cx="31" cy="61" fill="#FF7394" opacity="0.45" rx="7" ry="4" />
          <Ellipse cx="69" cy="61" fill="#FF7394" opacity="0.45" rx="7" ry="4" />
          <Path
            d="M35 66 C43 75 57 75 65 66"
            fill="none"
            stroke={palette.line}
            strokeLinecap="round"
            strokeWidth="5"
          />
        </G>
      );
    case 'excited':
      return (
        <G>
          <Circle cx="18" cy="35" fill={palette.deco} r="3" />
          <Circle cx="28" cy="20" fill={palette.deco} r="2.4" />
          <Circle cx="73" cy="18" fill={palette.deco} r="2.4" />
          <Circle cx="82" cy="34" fill={palette.deco} r="3" />
          <Sparkle color={palette.deco} x={80} y={28} />
          <Path
            d="M24 25 L25.5 19 L27 25"
            fill="none"
            stroke={palette.deco}
            strokeLinecap="round"
            strokeWidth="2.4"
          />
          <Circle cx="37" cy="45" fill="#263033" r="5.3" />
          <Circle cx="63" cy="45" fill="#263033" r="5.3" />
          <Circle cx="39" cy="43" fill="#FFFFFF" r="1.7" />
          <Circle cx="65" cy="43" fill="#FFFFFF" r="1.7" />
          <Ellipse cx="29" cy="58" fill={palette.blush} opacity="0.55" rx="7" ry="4" />
          <Ellipse cx="71" cy="58" fill={palette.blush} opacity="0.55" rx="7" ry="4" />
          <Path d="M35 62 C42 73 58 73 65 62" fill="#7B3440" opacity="0.95" />
          <Path
            d="M40 64 C45 69 55 69 60 64"
            fill="none"
            stroke="#FFFFFF"
            strokeLinecap="round"
            strokeWidth="2.4"
          />
        </G>
      );
    case 'calm':
      return (
        <G>
          <Path
            d="M28 45 C33 51 42 51 47 45"
            fill="none"
            stroke={palette.line}
            strokeLinecap="round"
            strokeWidth="4.4"
          />
          <Path
            d="M53 45 C58 51 67 51 72 45"
            fill="none"
            stroke={palette.line}
            strokeLinecap="round"
            strokeWidth="4.4"
          />
          <Path
            d="M35 63 C43 70 57 70 65 63"
            fill="none"
            stroke={palette.line}
            strokeLinecap="round"
            strokeWidth="4.4"
          />
        </G>
      );
    case 'tired':
      return (
        <G>
          <SvgText fill={palette.deco} fontSize="13" fontWeight="700" x="72" y="26">
            Z
          </SvgText>
          <Path
            d="M28 42 C34 38 41 39 46 44"
            fill="none"
            stroke={palette.line}
            strokeLinecap="round"
            strokeWidth="4.2"
          />
          <Path
            d="M54 44 C59 39 66 38 72 42"
            fill="none"
            stroke={palette.line}
            strokeLinecap="round"
            strokeWidth="4.2"
          />
          <Ellipse cx="36" cy="52" fill={palette.blush} opacity="0.42" rx="8" ry="4.4" />
          <Ellipse cx="64" cy="52" fill={palette.blush} opacity="0.42" rx="8" ry="4.4" />
          <Path
            d="M38 69 C45 62 55 62 62 69"
            fill="none"
            stroke={palette.line}
            strokeLinecap="round"
            strokeWidth="4.8"
          />
        </G>
      );
    case 'sleepy':
      return (
        <G>
          <SvgText fill={palette.deco} fontSize="15" fontWeight="700" x="67" y="25">
            Z
          </SvgText>
          <SvgText fill={palette.deco} fontSize="10" fontWeight="700" x="80" y="15">
            Z
          </SvgText>
          <Path
            d="M28 45 C34 51 42 51 48 45"
            fill="none"
            stroke={palette.line}
            strokeLinecap="round"
            strokeWidth="4.4"
          />
          <Path
            d="M52 45 C58 51 66 51 72 45"
            fill="none"
            stroke={palette.line}
            strokeLinecap="round"
            strokeWidth="4.4"
          />
          <Ellipse
            cx="50"
            cy="65"
            fill="none"
            rx="6.5"
            ry="8.5"
            stroke={palette.line}
            strokeWidth="4.2"
          />
        </G>
      );
    case 'sad':
      return (
        <G>
          <Circle cx="37" cy="45" fill={palette.line} r="4.2" />
          <Circle cx="63" cy="45" fill={palette.line} r="4.2" />
          <Path
            d="M38 68 C45 60 55 60 62 68"
            fill="none"
            stroke={palette.line}
            strokeLinecap="round"
            strokeWidth="4.8"
          />
          <Path d="M72 49 C78 58 77 64 72 67 C66 64 66 58 72 49 Z" fill="#6CAEF6" />
        </G>
      );
    case 'stressed':
      return (
        <G>
          <Path
            d="M29 39 L44 44"
            fill="none"
            stroke={palette.line}
            strokeLinecap="round"
            strokeWidth="4.8"
          />
          <Path
            d="M71 39 L56 44"
            fill="none"
            stroke={palette.line}
            strokeLinecap="round"
            strokeWidth="4.8"
          />
          <Circle cx="38" cy="50" fill={palette.line} r="4" />
          <Circle cx="62" cy="50" fill={palette.line} r="4" />
          <Path
            d="M35 68 C41 64 47 72 53 68 C59 64 62 67 66 70"
            fill="none"
            stroke={palette.line}
            strokeLinecap="round"
            strokeWidth="4"
          />
        </G>
      );
    case 'neutral':
    default:
      return (
        <G>
          <Circle cx="37" cy="46" fill={palette.line} r="4" />
          <Circle cx="63" cy="46" fill={palette.line} r="4" />
          <Path
            d="M39 64 H61"
            fill="none"
            stroke={palette.line}
            strokeLinecap="round"
            strokeWidth="4.8"
          />
        </G>
      );
  }
}

export function MoodFaceIcon({ moodId, size = 42 }: MoodFaceIconProps) {
  return (
    <Svg height={size} viewBox="0 0 100 100" width={size}>
      <FaceShell moodId={moodId}>
        <Expression moodId={moodId} />
      </FaceShell>
    </Svg>
  );
}
