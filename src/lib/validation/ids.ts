/**
 * A plausible row id from a server action's arguments. Actions are public
 * endpoints, so a declared `string` parameter can still arrive as anything —
 * this rejects the junk before it reaches a query. 64 comfortably covers a
 * cuid while keeping an oversized payload out of the database round trip.
 */
export function isRowId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 64;
}
