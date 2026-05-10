import { useId } from 'react';
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
} from 'react-native-svg';

type MoneyNoteCategoryIconProps = {
  icon: string;
  size?: number;
};

function cleanId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '');
}

function Face({ color = '#13234A' }: { color?: string }) {
  return (
    <G>
      <Circle cx="41" cy="56" fill={color} r="3.4" />
      <Circle cx="59" cy="56" fill={color} r="3.4" />
      <Circle cx="42" cy="54.5" fill="#FFFFFF" opacity="0.9" r="1" />
      <Circle cx="60" cy="54.5" fill="#FFFFFF" opacity="0.9" r="1" />
      <Ellipse cx="35" cy="63" fill="#FFB7C2" opacity="0.8" rx="5" ry="3.4" />
      <Ellipse cx="65" cy="63" fill="#FFB7C2" opacity="0.8" rx="5" ry="3.4" />
      <Path d="M46 62 C49 67 55 67 58 62" fill="none" stroke={color} strokeLinecap="round" strokeWidth="2.5" />
    </G>
  );
}

function FoodIcon({ prefix, size }: { prefix: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 100 100" width={size}>
      <Defs>
        <LinearGradient id={`${prefix}-cup`} x1="0.2" x2="0.85" y1="0.05" y2="1">
          <Stop offset="0" stopColor="#FFE9B9" />
          <Stop offset="0.55" stopColor="#FFC65E" />
          <Stop offset="1" stopColor="#FF9B22" />
        </LinearGradient>
        <LinearGradient id={`${prefix}-utensil`} x1="0.15" x2="0.9" y1="0.05" y2="1">
          <Stop offset="0" stopColor="#FFF7F0" />
          <Stop offset="1" stopColor="#FF8EA4" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="48" cy="84" fill="#FFB35A" opacity="0.2" rx="31" ry="5" />
      <Path d="M30 32 H60 C64 32 67 36 66 40 L62 75 C61 81 56 84 49 84 H38 C31 84 27 80 26 74 L22 40 C21 36 25 32 30 32 Z" fill={`url(#${prefix}-cup)`} />
      <Path d="M27 38 C35 42 54 42 63 38" fill="none" opacity="0.6" stroke="#FFF6DD" strokeLinecap="round" strokeWidth="5" />
      <Rect fill="#FFE7A7" height="12" rx="6" width="22" x="31" y="23" />
      <Path d="M43 23 C42 18 47 15 51 18" fill="none" stroke="#FF8EA4" strokeLinecap="round" strokeWidth="4" />
      <G rotation="-8" origin="71,55">
        <Rect fill={`url(#${prefix}-utensil)`} height="34" rx="5" width="10" x="68" y="43" />
        <Path d="M65 42 V31 M70 42 V31 M75 42 V31" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="2.8" />
      </G>
      <G rotation="9" origin="82,56">
        <Rect fill={`url(#${prefix}-utensil)`} height="36" rx="5" width="10" x="80" y="42" />
        <Ellipse cx="85" cy="34" fill="#FFF9F5" rx="8" ry="12" />
      </G>
      <Face color="#6A3B18" />
    </Svg>
  );
}

function DailyIcon({ prefix, size }: { prefix: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 100 100" width={size}>
      <Defs>
        <LinearGradient id={`${prefix}-bag`} x1="0.1" x2="0.9" y1="0.05" y2="1">
          <Stop offset="0" stopColor="#E7FFF6" />
          <Stop offset="0.55" stopColor="#8BF2D7" />
          <Stop offset="1" stopColor="#23C8B4" />
        </LinearGradient>
        <LinearGradient id={`${prefix}-coin`} x1="0.18" x2="0.85" y1="0.1" y2="1">
          <Stop offset="0" stopColor="#FFE782" />
          <Stop offset="1" stopColor="#F4A400" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="50" cy="84" fill="#4EDCCA" opacity="0.18" rx="32" ry="5" />
      <Rect fill={`url(#${prefix}-bag)`} height="46" rx="10" width="48" x="24" y="35" />
      <Path d="M37 35 C37 25 59 25 59 35" fill="none" stroke="#2FCFBF" strokeLinecap="round" strokeWidth="5" />
      <Path d="M37 21 H58 M37 29 H61 M37 37 H53" fill="none" stroke="#35D3BB" strokeLinecap="round" strokeWidth="3" />
      <Path d="M32 44 C41 48 57 48 66 44" fill="none" opacity="0.55" stroke="#F2FFF9" strokeLinecap="round" strokeWidth="4" />
      <Circle cx="73" cy="66" fill={`url(#${prefix}-coin)`} r="12" />
      <Path d="M73 59 V73 M69 62 C72 58 78 60 78 64 C78 70 68 66 68 72 C68 76 75 77 79 73" fill="none" stroke="#FFF3A6" strokeLinecap="round" strokeWidth="2.4" />
      <Face color="#087D7B" />
    </Svg>
  );
}

