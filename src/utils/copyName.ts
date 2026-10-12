// Matches a name that already carries a copy suffix: "Name (copy)" or
// "Name (copy 3)". The first group is the original name.
const COPY_SUFFIX = /^(.*) \(copy(?: \d+)?\)$/;

/**
 * Name for a copy of something called `name`: "Name (copy)", or
 * "Name (copy 2)", "Name (copy 3)"… when the earlier ones are taken.
 * Copying a copy reuses the original name, so it never stacks into
 * "Name (copy) (copy)".
 */
export function copyName(name: string, taken: string[] = []): string {
  const base = (name.match(COPY_SUFFIX)?.[1] ?? name).trim();
  const used = new Set(taken);
  const label = (suffix: string) =>
    base ? `${base} (${suffix})` : `(${suffix})`;

  let candidate = label("copy");
  for (let n = 2; used.has(candidate); n++) candidate = label(`copy ${n}`);
  return candidate;
}
