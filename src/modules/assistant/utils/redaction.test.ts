import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import type { PageContextEntry } from "@/interfaces/Assistant";
import { PII_PATTERNS } from "@/modules/assistant/utils/pii";
import { Redactor } from "@/modules/assistant/utils/redaction";
import {
  type CatalogEntry,
  describePageContext,
  identifierNotes,
  pseudonymizeMessages,
  type RedactionConfig,
} from "@/modules/assistant/utils/redaction";

describe("Redactor token displays", () => {
  it("keeps one token per resource across mints", () => {
    const r = new Redactor();
    const first = r.handle("peer", "peer-1", "build-01");
    const again = r.handle("peer", "peer-1", "build-01");
    expect(again).toBe(first);
    expect(r.restore(`${first} is up`)).toBe("build-01 is up");
  });

  it("upgrades a display that was only ever the id", () => {
    const r = new Redactor();
    // First sighting had no name to go on (a bare id in a nested field).
    const token = r.handle("peer", "69b666c4321c");
    expect(r.restore(token)).toBe("69b666c4321c");

    // A later call knows the name — same token, readable answer.
    expect(r.handle("peer", "69b666c4321c", "minecraft-host")).toBe(token);
    expect(r.restore(`points at ${token}`)).toBe("points at minecraft-host");
    expect(r.resolve(token)).toBe("69b666c4321c");
  });

  it("does not let a later id overwrite a real name", () => {
    const r = new Redactor();
    const token = r.handle("group", "g-1", "Build Servers");
    r.handle("group", "g-1");
    expect(r.restore(token)).toBe("Build Servers");
  });
});
/**
 * The rewriter edits what the user typed, so the cases that matter most are the
 * ones where it must NOT fire — and the ones where a typed value has to come out
 * as the *same* token the redacted data carries.
 */

const CATALOG: CatalogEntry[] = [
  { name: "eduards-macbook", type: "peer", id: "p1" },
  { name: "build-runner-01", type: "peer", id: "p2" },
  { name: "build", type: "group", id: "g1" },
  { name: "Contractors", type: "group", id: "g2" },
  { name: "All", type: "group", id: "g3" },
  { name: "db", type: "peer", id: "p3" },
  {
    name: "macbook.netbird.cloud",
    type: "dns",
    id: "macbook.netbird.cloud",
    scalar: true,
    owner: {
      type: "peer",
      id: "p1",
      name: "eduards-macbook",
      field: "hostname",
    },
  },
  {
    name: "100.84.175.167",
    type: "ip",
    id: "100.84.175.167",
    scalar: true,
    owner: { type: "peer", id: "p2", name: "build-runner-01", field: "ip" },
  },
];

const withCatalog = () => new Redactor({ catalog: () => CATALOG });

const rewrite = (text: string) => withCatalog().detect(text).redacted;

describe("Redactor.detect: names", () => {
  it("swaps a peer name", () => {
    expect(rewrite("is eduards-macbook online?")).toBe("is [PEER_1] online?");
  });

  it("prefers the longest name over a shorter one it contains", () => {
    expect(rewrite("check build-runner-01")).toBe("check [PEER_1]");
  });

  it("leaves a longer hostname alone", () => {
    expect(rewrite("check build-runner-011")).toBe("check build-runner-011");
  });

  it("matches case-insensitively and keeps the rest of the sentence", () => {
    expect(rewrite("can CONTRACTORS reach it?")).toBe(
      "can [GROUP_1] reach it?",
    );
  });

  it("matches a resource named like a common word", () => {
    expect(rewrite("list all peers and all groups")).toBe(
      "list [GROUP_1] peers and [GROUP_1] groups",
    );
  });

  it("skips names under three characters", () => {
    expect(rewrite("is db up?")).toBe("is db up?");
  });

  it("does not match inside another word", () => {
    expect(rewrite("rebuild the buildkite runner")).toBe(
      "rebuild the buildkite runner",
    );
  });

  it("leaves already-tokenised text untouched", () => {
    expect(rewrite("is [PEER_1] online?")).toBe("is [PEER_1] online?");
  });

  it("handles two different resources in one sentence", () => {
    expect(rewrite("can Contractors reach eduards-macbook?")).toBe(
      "can [GROUP_1] reach [PEER_1]?",
    );
  });

  it("swaps a DNS label from the catalog", () => {
    expect(rewrite("open macbook.netbird.cloud")).toBe("open [DNS_1]");
  });

  it("passes empty input through", () => {
    expect(rewrite("")).toBe("");
  });
});

