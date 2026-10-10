/** Resizes an uploaded image in the browser to a JPEG data URL (keeps rows small, never public). */
export async function imageToDataUrl(file: File, max = 1400, limit = 1_200_000): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Please upload a JPG, PNG or WEBP image.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Images must be under 15 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("We couldn’t read that image."));
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Your browser couldn’t process this image.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    let q = 0.86;
    let out = c.toDataURL("image/jpeg", q);
    while (out.length > limit && q > 0.4) {
      q -= 0.1;
      out = c.toDataURL("image/jpeg", q);
    }
    if (out.length > limit) throw new Error("That image is too large.");
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}
