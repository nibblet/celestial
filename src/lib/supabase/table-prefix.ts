type SupabaseLikeClient = {
  from: (table: string) => unknown;
};

function mapTableName(table: string): string {
  if (table.startsWith("cel_")) return table;
  if (table.startsWith("sb_")) {
    return `cel_${table.slice(3)}`;
  }
  return table;
}

/**
 * Celestial’s Supabase data lives in **`cel_*` tables** (this app’s namespace).
 *
 * Legacy callsites use **`sb_*` names** from the shared Storybook schema; they are
 * **not** sent to Keith’s `sb_*` tables — `mapTableName` rewrites them to `cel_*`.
 *
 * **Prefer `cel_*` in new code** so it’s obvious which tables are hit. Passing
 * `cel_*` through unchanged keeps one client compatible with both naming styles.
 */
export function withCelTablePrefix<T extends SupabaseLikeClient>(client: T): T {
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === "from") {
        return (table: string) =>
          Reflect.get(target, prop, receiver).call(target, mapTableName(table));
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as T;
}
