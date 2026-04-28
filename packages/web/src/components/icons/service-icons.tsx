import type { ComponentType } from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

/** Apparatus — Broken ring with waveform */
export function ApparatusIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 110 110" className={className} aria-hidden="true" role="img">
      <path d="M30,85 A35,35 0 1,1 80,85" fill="none" stroke="#38a0ff" strokeWidth="6" strokeLinecap="square"/>
      <polyline points="38,55 44,42 50,58 56,38 62,62 68,45 74,55" fill="none" stroke="#6cb4ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="30" y1="85" x2="80" y2="85" stroke="#38a0ff" strokeWidth="3" opacity="0.4"/>
    </svg>
  );
}

/** Chimera — Three arc segments with gap sparks */
export function ChimeraIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 110 110" className={className} aria-hidden="true" role="img">
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
    <svg width={size} height={size} viewBox="0 0 110 110" className={className} aria-hidden="true" role="img">
      <path d="M75,25 A35,35 0 1,0 75,85" fill="none" stroke="#e5a820" strokeWidth="6" strokeLinecap="square"/>
      <path d="M55,38 Q62,48 55,58 Q48,68 55,78" fill="none" stroke="#f07030" strokeWidth="3" strokeLinecap="round"/>
      <rect x="76" y="24" width="12" height="3" fill="#e5a820" opacity="0.5"/>
      <rect x="76" y="83" width="12" height="3" fill="#e5a820" opacity="0.5"/>
    </svg>
  );
}

/** Horizon — Fleet intelligence horizon */
export function HorizonIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 110 110" className={className} aria-hidden="true" role="img">
      <line x1="18" y1="50" x2="92" y2="50" stroke="#38a0ff" strokeWidth="1.5" strokeLinecap="square" opacity="0.25"/>
      <path d="M20,50 A35,32 0 0 1 90,50" fill="none" stroke="#f07030" strokeWidth="5" strokeLinecap="square"/>
      <path d="M34,50 A21,19 0 0 1 76,50" fill="none" stroke="#f07030" strokeWidth="2.5" strokeLinecap="square" opacity="0.45"/>
      <circle cx="55" cy="50" r="4.5" fill="#f07030"/>
      <line x1="55" y1="55" x2="26" y2="94" stroke="#38a0ff" strokeWidth="3.5" strokeLinecap="square"/>
      <line x1="55" y1="55" x2="84" y2="94" stroke="#38a0ff" strokeWidth="3.5" strokeLinecap="square"/>
      <line x1="55" y1="55" x2="18" y2="82" stroke="#f07030" strokeWidth="2" strokeLinecap="square" opacity="0.45"/>
      <line x1="55" y1="55" x2="92" y2="82" stroke="#f07030" strokeWidth="2" strokeLinecap="square" opacity="0.45"/>
    </svg>
  );
}

/** Synapse — Neural sensor network */
export function SynapseIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 110 110" className={className} aria-hidden="true" role="img">
      <line x1="55" y1="55" x2="28" y2="24" stroke="#38a0ff" strokeWidth="2.5" strokeLinecap="square"/>
      <line x1="55" y1="55" x2="82" y2="24" stroke="#38a0ff" strokeWidth="2.5" strokeLinecap="square"/>
      <line x1="55" y1="55" x2="90" y2="50" stroke="#38a0ff" strokeWidth="2.5" strokeLinecap="square"/>
      <line x1="55" y1="55" x2="26" y2="76" stroke="#38a0ff" strokeWidth="2.5" strokeLinecap="square"/>
      <line x1="55" y1="55" x2="78" y2="86" stroke="#8B5CF6" strokeWidth="3.5" strokeLinecap="square"/>
      <line x1="28" y1="24" x2="82" y2="24" stroke="#38a0ff" strokeWidth="1.5" strokeLinecap="square" opacity="0.3"/>
      <line x1="82" y1="24" x2="90" y2="50" stroke="#38a0ff" strokeWidth="1.5" strokeLinecap="square" opacity="0.3"/>
      <line x1="26" y1="76" x2="78" y2="86" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="square" opacity="0.35"/>
      <circle cx="28" cy="24" r="4.5" fill="none" stroke="#38a0ff" strokeWidth="2"/>
      <circle cx="82" cy="24" r="3.5" fill="none" stroke="#38a0ff" strokeWidth="2"/>
      <circle cx="90" cy="50" r="3.5" fill="none" stroke="#38a0ff" strokeWidth="2"/>
      <circle cx="26" cy="76" r="3.5" fill="none" stroke="#38a0ff" strokeWidth="2"/>
      <circle cx="78" cy="86" r="5.5" fill="#8B5CF6"/>
      <circle cx="55" cy="55" r="7" fill="none" stroke="#38a0ff" strokeWidth="3"/>
    </svg>
  );
}

/** Map service ID to its icon component */
export const SERVICE_ICON_MAP: Record<string, ComponentType<IconProps>> = {
  apparatus: ApparatusIcon,
  'chimera-api': ChimeraIcon,
  'chimera-web': ChimeraIcon,
  crucible: CrucibleIcon,
  'signal-horizon-api': HorizonIcon,
  'signal-horizon-ui': HorizonIcon,
  'synapse-pingora': SynapseIcon,
};