function ClothesIcon({ prefix, size }: { prefix: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 100 100" width={size}>
      <Defs>
        <LinearGradient id={`${prefix}-shirt`} x1="0.08" x2="0.9" y1="0" y2="1">
          <Stop offset="0" stopColor="#F4D9FF" />
          <Stop offset="0.62" stopColor="#C39BFF" />
          <Stop offset="1" stopColor="#7DCAFF" />
        </LinearGradient>
        <LinearGradient id={`${prefix}-stack`} x1="0.1" x2="0.9" y1="0.05" y2="1">
          <Stop offset="0" stopColor="#CFFFF5" />
          <Stop offset="1" stopColor="#62D1FF" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="50" cy="84" fill="#89B8FF" opacity="0.18" rx="33" ry="5" />
      <Path d="M31 39 L22 48 L29 60 L36 56 V74 H64 V56 L71 60 L78 48 L69 39 L58 32 C54 38 46 38 42 32 Z" fill={`url(#${prefix}-shirt)`} />
      <Rect fill={`url(#${prefix}-stack)`} height="14" rx="7" width="48" x="26" y="71" />
      <Path d="M35 43 C42 48 58 48 65 43" fill="none" opacity="0.45" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="4" />
      <Face color="#35296D" />
    </Svg>
  );
}

function CosmeticsIcon({ prefix, size }: { prefix: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 100 100" width={size}>
      <Defs>
        <LinearGradient id={`${prefix}-lip`} x1="0.2" x2="0.9" y1="0.05" y2="1">
          <Stop offset="0" stopColor="#FFA9B6" />
          <Stop offset="1" stopColor="#FF4F74" />
        </LinearGradient>
        <RadialGradient cx="36%" cy="28%" id={`${prefix}-compact`} r="75%">
          <Stop offset="0" stopColor="#FFE7E6" />
          <Stop offset="0.7" stopColor="#FF938B" />
          <Stop offset="1" stopColor="#FF665E" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="50" cy="84" fill="#FF8B9B" opacity="0.18" rx="31" ry="5" />
      <Rect fill="#FF9CAC" height="38" rx="8" width="20" x="27" y="42" />
      <Rect fill="#FFD1A0" height="7" rx="3.5" width="25" x="24" y="38" />
      <Path d="M30 19 C35 12 44 16 44 26 V38 H29 Z" fill={`url(#${prefix}-lip)`} />
      <Circle cx="63" cy="57" fill={`url(#${prefix}-compact)`} r="20" />
      <Circle cx="63" cy="57" fill="#FFD8D1" opacity="0.6" r="13" />
      <Path d="M64 35 C67 28 75 29 78 36" fill="none" stroke="#FF8EA4" strokeLinecap="round" strokeWidth="5" />
      <Face color="#3B253A" />
    </Svg>
  );
}

function SocialIcon({ prefix, size }: { prefix: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 100 100" width={size}>
      <Defs>
        <LinearGradient id={`${prefix}-red`} x1="0.1" x2="0.88" y1="0.05" y2="1">
          <Stop offset="0" stopColor="#FFD6DD" />
          <Stop offset="1" stopColor="#FF6E83" />
        </LinearGradient>
        <LinearGradient id={`${prefix}-mint`} x1="0.1" x2="0.9" y1="0" y2="1">
          <Stop offset="0" stopColor="#DFFFF7" />
          <Stop offset="1" stopColor="#67E0C4" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="51" cy="84" fill="#FF9AAA" opacity="0.16" rx="34" ry="5" />
      <G rotation="-10" origin="38,52">
        <Path d="M21 34 C31 28 48 29 56 37 C55 59 48 72 38 72 C28 72 22 58 21 34 Z" fill={`url(#${prefix}-red)`} />
        <Path d="M28 75 H48" stroke="#FF9CAA" strokeLinecap="round" strokeWidth="4" />
      </G>
      <G rotation="12" origin="63,52">
        <Path d="M45 36 C55 28 74 30 81 39 C79 61 72 74 61 73 C51 72 46 58 45 36 Z" fill={`url(#${prefix}-mint)`} />
        <Path d="M52 76 H73" stroke="#69DBC3" strokeLinecap="round" strokeWidth="4" />
      </G>
      <Path d="M51 19 C57 9 74 15 72 29 C70 39 58 43 50 50 C42 43 30 39 28 29 C26 15 43 9 49 19 Z" fill="#FF9CAA" opacity="0.92" />
      <Face color="#3B253A" />
    </Svg>
  );
}

