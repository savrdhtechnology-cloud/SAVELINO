/**
 * Minimal query surface for tables chosen at runtime. Replace with generated
 * `Database` types (`supabase gen types typescript`) once the project is provisioned.
 */
export type QueryResult = { data: unknown; error: unknown };
export type LooseFilter = PromiseLike<QueryResult> & {
  eq(column: string, value: string): LooseFilter;
  order(column: string, options: { ascending: boolean }): LooseFilter;
  limit(count: number): LooseFilter;
  maybeSingle(): PromiseLike<QueryResult>;
};
export type LooseTable = { select(columns: string): LooseFilter };

type FromCapable = { from(relation: string): unknown };

export function table(client: FromCapable, name: string): LooseTable {
  return client.from(name) as LooseTable;
}
