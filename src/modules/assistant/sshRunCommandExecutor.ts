import type {
  ClientToolContext,
  ClientToolExecutor,
  ToolOutcome,
} from "@netbird/assistant-react";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { getBrowserInfo } from "@utils/helpers";
import {
  isNativeSSHSupported,
  isNetbirdSSHProtocolSupported,
} from "@utils/version";
import { OperatingSystem } from "@/interfaces/OperatingSystem";

/**
 * `ssh_run_command`: runs one approved command on one peer.
 *
 * One call does the whole thing — join the network, take temporary access to
 * the target, run the command — because the user approves it once. There is no
 * separate connect step: a connection approved on its own is a capability
 * sitting around waiting to be used, and a harder thing to reason about than
 * "may it run this command on this machine".
 *
 * ## Access is scoped to the peer the user approved
 *
 * The grant is a temporary-access peer for ONE target, with an SSH rule and the
 * approving user as its authorized user, deleted by management when the tunnel
 * drops. That is what the dashboard's own browser-SSH window takes, and it is
 * deliberately not a standing group membership: a policy granting an
 * `Assistants` group access is permanent and covers every assistant peer in
 * every session, which is far more than any one command needs.
 *
 * Each target gets its own grant, so a command approved for one machine can
 * never become access to another.
 *
 * ## Why not `connectTemporary`
 *
 * `useNetBirdClient`'s helper returns early once the client is connected, so it
 * grants access for the FIRST peer only — a second target silently gets no
 * grant and its connection then fails. It also hides the keypair, and the
 * keypair is exactly what has to be reused: registering the same WireGuard
 * public key again adds a policy to the existing peer instead of creating a
 * second one.
 */

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface SSHSession {
  exec?: (command: string, timeoutMs?: number) => Promise<ExecResult>;
  close: () => void;
}

/** What the executor needs to know about the peer it is aiming at. */
export interface PeerAddress {
  id?: string;
  ip: string;
  version: string;
  os: string;
  name?: string;
  hostname?: string;
  dns_label?: string;
  /** Online right now. An offline peer cannot be reached however good the policy. */
  connected?: boolean;
  /** SSH turned on for this peer. Off by default on every NetBird peer. */
  ssh_enabled?: boolean;
  local_flags?: { server_ssh_allowed?: boolean };
}

const firstLabel = (value: string): string =>
  value.trim().toLowerCase().split(".")[0] ?? "";

/**
 * Resolves whatever the user called a peer to an actual peer.
 *
 * This has to happen HERE, in the browser, and not in the model. Peer names are
 * PII — a hostname is routinely someone's name — so the redaction layer hands
 * the model an unlabelled `[PEER_n]` token instead of a name. Worse for
 * matching: a hostname the user types is tokenised as its own string, so the
 * FQDN `macbook-pro-von-eduard.netbird.selfhosted` and the peer's `dns_label`
 * `macbook-pro-von-eduard` become DIFFERENT tokens and cannot be compared. The
 * model is structurally unable to do this lookup; the browser is the data owner
 * and can.
 */
export function matchesPeer(peer: PeerAddress, reference: string): boolean {
  const query = reference.trim().toLowerCase();
  if (!query) return false;

  // Exact identities first — an id or an address is unambiguous.
  for (const exact of [peer.id, peer.ip]) {
    if (exact && exact.toLowerCase() === query) return true;
  }
  for (const named of [peer.name, peer.hostname, peer.dns_label]) {
    if (named && named.toLowerCase() === query) return true;
  }

  /*
    Then the machine-name forms, compared on their first DNS label. This is what
    makes `macbook-pro-von-eduard.netbird.selfhosted` (the account FQDN),
    `MacBook-Pro-von-Eduard.local` (what the OS calls itself) and the bare
    `macbook-pro-von-eduard` all resolve to the same peer, which is the point: a
    person uses those three interchangeably.
  */
  const label = firstLabel(query);
  if (!label) return false;
  for (const named of [peer.dns_label, peer.hostname, peer.name]) {
    if (named && firstLabel(named) === label) return true;
  }
  return false;
}