describe("Redactor.detect: typed values", () => {
  it("tokenises an IP the account actually holds", () => {
    expect(rewrite("where is 100.84.175.167?")).toBe("where is [IP_1]?");
  });

  it("gives the same IP one token", () => {
    expect(rewrite("is 100.84.175.167 the same as 100.84.175.167?")).toBe(
      "is [IP_1] the same as [IP_1]?",
    );
  });

  it("leaves values the account does not hold alone", () => {
    expect(rewrite("route 10.0.0.0/24 to who@example.com")).toBe(
      "route 10.0.0.0/24 to who@example.com",
    );
  });

  it("matches nothing with no catalog at all", () => {
    expect(new Redactor().detect("where is 100.84.175.167?").redacted).toBe(
      "where is 100.84.175.167?",
    );
  });
});

describe("Redactor.detect: detections", () => {
  it("reports what was found, and who owns a typed hostname", () => {
    const { redacted, detections } = withCatalog().detect(
      "bring me to macbook.netbird.cloud",
    );
    expect(redacted).toBe("bring me to [DNS_1]");
    expect(detections).toEqual([
      {
        kind: "dns",
        value: "macbook.netbird.cloud",
        token: "[DNS_1]",
        note: "[DNS_1] is the hostname of peer [PEER_1]",
      },
    ]);
  });

  it("carries no note for a resource name (the token already is the resource)", () => {
    const { detections } = withCatalog().detect("open eduards-macbook");
    expect(detections).toEqual([
      { kind: "peer", value: "eduards-macbook", token: "[PEER_1]" },
    ]);
  });

  it("detects nothing in a message that names nothing", () => {
    expect(withCatalog().detect("list my peers").detections).toEqual([]);
  });
});

describe("PII patterns", () => {
  const withPatterns = () => new Redactor({ patterns: PII_PATTERNS });
  const red = (text: string) => withPatterns().detect(text).redacted;

  it("tokenises addresses and networks", () => {
    expect(red("route 10.0.0.0/24 via 100.84.175.167")).toBe(
      "route [CIDR_1] via [IP_1]",
    );
    expect(red("ping fe80::1 and fd00:1234:5678:9abc::/64")).toBe(
      "ping [IP_1] and [CIDR_1]",
    );
    expect(red("mac is aa:bb:cc:dd:ee:ff")).toBe("mac is [MAC_1]");
  });

  it("tokenises contact details", () => {
    expect(red("mail eduard@netbird.io or call +49 30 901820")).toBe(
      "mail [EMAIL_1] or call [PHONE_1]",
    );
  });

  it("tokenises secrets people paste", () => {
    expect(red("setup key 12345678-abcd-4ef0-9876-0123456789ab")).toBe(
      "setup key [UUID_1]",
    );
    expect(red("token nbp_A1b2C3d4E5f6")).toBe("token [KEY_1]");
    expect(
      red(
        "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.abc123def456",
      ),
    ).toBe("Authorization: Bearer [KEY_1]");
    expect(red("card 4111 1111 1111 1111 please")).toBe("card [CARD_1] please");
  });

  it("tokenises credential URLs and DSNs whole", () => {
    expect(
      red("DATABASE_URL=postgres://nb:hunter2pass@db.local:5432/netbird"),
    ).toBe("DATABASE_URL=[KEY_1]");
  });

  it("tokenises secret assignments from pasted configs", () => {
    expect(red("set password: Sup3rSecret! and retry")).toBe(
      "set [KEY_1] and retry",
    );
    expect(red("NETBIRD_AUTH_CLIENT_SECRET=8xK2mQ9zL4 restart")).toBe(
      "[KEY_1] restart",
    );
  });

  it("tokenises opaque bearer tokens, ssh public keys and vendor keys", () => {
    expect(
      red("curl -H 'Authorization: Bearer nb_live_9f8e7d6c5b4a39281706'"),
    ).toBe("curl -H 'Authorization: [KEY_1]'");
    expect(
      red(
        "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGtleWRhdGFrZXlkYXRha2V5ZGF0YQ netbird",
      ),
    ).toBe("[KEY_1] netbird");
    expect(red("use pk_live_EXAMPLEEXAMPLEEXAMPLE1234 please")).toBe(
      "use [KEY_1] please",
    );
    expect(red("https://hooks.slack.com/services/T0AAA/B1BBB/x9y8z7")).toBe(
      "[KEY_1]",
    );
  });

  it("leaves config idioms alone", () => {
    expect(red("route 0.0.0.0/0 via my exit node at 100.64.0.5")).toBe(
      "route 0.0.0.0/0 via my exit node at [IP_1]",
    );
    expect(red("listen on 0.0.0.0 and 127.0.0.1")).toBe(
      "listen on 0.0.0.0 and 127.0.0.1",
    );
  });

  it("keeps versions, ports and times", () => {
    expect(red("update 0.28.9 uses port 51820 at 12:30")).toBe(
      "update 0.28.9 uses port 51820 at 12:30",
    );
  });

  it("restores what it redacted", () => {
    const redactor = withPatterns();
    const { redacted } = redactor.detect("where is 100.84.175.167?");
    expect(redacted).toBe("where is [IP_1]?");
    expect(redactor.restore(redacted)).toBe("where is 100.84.175.167?");
  });
});

