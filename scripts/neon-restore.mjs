// One-time restore of the SAVLINO Supabase backup into the project's Neon database.
// Runs before `next build` on Vercel, where the Neon connection string is injected.
// It only acts when NEON_RESTORE_KEY is set AND the database is still empty, so it can
// never overwrite existing data. The backup is AES-256-GCM encrypted; the key lives
// only in Vercel. Never fails the build: problems are logged and the build continues.
import { execSync } from "node:child_process";
import { createDecipheriv } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { gunzipSync } from "node:zlib";

const log = (m) => console.log(`[neon-restore] ${m}`);
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const key = process.env.NEON_RESTORE_KEY;

async function main() {
  if (!url || !key) return log("skipped (no Neon database or restore key)");

  const dir = "/tmp/neon-restore-client";
  execSync(`npm install --no-save --no-audit --no-fund --prefix ${dir} pg@8`, { stdio: "ignore" });
  const { Client } = createRequire(`${dir}/noop.js`)("pg");

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query("select to_regclass('public.site_settings') is not null as present");
    if (rows[0].present) return log("database already contains SAVLINO tables — nothing to do");

    const raw = Buffer.from(readFileSync(new URL("./neon-restore.enc", import.meta.url), "utf8"), "base64");
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "hex"), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const sql = gunzipSync(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()])).toString("utf8");

    log("restoring backup (single transaction)…");
    await client.query(sql);

    const { rows: c } = await client.query(`select
      (select count(*) from auth.users) as users,
      (select count(*) from public.products) as products,
      (select count(*) from public.collections) as collections,
      (select count(*) from public.site_settings) as settings,
      (select count(*) from pg_policies where schemaname = 'public') as policies`);
    log(`RESTORE OK ${JSON.stringify(c[0])}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => log(`RESTORE FAILED: ${e.message}`));
