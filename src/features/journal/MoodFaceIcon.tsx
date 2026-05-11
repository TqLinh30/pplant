import { useId, type ReactNode } from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import type { JournalMoodId } from '@/domain/journal/types';

type MoodFaceIconProps = {
  moodId: JournalMoodId;
  size?: number;
};

type FaceShellProps = {
  children: ReactNode;
  faceEnd: string;
  faceStart: string;
  glow: string;
  prefix: string;
  rim: string;
};

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '');
}

function FaceShell({ children, faceEnd, faceStart, glow, prefix, rim }: FaceShellProps) {
  const faceGradient = `${prefix}-face`;
  const shineGradient = `${prefix}-shine`;

  return (
    <G>
      <Defs>
        <RadialGradient cx="35%" cy="28%" id={faceGradient} r="76%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.82" />
          <Stop offset="0.38" stopColor={faceStart} />
          <Stop offset="1" stopColor={faceEnd} />
        </RadialGradient>
        <LinearGradient id={shineGradient} x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.75" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.08" />
        </LinearGradient>
      </Defs>
      <Circle cx="512" cy="512" fill={glow} opacity="0.55" r="344" />
      <Circle cx="512" cy="512" fill={`url(#${faceGradient})`} r="279" />
      <Circle cx="512" cy="512" fill="none" opacity="0.7" r="289" stroke={rim} strokeWidth="20" />
      <Ellipse
        cx="625"
        cy="312"
        fill={`url(#${shineGradient})`}
        opacity="0.36"
        rx="80"
        ry="136"
        rotation="-36"
      />
      {children}
    </G>
  );
}

function Sparkle({ color, scale = 1, x, y }: { color: string; scale?: number; x: number; y: number }) {
  const long = 49 * scale;
  const short = 16 * scale;

  return (
    <Path
      d={`M${x} ${y - long} C${x + short} ${y - short} ${x + short} ${y - short} ${x + long} ${y} C${x + short} ${y + short} ${x + short} ${y + short} ${x} ${y + long} C${x - short} ${y + short} ${x - short} ${y + short} ${x - long} ${y} C${x - short} ${y - short} ${x - short} ${y - short} ${x} ${y - long} Z`}
      fill={color}
    />
  );
}

function SunRay({
  height,
  rotation,
  width,
  x,
  y,
}: {
  height: number;
  rotation: number;
  width: number;
  x: number;
  y: number;
}) {
  return (
    <G origin={`${x}, ${y}`} rotation={rotation}>
      <Rect fill="#FFA000" height={height} rx={width / 2} width={width} x={x - width / 2} y={y - height / 2} />
    </G>
  );
}

function Heart({
  color = '#F7336F',
  scale = 1,
  x,
  y,
}: {
  color?: string;
  scale?: number;
  x: number;
  y: number;
}) {
  const s = scale;

  return (
    <Path
      d={`M${x} ${y + 30 * s} C${x - 78 * s} ${y - 30 * s} ${x - 154 * s} ${y + 46 * s} ${x - 104 * s} ${y + 128 * s} C${x - 66 * s} ${y + 190 * s} ${x} ${y + 222 * s} ${x} ${y + 222 * s} C${x} ${y + 222 * s} ${x + 66 * s} ${y + 190 * s} ${x + 104 * s} ${y + 128 * s} C${x + 154 * s} ${y + 46 * s} ${x + 78 * s} ${y - 30 * s} ${x} ${y + 30 * s} Z`}
      fill={color}
    />
  );
}

