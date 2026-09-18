/**
 * Step-up authorization for the assistant taking access to a peer.
 *
 * ## What this buys that a token refresh does not
 *
 * `renewTokens()` proves a refresh token exists in storage. It does not prove
 * anyone is at the keyboard. This does: the grant is created by a window the
 * user opened with a click and signed in to, so a session left open on an
 * unattended machine cannot quietly hand the assistant access to a peer.
 *
 * ## Why a click, and not just `window.open` from the executor
 *
 * Browsers only allow `window.open` synchronously inside a user gesture. The
 * assistant's tool dispatch arrives over an event stream and then awaits a peer
 * lookup, so by the time the executor would open a window the gesture context
 * is long gone and the popup is blocked. The click is therefore not a
 * workaround — it is the only way to open the window, and it happens to be
 * exactly the human-presence signal the feature wants.
 *
 * So the executor asks, this module parks the request, the panel renders a
 * button, and the click both opens the window and answers the request.
 */

/** What the prompt shows, and what the popup needs to create the grant. */
export interface AccessRequest {
  peerId: string;
  /** Shown to the user so they authorize a machine, not an opaque id. */
  peerLabel: string;
  /**
   * The command this confirms, verbatim.
   *
   * Every call carries one, because every command is confirmed — the access is
   * granted once per peer, but "may it run THIS" is asked every time. A prompt
   * that showed only the peer would, on the second command, be asking the user
   * to agree to something it had not told them.
   */
  command: string;
  wgPublicKey: string;
  rules: string[];
  assistantPeerName: string;
  /**
   * Whether this peer still needs a sign-in, or is already authorized in this
   * tab and only the command remains to be confirmed.
   */
  needsAuthorization: boolean;
}

interface Pending extends AccessRequest {
  resolve: (granted: boolean) => void;
}

type Listener = (pending: AccessRequest | null) => void;

let pending: Pending | null = null;
const listeners = new Set<Listener>();

const notify = (): void => {
  const snapshot: AccessRequest | null = pending
    ? {
        peerId: pending.peerId,
        peerLabel: pending.peerLabel,
        command: pending.command,
        wgPublicKey: pending.wgPublicKey,
        rules: pending.rules,
        assistantPeerName: pending.assistantPeerName,
        needsAuthorization: pending.needsAuthorization,
      }
    : null;
  listeners.forEach((listener) => listener(snapshot));
};

/** Subscribe to the pending request, for a component that renders the prompt. */
export function subscribeToAccessRequest(listener: Listener): () => void {
  listeners.add(listener);
  listener(pending);
  return () => listeners.delete(listener);
}

export function currentAccessRequest(): AccessRequest | null {
  return pending
    ? {
        peerId: pending.peerId,
        peerLabel: pending.peerLabel,
        command: pending.command,
        wgPublicKey: pending.wgPublicKey,
        rules: pending.rules,
        assistantPeerName: pending.assistantPeerName,
        needsAuthorization: pending.needsAuthorization,
      }
    : null;
}

/**
 * Parks a request for the user, resolving once they answer.
 *
 * Only one can be outstanding: a second request supersedes the first rather
 * than queueing, because two prompts for two peers would be ambiguous about
 * which one the window that opens belongs to. The superseded caller is told it
 * was not granted rather than being left hanging.
 */
export function requestAccessAuthorization(
  request: AccessRequest,
): Promise<boolean> {
  if (pending) pending.resolve(false);
  return new Promise<boolean>((resolve) => {
    pending = { ...request, resolve };
    notify();
  });
}

/**
 * Answers a request that needs no sign-in — the peer is already authorized in
 * this tab and only the command was being confirmed.
 *
 * Separate from `openAuthorizationWindow` so the no-window case does not go
 * near popup handling at all: there is nothing to open, nothing to block, and
 * nothing to wait for.
 */
export function confirmWithoutAuthorization(): void {
  if (!pending) return;
  const request = pending;
  pending = null;
  notify();
  request.resolve(true);
}

/** Abandons the pending request — the user dismissed it, or a turn was cancelled. */
export function cancelAccessAuthorization(): void {
  if (!pending) return;
  pending.resolve(false);
  pending = null;
  notify();
}

/** The message the popup posts back once it has created the grant. */
export const ACCESS_GRANTED_MESSAGE = "netbird-assistant-access";

export interface AccessGrantedMessage {
  type: typeof ACCESS_GRANTED_MESSAGE;
  ok: boolean;
  peerId: string;
  error?: string;
}

export function buildAuthorizeUrl(request: AccessRequest): string {
  const params = new URLSearchParams({
    peer: request.peerId,
    // Carried so the window can name the machine it just authorized rather
    // than echoing an opaque id back at the person who authorized it.
    label: request.peerLabel,
    key: request.wgPublicKey,
    name: request.assistantPeerName,
    rules: request.rules.join(","),
  });
  return `/peer/assistant-access?${params.toString()}`;
}

/**
 * Opens the authorization window and settles the pending request from its reply.
 *
 * MUST be called straight from a click handler — see the header. The listener
 * checks `event.origin` against this window's own, because a message from
 * anywhere else claiming a grant succeeded would let a page the user happens to
 * have open decide that the assistant may reach a peer.
 */
export function openAuthorizationWindow(): Window | null {
  const request = pending;
  if (!request) return null;

  const child = window.open(
    buildAuthorizeUrl(request),
    "netbird-assistant-access",
    "noopener=no,width=520,height=640,left=120,top=120",
  );
  if (!child) {
    // Blocked. Settle rather than leave the tool waiting on a window that will
    // never exist.
    request.resolve(false);
    pending = null;
    notify();
    return null;
  }

  const onMessage = (event: MessageEvent<AccessGrantedMessage>) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.type !== ACCESS_GRANTED_MESSAGE) return;
    if (data.peerId !== request.peerId) return;

    window.removeEventListener("message", onMessage);
    request.resolve(data.ok);
    if (pending === request) {
      pending = null;
      notify();
    }
  };
  window.addEventListener("message", onMessage);

  /*
    A window closed without answering has to settle too, or the tool waits out
    its whole timeout for a decision the user already made by closing it.
  */
  const poll = window.setInterval(() => {
    if (!child.closed) return;
    window.clearInterval(poll);
    window.removeEventListener("message", onMessage);
    if (pending === request) {
      request.resolve(false);
      pending = null;
      notify();
    }
  }, 500);

  return child;
}

/** Test seam. */
export function resetAccessAuthorizationForTests(): void {
  if (pending) pending.resolve(false);
  pending = null;
  listeners.clear();
}
