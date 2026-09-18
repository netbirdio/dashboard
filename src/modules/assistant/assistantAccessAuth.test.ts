import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACCESS_GRANTED_MESSAGE,
  confirmWithoutAuthorization,
  buildAuthorizeUrl,
  cancelAccessAuthorization,
  consumeAccessNonce,
  currentAccessRequest,
  hasAccessNonce,
  isAllowedAccessRule,
  openAuthorizationWindow,
  requestAccessAuthorization,
  resetAccessAuthorizationForTests,
  subscribeToAccessRequest,
} from "@/modules/assistant/assistantAccessAuth";

/*
  Step-up authorization for the assistant reaching a peer.

  The cases worth the most here are the ones that decide whether this is a real
  control or theatre: a reply from another origin must not be able to grant
  access, a window nobody opened from the panel must arrive without the nonce
  the page demands, and a request must always settle — a window the user
  closes without answering has to resolve as "no", or the tool waits out its
  whole timeout for a decision the person already made by closing it.
*/

const REQUEST = {
  peerId: "peer-1",
  peerLabel: "MacBook-Pro-von-Eduard",
  command: "/usr/local/bin/netbird status",
  wgPublicKey: "pub-1",
  rules: ["netbird-ssh/22022"],
  assistantPeerName: "assistant-chrome-ab12cd",
  needsAuthorization: true,
};

/**
 * A tab's `sessionStorage`, which the nonce lives in.
 *
 * Its own object per stub rather than a shared one, because the thing being
 * modelled is per-tab storage: a window opened from somewhere else starts with
 * none of this, and that is the case the nonce check exists for.
 */
function stubStorage(seed: Record<string, string> = {}) {
  const entries = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
    removeItem: (key: string) => void entries.delete(key),
  };
}

function stubWindow(
  child: Partial<Window> | null,
  sessionStorage = stubStorage(),
) {
  const listeners: Array<(e: MessageEvent) => void> = [];
  const open = vi.fn(() => child as Window | null);
  vi.stubGlobal("window", {
    open,
    sessionStorage,
    location: { origin: "https://dash.test" },
    addEventListener: (type: string, fn: (e: MessageEvent) => void) => {
      if (type === "message") listeners.push(fn);
    },
    removeEventListener: (type: string, fn: (e: MessageEvent) => void) => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    },
    setInterval: () => 1,
    clearInterval: () => {},
  });
  return {
    open,
    sessionStorage,
    deliver: (data: unknown, origin = "https://dash.test") =>
      listeners.slice().forEach((fn) => fn({ data, origin } as MessageEvent)),
  };
}

/** The nonce the opener minted, read back off the URL it opened. */
const nonceFromOpen = (open: ReturnType<typeof vi.fn>): string | null =>
  new URLSearchParams(String(open.mock.calls[0]?.[0]).split("?")[1]).get(
    "nonce",
  );

afterEach(() => {
  resetAccessAuthorizationForTests();
  vi.unstubAllGlobals();
});