describe("Redactor.rule", () => {
  it("registers a named whitelist usable by name", () => {
    const redactor = new Redactor().rule("peer", {
      handle: "peer",
      fields: { connected: true },
    });
    expect(
      redactor.redact({ id: "p-1", name: "macbook", connected: true }, "peer"),
    ).toEqual({ id: "[PEER_1]", name: "[PEER_1]", connected: true });
    expect(redactor.redact({ id: "p-1" }, "unknown-rule")).toBeUndefined();
  });

  it("registers a custom text pattern for detect", () => {
    const redactor = new Redactor().rule(
      "email",
      /\b[\w.+-]+@[\w-]+\.\w{2,}\b/g,
    );
    const { redacted, detections } = redactor.detect(
      "who is eduard@netbird.io?",
    );
    expect(redacted).toBe("who is [EMAIL_1]?");
    expect(detections).toEqual([
      { kind: "email", value: "eduard@netbird.io", token: "[EMAIL_1]" },
    ]);
    expect(redactor.restore("[EMAIL_1]")).toBe("eduard@netbird.io");
  });
});

const message = (role: "user" | "assistant", text: string): UIMessage =>
  ({
    id: `${role}-${text}`,
    role,
    parts: [{ type: "text", text }],
  }) as UIMessage;

describe("pseudonymizeMessages", () => {
  it("rewrites user text parts and leaves assistant parts alone", () => {
    const out = pseudonymizeMessages(
      [
        message("user", "is eduards-macbook online?"),
        // The model's own words already speak in tokens — not ours to touch.
        message("assistant", "eduards-macbook is online"),
      ],
      withCatalog(),
    );

    expect(out[0].parts[0]).toMatchObject({ text: "is [PEER_1] online?" });
    expect(out[1].parts[0]).toMatchObject({
      text: "eduards-macbook is online",
    });
  });

  it("assigns the same tokens on a resend, even after the catalog grew", () => {
    const entries = [...CATALOG];
    const redactor = new Redactor({ catalog: () => entries });
    const transcript = [message("user", "is eduards-macbook online?")];

    const first = pseudonymizeMessages(transcript, redactor);
    entries.push({ name: "new-arrival", type: "peer", id: "p9" });
    const second = pseudonymizeMessages(
      [...transcript, message("user", "and new-arrival?")],
      redactor,
    );

    expect(second[0]).toEqual(first[0]);
    expect(second[1].parts[0]).toMatchObject({ text: "and [PEER_2]?" });
  });

  it("leaves typed values alone when the dashboard holds nothing", () => {
    const out = pseudonymizeMessages(
      [message("user", "where is 100.84.175.167?")],
      new Redactor(),
    );
    expect(out[0].parts[0]).toMatchObject({ text: "where is 100.84.175.167?" });
  });
});

describe("identifierNotes", () => {
  it("attributes identifiers in the newest user message", () => {
    const note = identifierNotes(
      [
        message("user", "where is 100.84.175.167?"),
        message("assistant", "let me check"),
      ],
      withCatalog(),
    );
    expect(note).toBe(
      "Identifiers in this message: [IP_1] is the ip of peer [PEER_1].",
    );
  });

  it("is null when the message names nothing attributable", () => {
    expect(
      identifierNotes([message("user", "list my peers")], withCatalog()),
    ).toBeNull();
  });
});

