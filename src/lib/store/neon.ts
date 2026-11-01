import "server-only";

/**
 * Minimal Neon client over Neon's HTTPS SQL endpoint (the same protocol the
 * @neondatabase/serverless driver uses), so no database package is needed.
 * The website store lives in its own `store` schema; it never touches the CRM tables.
 */

export class StoreUnavailableError extends Error {
  constructor() {
    super("The store database is not connected");
  }
}

export const storeDbUrl = () => process.env.DATABASE_URL || process.env.POSTGRES_URL || null;
export const isStoreConfigured = () => Boolean(storeDbUrl());

type NeonResponse = { rows?: unknown[]; message?: string };

let workingEndpoint: string | null = null;

function endpointsFor(connectionString: string) {
  const host = new URL(connectionString).hostname;
  return [`https://${host.replace(/^[^.]+\./, "api.")}/sql`, `https://${host}/sql`];
}

/** Values are sent as text, like the Neon driver does (null stays null). */
function toParam(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return String(v);
  return JSON.stringify(v);
}

async function query(sql: string, params: unknown[]): Promise<NeonResponse> {
  const cs = storeDbUrl();
  if (!cs) throw new StoreUnavailableError();
  const candidates = workingEndpoint ? [workingEndpoint] : endpointsFor(cs);
  let lastError: Error = new Error("Neon request failed");
  for (const endpoint of candidates) {
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Neon-Connection-String": cs,
          "Neon-Raw-Text-Output": "true",
          "Neon-Array-Mode": "true",
        },
        body: JSON.stringify({ query: sql, params: params.map(toParam) }),
        cache: "no-store",
      });
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      continue;
    }
    const text = await res.text();
    let body: NeonResponse | null = null;
    try {
      body = JSON.parse(text) as NeonResponse;
    } catch {
      body = null;
    }
    if (res.ok && body) {
      workingEndpoint = endpoint;
      return body;
    }
    // A database error (bad SQL, constraint) comes back as JSON with a message: stop here.
    if (body?.message && res.status !== 404) throw new Error(body.message);
    lastError = new Error(`Neon HTTP ${res.status}`);
  }
  throw lastError;
}

function firstCell(r: NeonResponse): unknown {
  const row = r.rows?.[0];
  if (Array.isArray(row)) return row[0];
  if (row && typeof row === "object") return Object.values(row)[0];
  return undefined;
}

/** Runs a SELECT and returns its rows as plain JSON objects (types come back JSON-shaped). */
export async function rows<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const r = await query(`select coalesce(json_agg(x), '[]'::json)::text from (${sql}) x`, params);
  return JSON.parse(String(firstCell(r) ?? "[]")) as T[];
}

/** Runs an INSERT/UPDATE/DELETE … RETURNING and returns the returned rows. */
export async function mutate<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const r = await query(`with x as (${sql}) select coalesce(json_agg(x), '[]'::json)::text from x`, params);
  return JSON.parse(String(firstCell(r) ?? "[]")) as T[];
}
