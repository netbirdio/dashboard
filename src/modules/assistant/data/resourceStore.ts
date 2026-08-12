/**
 * The join table behind `resource_table`.
 *
 * The server deliberately sends only `{columns, ids}` for a table — never the
 * row data. That keeps a data-heavy component out of the model's output entirely
 * (the model can't fabricate or garble values it never writes), and it works
 * because the dashboard already fetched those rows when it executed the tool.
 * This store is where they're kept so the component can join against them.
 *
 * Rows are stored **post-redaction**, exactly as they were sent to the model, so
 * everything here is placeholder-form. Renderers restore for display.
 */
import type { ResourceType } from "../privacy/redaction";

export interface StoredResource {
  resource: ResourceType;
  row: Record<string, unknown>;
}

export class ResourceStore {
  /** Placeholder id (`{PEER_1}`) → the redacted row. */
  private byId = new Map<string, StoredResource>();

  /**
   * Index every object carrying an `id` found in a redacted tool result,
   * recursing into arrays and nested objects (a peer's `groups`, a policy's
   * `rules`) so a table can reference a nested resource too.
   *
   * Later writes win: a `get_peer` detail fetch should supersede the thinner row
   * from an earlier `list_peers`.
   */
  record(resource: ResourceType, value: unknown): void {
    if (Array.isArray(value)) {
      for (const item of value) this.record(resource, item);
      return;
    }
    if (value === null || typeof value !== "object") return;

    const row = value as Record<string, unknown>;
    if (typeof row.id === "string") {
      const existing = this.byId.get(row.id);
      this.byId.set(row.id, {
        resource,
        // Merge so a sparse later write can't drop fields we already had.
        row: existing ? { ...existing.row, ...row } : row,
      });
    }

    // Nested resources are indexed under their own id; the parent's resource
    // type is the best label available without re-walking the redaction spec.
    for (const nested of Object.values(row)) {
      if (nested && typeof nested === "object") this.record(resource, nested);
    }
  }

  get(id: string): StoredResource | undefined {
    return this.byId.get(id);
  }

  /** Field value for a row, or undefined when we never fetched it. */
  field(id: string, column: string): unknown {
    return this.byId.get(id)?.row?.[column];
  }

  get size(): number {
    return this.byId.size;
  }
}