/**
 * Whether this peer can be SSHed into at all, by the same test the dashboard's
 * own SSH button uses to decide whether to grey itself out.
 *
 * Checked BEFORE any access is taken. An earlier order granted first and
 * discovered the peer was unreachable afterwards, which wasted a grant and
 * reported the cause as a guess — "may be offline, or may not have SSH enabled"
 * — when the peer record answers it exactly.
 */
function sshReadiness(peer: PeerAddress): "offline" | "ssh-disabled" | null {
  if (peer.connected === false) return "offline";
  if (peer.ssh_enabled === false && !peer.local_flags?.server_ssh_allowed) {
    return "ssh-disabled";
  }
  return null;
}

export interface SSHRunCommandDeps {
  /** Every peer in the account, for `matchesPeer` to resolve a reference against. */
  listPeers: () => Promise<PeerAddress[]>;
  /** Generates the browser's WireGuard keypair. The private half never leaves. */
  generateKeypair: () => { publicKey: string; privateKey: string };
  /**
   * Asks the user to authorize access to one peer, resolving true once granted.
   *
   * A request rather than a call, because the grant is created by a window the
   * user opens and signs in to. The assistant holds the user's credentials and
   * could make the API call itself — the point is that it does not: a session
   * left open on an unattended machine should not be able to hand the assistant
   * a route into the network, and only a live person can answer this.
   */
  authorizeAccess: (input: {
    peerId: string;
    peerLabel: string;
    command: string;
    wgPublicKey: string;
    rules: string[];
    assistantPeerName: string;
    needsAuthorization: boolean;
  }) => Promise<boolean>;
  /** Starts the WASM client on a private key. */
  connect: (privateKey: string) => Promise<boolean>;
  /** Opens an SSH session over the connected NetBird client. */
  createSSHConnection: (
    host: string,
    port: number,
    username: string,
    jwtToken?: string,
    ipVersion?: string,
  ) => Promise<SSHSession>;
  /**
   * Whether this peer's SSH server wants a JWT rather than a public key.
   *
   * Asked rather than assumed: sending a JWT to a server expecting a key is a
   * different failure from not having one, and the browser SSH path detects
   * this before every connection for the same reason.
   */
  detectSSHServerType?: (
    host: string,
    port: number,
    timeoutMs: number,
  ) => Promise<boolean>;
  /**
   * Bearer for NetBird SSH's JWT auth, resolved at call time.
   *
   * A function, not a value, because NetBird's SSH server rejects a token by
   * AGE rather than by expiry:
   *
   *     iat := claims["iat"]; if time.Since(iat) > 10 * time.Minute { reject }
   *
   * An Auth0 access token stays valid for hours, so `isExpired` is happy with
   * one issued at login — and the peer refuses it as
   * `token expired ... age=1h23m, max=10m0s`, which reads like an expired
   * credential and is not one.
   *
   * The dashboard's SSH window never hits this because `window.open` reloads
   * the page and OIDC mints a fresh token on the spot. A long-lived panel has
   * to ask for one, so this resolver is expected to RENEW when the token is
   * close to that age, not merely to wait for expiry.
   */
  getAccessToken?: () => Promise<string | undefined>;
  /** Overrides the settle wait after a fresh grant. Tests pass 0. */
  settleMs?: number;
  /*
    There is deliberately no `isConnected` here.

    `useNetBirdClient` keeps its live client in a `useRef` — per hook INSTANCE —
    while the status it reports comes from a module-level store shared by every
    instance. The two diverge as soon as anything else connects, or the panel
    remounts: the store says CONNECTED, this instance's ref is still null, and
    `createSSHConnection` throws "Go client not ready". Gating on that status
    was exactly that bug. Readiness is tracked below instead, and proven by the
    SSH session actually opening.
  */
}

