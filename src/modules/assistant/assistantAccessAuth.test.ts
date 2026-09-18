import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACCESS_GRANTED_MESSAGE,
  confirmWithoutAuthorization,
  buildAuthorizeUrl,
  cancelAccessAuthorization,
  currentAccessRequest,
  openAuthorizationWindow,
  requestAccessAuthorization,
  resetAccessAuthorizationForTests,
  subscribeToAccessRequest,
} from "@/modules/assistant/assistantAccessAuth";

/*
  Step-up authorization for the assistant reaching a peer.

  The two cases worth the most here are the ones that decide whether this is a
  real control or theatre: a reply from another origin must not be able to grant
  access, and a request must always settle — a window the user closes without
  answering has to resolve as "no", or the tool waits out its whole timeout for
  a decision the person already made by closing it.
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

function stubWindow(child: Partial<Window> | null) {
  const listeners: Array<(e: MessageEvent) => void> = [];
  const open = vi.fn(() => child as Window | null);
  vi.stubGlobal("window", {
    open,
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
    deliver: (data: unknown, origin = "https://dash.test") =>
      listeners.slice().forEach((fn) => fn({ data, origin } as MessageEvent)),
  };
}

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
    const url = buildAuthorizeUrl(REQUEST);

    expect(url).toContain("peer=peer-1");
    expect(url).toContain("key=pub-1");
    expect(url).toContain("rules=netbird-ssh%2F22022");
    // The label travels so the window can name the machine it authorized
    // rather than echoing an opaque id back at the person who authorized it.
    expect(url).toContain("label=MacBook-Pro-von-Eduard");
    // The private half belongs to the assistant tab and is never part of this.
    expect(url).not.toMatch(/priv/i);
  });
});
