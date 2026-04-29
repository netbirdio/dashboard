const SESSION_LOST_REDIRECT_PATH_KEY = "netbird-session-lost-redirect-path";

const isSafeRelativePath = (path: string) =>
  path.startsWith("/") && !path.startsWith("//");

export const storeSessionLostRedirectPath = () => {
  if (typeof window === "undefined") return;

  const redirectPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  try {
    if (
      !redirectPath ||
      redirectPath === "/" ||
      !isSafeRelativePath(redirectPath)
    ) {
      window.sessionStorage.removeItem(SESSION_LOST_REDIRECT_PATH_KEY);
      return;
    }

    window.sessionStorage.setItem(
      SESSION_LOST_REDIRECT_PATH_KEY,
      redirectPath,
    );
  } catch {}
};

export const getSessionLostRedirectPath = () => {
  if (typeof window === "undefined") return undefined;

  try {
    const redirectPath = window.sessionStorage.getItem(
      SESSION_LOST_REDIRECT_PATH_KEY,
    );
    if (redirectPath && isSafeRelativePath(redirectPath)) return redirectPath;
  } catch {}

  return undefined;
};

export const clearSessionLostRedirectPath = () => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(SESSION_LOST_REDIRECT_PATH_KEY);
  } catch {}
};
