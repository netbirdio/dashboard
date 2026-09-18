import type { ClientToolContext } from "@netbird/assistant-react";
import { describe, expect, it, vi } from "vitest";
import { beforeEach } from "vitest";
import { isAllowedAccessRule } from "@/modules/assistant/assistantAccessAuth";
import {
  createSSHRunCommandExecutor,
  resetAssistantTunnel,
  type SSHRunCommandDeps,
} from "@/modules/assistant/sshRunCommandExecutor";

/*
  One approved call does three things — join the network, take temporary access
  to ONE peer, run the command — and the cases here are about the seams between
  them.

  The access is per-peer and dies with the tunnel, replacing a standing
  `Assistants` group grant that was permanent and covered every assistant peer
  in every session. So what matters is that each target gets its own grant (a
  command approved for one machine never becomes access to another), that the
  keypair is reused rather than re-minted (a second target must add a policy to
  the existing peer, not create a second one), and that a peer already granted
  in this tab costs no extra call.
*/

const ctx: ClientToolContext = {
  navigate: () => {},
  onControlCenterPage: () => false,
  setStatus: () => {},
  sessionId: "wrun_1",
};

const PEER = {
  id: "ch8i4ug6lnn4g9hqv7m0",
  ip: "100.84.232.69",
  version: "0.62.0",
  os: "linux",
  name: "MacBook-Pro-von-Eduard",
  hostname: "MacBook-Pro-von-Eduard.local",
  dns_label: "macbook-pro-von-eduard",
  connected: true,
  ssh_enabled: true,
};

function build(overrides: Partial<SSHRunCommandDeps> = {}) {
  const execCalls: string[] = [];
  const closed = { count: 0 };
  const session = {
    exec: vi.fn(async (command: string) => {
      execCalls.push(command);
      return { stdout: "hello\n", stderr: "", exitCode: 0 };
    }),
    close: () => {
      closed.count += 1;
    },
  };
  const createSSHConnection = vi.fn(async () => session);
  const authorizeAccess = vi.fn(
    async (_input: {
      peerId: string;
      peerLabel: string;
      command: string;
      wgPublicKey: string;
      rules: string[];
      assistantPeerName: string;
      needsAuthorization: boolean;
    }) => true,
  );
  const connect = vi.fn(async () => true);
  const detectSSHServerType = vi.fn(async () => true);
  let keypairs = 0;
  const deps: SSHRunCommandDeps = {
    listPeers: async () => [PEER],
    generateKeypair: () => {
      keypairs += 1;
      return { publicKey: `pub-${keypairs}`, privateKey: `priv-${keypairs}` };
    },
    authorizeAccess: authorizeAccess as never,
    connect,
    createSSHConnection: createSSHConnection as never,
    detectSSHServerType,
    getAccessToken: async () => "jwt-token",
    // The settle wait after a fresh grant is real behaviour, but sitting
    // through it once per case turned this file into 47 seconds of sleeping.
    settleMs: 0,
    ...overrides,
  };
  return {
    executor: createSSHRunCommandExecutor(deps),
    createSSHConnection,
    detectSSHServerType,
    authorizeAccess,
    connect,
    session,
    execCalls,
    closed,
    keypairCount: () => keypairs,
  };
}

beforeEach(() => {
  // Module-scope state outlives a test, exactly as it outlives a re-render.
  resetAssistantTunnel();
});

const run = (extra: Record<string, unknown> = {}) => ({
  // The bare dns label, which is how a person usually refers to a machine.
  peer: "macbook-pro-von-eduard",
  command: "uptime",
  ...extra,
});