/*
  What this tab has already arranged, kept at module scope for the same reason
  `netBirdStore` is: the executor is rebuilt whenever the panel re-renders, and
  the tunnel outlives any one of those.

  Reusing the keypair is what makes a second peer cheap — the same public key
  registers as the same peer with an added policy — and it is what lets a repeat
  command on a peer already granted skip straight to the SSH session.
*/
const tunnel: {
  keypair: { publicKey: string; privateKey: string } | null;
  name: string | null;
  granted: Set<string>;
  /** Whether THIS module has connected a client since the last reset. */
  connected: boolean;
} = { keypair: null, name: null, granted: new Set(), connected: false };

/** Test seam; also the honest way to drop state when a tunnel is gone. */
export function resetAssistantTunnel(): void {
  tunnel.keypair = null;
  tunnel.name = null;
  tunnel.granted.clear();
  tunnel.connected = false;
}

/**
 * The name this tab's peer appears under on the account's Peers page.
 *
 * Unique per tunnel, and that matters for the person reading that page: a fixed
 * name puts every browser, tab and conversation on one indistinguishable row,
 * so an admin cannot tell which is still live, which to revoke, or which
 * produced a given access policy.
 *
 * Minted once alongside the keypair rather than per command, because the peer
 * is identified by that key — a later grant reusing the key lands on the peer
 * that already exists, so a name that changed per call would be ignored anyway
 * and only mislead. Shaped like a DNS label, which is what NetBird derives from
 * it.
 */
function mintPeerName(): string {
  const browser = getBrowserInfo();
  const family = (browser.name || "browser").toLowerCase();
  // Short, and only for uniqueness — long enough that two tabs opened in the
  // same second do not collide.
  const unique = Math.random().toString(36).slice(2, 8);
  return `assistant-${family}-${unique}`
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 63);
}

/*
  22, the same port the dashboard's own SSH window dials.

  Worth knowing that this is not where the server listens: NetBird's embedded
  SSH server binds 22022 (`InternalSSHPort`), and port 22 reaches it through an
  inbound DNAT rule the engine installs best-effort, warning rather than failing
  when it cannot. So on a peer where that rule did not take, 22 arrives nowhere
  while 22022 would work.

  22 anyway, because that is the path the dashboard's SSH window uses and is
  therefore the one known to work; switching on a hypothesis would trade a
  tested route for an untested one. If a peer ever refuses on 22 while its
  server is plainly up, 22022 is the first thing to try.
*/
const NATIVE_SSH_PORT = 22;
const LEGACY_SSH_PORT = 44338;

/**
 * The access rule for this peer, matching what the browser-SSH window computes.
 *
 * `netbird-ssh` carries the authorized user, so the rule is tied to the person
 * who approved it rather than being an open port. Older peers predate that and
 * fall back to plain tcp.
 */
function accessRule(peer: PeerAddress): string {
  const protocol = isNetbirdSSHProtocolSupported(peer.version)
    ? "netbird-ssh"
    : "tcp";
  // 22022 here is the port the RULE names, not the one dialled — genuinely
  // different numbers, and conflating them is an easy mistake.
  const port = isNativeSSHSupported(peer.version) ? 22022 : LEGACY_SSH_PORT;
  return `${protocol}/${port}`;
}

/*
  The login name, defaulted from the peer's OS exactly as the browser SSH modal
  seeds its field.

  There is no account-derived answer here and it is worth being explicit about
  why: a NetBird identity is not a login on the target machine. The dashboard
  asks a person, seeded by OS, and the person corrects it. The assistant's
  equivalent of "the person corrects it" is the `username` input, which the user
  reads and approves along with the command.
*/
function defaultUsernameFor(os: string): string {
  return isWindows(os) ? "Administrator" : "root";
}

/*
  Windows runs commands through PowerShell, not a POSIX shell:

      return []string{shell, "-Command", cmdString}   // command_execution_windows.go

  So the login-shell retry does not apply there — `${SHELL:-/bin/sh} -lic '…'`
  handed to PowerShell is not a fallback, it is a second, stranger error. Nor
  is it needed: PowerShell inherits PATH from the environment rather than from
  a shell rc file, so the gap that makes a binary visible in a terminal and
  invisible here does not open in the first place.
*/
const isWindows = (os: string): boolean =>
  getOperatingSystem(os) === OperatingSystem.WINDOWS;

