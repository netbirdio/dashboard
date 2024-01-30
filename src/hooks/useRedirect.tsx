import loadConfig from "@utils/config";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const config = loadConfig();
export const useRedirect = (
  url: string,
  replace: boolean = false,
  enable: boolean = true,
) => {
  const router = useRouter();
  const currentPath = usePathname();
  const callBackUrls = [config.redirectURI, config.silentRedirectURI];

  useEffect(() => {
    if (!enable) return;
    if (callBackUrls.includes(url)) return; // Don't redirect to the callback urls to avoid infinite loop
    if (url === currentPath) return; // Don't redirect to the current page

    const redirect = replace ? router.replace : router.push; // Replace the current history or add a new one

    router.refresh();
    redirect(url);

    // Timer in case the user has his browser tab open but not focused
    const interval = setInterval(() => {
      router.refresh();
      redirect(url);
    }, 1000);

    return () => clearInterval(interval);
  }, [replace, router, url, enable]);
};
