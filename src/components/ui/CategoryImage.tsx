import Image, { type StaticImageData } from "next/image";

/** Category photo: bundled images get blur placeholders; pasted URLs load as-is. */
export function CategoryImage({
  src,
  alt,
  sizes,
  className,
  priority,
}: {
  src: StaticImageData | string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  if (typeof src === "string") {
    return <Image src={src} alt={alt} fill unoptimized sizes={sizes} priority={priority} className={className} />;
  }
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} placeholder="blur" className={className} />;
}