describe("Redactor.resolveInput", () => {
  it("maps the model's tokens back to real ids, braces or not", () => {
    const redactor = new Redactor();
    redactor.handle("peer", "p-1", "eduards-macbook");

    expect(redactor.resolveInput({ peer_id: "[PEER_1]" })).toEqual({
      peer_id: "p-1",
    });
    expect(redactor.resolveInput({ peer_id: "peer_1" })).toEqual({
      peer_id: "p-1",
    });
  });

  it("passes unknown strings and non-strings through", () => {
    const redactor = new Redactor();
    expect(redactor.resolveInput({ id: "[PEER_9]", limit: 5 })).toEqual({
      id: "[PEER_9]",
      limit: 5,
    });
  });
});

describe("Redactor.resolveDeep", () => {
  it("resolves references and restores tokens inside prose, at any depth", () => {
    const redactor = new Redactor();
    redactor.handle("node", "peer-draft-1", "eduards-macbook");
    redactor.handle("group", "g-1", "Contractors");

    expect(
      redactor.resolveDeep({
        links: [{ from: "[NODE_1]", to: "[GROUP_1]" }],
        name: "Access for [GROUP_1]",
      }),
    ).toEqual({
      links: [{ from: "peer-draft-1", to: "g-1" }],
      name: "Access for Contractors",
    });
  });
});

describe("Redactor.redact", () => {
  const PEER: RedactionConfig = {
    handle: "peer",
    fields: {
      connected: true,
      ip: "ip",
      extra_dns_labels: "dns",
      groups: {
        handle: "group",
        labelled: true,
        fields: { peers_count: true },
      },
    },
  };

  it("keeps, tokenises and drops per the whitelist, over arrays too", () => {
    const redactor = new Redactor();
    const out = redactor.redact(
      [
        {
          id: "p-1",
          name: "eduards-macbook",
          connected: true,
          ip: "100.84.175.167",
          extra_dns_labels: ["a.netbird.cloud", "b.netbird.cloud"],
          serial_number: "C02XL0GYJGH5",
          groups: [{ id: "g-1", name: "Build Servers", peers_count: 3 }],
        },
      ],
      PEER,
    );

    expect(out).toEqual([
      {
        id: "[PEER_1]",
        name: "[PEER_1]",
        connected: true,
        ip: "[IP_1]",
        extra_dns_labels: ["[DNS_1]", "[DNS_2]"],
        groups: [{ id: "[GROUP_1]", name: "Build Servers", peers_count: 3 }],
      },
    ]);
    expect(redactor.restore("[PEER_1] in [GROUP_1]")).toBe(
      "eduards-macbook in Build Servers",
    );
    expect(redactor.resolve("[PEER_1]")).toBe("p-1");
  });

  it("tokenises a bare id where an object was expected", () => {
    const redactor = new Redactor();
    expect(redactor.redact("g-9", PEER.fields.groups as RedactionConfig)).toBe(
      "[GROUP_1]",
    );
  });

  it("drops a bare string when the config has no handle", () => {
    const redactor = new Redactor();
    expect(redactor.redact("secret", { fields: {} })).toBeUndefined();
  });
});

describe("describePageContext", () => {
  it("mints the resource's token, keeping the name as its display", () => {
    const redactor = new Redactor();
    const entry: PageContextEntry = {
      key: "peer:p-1",
      type: "peer",
      id: "p-1",
    };

    expect(describePageContext(entry, redactor, "eduards-macbook")).toBe(
      '<page-context kind="peer" ref="[PEER_1]" />',
    );
    expect(redactor.restore("[PEER_1]")).toBe("eduards-macbook");
    expect(redactor.resolve("[PEER_1]")).toBe("p-1");
  });

  it("passes a label-only entry (a settings tab) through", () => {
    const entry: PageContextEntry = {
      key: "settings:dns",
      type: "settings",
      label: "Settings · DNS",
    };
    expect(describePageContext(entry, new Redactor())).toBe(
      '<page-context kind="settings" page="Settings · DNS" />',
    );
  });

  it("is null with no entry", () => {
    expect(describePageContext(null, new Redactor())).toBeNull();
  });
});
