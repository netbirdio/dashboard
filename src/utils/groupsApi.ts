// Group reads go to the versioned endpoint, which returns members as peer IDs.
// Management versions that predate it keep serving /groups. Their router adds
// CORS headers only to matched routes, so a cross-origin probe fails as a
// network error rather than a readable 404.
const V1_GROUPS = "/v1alpha1/groups";

type FallbackState = { v1alpha1Unavailable: boolean };

const sessionState: FallbackState = { v1alpha1Unavailable: false };

const GROUP_READ_PATH = /^\/groups(\/[^/?]+)?(\?.*)?$/;

/** Whether a GET path is /groups or /groups/{id}, the reads that have a v1alpha1 twin. */
export const isGroupReadPath = (path: string): boolean =>
  GROUP_READ_PATH.test(path);

const isNotFound = (err: unknown): boolean => {
  const e = err as { status?: number; code?: number } | null;
  return e?.status === 404 || e?.code === 404;
};

// fetch rejects with a TypeError when the browser blocks or loses the request.
const isNetworkError = (err: unknown): boolean => err instanceof TypeError;

const v1alpha1Missing = (err: unknown): boolean =>
  isNotFound(err) || isNetworkError(err);

/**
 * Runs a group read against v1alpha1 and falls back to the unversioned path
 * when v1alpha1 answers 404 or the request fails at the network level. Other
 * errors are rethrown. The fallback is remembered only once the unversioned
 * read succeeds, so a real outage or a missing single group keeps surfacing.
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
    if (!v1alpha1Missing(err)) throw err;
  }
  const result = await request(path);
  state.v1alpha1Unavailable = true;
  return result;
}

/** Forgets the remembered fallback decision. */
export function resetGroupsApiFallback(state: FallbackState = sessionState) {
  state.v1alpha1Unavailable = false;
}
