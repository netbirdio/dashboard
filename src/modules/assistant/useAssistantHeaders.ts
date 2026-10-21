import { useOidcAccessToken, useOidcIdToken } from "@axa-fr/react-oidc";
import loadConfig from "@utils/config";
import { sleep } from "@utils/helpers";
import { useCallback, useRef } from "react";
import { isExpired } from "react-jwt";

// The same token selection and expiry wait as useNetBirdFetch (src/utils/api),
// shaped as the headers resolver the assistant calls before every request.
// Undefined until the user has a token: nothing is asked of the assistant
// on their behalf before then.
export function useAssistantHeaders(): (() => Promise<Record<string, string>>) | undefined {
  const { idToken } = useOidcIdToken();
  const { accessToken } = useOidcAccessToken();
  const tokenSource = loadConfig().tokenSource || "accessToken";
  const token = tokenSource.toLowerCase() === "idtoken" ? idToken : accessToken;

  // Read at request time through a ref: the resolver is captured once per
  // conversation, and the OIDC client refreshes tokens behind it.
  const tokenRef = useRef(token);
  // eslint-disable-next-line react-hooks/refs -- deliberate: see above
  tokenRef.current = token;

  const resolve = useCallback(async () => {
    let attempts = 4;
    while (isExpired(tokenRef.current) && attempts > 0) {
      await sleep(500);
      attempts -= 1;
    }
    return { Authorization: `Bearer ${tokenRef.current}` };
  }, []);
  return token ? resolve : undefined;
}
