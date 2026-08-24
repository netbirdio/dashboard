// Skill catalog: agent/skills/<name>.md, each with a `description` used as the
// routing hint the model picks from. Read once — the files ship in the image.
import { readdirSync, readFileSync } from "node:fs";

export interface Skill {
  name: string;
  description: string;
  markdown: string;
}

const SKILLS_DIR = new URL("./skills/", import.meta.url);

// Anthropic's skill-authoring contract, enforced at load so a malformed guide
// fails at boot rather than silently becoming unroutable.
// https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
const NAME_PATTERN = /^[a-z0-9-]{1,64}$/;
const RESERVED_NAMES = ["anthropic", "claude"];
const MAX_DESCRIPTION = 1_024;

function parse(name: string, raw: string): Skill {
  const bad = (why: string): never => {
    throw new Error(`skill "${name}": ${why}`);
  };

  if (!NAME_PATTERN.test(name)) bad("name must be lowercase letters, numbers and hyphens, max 64");
  if (RESERVED_NAMES.some((w) => name.includes(w))) bad(`name may not contain ${RESERVED_NAMES.join(" or ")}`);

  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (!match) bad("missing YAML frontmatter");
  const description = /^description:\s*(.+)$/m.exec(match![1]!)?.[1]?.trim() ?? "";
  if (!description) bad("frontmatter needs a non-empty description");
  if (description.length > MAX_DESCRIPTION) bad(`description exceeds ${MAX_DESCRIPTION} characters`);

  const markdown = match![2]!.trim();
  if (!markdown) bad("body is empty");
  return { name, description, markdown };
}

function load(): Map<string, Skill> {
  const skills = new Map<string, Skill>();
  for (const file of readdirSync(SKILLS_DIR).filter((f) => f.endsWith(".md")).sort()) {
    const name = file.replace(/\.md$/, "");
    skills.set(name, parse(name, readFileSync(new URL(file, SKILLS_DIR), "utf8")));
  }
  return skills;
}

const catalog = load();

export const skillNames: string[] = [...catalog.keys()];

export function getSkill(name: string): Skill | undefined {
  return catalog.get(name);
}

// Goes in the tool description so the routing hints are part of the cached
// tool definitions rather than a separate always-on block in the prompt.
export function skillMenu(): string {
  return [...catalog.values()].map((s) => `- \`${s.name}\` — ${s.description}`).join("\n");
}