const EXEC_TIMEOUT_MS = 5 * 60 * 1000;
const DETECT_TIMEOUT_MS = 20_000;
/** How long a newly created access policy is given to reach the target peer. */
const GRANT_SETTLE_MS = 2_000;

const TEXT = {
  unknownPeer: (peer: string) =>
    `No peer matches "${peer}", so no command was run. Ask the user for the name exactly as the ` +
    `dashboard's Peers page shows it — its hostname, its NetBird IP, or its full domain name all work.`,
  ambiguousPeer: (peer: string, matches: PeerAddress[]) =>
    `"${peer}" matches ${matches.length} peers, so no command was run. Ask the user which one ` +
    `they mean and repeat these options to them verbatim, then run the command again using the ` +
    `NetBird IP, which identifies one exactly:\n` +
    matches
      .map((p) => `- ${p.name || p.hostname || p.dns_label || p.id} (${p.ip})`)
      .join("\n"),
  offline: (name: string) =>
    `${name} is offline, so no command was run. It has to be connected to NetBird before anything ` +
    `can reach it. Tell the user; do not try another peer.`,
  sshDisabled: (name: string) =>
    `SSH is not enabled on ${name}, so no command was run and no access was taken. NetBird peers ` +
    `have SSH off by default. Tell the user to turn on SSH for that peer on its page in the ` +
    `dashboard, then ask them to run this again. Do not try another peer or another route.`,
  notAuthorized: (name: string) =>
    `The user did not confirm running that command on ${name}, so nothing ran. The first command ` +
    `on a peer also opens a sign-in window they have to complete. If they meant to allow it, ask ` +
    `them to run it again and finish that window. Do not try another peer or another route.`,
  connectFailed:
    "Could not connect to the network, so no command was run. The browser client may have failed " +
    "to start, or the management server may be unreachable.",
  blocked: (name: string, detail: string) =>
    `Temporary access was granted but the SSH connection to ${name} did not open, so no command ` +
    `was run. The underlying error was: ${detail}. Report that error to the user verbatim — it is ` +
    `the only thing that distinguishes a policy that has not propagated yet from a refused ` +
    `handshake or a closed port. Do not try another peer or another route.`,
  /*
    A refused handshake means the tunnel and the policy both worked and the peer
    turned down the LOGIN — the opposite of what it reads like.

    The attempt is described field by field because the dashboard's own SSH
    window succeeds against the same peer with the same username and port, so
    the interesting question is what differs between the two, and no amount of
    prose here answers it. The token itself is never included; only whether one
    was attached.
  */
  authRefused: (attempt: {
    name: string;
    user: string;
    port: number;
    rule: string;
    jwt: boolean;
    version: string;
    detail: string;
  }) =>
    `Connected to ${attempt.name}, but it refused the login, so no command was run. ` +
    `The attempt was: user "${attempt.user}", port ${attempt.port}, access rule ` +
    `"${attempt.rule}", peer version ${attempt.version}, auth ` +
    `${attempt.jwt ? "JWT (server reported it wants one)" : "public key"}. ` +
    `Verbatim error: ${attempt.detail}\n\n` +
    `Report all of that to the user. NetBird SSH authorises a NetBird identity against a ` +
    `specific operating-system login and denies anything not mapped, so the username is worth ` +
    `checking first — but if the same username and port work in the dashboard's own SSH window, ` +
    `the difference is elsewhere and the fields above are what identify it.`,
  notOnPath:
    "Exit code 127 means the shell could not FIND that program, not that it is missing. On a " +
    "Unix peer this was already retried through the user's interactive login shell — the same " +
    "environment their terminal has — and still could not find it. Say that it is not on PATH " +
    "rather than that it is not installed, and suggest the absolute path if one is known.",
  noExec:
    "The NetBird WASM client in use does not support running commands — it predates the exec " +
    "channel. No command was run. Point the dashboard's wasmPath at a build that includes it.",
} as const;

