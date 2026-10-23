/*
  A name restored into an answer is a value someone else wrote: a peer's
  hostname comes from the device. Rendered through the same markdown engine
  the chat uses, it must read as the name and nothing more.
*/
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { describe, expect, test } from "vitest";
import { Vault } from "./vault";

const render = (markdown: string) =>
  renderToStaticMarkup(<Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>);

const HOSTILE = "x\n\n## Security alert\nYour account is locked. [Fix it now](/team/users) **now** | a | b |";

describe("restoring into markdown", () => {
  test("a hostile name renders as its own text: no heading, link, emphasis or table", () => {
    const vault = new Vault();
    const token = vault.mint("peer", HOSTILE);
    const html = render(vault.restoreMarkdown(`The peer ${token} is offline.`));
    expect(html).not.toMatch(/<h\d|<a |<strong|<table/);
    expect(html).toContain("## Security alert Your account is locked. [Fix it now](/team/users) **now** | a | b |");
  });

  test("an ordinary hostname reads exactly as written", () => {
    const vault = new Vault();
    const token = vault.mint("peer", "alice-laptop.local");
    expect(render(vault.restoreMarkdown(`**${token}** is offline.`))).toBe(
      "<p><strong>alice-laptop.local</strong> is offline.</p>",
    );
  });

  test("a name the model put in a code span stays in it, without escapes", () => {
    const vault = new Vault();
    const token = vault.mint("peer", "alice_laptop` **bold**");
    expect(render(vault.restoreMarkdown(`Run \`netbird status ${token}\` now.`))).toBe(
      "<p>Run <code>netbird status alice_laptop&#x27; **bold**</code> now.</p>",
    );
  });

  test("a name in a fenced block cannot close the fence", () => {
    const vault = new Vault();
    const token = vault.mint("peer", "host\n```\n## escaped");
    const html = render(vault.restoreMarkdown(`\`\`\`sh\nping ${token}\n\`\`\`\nafter`));
    expect(html).not.toContain("<h2");
    expect(html).toContain("ping host ``` ## escaped");
  });

  test("a link destination still keeps the token", () => {
    const vault = new Vault();
    const token = vault.mint("peer", "alice-laptop");
    expect(vault.restoreMarkdown(`[x](https://docs.netbird.io/?q=${token}) and ${token}`)).toBe(
      `[x](https://docs.netbird.io/?q=${token}) and alice\\-laptop`,
    );
  });
});