function HappySunFace({ prefix, size }: { prefix: string; size: number }) {
  const eyeGradient = `${prefix}-happy-eye`;
  const mouthGradient = `${prefix}-happy-mouth`;

  return (
    <Svg height={size} viewBox="0 0 1024 1024" width={size}>
      <Defs>
        <RadialGradient cx="38%" cy="24%" id={eyeGradient} r="76%">
          <Stop offset="0" stopColor="#15354A" />
          <Stop offset="1" stopColor="#001D2E" />
        </RadialGradient>
        <LinearGradient id={mouthGradient} x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#FF507B" />
          <Stop offset="1" stopColor="#FF325E" />
        </LinearGradient>
      </Defs>
      <SunRay height={52} rotation={-30} width={28} x={224} y={271} />
      <SunRay height={54} rotation={-25} width={28} x={289} y={745} />
      <SunRay height={49} rotation={-22} width={28} x={376} y={160} />
      <SunRay height={49} rotation={0} width={26} x={448} y={146} />
      <SunRay height={43} rotation={18} width={25} x={640} y={172} />
      <SunRay height={48} rotation={82} width={29} x={847} y={446} />
      <SunRay height={45} rotation={38} width={26} x={801} y={708} />
      <SunRay height={44} rotation={34} width={25} x={748} y={766} />
      <SunRay height={42} rotation={-62} width={24} x={183} y={620} />
      <Circle cx="285" cy="224" fill="#FFB51A" r="18" />
      <Circle cx="719" cy="186" fill="#FFB51A" r="18" />
      <Circle cx="850" cy="310" fill="#FFB51A" r="17" />
      <Circle cx="844" cy="542" fill="#FFB51A" r="18" />
      <Circle cx="671" cy="796" fill="#FFB51A" r="17" />
      <Circle cx="196" cy="505" fill="#FFB51A" r="17" />
      <Sparkle color="#FFC52A" scale={0.9} x={780} y={262} />
      <Sparkle color="#FFC52A" scale={0.78} x={844} y={216} />
      <FaceShell
        faceEnd="#FFD43E"
        faceStart="#FFF09A"
        glow="#FFD557"
        prefix={prefix}
        rim="#FFC126"
      >
        <Circle cx="388" cy="493" fill={`url(#${eyeGradient})`} r="43" />
        <Circle cx="636" cy="493" fill={`url(#${eyeGradient})`} r="43" />
        <Circle cx="407" cy="474" fill="#FFFFFF" r="15" />
        <Circle cx="655" cy="474" fill="#FFFFFF" r="15" />
        <Circle cx="371" cy="518" fill="#FFFFFF" opacity="0.36" r="8" />
        <Circle cx="619" cy="518" fill="#FFFFFF" opacity="0.36" r="8" />
        <Circle cx="338" cy="594" fill="#FF8471" opacity="0.82" r="52" />
        <Circle cx="686" cy="594" fill="#FF8471" opacity="0.82" r="52" />
        <Path
          d="M431 561 C431 650 593 650 593 561 C593 538 575 527 555 527 H469 C449 527 431 538 431 561 Z"
          fill="#042338"
        />
        <Path
          d="M457 587 C475 639 549 639 567 587 C546 574 478 574 457 587 Z"
          fill={`url(#${mouthGradient})`}
        />
      </FaceShell>
    </Svg>
  );
}

function CalmFace({ neutral = false, prefix, size }: { neutral?: boolean; prefix: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 1024 1024" width={size}>
      <FaceShell
        faceEnd="#7FDED4"
        faceStart="#D6F6F1"
        glow="#B6EEE8"
        prefix={prefix}
        rim="#67CFC5"
      >
        <Circle cx="340" cy="596" fill="#9FE6DD" opacity="0.48" r="42" />
        <Circle cx="684" cy="596" fill="#9FE6DD" opacity="0.48" r="42" />
        <Path
          d="M335 498 C362 552 427 552 454 498"
          fill="none"
          stroke="#001D42"
          strokeLinecap="round"
          strokeWidth="29"
        />
        <Path
          d="M570 498 C597 552 662 552 689 498"
          fill="none"
          stroke="#001D42"
          strokeLinecap="round"
          strokeWidth="29"
        />
        {neutral ? (
          <Path
            d="M454 616 H570"
            fill="none"
            stroke="#001D42"
            strokeLinecap="round"
            strokeWidth="30"
          />
        ) : (
          <Path
            d="M455 592 C482 643 542 643 569 592"
            fill="none"
            stroke="#001D42"
            strokeLinecap="round"
            strokeWidth="29"
          />
        )}
      </FaceShell>
    </Svg>
  );
}