describe("assistant access authorization", () => {
  it("parks a request until the popup answers", async () => {
    const { deliver } = stubWindow({ closed: false });
    const pending = requestAccessAuthorization(REQUEST);

    expect(currentAccessRequest()?.peerId).toBe("peer-1");
    openAuthorizationWindow();
    deliver({ type: ACCESS_GRANTED_MESSAGE, ok: true, peerId: "peer-1" });

    expect(await pending).toBe(true);
    // Cleared, so the prompt does not linger after it has been answered.
    expect(currentAccessRequest()).toBeNull();
  });

  it("ignores a grant claimed by another origin", async () => {
    /*
      Without this, any page the user happens to have open could post a message
      saying access was granted and the assistant would believe it — turning a
      human-presence check into an invitation.
    */
    const { deliver } = stubWindow({ closed: false });
    const pending = requestAccessAuthorization(REQUEST);
    openAuthorizationWindow();

    deliver(
      { type: ACCESS_GRANTED_MESSAGE, ok: true, peerId: "peer-1" },
      "https://evil.test",
    );
    // Still outstanding — the foreign message decided nothing.
    expect(currentAccessRequest()?.peerId).toBe("peer-1");

    deliver({ type: ACCESS_GRANTED_MESSAGE, ok: true, peerId: "peer-1" });
    expect(await pending).toBe(true);
  });

  it("ignores a reply about a different peer", async () => {
    const { deliver } = stubWindow({ closed: false });
    const pending = requestAccessAuthorization(REQUEST);
    openAuthorizationWindow();

    deliver({ type: ACCESS_GRANTED_MESSAGE, ok: true, peerId: "someone-else" });
    expect(currentAccessRequest()?.peerId).toBe("peer-1");

    deliver({ type: ACCESS_GRANTED_MESSAGE, ok: false, peerId: "peer-1" });
    expect(await pending).toBe(false);
  });

  it("settles as refused when the popup is blocked", async () => {
    // Otherwise the tool waits on a window that will never exist.
    stubWindow(null);
    const pending = requestAccessAuthorization(REQUEST);

    expect(openAuthorizationWindow()).toBeNull();
    expect(await pending).toBe(false);
    expect(currentAccessRequest()).toBeNull();
  });

  it("settles as refused when the user dismisses the prompt", async () => {
    stubWindow({ closed: false });
    const pending = requestAccessAuthorization(REQUEST);

    cancelAccessAuthorization();

    expect(await pending).toBe(false);
    expect(currentAccessRequest()).toBeNull();
  });

  it("supersedes an earlier request rather than queueing behind it", async () => {
    stubWindow({ closed: false });
    const first = requestAccessAuthorization(REQUEST);
    const second = requestAccessAuthorization({ ...REQUEST, peerId: "peer-2" });

    // The first is answered rather than left hanging; one window cannot serve
    // two peers unambiguously.
    expect(await first).toBe(false);
    expect(currentAccessRequest()?.peerId).toBe("peer-2");
    cancelAccessAuthorization();
    expect(await second).toBe(false);
  });

  it("tells subscribers when a request appears and clears", async () => {
    stubWindow({ closed: false });
    const seen: Array<string | null> = [];
    const stop = subscribeToAccessRequest((r) => seen.push(r?.peerId ?? null));

    const pending = requestAccessAuthorization(REQUEST);
    cancelAccessAuthorization();
    await pending;
    stop();

    expect(seen).toEqual([null, "peer-1", null]);
  });

  it("confirms without a window when the peer is already authorized", async () => {
    /*
      The second command on a peer. The command still has to be confirmed — it
      is a different command — but re-opening a sign-in window for access
      already granted is asking again for a decision already made.
    */
    stubWindow({ closed: false });
    const pending = requestAccessAuthorization({
      ...REQUEST,
      needsAuthorization: false,
    });

    confirmWithoutAuthorization();

    expect(await pending).toBe(true);
    expect(currentAccessRequest()).toBeNull();
  });

  it("carries only the public key in the popup URL", () => {
    const url = buildAuthorizeUrl(REQUEST, "nonce-1");

    expect(url).toContain("peer=peer-1");
    expect(url).toContain("key=pub-1");
    expect(url).toContain("rules=netbird-ssh%2F22022");
    // The label travels so the window can name the machine it authorized
    // rather than echoing an opaque id back at the person who authorized it.
    expect(url).toContain("label=MacBook-Pro-von-Eduard");
    // The private half belongs to the assistant tab and is never part of this.
    expect(url).not.toMatch(/priv/i);
  });

  it("omits the nonce rather than sending an empty one", () => {
    // Storage refused it. The page sees the same missing-proof case either
    // way, so this must not arrive as `nonce=` and read as present-but-blank.
    expect(buildAuthorizeUrl(REQUEST, null)).not.toContain("nonce");
  });
});

