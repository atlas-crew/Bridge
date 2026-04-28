interface BrandImageProps {
  className?: string;
  size?: number;
}

/** Bridge — product mark (3×3 service grid). Sourced from /public/bridge-icon.svg. */
export function BridgeIcon({ className, size = 28 }: BrandImageProps) {
  return (
    <img
      src="/bridge-icon.svg"
      width={size}
      height={size}
      alt="Bridge"
      className={className}
      draggable={false}
    />
  );
}

interface LockupProps {
  className?: string;
  height?: number;
}

/** Bridge — full lockup with wordmark and "Service Orchestrator" tagline. */
export function BridgeLockup({ className, height = 36 }: LockupProps) {
  return (
    <img
      src="/bridge-lockup.svg"
      height={height}
      alt="Bridge — Service Orchestrator"
      className={className}
      draggable={false}
      style={{ height }}
    />
  );
}
