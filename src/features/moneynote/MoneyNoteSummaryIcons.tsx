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
    <Svg height={size} viewBox="120 115 840 780" width={size}>
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
    <Svg height={size} viewBox="130 110 820 790" width={size}>
      <Defs>
        <RadialGradient cx="36%" cy="24%" id={`${prefix}-pig-body`} r="78%">
          <Stop offset="0" stopColor="#FFF0F4" />
          <Stop offset="0.4" stopColor="#FFB7C6" />
          <Stop offset="0.78" stopColor="#FF829A" />
          <Stop offset="1" stopColor="#FF4D76" />
        </RadialGradient>
        <RadialGradient cx="38%" cy="24%" id={`${prefix}-pig-snout`} r="74%">
          <Stop offset="0" stopColor="#FFD2DA" />
          <Stop offset="0.58" stopColor="#FF8396" />
          <Stop offset="1" stopColor="#F14469" />
        </RadialGradient>
        <LinearGradient id={`${prefix}-pig-ear`} x1="0.15" x2="0.82" y1="0.04" y2="0.96">
          <Stop offset="0" stopColor="#FFD4DC" />
          <Stop offset="0.62" stopColor="#FF91A5" />
          <Stop offset="1" stopColor="#F64D72" />
        </LinearGradient>
        <LinearGradient id={`${prefix}-pig-leg`} x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#FF8CA1" />
          <Stop offset="1" stopColor="#F83B6B" />
        </LinearGradient>
        <LinearGradient id={`${prefix}-coin`} x1="0.18" x2="0.86" y1="0.1" y2="0.9">
          <Stop offset="0" stopColor="#FFE782" />
          <Stop offset="0.5" stopColor="#FFC733" />
          <Stop offset="1" stopColor="#F29900" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="520" cy="824" fill="#FF8EA1" opacity="0.2" rx="284" ry="42" />
      <Path
        d="M732 474 C834 458 900 512 886 586 C875 643 821 658 792 621 C839 628 843 556 800 558"
        fill="none"
        stroke="#FF4E73"
        strokeLinecap="round"
        strokeWidth="30"
      />
      <Path d="M332 270 C300 170 372 123 456 184 C421 205 390 238 365 286 Z" fill={`url(#${prefix}-pig-ear)`} />
      <Path d="M360 250 C350 203 384 178 425 201 C402 216 383 240 370 270 Z" fill="#F84D70" opacity="0.72" />
      <Path d="M510 285 C505 205 572 158 644 213 C610 237 591 280 589 340 Z" fill={`url(#${prefix}-pig-ear)`} />
      <Path d="M542 284 C545 238 580 209 617 227 C598 249 588 281 587 319 Z" fill="#F84D70" opacity="0.7" />
      <Path d="M358 704 C350 785 454 807 472 710 Z" fill={`url(#${prefix}-pig-leg)`} />
      <Path d="M614 704 C602 790 715 805 724 710 Z" fill={`url(#${prefix}-pig-leg)`} />
      <Path
        d="M230 536 C230 382 362 292 540 292 C718 292 830 391 842 540 C856 699 734 782 540 782 H386 C286 782 230 676 230 536 Z"
        fill={`url(#${prefix}-pig-body)`}
      />
      <Path d="M430 302 C482 280 604 280 671 312" fill="none" opacity="0.28" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="32" />
      <Path d="M428 314 C492 292 636 293 732 349" fill="none" opacity="0.16" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="36" />
      <Rect fill="#D83F61" height="30" rx="15" width="184" x="428" y="284" />
      <Circle cx="536" cy="226" fill={`url(#${prefix}-coin)`} r="78" />
      <Circle cx="536" cy="226" fill="none" opacity="0.45" r="56" stroke="#E88900" strokeWidth="12" />
      <Path d="M536 180 L554 209 L589 215 L563 239 L569 274 L536 258 L505 274 L511 239 L485 215 L520 209 Z" fill="#FFF4B2" />
      <Ellipse cx="296" cy="526" fill={`url(#${prefix}-pig-snout)`} rx="78" ry="72" />
      <Ellipse cx="265" cy="526" fill="#B91648" opacity="0.8" rx="14" ry="32" />
      <Ellipse cx="325" cy="526" fill="#B91648" opacity="0.8" rx="14" ry="32" />
      <Circle cx="425" cy="444" fill="#121842" r="31" />
      <Circle cx="416" cy="432" fill="#FFFFFF" r="10" />
      <Ellipse cx="480" cy="538" fill="#FF7895" opacity="0.56" rx="48" ry="36" />
      <Path d="M360 606 C387 638 428 630 445 594" fill="none" stroke="#621B2B" strokeLinecap="round" strokeWidth="20" />
    </Svg>
  );
}

function CalculatorIcon({ prefix, size }: { prefix: string; size: number }) {
  return (
    <Svg height={size} viewBox="180 120 660 790" width={size}>
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
