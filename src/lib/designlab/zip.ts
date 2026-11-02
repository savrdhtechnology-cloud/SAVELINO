/**
 * Minimal, dependency-free ZIP reader for the browser (and Node 18+ for tests).
 * Only reads the central directory first, so nothing is inflated until an entry is asked for.
 * Safe by construction: path traversal / absolute paths are rejected, entry count, per-file and total
 * sizes are capped, and the real inflated size is checked against what the archive declared (zip-bomb guard).
 */
export const ZIP_LIMITS = {
  maxEntries: 3000,
  maxFileBytes: 25 * 1024 * 1024,
  maxTotalBytes: 800 * 1024 * 1024,
  maxArchiveBytes: 400 * 1024 * 1024,
};

export type ZipEntry = { path: string; size: number; compressed: number; method: number; offset: number; crc: number };
export type ZipListing = { entries: ZipEntry[]; skipped: { path: string; reason: string }[] };

export class ZipError extends Error {}

const u16 = (v: DataView, o: number) => v.getUint16(o, true);
const u32 = (v: DataView, o: number) => v.getUint32(o, true);

/** Returns a clean relative path with forward slashes, or null if it is unsafe. */
export function safePath(raw: string): string | null {
  if (!raw || raw.includes("\0")) return null;
  const p = raw.replace(/\\/g, "/");
  if (p.startsWith("/") || /^[a-zA-Z]:/.test(p)) return null;
  const parts = p.split("/").filter((s) => s !== "" && s !== ".");
  if (parts.length === 0 || parts.some((s) => s === "..")) return null;
  return parts.join("/");
}

export async function listZip(file: Blob): Promise<ZipListing> {
  if (file.size > ZIP_LIMITS.maxArchiveBytes) throw new ZipError(`ZIP is larger than ${Math.round(ZIP_LIMITS.maxArchiveBytes / 1048576)} MB — split it into smaller ZIPs`);
  if (file.size < 22) throw new ZipError("This is not a valid ZIP file");
  const tailLen = Math.min(file.size, 22 + 65535);
  const tail = new DataView(await file.slice(file.size - tailLen).arrayBuffer());
  let eocd = -1;
  for (let i = tailLen - 22; i >= 0; i--) if (u32(tail, i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new ZipError("This is not a valid ZIP file (end record missing)");
  const total = u16(tail, eocd + 10);
  const cdSize = u32(tail, eocd + 12);
  const cdOffset = u32(tail, eocd + 16);
  if (total === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) throw new ZipError("ZIP64 archives are not supported — re-create the ZIP with a smaller size");
  if (cdOffset + cdSize > file.size) throw new ZipError("The ZIP is damaged (directory out of range)");
  if (total > ZIP_LIMITS.maxEntries) throw new ZipError(`ZIP has ${total} entries — the limit is ${ZIP_LIMITS.maxEntries}`);

  const cd = new DataView(await file.slice(cdOffset, cdOffset + cdSize).arrayBuffer());
  const dec = new TextDecoder("utf-8");
  const entries: ZipEntry[] = [];
  const skipped: { path: string; reason: string }[] = [];
  let pos = 0;
  let declared = 0;
  for (let n = 0; n < total; n++) {
    if (pos + 46 > cd.byteLength || u32(cd, pos) !== 0x02014b50) throw new ZipError("The ZIP is damaged (bad directory entry)");
    const flags = u16(cd, pos + 8);
    const method = u16(cd, pos + 10);
    const crc = u32(cd, pos + 16);
    const compressed = u32(cd, pos + 20);
    const size = u32(cd, pos + 24);
    const nameLen = u16(cd, pos + 28);
    const extraLen = u16(cd, pos + 30);
    const commentLen = u16(cd, pos + 32);
    const offset = u32(cd, pos + 42);
    const rawName = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + pos + 46, nameLen));
    pos += 46 + nameLen + extraLen + commentLen;
    if (rawName.endsWith("/")) continue; // folder
    const path = safePath(rawName);
    if (!path) { skipped.push({ path: rawName, reason: "Unsafe path (blocked)" }); continue; }
    if (flags & 1) { skipped.push({ path, reason: "Encrypted entry" }); continue; }
    if (method !== 0 && method !== 8) { skipped.push({ path, reason: "Unsupported compression" }); continue; }
    if (size > ZIP_LIMITS.maxFileBytes) { skipped.push({ path, reason: `Larger than ${ZIP_LIMITS.maxFileBytes / 1048576} MB` }); continue; }
    declared += size;
    if (declared > ZIP_LIMITS.maxTotalBytes) throw new ZipError("The ZIP expands to more than the allowed total size");
    entries.push({ path, size, compressed, method, offset, crc });
  }
  return { entries, skipped };
}

async function inflateRaw(data: Uint8Array, expected: number): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const reader = stream.getReader();
  const out = new Uint8Array(expected);
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (n + value.length > expected) { await reader.cancel(); throw new ZipError("Entry is larger than declared — blocked"); }
    out.set(value, n);
    n += value.length;
  }
  if (n !== expected) throw new ZipError("Entry is shorter than declared — the ZIP is damaged");
  return out;
}

export async function readZipEntry(file: Blob, e: ZipEntry): Promise<Uint8Array> {
  const head = new DataView(await file.slice(e.offset, e.offset + 30).arrayBuffer());
  if (head.byteLength < 30 || u32(head, 0) !== 0x04034b50) throw new ZipError(`Damaged entry: ${e.path}`);
  const dataStart = e.offset + 30 + u16(head, 26) + u16(head, 28);
  const raw = new Uint8Array(await file.slice(dataStart, dataStart + e.compressed).arrayBuffer());
  const out = e.method === 0 ? raw : await inflateRaw(raw, e.size);
  if (out.length !== e.size) throw new ZipError(`Size mismatch: ${e.path}`);
  return out;
}

const IMAGE_MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };
export const imageExt = (path: string) => path.split(".").pop()?.toLowerCase() ?? "";
export const imageMime = (path: string) => IMAGE_MIME[imageExt(path)] ?? null;

/** Magic-number check so a renamed .exe/.html can never pass as a picture. */
export function sniffImage(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | "image/avif" | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b.length > 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 && b[8] === 0x61 && b[9] === 0x76 && b[10] === 0x69) return "image/avif"; // ftyp avif
  return null;
}

export async function sha256(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(d), (x) => x.toString(16).padStart(2, "0")).join("");
}
