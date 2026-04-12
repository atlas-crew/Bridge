interface IconProps {
  className?: string;
  size?: number;
}

/** Inferno Lab — Crown of Three */
export function InfernoLabIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 110 110" className={className}>
      <path d="M16,88 L34,42 L52,88" fill="none" stroke="#f07030" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter" opacity="0.65"/>
      <path d="M38,88 L55,14 L72,88" fill="none" stroke="#f07030" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter"/>
      <path d="M58,88 L76,42 L94,88" fill="none" stroke="#f07030" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter" opacity="0.65"/>
      <line x1="12" y1="92" x2="98" y2="92" stroke="#f07030" strokeWidth="3" opacity="0.4"/>
    </svg>
  );
}

/** Apparatus — Broken ring with waveform */
export function ApparatusIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 110 110" className={className}>
      <path d="M30,85 A35,35 0 1,1 80,85" fill="none" stroke="#38a0ff" strokeWidth="6" strokeLinecap="square"/>
      <polyline points="38,55 44,42 50,58 56,38 62,62 68,45 74,55" fill="none" stroke="#6cb4ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="30" y1="85" x2="80" y2="85" stroke="#38a0ff" strokeWidth="3" opacity="0.4"/>
    </svg>
  );
}

/** Chimera — Three arc segments with gap sparks */
export function ChimeraIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 110 110" className={className}>
      <path d="M55,20 A35,35 0 0,1 86,42" fill="none" stroke="#d946a8" strokeWidth="6" strokeLinecap="square"/>
      <path d="M90,58 A35,35 0 0,1 68,88" fill="none" stroke="#e870c0" strokeWidth="6" strokeLinecap="square" opacity="0.7"/>
      <path d="M42,88 A35,35 0 0,1 20,42" fill="none" stroke="#d946a8" strokeWidth="6" strokeLinecap="square" opacity="0.45"/>
      <circle cx="88" cy="50" r="2.5" fill="#e870c0" opacity="0.6"/>
      <circle cx="55" cy="92" r="2.5" fill="#e870c0" opacity="0.6"/>
      <circle cx="22" cy="50" r="2.5" fill="#e870c0" opacity="0.6"/>
      <circle cx="55" cy="55" r="5" fill="none" stroke="#d946a8" strokeWidth="2.5"/>
      <line x1="52" y1="52" x2="58" y2="58" stroke="#e870c0" strokeWidth="2"/>
    </svg>
  );
}

/** Crucible — Broken C ring with flame */
export function CrucibleIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 110 110" className={className}>
      <path d="M75,25 A35,35 0 1,0 75,85" fill="none" stroke="#e5a820" strokeWidth="6" strokeLinecap="square"/>
      <path d="M55,38 Q62,48 55,58 Q48,68 55,78" fill="none" stroke="#f07030" strokeWidth="3" strokeLinecap="round"/>
      <rect x="76" y="24" width="12" height="3" fill="#e5a820" opacity="0.5"/>
      <rect x="76" y="83" width="12" height="3" fill="#e5a820" opacity="0.5"/>
    </svg>
  );
}

/** Map service ID to its icon component */
export const SERVICE_ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  apparatus: ApparatusIcon,
  'chimera-api': ChimeraIcon,
  'chimera-web': ChimeraIcon,
  crucible: CrucibleIcon,
};