describe("ssh_run_command executor", () => {
  it("runs the approved command verbatim over exec", async () => {
    const { executor, execCalls, session } = build();
    const command = `bash -lc 'echo "a  b" && exit 0'`;

    const outcome = await executor(run({ command }), ctx);

    expect(outcome.ok).toBe(true);
    // Byte for byte. Anything that normalised or re-quoted it would run
    // something other than what the user approved.
    expect(execCalls).toEqual([command]);
    expect(session.exec).toHaveBeenCalledTimes(1);
  });

  it("says it is waiting on the user while the prompt is up, not that it is running", async () => {
    /*
      The trail row reads "Running a command" from the moment the call is
      dispatched, so through the whole confirmation it told the user that the
      thing they were being asked to approve had already happened. The executor
      is the only place that knows the difference, and this is the order it has
      to report: waiting first, running only once something is.
    */
    const reported: (string | null)[] = [];
    const statusCtx: ClientToolContext = {
      ...ctx,
      setStatus: (text) => reported.push(text),
    };
    const { executor } = build({
      authorizeAccess: (async () => {
        // Whatever has been reported by the time the prompt is on screen is
        // what the user reads while deciding.
        expect(reported.at(-1)).toBe("Waiting for you to authorize and confirm");
        return true;
      }) as never,
    });

    expect((await executor(run(), statusCtx)).ok).toBe(true);
    expect(reported.at(-1)).toContain("Running the command");
  });

  it("asks only for a confirmation once the peer is authorized in this tab", async () => {
    const reported: string[] = [];
    const statusCtx: ClientToolContext = {
      ...ctx,
      setStatus: (text) => {
        if (text) reported.push(text);
      },
    };
    const { executor } = build();

    await executor(run(), statusCtx);
    await executor(run(), statusCtx);

    // The sign-in is per peer per tab; the second command only needs a click.
    expect(reported[0]).toBe("Waiting for you to authorize and confirm");
    expect(reported.find((line, i) => i > 0 && line.startsWith("Waiting"))).toBe(
      "Waiting for you to confirm",
    );
  });

  it("takes access scoped to the one peer, then connects, then runs", async () => {
    const { executor, authorizeAccess, connect, createSSHConnection } = build();

    const outcome = await executor(run(), ctx);

    expect(outcome.ok).toBe(true);
    // Scoped to this peer's id, with an SSH rule and nothing wider.
    expect(authorizeAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        peerId: PEER.id,
        wgPublicKey: "pub-1",
        rules: ["netbird-ssh/22022"],
        assistantPeerName: expect.stringMatching(/^assistant-[a-z]+-[a-z0-9]{6}$/),
      }),
    );
    expect(connect).toHaveBeenCalledWith("priv-1");
    expect(createSSHConnection).toHaveBeenCalledTimes(1);
  });

  it("reuses the tunnel and keypair for a second peer, adding only a grant", async () => {
    /*
      The bug `connectTemporary` would have shipped: it returns early once
      connected, so a second target gets no grant at all and its connection
      then fails. Registering the SAME public key again adds a policy to the
      existing peer instead of creating a second one.
    */
    const second = { ...PEER, id: "peer-2", ip: "100.84.232.71", name: "nas", hostname: "nas.local", dns_label: "nas" };
    const { executor, authorizeAccess, connect, keypairCount } = build({
      listPeers: async () => [PEER, second],
    });

    await executor(run(), ctx);
    await executor(run({ peer: "nas" }), ctx);

    expect(authorizeAccess).toHaveBeenCalledTimes(2);
    expect(authorizeAccess.mock.calls[1]?.[0]?.peerId).toBe("peer-2");
    // Same key both times, and the tunnel is opened once.
    expect(authorizeAccess.mock.calls[1]?.[0]?.wgPublicKey).toBe("pub-1");
    expect(keypairCount()).toBe(1);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("names the peer uniquely, and keeps that name across targets", async () => {
    /*
      A fixed name puts every browser, tab and conversation on one
      indistinguishable row of the account's Peers page — an admin then cannot
      tell which is live, which to revoke, or which produced a given policy.

      It is stable across targets on purpose: the peer is identified by its
      WireGuard key, so a later grant reusing that key lands on the peer that
      already exists and a changed name would be ignored anyway.
    */
    const second = { ...PEER, id: "peer-2", ip: "100.84.232.71", name: "nas", hostname: "nas.local", dns_label: "nas" };
    const { executor, authorizeAccess } = build({
      listPeers: async () => [PEER, second],
    });

    await executor(run(), ctx);
    await executor(run({ peer: "nas" }), ctx);

    const first = authorizeAccess.mock.calls[0]?.[0]?.assistantPeerName;
    const later = authorizeAccess.mock.calls[1]?.[0]?.assistantPeerName;
    expect(first).toMatch(/^assistant-/);
    expect(later).toBe(first);
    // A DNS label is what NetBird derives from this.
    expect(first).toMatch(/^[a-z0-9-]{1,63}$/);
  });

  it("gives a different tunnel a different name", async () => {
    const a = build();
    await a.executor(run(), ctx);
    const firstName = a.authorizeAccess.mock.calls[0]?.[0]?.assistantPeerName;

    resetAssistantTunnel();
    const b = build();
    await b.executor(run(), ctx);
    const secondName = b.authorizeAccess.mock.calls[0]?.[0]?.assistantPeerName;

    expect(secondName).not.toBe(firstName);
  });

  it("does not reconnect or re-grant for a second command on the same peer", async () => {
    // The prompt appears again — a different command needs confirming — but
    // nothing behind it is redone.
    const { executor, connect } = build();

    await executor(run(), ctx);
    await executor(run({ command: "uname -a" }), ctx);

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("uses a plain tcp rule for a peer too old for netbird-ssh", async () => {
    const { executor, authorizeAccess } = build({
      listPeers: async () => [{ ...PEER, version: "0.50.0" }],
    });
    await executor(run(), ctx);
    expect(authorizeAccess).toHaveBeenCalledWith(
      expect.objectContaining({ rules: ["tcp/44338"] }),
    );
  });

  it("only ever asks for a rule the authorizing page will grant", async () => {
    /*
      The two halves of one control, and they are in different files: this
      computes the rule, and the page checks the rule it is handed against a
      fixed set — because that rule arrives there through a URL. Drift either
      way is silent and total. A new port here and every grant is refused; a
      rule the page would accept and never sees is dead allowance.
    */
    for (const version of ["development", "0.62.0", "0.60.5", "0.50.0"]) {
      resetAssistantTunnel();
      const { executor, authorizeAccess } = build({
        listPeers: async () => [{ ...PEER, version }],
      });
      await executor(run(), ctx);

      const { rules } = authorizeAccess.mock.calls[0]![0];
      expect(rules).toHaveLength(1);
      expect(isAllowedAccessRule(rules[0]!)).toBe(true);
    }
  });

  it("does not run the command when the user declines to authorize", async () => {
    /*
      Declining is a decision, not an error. The assistant holds the user's
      credentials and could have granted this itself; the point of asking is
      that a session left open on an unattended machine cannot answer.
    */
    const { executor, createSSHConnection, connect } = build({
      authorizeAccess: (async () => false) as never,
    });
    const outcome = await executor(run(), ctx);

    expect(outcome.ok).toBe(false);
    expect(outcome.content).toMatch(/did not confirm running that command/i);
    expect(connect).not.toHaveBeenCalled();
    expect(createSSHConnection).not.toHaveBeenCalled();
  });

  it("confirms every command, but only asks to sign in once per peer", async () => {
    /*
      The two questions have different frequencies and the prompt carries both.
      "May it run THIS" is asked every time — a second command is a different
      command. "May it reach this machine" is asked once; re-opening a sign-in
      window for access already granted is asking again for a decision already
      made, which is how people learn to click through prompts.
    */
    const { executor, authorizeAccess } = build();

    await executor(run(), ctx);
    await executor(run({ command: "uname -a" }), ctx);

    expect(authorizeAccess).toHaveBeenCalledTimes(2);
    expect(authorizeAccess.mock.calls[0]?.[0]?.needsAuthorization).toBe(true);
    expect(authorizeAccess.mock.calls[0]?.[0]?.command).toBe("uptime");
    // Second time: the command is confirmed, the sign-in is not repeated.
    expect(authorizeAccess.mock.calls[1]?.[0]?.needsAuthorization).toBe(false);
    expect(authorizeAccess.mock.calls[1]?.[0]?.command).toBe("uname -a");
  });

  it("retries through the user's login shell when the command is not on PATH", async () => {
    /*
      The whole point: `netbird status` works in the PTY and not here, because
      the server runs an exec command as `shell -c` — a login shell but not an
      interactive one, so .zprofile is read and .zshrc is not, and PATH
      additions almost always live in .zshrc.

      The plain command is tried first and the wrapper only appears when the
      shell says it could not find the program. The user approved the plain
      string and that is what runs; the wrapper only changes which shell runs it.
    */
    const attempts: string[] = [];
    const { executor } = build({
      createSSHConnection: (async () => ({
        exec: async (cmd: string) => {
          attempts.push(cmd);
          return attempts.length === 1
            ? { stdout: "", stderr: "-sh: netbird: command not found", exitCode: 127 }
            : {
                stdout: "Daemon status: Connected",
                stderr: "bash: no job control in this shell",
                exitCode: 0,
              };
        },
        close: () => {},
      })) as never,
    });

    const outcome = await executor(run({ command: "netbird status" }), ctx);

    expect(attempts[0]).toBe("netbird status");
    expect(attempts[1]).toContain("-lic");
    expect(attempts[1]).toContain("'netbird status'");
    expect(outcome.ok).toBe(true);
    expect(outcome.content).toContain("Daemon status: Connected");
    // The shell's remark about itself is not the command's output.
    expect(outcome.content).not.toMatch(/no job control/);
  });

  it("quotes a command containing single quotes safely", async () => {
    const attempts: string[] = [];
    const { executor } = build({
      createSSHConnection: (async () => ({
        exec: async (cmd: string) => {
          attempts.push(cmd);
          return attempts.length === 1
            ? { stdout: "", stderr: "not found", exitCode: 127 }
            : { stdout: "hi there", stderr: "", exitCode: 0 };
        },
        close: () => {},
      })) as never,
    });

    await executor(run({ command: "echo 'hi there'" }), ctx);

    /*
      POSIX single-quote escaping: close the quote, an escaped quote, reopen.
      Anything less lets a quote inside the command terminate the wrapper's own
      quoting and change what runs.
    */
    expect(attempts[1]).toContain(String.raw`'echo '\''hi there'\'''`);
  });

  it("does not attempt the POSIX shell retry on a Windows peer", async () => {
    /*
      Windows runs commands through PowerShell (`shell -Command "<cmd>"`), so
      `${SHELL:-/bin/sh} -lic '…'` is not a fallback there — it is a second,
      stranger error. Nor is it needed: PowerShell takes PATH from the
      environment rather than from a shell rc file, so the gap that hides a
      binary from an exec session does not open.
    */
    const attempts: string[] = [];
    const { executor } = build({
      listPeers: async () => [{ ...PEER, os: "Microsoft Windows 11 Pro" }],
      createSSHConnection: (async () => ({
        exec: async (cmd: string) => {
          attempts.push(cmd);
          return { stdout: "", stderr: "not recognized", exitCode: 127 };
        },
        close: () => {},
      })) as never,
    });

    const outcome = await executor(run(), ctx);

    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toBe("uptime");
    expect(outcome.content).toContain("exit code: 127");
  });

  it("strips what each login shell says about itself", async () => {
    /*
      Verified against dash, sh, bash and zsh: all four run the command and
      preserve its exit code, and all but zsh add a line about job control or
      print `logout` on the way out. Those describe the wrapper, not the
      command, and reading them as the command's stderr is misleading.
    */
    const { executor } = build({
      createSSHConnection: (async () => {
        let n = 0;
        return {
          exec: async () => {
            n += 1;
            return n === 1
              ? { stdout: "", stderr: "sh: netbird: command not found", exitCode: 127 }
              : {
                  stdout: "Daemon status: Connected",
                  stderr:
                    "/bin/dash: 0: can't access tty; job control turned off\nreal warning\nlogout",
                  exitCode: 0,
                };
          },
          close: () => {},
        };
      }) as never,
    });

    const outcome = await executor(run(), ctx);

    expect(outcome.content).not.toMatch(/job control/);
    expect(outcome.content).not.toMatch(/^logout$/m);
    // Anything the command genuinely wrote survives.
    expect(outcome.content).toContain("real warning");
  });

  it("says it is not on PATH when even the login shell cannot find it", async () => {
    const { executor } = build({
      createSSHConnection: (async () => ({
        exec: async () => ({
          stdout: "",
          stderr: "-sh: nosuchthing: command not found",
          exitCode: 127,
        }),
        close: () => {},
      })) as never,
    });

    const outcome = await executor(run(), ctx);

    expect(outcome.ok).toBe(true);
    expect(outcome.content).toContain("exit code: 127");
    // Not installed and not on PATH are different claims, and only one is true.
    expect(outcome.content).toMatch(/not that it is missing/i);
    expect(outcome.content).toMatch(/interactive login shell/i);
  });

  it("rebuilds a dead client and retries once", async () => {
    /*
      The failure that actually happened, reported verbatim as "Go client not
      ready".

      `useNetBirdClient` keeps its live client in a useRef — per hook instance —
      while the status it reports comes from a module-level store shared by all
      of them. Gating on that status meant a remount, or any other component
      connecting, left this instance with a null ref while the store said
      CONNECTED. The join was skipped and the SSH call threw.
    */
    let attempts = 0;
    const { executor, connect } = build({
      createSSHConnection: (async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("Go client not ready");
        return { exec: async () => ({ stdout: "ok", stderr: "", exitCode: 0 }), close: () => {} };
      }) as never,
    });

    const outcome = await executor(run(), ctx);

    expect(outcome.ok).toBe(true);
    expect(attempts).toBe(2);
    // Connected once for the join, once more to rebuild the dead client.
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it("does not retry a failure that is not a dead client", async () => {
    // A refused handshake retried is just two refused handshakes and twice the
    // wait; only an unready client is worth rebuilding for.
    let attempts = 0;
    const { executor } = build({
      createSSHConnection: (async () => {
        attempts += 1;
        throw new Error("ssh: handshake failed");
      }) as never,
    });

    const outcome = await executor(run(), ctx);

    expect(outcome.ok).toBe(false);
    expect(attempts).toBe(1);
    // And the real error reaches the user rather than a guess about it.
    expect(outcome.content).toContain("handshake failed");
  });

  it("blames the username when the peer refuses the login", async () => {
    /*
      What actually happened, and it reads as the opposite of what it is: the
      tunnel worked, the policy worked, and the peer turned down the LOGIN.

      NetBird SSH maps a NetBird identity to one specific OS username and fails
      closed on anything else, so a refused handshake is a username problem far
      more often than a permissions one — and "root", the default here, is never
      valid on macOS, where the account is disabled.
    */
    const { executor } = build({
      createSSHConnection: (async () => {
        throw new Error(
          "ssh handshake: ssh: handshake failed: ssh: unable to authenticate, attempted methods [none password], no supported methods remain",
        );
      }) as never,
    });

    const outcome = await executor(run(), ctx);

    expect(outcome.ok).toBe(false);
    /*
      Every field of the attempt, because the dashboard's own SSH window
      succeeds against this peer with the same username and port — so the
      useful question is what DIFFERS between the two paths, and only the
      concrete values answer it.
    */
    expect(outcome.content).toContain('user "root"');
    expect(outcome.content).toContain("port 22");
    expect(outcome.content).toContain('"netbird-ssh/22022"');
    expect(outcome.content).toContain("peer version 0.62.0");
    expect(outcome.content).toContain("auth JWT (server reported it wants one)");
    expect(outcome.content).toMatch(/unable to authenticate/);
    // The token is never in there, only whether one was sent.
    expect(outcome.content).not.toContain("jwt-token");
  });

  it("keeps the generic wording for a failure that is not an auth refusal", async () => {
    const { executor } = build({
      createSSHConnection: (async () => {
        throw new Error("dial tcp: i/o timeout");
      }) as never,
    });

    const outcome = await executor(run(), ctx);

    expect(outcome.ok).toBe(false);
    expect(outcome.content).toMatch(/i\/o timeout/);
    expect(outcome.content).not.toMatch(/which login name/i);
  });

  it("refuses an offline peer before taking any access", async () => {
    const { executor, authorizeAccess, createSSHConnection } = build({
      listPeers: async () => [{ ...PEER, connected: false }],
    });
    const outcome = await executor(run(), ctx);

    expect(outcome.ok).toBe(false);
    expect(outcome.content).toMatch(/is offline/i);
    // No grant taken for a peer nothing could have reached.
    expect(authorizeAccess).not.toHaveBeenCalled();
    expect(createSSHConnection).not.toHaveBeenCalled();
  });

  it("names SSH being disabled instead of guessing after a failed connection", async () => {
    /*
      The failure actually hit. NetBird peers have SSH off by default, and the
      old order granted access first and then reported "may be offline, or may
      not have SSH enabled" — a guess, when the peer record says exactly which.
    */
    const { executor, authorizeAccess } = build({
      listPeers: async () => [{ ...PEER, ssh_enabled: false }],
    });
    const outcome = await executor(run(), ctx);

    expect(outcome.ok).toBe(false);
    expect(outcome.content).toMatch(/SSH is not enabled/i);
    expect(outcome.content).toMatch(/turn on SSH for that peer/i);
    expect(authorizeAccess).not.toHaveBeenCalled();
  });

  it("accepts a peer whose SSH is allowed by its local flags", async () => {
    const { executor } = build({
      listPeers: async () => [
        { ...PEER, ssh_enabled: false, local_flags: { server_ssh_allowed: true } },
      ],
    });
    expect((await executor(run(), ctx)).ok).toBe(true);
  });

  it("resolves the token at call time, not at construction", async () => {
    /*
      NetBird's SSH server rejects a JWT by AGE — `time.Since(iat) > 10m` — not
      by expiry, so an Auth0 token valid for hours is still refused once it is
      an hour old, reported as `token expired ... age=1h23m, max=10m0s`. The
      dashboard's SSH window never trips over it because window.open reloads
      the page and mints a fresh one; a long-lived panel has to ask for one,
      which it cannot do if the token was captured at construction.
    */
    let current = "stale-token";
    const { executor, createSSHConnection } = build({
      getAccessToken: async () => current,
    });

    current = "fresh-token";
    await executor(run(), ctx);

    expect(createSSHConnection).toHaveBeenCalledWith(
      PEER.ip,
      22,
      "root",
      "fresh-token",
    );
  });

  it("falls back to the public key when detection cannot answer", async () => {
    /*
      The server installs a password handler only when JWT auth is enabled, so
      offering a JWT to a peer without it is refused outright — reported as
      `attempted methods [none password]`, which reads like a bad credential
      rather than a method the server never accepted. Defaulting to the JWT
      therefore turned "detection did not answer" into a guaranteed failure.
      `useSSH` falls back to the key, and so does this.
    */
    const thrown = build({
      detectSSHServerType: (async () => {
        throw new Error("detection timed out");
      }) as never,
    });
    await thrown.executor(run(), ctx);
    expect(thrown.createSSHConnection).toHaveBeenCalledWith(
      PEER.ip,
      22,
      "root",
      undefined,
    );

    const absent = build({ detectSSHServerType: undefined });
    await absent.executor(run(), ctx);
    expect(absent.createSSHConnection).toHaveBeenCalledWith(
      PEER.ip,
      22,
      "root",
      undefined,
    );
  });

  it("only sends the JWT when the peer's SSH server asks for one", async () => {
    const withKey = build({ detectSSHServerType: (async () => false) as never });
    await withKey.executor(run(), ctx);
    expect(withKey.createSSHConnection).toHaveBeenCalledWith(
      PEER.ip,
      22,
      "root",
      undefined,
    );

    const withJwt = build();
    await withJwt.executor(run(), ctx);
    expect(withJwt.createSSHConnection).toHaveBeenCalledWith(
      PEER.ip,
      22,
      "root",
      "jwt-token",
    );
  });

  it("reports a blocked connection as an administrator's job", async () => {
    const { executor } = build({
      createSSHConnection: (async () => {
        throw new Error("i/o timeout");
      }) as never,
    });
    const outcome = await executor(run(), ctx);

    expect(outcome.ok).toBe(false);
    expect(outcome.content).toMatch(/SSH connection to .* did not open/i);
    // The model must not respond by trying somewhere else.
    expect(outcome.content).toMatch(/Do not try another peer/i);
  });

  it("reports a failed join without attempting the command", async () => {
    const { executor, createSSHConnection } = build({
      connect: (async () => false) as never,
    });
    const outcome = await executor(run(), ctx);

    expect(outcome.ok).toBe(false);
    expect(outcome.content).toMatch(/Could not connect to the network/i);
    expect(createSSHConnection).not.toHaveBeenCalled();
  });

  it("names the missing exec channel instead of looking like a failed command", async () => {
    // A dashboard pointed at a published WASM build predating the exec channel
    // would otherwise report this as the command failing.
    const { executor } = build({
      createSSHConnection: (async () => ({ close: () => {} })) as never,
    });
    const outcome = await executor(run(), ctx);

    expect(outcome.ok).toBe(false);
    expect(outcome.content).toMatch(/does not support running commands/i);
  });

  it("treats a non-zero exit as a result, not a tool failure", async () => {
    // "grep found nothing" is an answer. Reporting ok:false would have the
    // model retry a command that worked.
    const { executor } = build({
      createSSHConnection: (async () => ({
        exec: async () => ({ stdout: "", stderr: "not found\n", exitCode: 1 }),
        close: () => {},
      })) as never,
    });
    const outcome = await executor(run(), ctx);

    expect(outcome.ok).toBe(true);
    expect(outcome.content).toContain("exit code: 1");
    expect(outcome.content).toContain("not found");
  });

  it("keeps stdout and stderr apart", async () => {
    // The whole reason for the exec channel: a PTY interleaves them.
    const { executor } = build({
      createSSHConnection: (async () => ({
        exec: async () => ({ stdout: "OUT", stderr: "ERR", exitCode: 0 }),
        close: () => {},
      })) as never,
    });
    const outcome = await executor(run(), ctx);

    expect(outcome.content).toMatch(/stdout:\nOUT/);
    expect(outcome.content).toMatch(/stderr:\nERR/);
  });

  it("dials the port the dashboard's own SSH window dials", async () => {
    /*
      22, while the ACCESS RULE names 22022 — genuinely different numbers. The
      server listens on 22022 and port 22 reaches it through a best-effort DNAT
      rule, so 22022 is the first thing to try if a peer with a healthy server
      ever refuses on 22. Not switched on a hypothesis.
    */
    const native = build();
    await native.executor(run(), ctx);
    expect(native.createSSHConnection).toHaveBeenCalledWith(
      PEER.ip,
      22,
      "root",
      "jwt-token",
    );

    const legacy = build({
      listPeers: async () => [{ ...PEER, version: "0.50.0" }],
    });
    await legacy.executor(run(), ctx);
    expect(legacy.createSSHConnection).toHaveBeenCalledWith(
      PEER.ip,
      44338,
      "root",
      "jwt-token",
    );
  });

  it("defaults the login name from the peer's OS, not from the account", async () => {
    /*
      A NetBird identity is not a login on the target machine. The browser SSH
      modal seeds this field from the peer's OS and lets a person correct it;
      an account-derived name like "Eduard Gert" is never a valid login.
    */
    const windows = build({
      listPeers: async () => [{ ...PEER, os: "Microsoft Windows 11 Pro" }],
    });
    await windows.executor(run(), ctx);
    expect(windows.createSSHConnection).toHaveBeenCalledWith(
      PEER.ip,
      22,
      "Administrator",
      "jwt-token",
    );

    const linux = build();
    await linux.executor(run(), ctx);
    expect(linux.createSSHConnection).toHaveBeenCalledWith(
      PEER.ip,
      22,
      "root",
      "jwt-token",
    );
  });

  it("prefers a username the user approved over the OS default", async () => {
    const { executor, createSSHConnection } = build();
    await executor(run({ username: "pi" }), ctx);
    expect(createSSHConnection).toHaveBeenCalledWith(
      PEER.ip,
      22,
      "pi",
      "jwt-token",
    );
  });

  it("closes the session even when the command throws", async () => {
    let closes = 0;
    const { executor } = build({
      createSSHConnection: (async () => ({
        exec: async () => {
          throw new Error("channel died");
        },
        close: () => {
          closes += 1;
        },
      })) as never,
    });
    const outcome = await executor(run(), ctx);

    expect(outcome.ok).toBe(false);
    // One session per command; leaking one per approval would accumulate for
    // as long as the tab lives.
    expect(closes).toBe(1);
  });

  it("resolves every way a person names the same machine", async () => {
    /*
      The cases that actually failed. The model cannot do this lookup: peer
      names are PII, so it sees unlabelled `[PEER_n]` tokens, and a typed FQDN
      tokenises as a different string from the peer's own dns_label — so the
      two can never be compared. The browser is the data owner and resolves it.
    */
    for (const reference of [
      "macbook-pro-von-eduard.netbird.selfhosted", // the account FQDN
      "MacBook-Pro-von-Eduard.local", // what the OS calls itself
      "macbook-pro-von-eduard", // the bare dns label
      "MacBook-Pro-von-Eduard", // the peer name, as the dashboard shows it
      "MACBOOK-PRO-VON-EDUARD", // people do not match case
      "100.84.232.69", // the NetBird IP
      "ch8i4ug6lnn4g9hqv7m0", // the peer id, from a resolved token
    ]) {
      const { executor, createSSHConnection } = build();
      const outcome = await executor(run({ peer: reference }), ctx);
      expect(outcome.ok, reference).toBe(true);
      expect(createSSHConnection, reference).toHaveBeenCalledWith(
        PEER.ip,
        22,
        "root",
        "jwt-token",
      );
    }
  });

  it("asks which one rather than guessing when a name is ambiguous", async () => {
    // Running a command on the wrong machine is not recoverable by apologising.
    const { executor, createSSHConnection } = build({
      listPeers: async () => [
        PEER,
        { ...PEER, id: "other", ip: "100.84.232.70", name: "macbook-pro-von-eduard" },
      ],
    });
    const outcome = await executor(run({ peer: "macbook-pro-von-eduard" }), ctx);

    expect(outcome.ok).toBe(false);
    expect(outcome.content).toMatch(/matches 2 peers/);
    // The candidates have to be IN the message. Telling the model to "ask which
    // one" without naming them is how a chat goes silent: it has no peer names
    // of its own — they reach it as opaque tokens.
    expect(outcome.content).toContain("100.84.232.69");
    expect(outcome.content).toContain("100.84.232.70");
    expect(createSSHConnection).not.toHaveBeenCalled();
  });

  it("does not reach for an unrelated machine when nothing matches", async () => {
    // Every name field has to miss, or this asserts nothing — an earlier
    // version of this case spread the MacBook fixture and kept its `name`,
    // so it "passed" by matching legitimately.
    const { executor, createSSHConnection } = build({
      listPeers: async () => [
        {
          id: "other-id",
          ip: "100.84.232.99",
          version: "0.62.0",
          os: "linux",
          name: "nas",
          hostname: "nas.local",
          dns_label: "nas",
        },
      ],
    });
    const outcome = await executor(run({ peer: "macbook-pro-von-eduard" }), ctx);

    expect(outcome.ok).toBe(false);
    expect(outcome.content).toMatch(/No peer matches/);
    expect(createSSHConnection).not.toHaveBeenCalled();
  });

  it("refuses an unknown peer without opening anything", async () => {
    const { executor, createSSHConnection } = build({ listPeers: async () => [] });
    const outcome = await executor(run(), ctx);

    expect(outcome.ok).toBe(false);
    expect(createSSHConnection).not.toHaveBeenCalled();
  });

  it("refuses a malformed dispatch", async () => {
    const { executor, createSSHConnection } = build();
    for (const bad of [{}, { peer: "p" }, { peer: "p", command: "" }]) {
      const outcome = await executor(bad, ctx);
      expect(outcome.ok).toBe(false);
    }
    expect(createSSHConnection).not.toHaveBeenCalled();
  });
});
