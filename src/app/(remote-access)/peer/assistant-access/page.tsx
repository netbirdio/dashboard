"use client";

import { useOidc } from "@axa-fr/react-oidc";
import { useApiCall } from "@utils/api";
import { CheckCircle2Icon, CircleXIcon, Loader2Icon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import {
  ACCESS_GRANTED_MESSAGE,
  type AccessGrantedMessage,
} from "@/modules/assistant/assistantAccessAuth";

/**
 * Authorizes the assistant to reach one peer, in a window the user opened.
 *
 * ## Why this is a page and not a fetch
 *
 * Everything here could be done by the assistant panel directly — it has the
 * user's bearer already. The point is that it is NOT: the grant is created by a
 * window a person opened and signed in to. A silent token refresh proves a
 * refresh token exists in storage; this proves someone is at the keyboard.
 *
 * ## Why it forces a fresh sign-in
 *
 * Sitting behind the authenticated layout is not enough, and this is the part
 * that is easy to get wrong. With a live dashboard session the guard
 * authenticates silently, the window flashes "granted", and nobody has proved
 * anything — the check degrades to "a window was opened", which a background
 * tab could have done. `prompt=login` makes the identity provider ask again,
 * every time, which is the whole reason this window exists.
 *
 * ## What it grants
 *
 * Exactly what the opener asked for, for one peer: a temporary-access peer
 * carrying the assistant tab's OWN WireGuard public key, so the grant lands on
 * the peer the assistant is already running rather than on a second one that
 * would die with this window. The key arrives in the URL and is public by
 * definition — the private half stays in the assistant's tab and is never part
 * of this flow.
 */

/** Marks the return trip, so the forced sign-in happens once and not in a loop. */
const REAUTH_MARKER = "reauth";

/**
 * How long the success state stays up before the window closes itself.
 *
 * Not zero. This window is the only place the grant is confirmed and the only
 * place the machine it covers is named, and one that vanishes the instant it
 * appears reads as one that failed. The beat also keeps the reply ahead of the
 * close: the grant is reported to the opener by `postMessage`, and leaving a
 * gap means nothing here depends on how a browser orders a queued message
 * against a window that is going away.
 */
const AUTO_CLOSE_MS = 1_200;

/**
 * How long after the close attempt to conclude the browser refused it.
 *
 * A script-opened window may normally close itself, but that is a permission
 * and not a guarantee. If this timer still runs, the close did not happen and
 * the person is looking at a window with no way out of it.
 */
const CLOSE_REFUSED_MS = 400;

export default function AssistantAccessPage() {
  const params = useSearchParams();
  const { login } = useOidc();
  const peerRequest = useApiCall("/peers");
  const [state, setState] = useState<"working" | "granted" | "failed">(
    "working",
  );
  const [error, setError] = useState("");
  const [closeRefused, setCloseRefused] = useState(false);
  // React mounts effects twice in dev; a double grant would create a second
  // policy for the same peer, and a double login would bounce the window.
  const started = useRef(false);

  const peerId = params.get("peer");
  const peerLabel = params.get("label") ?? "this peer";
  const wgPublicKey = params.get("key");
  const assistantPeerName = params.get("name");
  const rules = (params.get("rules") ?? "").split(",").filter(Boolean);
  const reauthenticated = params.get(REAUTH_MARKER) === "1";

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const reply = (message: AccessGrantedMessage) => {
      // Targeted at this origin rather than "*", so the grant result is not
      // broadcast to whatever else may be listening.
      window.opener?.postMessage(message, window.location.origin);
    };

    const run = async () => {
      if (!peerId || !wgPublicKey || !assistantPeerName || rules.length === 0) {
        setState("failed");
        setError("This link is missing what it needs to authorize anything.");
        return;
      }

      /*
        Ask the identity provider to authenticate the person again, and come
        back here afterwards. The marker is what stops this repeating: without
        it the return trip would be indistinguishable from the first visit and
        the window would bounce to the IdP forever.
      */
      if (!reauthenticated) {
        const back = `${window.location.pathname}${window.location.search}&${REAUTH_MARKER}=1`;
        await login(back, { prompt: "login" });
        return;
      }

      try {
        await peerRequest.post(
          { name: assistantPeerName, wg_pub_key: wgPublicKey, rules },
          `/${encodeURIComponent(peerId)}/temporary-access`,
        );
        setState("granted");
        reply({ type: ACCESS_GRANTED_MESSAGE, ok: true, peerId });
      } catch (err) {
        const detail =
          err instanceof Error ? err.message : "The request was refused.";
        setState("failed");
        setError(detail);
        reply({
          type: ACCESS_GRANTED_MESSAGE,
          ok: false,
          peerId,
          error: detail,
        });
      }
    };

    run().catch(() => {
      setState("failed");
      setError("Something went wrong while authorizing.");
    });
    // Once, on mount. The parameters come from the URL and do not change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Granting is the end of this window's job, so it sees itself out. The
  // opener has already been told; nothing here is waiting on a click.
  useEffect(() => {
    if (state !== "granted") return;
    const closing = window.setTimeout(() => window.close(), AUTO_CLOSE_MS);
    const refused = window.setTimeout(
      () => setCloseRefused(true),
      AUTO_CLOSE_MS + CLOSE_REFUSED_MS,
    );
    return () => {
      window.clearTimeout(closing);
      window.clearTimeout(refused);
    };
  }, [state]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-nb-gray-950 px-8">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        {state === "working" && (
          <>
            <Loader2Icon className="animate-spin text-netbird" size={32} />
            <h1 className="text-lg font-medium text-nb-gray-100">
              {reauthenticated ? "Granting access" : "Confirming it's you"}
            </h1>
            <p className="text-sm text-nb-gray-300">
              {reauthenticated
                ? `Giving the assistant temporary SSH access to ${peerLabel}.`
                : "Signing you in again before anything is granted."}
            </p>
          </>
        )}

        {state === "granted" && (
          <>
            <CheckCircle2Icon className="text-green-500" size={32} />
            <h1 className="text-lg font-medium text-nb-gray-100">
              Successfully Authorized
            </h1>
            {/* Names the machine: this is the one moment the person is shown
                what they just granted access to. */}
            <p className="text-sm text-nb-gray-300">
              The access covers {peerLabel} only, and ends when the assistant
              disconnects.
            </p>
            {/* Only once the window has tried and failed to close itself —
                otherwise this is a button that disappears as it is read. */}
            {closeRefused && (
              <button
                type="button"
                onClick={() => window.close()}
                className="mt-2 rounded-md bg-netbird px-4 py-2 text-sm font-medium text-white"
              >
                Close
              </button>
            )}
          </>
        )}

        {state === "failed" && (
          <>
            <CircleXIcon className="text-red-500" size={32} />
            <h1 className="text-lg font-medium text-nb-gray-100">
              Authorization Failed
            </h1>
            <p className="text-sm text-nb-gray-300">
              {error} You can close this window; the assistant has been told it
              was refused.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
