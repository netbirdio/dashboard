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
 *
 * ## Why the window carries a nonce
 *
 * The page it opens turns URL parameters into SSH access to a peer, and a
 * forced sign-in proves a person is present without proving they meant to
 * grant THIS key access to THIS machine. Without more, a link mailed to an
 * admin is enough: they click, they see a sign-in they recognise, and a key
 * they have never heard of lands on their network.
 *
 * So the opener leaves proof in `sessionStorage` before the window opens, and
 * the page refuses to grant anything without it. A window opened from here
 * inherits a copy of that storage; a link opened anywhere else does not.
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

/**
 * Where the opener leaves proof that it is the one that opened the window.
 *
 * `sessionStorage` for two properties it happens to have exactly: a window
 * opened from another inherits a COPY of it at creation, and it is scoped to
 * the tab. Together those mean the page can tell a window this module opened
 * from one reached by following a link, which is the whole check.
 */
const ACCESS_NONCE_KEY = "netbird-assistant-access-nonce";

/**
 * Mints the proof and stores it, returning null if storage refuses.
 *
 * MUST run before `window.open`: the child inherits the storage it is handed
 * at creation, and nothing written afterwards reaches it.
 */
function mintAccessNonce(): string | null {
  try {
    const nonce = crypto.randomUUID();
    window.sessionStorage.setItem(ACCESS_NONCE_KEY, nonce);
    return nonce;
  } catch {
    // Fails closed: with no nonce to carry, the page grants nothing.
    return null;
  }
}

function clearAccessNonce(): void {
  try {
    window.sessionStorage.removeItem(ACCESS_NONCE_KEY);
  } catch {
    // Storage is unavailable, so there is nothing left behind to clear.
  }
}

/** Whether this window's nonce is the one its tab was opened with. */
export function hasAccessNonce(nonce: string | null): boolean {
  if (!nonce) return false;
  try {
    const stored = window.sessionStorage.getItem(ACCESS_NONCE_KEY);
    return Boolean(stored) && stored === nonce;
  } catch {
    return false;
  }
}

/**
 * Checks the nonce and spends it, so one window grants at most once.
 *
 * The opener keeps its own copy — storage is copied into the child, not shared
 * — so this does not revoke anything mid-flow. What it stops is the page
 * granting a second time on a reload or a Back within the window it opened.
 */
export function consumeAccessNonce(nonce: string | null): boolean {
  if (!hasAccessNonce(nonce)) return false;
  clearAccessNonce();
  return true;
}

/**
 * The access rules this flow may grant, as an exact set.
 *
 * The page reads its rules from the URL, so without a check a crafted link
 * could ask for whatever the management API happens to accept, and `tcp/3389`
 * is RDP rather than SSH.
 *
 * The cross product of what `accessRule` chooses between, rather than the three
 * combinations its version thresholds can currently reach: it picks protocol
 * and port from two independent checks, so pinning the set to today's overlap
 * between them would turn a threshold change into a refusal to grant anything.
 */
const ALLOWED_ACCESS_RULES = new Set([
  "netbird-ssh/22022",
  "netbird-ssh/44338",
  "tcp/22022",
  "tcp/44338",
]);

export const isAllowedAccessRule = (rule: string): boolean =>
  ALLOWED_ACCESS_RULES.has(rule);

export function buildAuthorizeUrl(
  request: AccessRequest,
  nonce: string | null,
): string {
  const params = new URLSearchParams({
    peer: request.peerId,
    // Carried so the window can name the machine it just authorized rather
    // than echoing an opaque id back at the person who authorized it.
    label: request.peerLabel,
    key: request.wgPublicKey,
    name: request.assistantPeerName,
    rules: request.rules.join(","),
  });
  // Omitted rather than sent empty when storage refused it, so the page sees
  // the same missing-proof case either way.
  if (nonce) params.set("nonce", nonce);
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

  // Before the window, not after: the child gets a copy of this tab's storage
  // as it is created, so a nonce written later would never reach it.
  const nonce = mintAccessNonce();

  const child = window.open(
    buildAuthorizeUrl(request, nonce),
    "netbird-assistant-access",
    "noopener=no,width=520,height=640,left=120,top=120",
  );
  if (!child) {
    // Blocked. Settle rather than leave the tool waiting on a window that will
    // never exist.
    clearAccessNonce();
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
    clearAccessNonce();
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
    clearAccessNonce();
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
  clearAccessNonce();
}
