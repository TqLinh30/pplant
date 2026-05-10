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

type MoneyNoteSummaryIconName = 'expense' | 'income' | 'total';

type MoneyNoteSummaryIconProps = {
  name: MoneyNoteSummaryIconName;
  size?: number;
};

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '');
}

function WalletIcon({ prefix, size }: { prefix: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 1024 1024" width={size}>
      <Defs>
        <LinearGradient id={`${prefix}-wallet-body`} x1="0.09" x2="0.92" y1="0.06" y2="0.94">
          <Stop offset="0" stopColor="#E9FFF8" />
          <Stop offset="0.48" stopColor="#B8F7E8" />
          <Stop offset="1" stopColor="#29C9B8" />
        </LinearGradient>
        <LinearGradient id={`${prefix}-wallet-edge`} x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#72E7C3" />
          <Stop offset="1" stopColor="#13AFA6" />
        </LinearGradient>
        <LinearGradient id={`${prefix}-wallet-bill`} x1="0.08" x2="0.93" y1="0.03" y2="0.98">
          <Stop offset="0" stopColor="#DFFFF0" />
          <Stop offset="0.48" stopColor="#9DEBC9" />
          <Stop offset="1" stopColor="#38BE8F" />
        </LinearGradient>
        <RadialGradient cx="38%" cy="30%" id={`${prefix}-wallet-face`} r="76%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.68" />
          <Stop offset="0.55" stopColor="#C9FFF2" stopOpacity="0.24" />
          <Stop offset="1" stopColor="#25BFB3" stopOpacity="0.14" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="508" cy="824" fill="#7CE0D0" opacity="0.24" rx="286" ry="42" />
      <G rotation="-10" origin="514,320">
        <Rect fill={`url(#${prefix}-wallet-bill)`} height="314" rx="42" width="418" x="324" y="150" />
        <Rect fill="none" height="206" opacity="0.45" rx="22" stroke="#D8FFF0" strokeWidth="32" width="316" x="374" y="202" />
        <Circle cx="534" cy="305" fill="#DBFFF0" opacity="0.9" r="58" />
      </G>
      <G rotation="-3" origin="610,334">
        <Rect fill="#B6F3D5" height="266" opacity="0.78" rx="40" width="316" x="560" y="214" />
      </G>
      <Rect fill={`url(#${prefix}-wallet-edge)`} height="430" rx="86" width="642" x="198" y="350" />
      <Rect fill={`url(#${prefix}-wallet-body)`} height="356" rx="62" width="590" x="222" y="368" />
      <Path
        d="M260 422 C394 436 637 432 776 420"
        fill="none"
        opacity="0.55"
        stroke="#F1FFF9"
        strokeDasharray="34 34"
        strokeLinecap="round"
        strokeWidth="16"
      />
      <Rect fill="#32CABA" height="174" rx="52" width="210" x="714" y="468" />
      <Circle cx="800" cy="555" fill="#F4FFFD" r="42" />
      <Circle cx="430" cy="586" fill="#0F9D9A" r="34" />
      <Circle cx="600" cy="586" fill="#0F9D9A" r="34" />
      <Circle cx="443" cy="572" fill="#FFFFFF" opacity="0.86" r="11" />
      <Circle cx="613" cy="572" fill="#FFFFFF" opacity="0.86" r="11" />
      <Ellipse cx="348" cy="654" fill="#FFB8C5" opacity="0.75" rx="38" ry="26" />
      <Ellipse cx="682" cy="654" fill="#FFB8C5" opacity="0.75" rx="38" ry="26" />
      <Path d="M475 630 C495 672 548 672 568 630" fill="none" stroke="#0F9D9A" strokeLinecap="round" strokeWidth="18" />
      <Rect fill={`url(#${prefix}-wallet-face)`} height="318" rx="54" width="548" x="244" y="384" />
    </Svg>
  );
}

