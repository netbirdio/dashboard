import { useOidcUser } from "@axa-fr/react-oidc";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { Params, useApiCall } from "@utils/api";
import { useIsMd } from "@utils/responsive";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { User } from "@/interfaces/User";

type Props = {
  children: React.ReactNode;
};

const ApplicationContext = React.createContext(
  {} as {
    latestVersion: string | undefined;
    latestUrl: string | undefined;
    toggleMobileNav: () => void;
    mobileNavOpen: boolean;
    user: any;
    globalApiParams?: Params;
    setGlobalApiParams?: (p?: Params) => void;
    isNavigationCollapsed: boolean;
    toggleNavigation: () => void;
  },
);

export default function ApplicationProvider({ children }: Props) {
  const { oidcUser: user } = useOidcUser();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMd = useIsMd();
  const userRequest = useApiCall<User[]>(`/users`, true);
  const [show, setShow] = useState(false);
  const [isNavigationCollapsed, setIsNavigationCollapsed] = useLocalStorage(
    "netbird-nav-collapsed",
    false,
  );
  const requestCalled = useRef(false);
  const maxTries = 3;

  const [globalApiParams, setGlobalApiParams] = useLocalStorage<
    Params | undefined
  >("netbird-api-params", undefined);

  const populateCache = useCallback(
    async (tries = 0) => {
      if (tries >= maxTries) {
        setShow(true);
        return Promise.reject();
      }
      try {
        await userRequest.get().then(() => setShow(true));
        return Promise.resolve();
      } catch (e) {
        setTimeout(() => populateCache(tries + 1), 500);
      }
    },
    [userRequest, setShow],
  );

  const toggleNavigation = useCallback(() => {
    setIsNavigationCollapsed((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!requestCalled.current) {
      populateCache().then();
      requestCalled.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hide mobile nav when windows gets resized
  useEffect(() => {
    if (isMd) {
      setMobileNavOpen(false);
    }
  }, [isMd]);

  const toggleMobileNav = () => {
    setMobileNavOpen(!mobileNavOpen);
  };

  return show ? (
    <ApplicationContext.Provider
      value={{
        latestVersion: undefined,
        toggleMobileNav,
        latestUrl: undefined,
        mobileNavOpen,
        user,
        globalApiParams,
        setGlobalApiParams,
        isNavigationCollapsed,
        toggleNavigation,
      }}
    >
      {children}
    </ApplicationContext.Provider>
  ) : (
    <FullScreenLoading />
  );
}

export function useApplicationContext() {
  return useContext(ApplicationContext);
}
