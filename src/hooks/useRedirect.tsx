import loadConfig from "@utils/config";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const config = loadConfig();

const RETRY_DELAY = 1250;
const MAX_RETRIES = 10;

export const useRedirect = (
  url: string,
  replace: boolean = false,
  enable: boolean = true,
) => {
  const router = useRouter();
  const currentPath = usePathname();
  const callBackUrls = useRef([config.redirectURI, config.silentRedirectURI]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    // Parse URL to separate path and query params
    const [targetPath] = url.split("?");
    const currentFullPath = window.location.pathname;

    // If redirect is disabled or the url is already in the callback urls then do not redirect
    if (!enable || callBackUrls.current.includes(url)) {
      return;
    }

    // Check if we're already on the target path
    if (targetPath === currentFullPath || targetPath === currentPath) {
      return;
    }

    const performRedirect = () => {
      if (replace) {
        router.replace(url);
      } else {
        router.push(url);
      }

      retryCountRef.current += 1;

      // Retry if navigation hasn't occurred and we haven't exceeded max retries
      if (retryCountRef.current < MAX_RETRIES) {
        timeoutRef.current = setTimeout(() => {
          // Check again if we're still not on the target path
          if (window.location.pathname !== targetPath) {
            performRedirect();
          }
        }, RETRY_DELAY);
      }
    };

    performRedirect();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      retryCountRef.current = 0;
    };
  }, [replace, router, url, enable, currentPath]);
};

export default useRedirect;