function MedicalIcon({ prefix, size }: { prefix: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 100 100" width={size}>
      <Defs>
        <LinearGradient id={`${prefix}-kit`} x1="0.08" x2="0.9" y1="0.05" y2="1">
          <Stop offset="0" stopColor="#FFF8F5" />
          <Stop offset="0.62" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#FF7676" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="50" cy="84" fill="#FF7777" opacity="0.16" rx="32" ry="5" />
      <Rect fill={`url(#${prefix}-kit)`} height="48" rx="10" width="58" x="21" y="34" />
      <Path d="M38 34 V28 C38 22 62 22 62 28 V34" fill="none" stroke="#FF7474" strokeLinecap="round" strokeWidth="6" />
      <Rect fill="#FF6969" height="7" rx="3.5" width="58" x="21" y="49" />
      <Circle cx="50" cy="51" fill="#FF6969" r="13" />
      <Path d="M50 43 V59 M42 51 H58" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="6" />
      <Face color="#56302D" />
    </Svg>
  );
}

function EducationIcon({ prefix, size }: { prefix: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 100 100" width={size}>
      <Defs>
        <LinearGradient id={`${prefix}-bag`} x1="0.1" x2="0.9" y1="0.04" y2="1">
          <Stop offset="0" stopColor="#E3FFF8" />
          <Stop offset="0.55" stopColor="#8DE8D7" />
          <Stop offset="1" stopColor="#46C8E6" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="50" cy="84" fill="#60D8E7" opacity="0.18" rx="32" ry="5" />
      <Rect fill={`url(#${prefix}-bag)`} height="44" rx="12" width="52" x="24" y="38" />
      <Path d="M37 38 C37 27 63 27 63 38" fill="none" stroke="#73D7E7" strokeLinecap="round" strokeWidth="6" />
      <Rect fill="#78CFF0" height="16" rx="6" width="30" x="35" y="63" />
      <Path d="M30 46 C39 50 62 50 70 46" fill="none" opacity="0.52" stroke="#F0FFF9" strokeLinecap="round" strokeWidth="4" />
      <Path d="M73 24 L82 21 L85 61 L76 62 Z" fill="#FFD65C" />
      <Path d="M80 21 L87 25 L85 61" fill="#FFB950" />
      <Face color="#087D7B" />
    </Svg>
  );
}

function ElectricityIcon({ prefix, size }: { prefix: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 100 100" width={size}>
      <Defs>
        <LinearGradient id={`${prefix}-bulb`} x1="0.14" x2="0.84" y1="0.05" y2="1">
          <Stop offset="0" stopColor="#FFF885" />
          <Stop offset="1" stopColor="#FFC326" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="50" cy="84" fill="#FFD95C" opacity="0.16" rx="32" ry="5" />
      <Path d="M24 39 C24 23 36 12 51 12 C66 12 78 23 78 39 C78 50 72 58 64 64 L60 78 H42 L38 64 C29 58 24 49 24 39 Z" fill={`url(#${prefix}-bulb)`} />
      <Rect fill="#88B7F5" height="12" rx="6" width="25" x="39" y="75" />
      <Path d="M67 31 L58 48 H70 L57 68" fill="none" stroke="#FFE57B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
      <Face color="#17325D" />
    </Svg>
  );
}

function TransportIcon({ prefix, size }: { prefix: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 100 100" width={size}>
      <Defs>
        <LinearGradient id={`${prefix}-car`} x1="0.1" x2="0.9" y1="0.05" y2="1">
          <Stop offset="0" stopColor="#DFFFF9" />
          <Stop offset="0.5" stopColor="#69E3D0" />
          <Stop offset="1" stopColor="#15AFAE" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="51" cy="84" fill="#35CFC5" opacity="0.16" rx="34" ry="5" />
      <Path d="M21 55 C24 41 35 33 50 33 H63 C74 33 83 43 85 55 L88 65 C88 73 81 78 73 78 H28 C20 78 13 72 14 64 Z" fill={`url(#${prefix}-car)`} />
      <Path d="M39 38 H60 C68 38 74 45 76 55 H29 C31 47 34 42 39 38 Z" fill="#DFFFFC" opacity="0.82" />
      <Circle cx="30" cy="78" fill="#0A6770" r="8" />
      <Circle cx="75" cy="78" fill="#0A6770" r="8" />
      <Circle cx="26" cy="58" fill="#FFE05E" r="5" />
      <Circle cx="70" cy="58" fill="#FFE05E" r="5" />
      <Face color="#096A70" />
    </Svg>
  );
}

