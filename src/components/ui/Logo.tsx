import Image from "next/image";
import { site } from "@/lib/site";

type LogoProps = {
  /** Rendered height in px; width follows the approved artwork's aspect ratio. */
  height: number;
  priority?: boolean;
  className?: string;
};

/**
 * The approved SAVLINO lockup (SL monogram + wordmark + tagline), used exactly
 * as supplied — only the Royal Noir background has been made transparent.
 */
export function Logo({ height, priority, className }: LogoProps) {
  const width = Math.round((site.logo.lockupWidth / site.logo.lockupHeight) * height);
  return (
    <Image
      src={site.logo.lockup}
      alt="SAVLINO — A Legacy of Elegance"
      width={width}
      height={height}
      priority={priority}
      sizes={`${width}px`}
      className={className}
      style={{ width, height }}
    />
  );
}

export function Monogram({ size, priority, className }: { size: number; priority?: boolean; className?: string }) {
  return (
    <Image
      src={site.logo.monogram}
      alt="SAVLINO SL monogram"
      width={size}
      height={size}
      priority={priority}
      sizes={`${size}px`}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