/** Truncated for the chat transcript; the agent caps and screens it again. */
const MAX_STREAM_CHARS = 20_000;
const clip = (text: string): string =>
  text.length <= MAX_STREAM_CHARS ? text : `${text.slice(0, MAX_STREAM_CHARS)}…`;

function render(result: ExecResult): string {
  const parts = [`exit code: ${result.exitCode}`];
  // Kept apart rather than merged. A PTY would have interleaved them, and the
  // whole reason for the exec channel is that a reader can tell which stream
  // said what.
  if (result.stdout.trim()) parts.push(`stdout:\n${clip(result.stdout)}`);
  if (result.stderr.trim()) parts.push(`stderr:\n${clip(result.stderr)}`);
  if (!result.stdout.trim() && !result.stderr.trim()) {
    parts.push("(no output)");
  }
  return parts.join("\n\n");
}

/**
 * The command, run the way the user's own terminal would run it.
 *
 * `-l` for the login profile and `-i` for the interactive one: the PTY session
 * gets both, and an exec session gets neither past `-c`, which is the entire
 * difference between `netbird status` working in a terminal and not here.
 * `$SHELL` rather than a fixed shell, because the profile that matters is the
 * one belonging to whatever the user actually uses.
 */
function interactiveLoginShell(command: string): string {
  // POSIX single-quote escaping: end the quote, an escaped quote, reopen.
  const quoted = `'${command.replace(/'/g, `'\\''`)}'`;
  return `\${SHELL:-/bin/sh} -lic ${quoted}`;
}

/*
  What a login shell says about itself, which is not what the command said.

  `-i` without a terminal makes each shell announce the same thing differently,
  and `-l` makes them print `logout` on the way out. Verified against dash, sh,
  bash and zsh — all four run the command and preserve its exit code, and all
  but zsh add one of these lines. Left in place they read to the model as the
  command having complained.
*/
const SHELL_NOISE = [
  /^[\w./-]*:?\s*\d*:?\s*no job control in this shell\s*$/i,
  /^[\w./-]*:?\s*\d*:?\s*can't access tty;?\s*job control turned off\s*$/i,
  /^logout$/i,
];

function stripShellNoise(stderr: string): string {
  return stderr
    .split("\n")
    .filter((line) => !SHELL_NOISE.some((pattern) => pattern.test(line.trim())))
    .join("\n")
    .trim();
}

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error ?? "unknown error");

export function createSSHRunCommandExecutor(
  deps: SSHRunCommandDeps,
): ClientToolExecutor {
  return async (input: unknown, ctx: ClientToolContext): Promise<ToolOutcome> => {
    const { peer, command, username } = (input ?? {}) as {
      peer?: string;
      command?: string;
      username?: string;
    };
    if (typeof peer !== "string" || typeof command !== "string" || !command) {
      return { ok: false, content: "That command was malformed, so nothing was run." };
    }

    let candidates: PeerAddress[];
    try {
      candidates = (await deps.listPeers()).filter((p) => matchesPeer(p, peer));
    } catch {
      candidates = [];
    }
    // Ambiguity is reported rather than guessed at: running a command on the
    // wrong machine is not recoverable by apologising afterwards.
    if (candidates.length > 1) {
      return { ok: false, content: TEXT.ambiguousPeer(peer, candidates) };
    }
    const address = candidates[0];
    if (!address?.ip || !address.id) {
      return { ok: false, content: TEXT.unknownPeer(peer) };
    }
    const peerId = address.id;

    // Before the grant, so an unreachable peer costs nothing and the reason is
    // read off the peer rather than inferred from a failed connection.
    const label =
      address.name || address.hostname || address.dns_label || address.ip;
    const notReady = sshReadiness(address);
    if (notReady === "offline") return { ok: false, content: TEXT.offline(label) };
    if (notReady === "ssh-disabled") {
      return { ok: false, content: TEXT.sshDisabled(label) };
    }

    /*
      Join the network and take access, both only as far as needed.

      The keypair is minted once per tab and reused: registering the same public
      key again adds a policy to the peer that already exists rather than
      creating a second one. A target already granted in this tab skips the call
      entirely, which is what makes a follow-up command on the same machine cost
      nothing beyond its own approval.
    */
    if (!tunnel.keypair) {
      tunnel.keypair = deps.generateKeypair();
      tunnel.name = mintPeerName();
    }
    const keypair = tunnel.keypair;
    const peerName = tunnel.name ?? mintPeerName();

    /*
      One prompt, covering both questions, before anything with a side effect.

      The command is confirmed EVERY time; the peer is authorized once per tab.
      So the prompt always appears, and only asks for a sign-in the first time —
      which is what puts the sign-in before the command approval rather than
      after it. Re-opening the window for a peer already authorized would be
      asking again for a decision already made, and that is how people learn to
      click through prompts without reading them.
    */
    const needsAuthorization = !tunnel.granted.has(peerId);
    /*
      Say what is really happening, because the trail cannot.

      The row's label comes from the tool name and reads "Running a command"
      from the moment the call is dispatched — through the whole stretch in
      which nothing is running and the assistant is waiting on a person. That
      is not a cosmetic problem: a user who is being asked for something is
      being told the thing they are deciding about has already happened.
    */
    ctx.setStatus(
      needsAuthorization
        ? "Waiting for you to authorize and confirm"
        : "Waiting for you to confirm",
    );
    const confirmed = await deps
      .authorizeAccess({
        peerId,
        peerLabel: label,
        command,
        wgPublicKey: keypair.publicKey,
        rules: [accessRule(address)],
        assistantPeerName: peerName,
        needsAuthorization,
      })
      .catch(() => false);
    if (!confirmed) return { ok: false, content: TEXT.notAuthorized(label) };
    ctx.setStatus(`Connecting to ${label}`);

    const freshGrant = needsAuthorization;
    if (needsAuthorization) tunnel.granted.add(peerId);

    // Only the private half, and only here. It is generated in this tab and
    // handed to nothing but the WASM client.
    const join = async (): Promise<boolean> => {
      try {
        const ok = await deps.connect(keypair.privateKey);
        tunnel.connected = ok;
        return ok;
      } catch {
        tunnel.connected = false;
        return false;
      }
    };

    if (!tunnel.connected && !(await join())) {
      return { ok: false, content: TEXT.connectFailed };
    }

    /*
      A policy created seconds ago has to reach the TARGET peer before it will
      accept anything, and that propagation is asynchronous. Only waited for
      when the grant is new — a reused one propagated long ago, and making every
      repeat command pay this would be pure latency.
    */
    const settleMs = deps.settleMs ?? GRANT_SETTLE_MS;
    if (freshGrant && settleMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, settleMs));
    }

    const port = isNativeSSHSupported(address.version)
      ? NATIVE_SSH_PORT
      : LEGACY_SSH_PORT;

    /*
      Defaults to public key, NOT to the JWT, and the difference is the whole
      bug it was written for.

      The server only installs a password handler when JWT auth is enabled:

          if s.jwtEnabled { server.PasswordHandler = s.passwordHandler }

      So on a peer without it, offering a password is refused outright and the
      client reports `attempted methods [none password], no supported methods
      remain` — which reads like a rejected credential rather than a method the
      server never accepted. Falling back to the JWT therefore turns "detection
      did not answer" into a guaranteed failure, while falling back to the key
      is what `useSSH` does and what actually connects.
    */
    let requiresJwt = false;
    try {
      requiresJwt =
        (await deps.detectSSHServerType?.(address.ip, port, DETECT_TIMEOUT_MS)) ??
        false;
    } catch {
      requiresJwt = false;
    }

    const token = requiresJwt ? await deps.getAccessToken?.() : undefined;

    const openSSH = () =>
      deps.createSSHConnection(
        address.ip,
        port,
        username || defaultUsernameFor(address.os),
        token,
      );

    let ssh: SSHSession;
    try {
      try {
        ssh = await openSSH();
      } catch (first) {
        /*
          "Go client not ready" means this hook instance has no live client even
          though something thought it was connected — a remount, or another
          component's connection. Rebuilding it and trying once more turns a
          dead end into a hiccup; anything else is a real failure and rethrows.
        */
        if (!/not ready/i.test(describeError(first))) throw first;
        tunnel.connected = false;
        if (!(await join())) return { ok: false, content: TEXT.connectFailed };
        ssh = await openSSH();
      }
    } catch (error) {
      /*
        The error is REPORTED, not swallowed. An earlier version caught this
        bare and replaced it with a guess about offline peers and disabled SSH,
        which is how a real failure spent a long time looking like a
        configuration problem. What the WASM client rejects with — a dial
        timeout, a refused handshake, an unready client — is the only thing that
        tells them apart.

        A rejected handshake gets its own wording because it means the opposite
        of what it looks like: the tunnel worked and the policy worked, and the
        peer turned down the LOGIN. NetBird SSH maps a NetBird identity to one
        specific OS username and fails closed on anything else, so this is a
        username problem far more often than a permissions one — and the user
        is the only one who knows their account name on that machine.
      */
      const detail = describeError(error);
      if (/unable to authenticate|handshake failed|permission denied/i.test(detail)) {
        return {
          ok: false,
          content: TEXT.authRefused({
            name: label,
            user: username || defaultUsernameFor(address.os),
            port,
            rule: accessRule(address),
            jwt: requiresJwt && Boolean(token),
            version: address.version,
            detail: detail.slice(0, 300),
          }),
        };
      }
      return { ok: false, content: TEXT.blocked(label, detail.slice(0, 300)) };
    }

    try {
      if (typeof ssh.exec !== "function") {
        return { ok: false, content: TEXT.noExec };
      }
      // From here the row's own label is true again; the SDK clears this when
      // the call ends either way.
      ctx.setStatus(`Running the command on ${label}`);
      let result = await ssh.exec(command, EXEC_TIMEOUT_MS);

      /*
        127 means the shell could not FIND the program, and the cause is the
        difference between this session and the interactive one.

        The server runs an exec command as `shell -c "<command>"` with argv[0]
        set to `-shell`, so it is a LOGIN shell but not an interactive one —
        which reads .zprofile and skips .zshrc. PATH additions almost always
        live in .zshrc, so `netbird` resolves in the terminal and not here, on
        a machine that plainly has it.

        Retried once through an interactive login shell, which is what the PTY
        session gets. Only on 127, because the wrapper changes the environment
        a command runs in and there is no reason to impose that on commands
        that worked. The user still approved the plain command and that is what
        is being run — inside the shell they would have run it in themselves.
      */
      if (result.exitCode === 127 && !isWindows(address.os)) {
        const retried = await ssh
          .exec(interactiveLoginShell(command), EXEC_TIMEOUT_MS)
          .catch(() => null);
        if (retried && retried.exitCode !== 127) {
          result = { ...retried, stderr: stripShellNoise(retried.stderr) };
        } else {
          return { ok: true, content: `${render(result)}\n\n${TEXT.notOnPath}` };
        }
      }
      // A non-zero exit is a RESULT, not a failure of the tool: the command ran
      // and said something. Reporting it as ok:false would have the model treat
      // "grep found nothing" as a broken tool.
      return { ok: true, content: render(result) };
    } catch (error) {
      return {
        ok: false,
        content: `The command could not be run: ${describeError(error)}`,
      };
    } finally {
      // One session per command. Leaving it open would accumulate a session per
      // approval for as long as the tab lives.
      try {
        ssh.close();
      } catch {
        // already gone
      }
    }
  };
}