function SleepyFace({ prefix, size }: { prefix: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 1024 1024" width={size}>
      <FaceShell
        faceEnd="#9B86F0"
        faceStart="#DDD5FF"
        glow="#CFC6FF"
        prefix={prefix}
        rim="#B6A7F0"
      >
        <Ellipse cx="377" cy="622" fill="#F07BD8" opacity="0.7" rx="53" ry="43" />
        <Ellipse cx="647" cy="622" fill="#F0A2E0" opacity="0.7" rx="53" ry="43" />
        <Path
          d="M334 545 C363 588 421 588 449 545"
          fill="none"
          stroke="#121238"
          strokeLinecap="round"
          strokeWidth="26"
        />
        <Path
          d="M575 545 C604 588 662 588 690 545"
          fill="none"
          stroke="#121238"
          strokeLinecap="round"
          strokeWidth="26"
        />
        <Circle cx="512" cy="635" fill="#B81758" r="38" />
        <Circle cx="512" cy="652" fill="#F13F7F" r="25" />
        <Path d="M328 330 C360 282 382 282 406 330" fill="none" opacity="0.25" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="24" />
        <SvgText fill="#18105A" fontSize="128" fontWeight="800" x="704" y="318">
          Z
        </SvgText>
        <SvgText fill="#18105A" fontSize="96" fontWeight="800" x="646" y="373">
          Z
        </SvgText>
        <SvgText fill="#18105A" fontSize="70" fontWeight="800" x="604" y="425">
          Z
        </SvgText>
      </FaceShell>
    </Svg>
  );
}

function TiredFace({ prefix, size, stressed = false }: { prefix: string; size: number; stressed?: boolean }) {
  return (
    <Svg height={size} viewBox="0 0 1024 1024" width={size}>
      <FaceShell
        faceEnd="#EAB88F"
        faceStart="#F8DEC7"
        glow="#F0CFB6"
        prefix={prefix}
        rim="#D99B6F"
      >
        <Ellipse cx="340" cy="594" fill="#EA9A82" opacity="0.56" rx="54" ry="49" />
        <Ellipse cx="684" cy="594" fill="#EA9A82" opacity="0.56" rx="54" ry="49" />
        <Path
          d="M314 504 C345 573 412 574 437 510 C385 503 347 493 314 504 Z"
          fill="#321713"
        />
        <Path
          d="M586 510 C612 574 679 573 710 504 C677 493 638 503 586 510 Z"
          fill="#321713"
        />
        <Path
          d="M294 503 C347 495 383 486 440 463"
          fill="none"
          stroke="#321713"
          strokeLinecap="round"
          strokeWidth="22"
        />
        <Path
          d="M584 463 C641 486 677 495 730 503"
          fill="none"
          stroke="#321713"
          strokeLinecap="round"
          strokeWidth="22"
        />
        <Circle cx="409" cy="500" fill="#FFFFFF" opacity="0.8" r="10" />
        <Circle cx="659" cy="500" fill="#FFFFFF" opacity="0.8" r="10" />
        <Path
          d="M462 667 C483 605 541 605 562 667 C532 647 492 647 462 667 Z"
          fill="#252525"
          stroke="#252525"
          strokeLinejoin="round"
          strokeWidth="18"
        />
        <Path
          d="M480 664 C502 647 522 647 544 664"
          fill="none"
          stroke="#FF7090"
          strokeLinecap="round"
          strokeWidth="18"
        />
        {stressed ? (
          <G>
            <Path d="M750 330 L790 292" fill="none" stroke="#D47055" strokeLinecap="round" strokeWidth="16" />
            <Path d="M778 376 L832 363" fill="none" stroke="#D47055" strokeLinecap="round" strokeWidth="16" />
          </G>
        ) : null}
      </FaceShell>
    </Svg>
  );
}