function PhoneIcon({ prefix, size }: { prefix: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 100 100" width={size}>
      <Defs>
        <LinearGradient id={`${prefix}-phone`} x1="0.1" x2="0.9" y1="0.05" y2="1">
          <Stop offset="0" stopColor="#F0F8FF" />
          <Stop offset="0.55" stopColor="#B8D8FF" />
          <Stop offset="1" stopColor="#6D9CFF" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="50" cy="84" fill="#80A8FF" opacity="0.16" rx="31" ry="5" />
      <Rect fill={`url(#${prefix}-phone)`} height="62" rx="12" width="40" x="30" y="18" />
      <Rect fill="#E9F8FF" height="44" rx="6" width="32" x="34" y="27" />
      <Path d="M39 76 H61" stroke="#679AFF" strokeLinecap="round" strokeWidth="3" />
      <Path d="M18 50 H46 V68 H31 L25 75 V68 H18 Z" fill="#BFF7E9" stroke="#6FE0C8" strokeWidth="2" />
      <Circle cx="28" cy="59" fill="#73D7C5" r="2" />
      <Circle cx="35" cy="59" fill="#73D7C5" r="2" />
      <Circle cx="42" cy="59" fill="#73D7C5" r="2" />
      <Face color="#174E92" />
    </Svg>
  );
}

function RentIcon({ prefix, size }: { prefix: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 100 100" width={size}>
      <Defs>
        <LinearGradient id={`${prefix}-house`} x1="0.1" x2="0.9" y1="0.05" y2="1">
          <Stop offset="0" stopColor="#E8FFF7" />
          <Stop offset="0.55" stopColor="#A7F0D8" />
          <Stop offset="1" stopColor="#60D7C5" />
        </LinearGradient>
        <LinearGradient id={`${prefix}-roof`} x1="0.1" x2="0.9" y1="0.05" y2="1">
          <Stop offset="0" stopColor="#FFA8A8" />
          <Stop offset="1" stopColor="#FF6A76" />
        </LinearGradient>
        <LinearGradient id={`${prefix}-coin`} x1="0.15" x2="0.85" y1="0.05" y2="1">
          <Stop offset="0" stopColor="#FFE879" />
          <Stop offset="1" stopColor="#F7A900" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="50" cy="84" fill="#65D7C5" opacity="0.18" rx="33" ry="5" />
      <Path d="M26 43 L50 22 L74 43 V78 H26 Z" fill={`url(#${prefix}-house)`} />
      <Path d="M18 45 L50 17 L82 45" fill="none" stroke={`url(#${prefix}-roof)`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="9" />
      <Rect fill="#FF8B8C" height="24" rx="8" width="16" x="35" y="54" />
      <Rect fill="#FFE3A6" height="20" rx="5" width="18" x="56" y="50" />
      <Path d="M65 50 V70 M56 60 H74" stroke="#FFFFFF" strokeWidth="3" />
      <Circle cx="74" cy="73" fill={`url(#${prefix}-coin)`} r="13" />
      <Path d="M74 66 V80 M70 69 C74 65 80 67 79 71 C78 76 70 73 70 78 C70 82 78 83 81 78" fill="none" stroke="#FFF2A7" strokeLinecap="round" strokeWidth="2.3" />
      <Face color="#6A321E" />
    </Svg>
  );
}

function GenericIcon({ prefix, size }: { prefix: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 100 100" width={size}>
      <Defs>
        <RadialGradient cx="35%" cy="28%" id={`${prefix}-orb`} r="75%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.52" stopColor="#CFF8F0" />
          <Stop offset="1" stopColor="#55D3CF" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="50" cy="84" fill="#55D3CF" opacity="0.15" rx="30" ry="5" />
      <Circle cx="50" cy="50" fill={`url(#${prefix}-orb)`} r="32" />
      <Face color="#087D7B" />
    </Svg>
  );
}

export function MoneyNoteCategoryIcon({ icon, size = 44 }: MoneyNoteCategoryIconProps) {
  const prefix = `mncat${cleanId(useId())}`;

  if (icon === 'food-fork-drink') {
    return <FoodIcon prefix={prefix} size={size} />;
  }

  if (icon === 'bottle-soda-outline') {
    return <DailyIcon prefix={prefix} size={size} />;
  }

  if (icon === 'tshirt-crew-outline') {
    return <ClothesIcon prefix={prefix} size={size} />;
  }

  if (icon === 'lipstick') {
    return <CosmeticsIcon prefix={prefix} size={size} />;
  }

  if (icon === 'glass-cocktail') {
    return <SocialIcon prefix={prefix} size={size} />;
  }

  if (icon === 'pill') {
    return <MedicalIcon prefix={prefix} size={size} />;
  }

  if (icon === 'notebook-edit-outline') {
    return <EducationIcon prefix={prefix} size={size} />;
  }

  if (icon === 'water-pump') {
    return <ElectricityIcon prefix={prefix} size={size} />;
  }

  if (icon === 'train') {
    return <TransportIcon prefix={prefix} size={size} />;
  }

  if (icon === 'cellphone') {
    return <PhoneIcon prefix={prefix} size={size} />;
  }

  if (icon === 'home-outline') {
    return <RentIcon prefix={prefix} size={size} />;
  }

  return <GenericIcon prefix={prefix} size={size} />;
}