function PiggyIcon({ prefix, size }: { prefix: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 1024 1024" width={size}>
      <Defs>
        <RadialGradient cx="34%" cy="24%" id={`${prefix}-pig-body`} r="82%">
          <Stop offset="0" stopColor="#FFEAF0" />
          <Stop offset="0.52" stopColor="#FF9DB2" />
          <Stop offset="1" stopColor="#FF5278" />
        </RadialGradient>
        <RadialGradient cx="34%" cy="28%" id={`${prefix}-pig-snout`} r="76%">
          <Stop offset="0" stopColor="#FFD2DA" />
          <Stop offset="1" stopColor="#FF5A78" />
        </RadialGradient>
        <LinearGradient id={`${prefix}-coin`} x1="0.18" x2="0.86" y1="0.1" y2="0.9">
          <Stop offset="0" stopColor="#FFE782" />
          <Stop offset="0.5" stopColor="#FFC733" />
          <Stop offset="1" stopColor="#F29900" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="520" cy="812" fill="#FFA2B2" opacity="0.22" rx="280" ry="40" />
      <Path d="M333 258 C300 180 366 120 436 170 C406 196 378 230 354 272 Z" fill="#FF9AAC" />
      <Path d="M365 236 C351 196 383 168 420 190 C401 204 384 222 369 246 Z" fill="#FF5E7D" opacity="0.72" />
      <Path d="M561 174 C533 112 592 82 638 122 C616 144 600 177 593 214 Z" fill="#FF9AAC" />
      <Path d="M594 164 C580 134 608 119 630 136 C619 149 611 167 608 185 Z" fill="#FF5E7D" opacity="0.72" />
      <Path
        d="M714 464 C817 461 899 513 893 598 C889 661 825 681 788 641"
        fill="none"
        stroke="#FF4E73"
        strokeLinecap="round"
        strokeWidth="28"
      />
      <Path d="M800 583 C858 552 865 650 806 622" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="16" />
      <Ellipse cx="514" cy="530" fill={`url(#${prefix}-pig-body)`} rx="318" ry="266" />
      <Rect fill="#E24768" height="28" rx="14" width="190" x="421" y="280" />
      <Circle cx="546" cy="218" fill={`url(#${prefix}-coin)`} r="78" />
      <Circle cx="546" cy="218" fill="none" opacity="0.5" r="55" stroke="#E88A00" strokeWidth="12" />
      <Path d="M547 176 L563 207 L598 213 L572 238 L578 273 L547 257 L516 273 L522 238 L496 213 L531 207 Z" fill="#FFF5B8" />
      <Ellipse cx="319" cy="540" fill={`url(#${prefix}-pig-snout)`} rx="82" ry="74" />
      <Ellipse cx="286" cy="540" fill="#C5164B" opacity="0.82" rx="15" ry="34" />
      <Ellipse cx="348" cy="540" fill="#C5164B" opacity="0.82" rx="15" ry="34" />
      <Circle cx="434" cy="444" fill="#161D46" r="30" />
      <Circle cx="424" cy="432" fill="#FFFFFF" r="10" />
      <Ellipse cx="472" cy="530" fill="#FF7F98" opacity="0.62" rx="52" ry="38" />
      <Path d="M366 604 C392 642 434 636 451 598" fill="none" stroke="#5A1B2A" strokeLinecap="round" strokeWidth="20" />
      <Path d="M394 730 C389 807 501 810 486 729" fill="#FF4E73" />
      <Path d="M635 723 C642 800 751 792 728 711" fill="#FF4E73" />
    </Svg>
  );
}

function CalculatorIcon({ prefix, size }: { prefix: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 1024 1024" width={size}>
      <Defs>
        <LinearGradient id={`${prefix}-calc-shell`} x1="0.06" x2="0.92" y1="0.04" y2="0.96">
          <Stop offset="0" stopColor="#A8C8FF" />
          <Stop offset="0.48" stopColor="#F8FCFF" />
          <Stop offset="1" stopColor="#3279F5" />
        </LinearGradient>
        <LinearGradient id={`${prefix}-calc-screen`} x1="0.12" x2="0.88" y1="0.06" y2="1">
          <Stop offset="0" stopColor="#D9EBFF" />
          <Stop offset="1" stopColor="#A9C9FB" />
        </LinearGradient>
        <LinearGradient id={`${prefix}-calc-equal`} x1="0.1" x2="0.9" y1="0.05" y2="0.95">
          <Stop offset="0" stopColor="#8CB7FF" />
          <Stop offset="1" stopColor="#2E74F8" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="512" cy="828" fill="#79AFFF" opacity="0.2" rx="234" ry="44" />
      <Rect fill="#69A0FF" height="708" rx="106" width="526" x="249" y="164" />
      <Rect fill={`url(#${prefix}-calc-shell)`} height="648" rx="84" width="466" x="279" y="194" />
      <Rect fill={`url(#${prefix}-calc-screen)`} height="162" rx="44" stroke="#4386F5" strokeWidth="10" width="350" x="337" y="282" />
      <Path d="M384 325 C384 296 407 286 432 286" fill="none" opacity="0.72" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="20" />
      <Rect fill="#F8FCFF" height="128" rx="34" stroke="#87AEF5" strokeWidth="9" width="142" x="338" y="510" />
      <Rect fill="#F8FCFF" height="128" rx="34" stroke="#87AEF5" strokeWidth="9" width="142" x="543" y="510" />
      <Rect fill="#F8FCFF" height="128" rx="34" stroke="#87AEF5" strokeWidth="9" width="142" x="338" y="674" />
      <Rect fill={`url(#${prefix}-calc-equal)`} height="128" rx="34" width="142" x="543" y="674" />
      <Path d="M410 540 V608 M376 574 H444" fill="none" stroke="#4D88F7" strokeLinecap="round" strokeWidth="25" />
      <Path d="M591 574 H637" fill="none" stroke="#4D88F7" strokeLinecap="round" strokeWidth="25" />
      <Path d="M375 708 L444 769 M444 708 L375 769" fill="none" stroke="#4D88F7" strokeLinecap="round" strokeWidth="24" />
      <Path d="M584 720 H644 M584 756 H644" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="23" />
    </Svg>
  );
}

export function MoneyNoteSummaryIcon({ name, size = 48 }: MoneyNoteSummaryIconProps) {
  const prefix = `mn${sanitizeId(useId())}${name}`;

  if (name === 'income') {
    return <WalletIcon prefix={prefix} size={size} />;
  }

  if (name === 'expense') {
    return <PiggyIcon prefix={prefix} size={size} />;
  }

  return <CalculatorIcon prefix={prefix} size={size} />;
}