describe("proof that the panel opened the window", () => {
  /*
    The page turns URL parameters into SSH access to a peer, so on its own the
    forced sign-in only proves a person is present — not that they meant to
    grant this key access to this machine. A link mailed to an admin would look
    from there exactly like a request the assistant made.

    What separates the two is this: the opener leaves a nonce in the tab's
    sessionStorage, which a window it opens inherits a copy of and a window
    reached by following a link does not.
  */
  it("stores the nonce it puts in the popup URL", () => {
    const { open } = stubWindow({ closed: false });
    const pending = requestAccessAuthorization(REQUEST);
    openAuthorizationWindow();

    const nonce = nonceFromOpen(open);
    expect(nonce).toBeTruthy();
    expect(hasAccessNonce(nonce)).toBe(true);
    void pending;
  });

  it("has nothing to offer a window the panel never opened", () => {
    // A tab reached by following a link: same origin, same page, storage that
    // never held a nonce. This is the phishing case, and it has to fail shut.
    const { open } = stubWindow({ closed: false });
    const pending = requestAccessAuthorization(REQUEST);
    openAuthorizationWindow();
    const nonce = nonceFromOpen(open);

    stubWindow({ closed: false });
    expect(hasAccessNonce(nonce)).toBe(false);
    void pending;
  });

  it("refuses a nonce that is merely present", () => {
    stubWindow({ closed: false }, stubStorage({ other: "value" }));
    expect(hasAccessNonce("guessed")).toBe(false);
    expect(hasAccessNonce(null)).toBe(false);
  });

  it("spends the nonce, so one window grants at most once", () => {
    const { open } = stubWindow({ closed: false });
    const pending = requestAccessAuthorization(REQUEST);
    openAuthorizationWindow();
    const nonce = nonceFromOpen(open);

    expect(consumeAccessNonce(nonce)).toBe(true);
    // A reload or a Back inside that window finds it gone.
    expect(consumeAccessNonce(nonce)).toBe(false);
    void pending;
  });

  it("drops the nonce once the request settles", async () => {
    const { open, deliver } = stubWindow({ closed: false });
    const pending = requestAccessAuthorization(REQUEST);
    openAuthorizationWindow();
    const nonce = nonceFromOpen(open);

    deliver({ type: ACCESS_GRANTED_MESSAGE, ok: true, peerId: "peer-1" });
    await pending;

    // Left behind, it would still be good the next time this page was reached
    // by any means at all.
    expect(hasAccessNonce(nonce)).toBe(false);
  });

  it("leaves no nonce behind when the popup is blocked", async () => {
    const { sessionStorage } = stubWindow(null);
    const pending = requestAccessAuthorization(REQUEST);

    openAuthorizationWindow();
    await pending;

    expect(sessionStorage.getItem("netbird-assistant-access-nonce")).toBeNull();
  });
});

describe("the rules the flow may grant", () => {
  /*
    These travel in the URL too, so the page checks them rather than passing
    them to the API as given. Without this the nonce would bound WHO can start
    the flow while leaving WHAT it grants open to whatever the URL asked for.
  */
  it("accepts every rule the executor produces", () => {
    for (const rule of [
      "netbird-ssh/22022",
      "netbird-ssh/44338",
      "tcp/22022",
      "tcp/44338",
    ]) {
      expect(isAllowedAccessRule(rule)).toBe(true);
    }
  });

  it("refuses access that is not SSH", () => {
    // RDP, the whole TCP range, and a port that merely looks familiar.
    expect(isAllowedAccessRule("tcp/3389")).toBe(false);
    expect(isAllowedAccessRule("tcp/1-65535")).toBe(false);
    expect(isAllowedAccessRule("tcp/22")).toBe(false);
    expect(isAllowedAccessRule("udp/22022")).toBe(false);
    expect(isAllowedAccessRule("")).toBe(false);
  });
});
