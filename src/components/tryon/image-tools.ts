import { TRYON_LIMITS } from "@/lib/tryon/config";

export type PreparedPhoto = { dataUrl: string; width: number; height: number };

export class PhotoError extends Error {}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new PhotoError("We couldn’t read that photo. Please try another one."));
    img.src = src;
  });
}

/** Down-scales a canvas-drawable source to ≤1280px and encodes it as a JPEG data URL. */
function encode(source: CanvasImageSource, w: number, h: number): PreparedPhoto {
  const max = TRYON_LIMITS.outputMaxDimension;
  const scale = Math.min(1, max / Math.max(w, h));
  const width = Math.round(w * scale);
  const height = Math.round(h * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PhotoError("Your browser couldn’t process this photo.");
  ctx.drawImage(source, 0, 0, width, height);
  let quality = 0.86;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > TRYON_LIMITS.maxDataUrlChars && quality > 0.4) {
    quality -= 0.12;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrl.length > TRYON_LIMITS.maxDataUrlChars) throw new PhotoError("That photo is too large. Please use a smaller image.");
  return { dataUrl, width, height };
}

/** Validates type, file size and resolution, then prepares the photo for upload. */
export async function preparePhotoFile(file: File): Promise<PreparedPhoto> {
  if (!(TRYON_LIMITS.acceptedTypes as readonly string[]).includes(file.type)) {
    throw new PhotoError("Please upload a JPG, PNG or WEBP photo.");
  }
  if (file.size > TRYON_LIMITS.maxOriginalBytes) throw new PhotoError("Photos must be under 12 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    if (Math.min(img.naturalWidth, img.naturalHeight) < TRYON_LIMITS.minDimension) {
      throw new PhotoError("Photo resolution is too low. Please use a clearer photo (at least 400px).");
    }
    return encode(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Captures the current camera frame (mirrored back to true orientation). */
export function captureVideoFrame(video: HTMLVideoElement): PreparedPhoto {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) throw new PhotoError("The camera isn’t ready yet.");
  return encode(video, w, h);
}
