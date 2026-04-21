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
 * Runtime table namespace remap:
 * - Existing code can keep `.from("sb_*")` callsites
 * - Queries are transparently redirected to `cel_*` tables
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
