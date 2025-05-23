import loadConfig from "@utils/config";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const config = loadConfig();

export const useRedirect = (
  url: string,
  replace: boolean = false,
  enable: boolean = true,
) => {
  const router = useRouter();
  const currentPath = usePathname();
  const callBackUrls = useRef([config.redirectURI, config.silentRedirectURI]);
  const isRedirecting = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If redirect is disabled or the url is already in the callback urls then do not redirect
    if (!enable || callBackUrls.current.includes(url)) return;

    const performRedirect = () => {
      if (!isRedirecting.current) {
        isRedirecting.current = true;
        router.refresh();
        if (replace) {
          router.replace(url);
        } else {
          router.push(url);
        }
        isRedirecting.current = false;
      }
    };

    performRedirect();

    // Try to redirect after 1.25 seconds if for whatever reason the redirect did not happen (network change, browser tab open but not focused etc.)
    intervalRef.current = setInterval(() => {
      if (!isRedirecting.current) {
        performRedirect();
      }
    }, 1250);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [replace, router, url, enable, currentPath]);
};

export default useRedirect;