function LoveFace({ prefix, size }: { prefix: string; size: number }) {
  const loveGradient = `${prefix}-love`;
  const heartGradient = `${prefix}-heart`;

  return (
    <Svg height={size} viewBox="0 0 1024 1024" width={size}>
      <Defs>
        <RadialGradient cx="36%" cy="30%" id={loveGradient} r="84%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.86" />
          <Stop offset="0.36" stopColor="#FFD3DF" />
          <Stop offset="1" stopColor="#FF83AB" />
        </RadialGradient>
        <RadialGradient cx="35%" cy="26%" id={heartGradient} r="78%">
          <Stop offset="0" stopColor="#FF9EB8" />
          <Stop offset="0.52" stopColor="#F83B75" />
          <Stop offset="1" stopColor="#D31555" />
        </RadialGradient>
      </Defs>
      <Heart color={`url(#${heartGradient})`} scale={0.42} x={166} y={160} />
      <Heart color={`url(#${heartGradient})`} scale={0.34} x={847} y={258} />
      <Heart color={`url(#${heartGradient})`} scale={0.25} x={895} y={408} />
      <Heart color={`url(#${heartGradient})`} scale={0.27} x={832} y={738} />
      <Heart color={`url(#${heartGradient})`} scale={0.29} x={182} y={740} />
      <Ellipse cx="512" cy="544" fill="#FFD7E4" opacity="0.7" rx="360" ry="320" />
      <Ellipse cx="512" cy="544" fill={`url(#${loveGradient})`} rx="304" ry="262" />
      <Ellipse cx="512" cy="544" fill="none" opacity="0.72" rx="313" ry="272" stroke="#F4739B" strokeWidth="20" />
      <Ellipse cx="635" cy="330" fill="#FFFFFF" opacity="0.62" rx="43" ry="76" rotation="-35" />
      <Ellipse cx="722" cy="387" fill="#FFFFFF" opacity="0.62" rx="24" ry="36" rotation="-28" />
      <Heart color={`url(#${heartGradient})`} scale={0.52} x={381} y={434} />
      <Heart color={`url(#${heartGradient})`} scale={0.52} x={642} y={434} />
      <Ellipse cx="330" cy="619" fill="#FF79A6" opacity="0.38" rx="63" ry="39" />
      <Ellipse cx="694" cy="619" fill="#FF79A6" opacity="0.38" rx="63" ry="39" />
      <Path
        d="M452 605 C483 658 541 658 572 605"
        fill="none"
        stroke="#4E2927"
        strokeLinecap="round"
        strokeWidth="28"
      />
    </Svg>
  );
}

function SadFace({ prefix, size }: { prefix: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 1024 1024" width={size}>
      <FaceShell
        faceEnd="#A8D4FF"
        faceStart="#E0F1FF"
        glow="#C6E2FF"
        prefix={prefix}
        rim="#83B9F2"
      >
        <Circle cx="388" cy="506" fill="#315D97" r="33" />
        <Circle cx="636" cy="506" fill="#315D97" r="33" />
        <Path
          d="M451 660 C480 604 544 604 573 660"
          fill="none"
          stroke="#315D97"
          strokeLinecap="round"
          strokeWidth="30"
        />
        <Path d="M695 536 C746 604 731 653 693 669 C656 653 645 604 695 536 Z" fill="#5FAAF7" />
      </FaceShell>
    </Svg>
  );
}

export function MoodFaceIcon({ moodId, size = 42 }: MoodFaceIconProps) {
  const rawId = useId();
  const prefix = `mood${sanitizeId(rawId)}${moodId}`;

  switch (moodId) {
    case 'love':
      return <LoveFace prefix={prefix} size={size} />;
    case 'excited':
      return <HappySunFace prefix={prefix} size={size} />;
    case 'calm':
      return <CalmFace prefix={prefix} size={size} />;
    case 'sleepy':
      return <SleepyFace prefix={prefix} size={size} />;
    case 'sad':
      return <SadFace prefix={prefix} size={size} />;
    case 'stressed':
      return <TiredFace prefix={prefix} size={size} stressed />;
    case 'neutral':
      return <CalmFace neutral prefix={prefix} size={size} />;
    case 'tired':
    default:
      return <TiredFace prefix={prefix} size={size} />;
  }
}
