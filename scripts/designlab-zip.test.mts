import { readFileSync } from "node:fs";
import { listZip, readZipEntry, sniffImage, safePath, sha256 } from "../src/lib/designlab/zip";
import { suggestGroups, parseCatalogCsv, detectAngle } from "../src/lib/designlab/group";
const assert = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exitCode = 1; } else console.log("ok  ", m); };
const buf = readFileSync(process.argv[2]);
const blob = new Blob([buf]);
const { entries, skipped } = await listZip(blob);
console.log("entries", entries.length, "skipped", skipped.length);
let hashes = new Set<string>(), bad = 0;
for (const e of entries) { if (!/\.(jpe?g|png|webp|avif)$/i.test(e.path)) continue; const b = await readZipEntry(blob, e); if (!sniffImage(b)) bad++; hashes.add(await sha256(b)); }
assert(bad === 0, "all images pass magic-number check");
const csvE = entries.find((e) => /Product_Catalog\.csv$/i.test(e.path))!;
const cat = parseCatalogCsv(new TextDecoder().decode(await readZipEntry(blob, csvE)));
assert(cat.length === 14, `catalog rows = ${cat.length}`);
const r = suggestGroups(entries.map((e) => e.path), cat);
assert(r.groups.length === 14, `groups = ${r.groups.length}`);
assert(r.groups.reduce((n, g) => n + g.images.length, 0) === 62, "62 images grouped");
assert(r.ignored.length === 2, `ignored size guides = ${r.ignored.length}`);
assert(r.groups.every((g) => g.sku && g.name && g.category && g.color), "all have sku/name/category/color");
console.log(r.groups.slice(0, 2).map((g) => `${g.sku} ${g.name} | ${g.category} | ${g.color} | ${g.images.length}`));
// without catalog
const r2 = suggestGroups(entries.map((e) => e.path));
assert(r2.groups.length === 14 && r2.groups[0].category !== "", "folder-only grouping still 14 with category from parent folder");
// angle + loose
const l = suggestGroups(["a/x.jpg", "rose_front.jpg", "rose_back.jpg", "rose_detail.png", "plain1.jpg", "plain2.jpg", "../evil.jpg", "dir/Rose Front.jpg"]);
console.log(l.groups.map((g) => `${g.key}:${g.basis}:${g.images.map((i) => i.angle)}`));
assert(detectAngle("Blouse_BACK_01.jpg") === "back" && detectAngle("background.jpg") === "unlabeled", "angle detection");
assert(safePath("../x") === null && safePath("/etc/p") === null && safePath("a\\..\\b") === null && safePath("a/./b.jpg") === "a/b.jpg", "safePath");
