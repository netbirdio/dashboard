// Group reads go to the versioned endpoint, which returns members as peer IDs.
// Management versions that predate it answer 404 and keep serving /groups.
const V1_GROUPS = "/v1alpha1/groups";

type FallbackState = { v1alpha1Unavailable: boolean };

const sessionState: FallbackState = { v1alpha1Unavailable: false };

const GROUP_READ_PATH = /^\/groups(\/[^/?]+)?(\?.*)?$/;

/** Whether a GET path is /groups or /groups/{id}, the reads that have a v1alpha1 twin. */
export const isGroupReadPath = (path: string): boolean =>
  GROUP_READ_PATH.test(path);

const isNotFound = (err: unknown): boolean =>
  (err as { code?: number } | null)?.code === 404;

/**
 * Runs a group read against v1alpha1 and falls back to the unversioned path
 * only when v1alpha1 answers 404. Other errors are rethrown. The fallback is
 * remembered once it succeeds, so later reads skip the probe. A 404 on a
 * single group is not remembered unless the unversioned path then succeeds.
 */
export async function requestGroupsWithFallback<T>(
  path: string,
  request: (path: string) => Promise<T>,
  state: FallbackState = sessionState,
): Promise<T> {
  if (!isGroupReadPath(path) || state.v1alpha1Unavailable) {
    return request(path);
  }
  try {
    return await request(path.replace(/^\/groups/, V1_GROUPS));
  } catch (err) {
    if (!isNotFound(err)) throw err;
  }
  const result = await request(path);
  state.v1alpha1Unavailable = true;
  return result;
}

/** Forgets the remembered fallback decision. */
export function resetGroupsApiFallback(state: FallbackState = sessionState) {
  state.v1alpha1Unavailable = false;
}
