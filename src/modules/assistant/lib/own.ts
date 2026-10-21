/**
 * An entry only when the table itself holds it.
 * Tool and operation names come from model output, and `constructor` would otherwise find Object.prototype's.
 */
export const ownEntry = <T>(table: Record<string, T>, key: string): T | undefined =>
  Object.hasOwn(table, key) ? table[key] : undefined;
