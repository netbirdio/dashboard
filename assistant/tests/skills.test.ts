import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { getSkill, skillMenu, skillNames } from "@/agent/skills.ts";
import { runServerTool, TOOLS } from "@/agent/tools/registry.ts";

const SKILLS_DIR = new URL("../src/agent/skills/", import.meta.url);

// The authoring contract from
// https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
test("every skill meets the authoring contract", () => {
  for (const name of skillNames) {
    const skill = getSkill(name)!;

    expect(name).toMatch(/^[a-z0-9-]{1,64}$/);
    expect(name).not.toMatch(/anthropic|claude/);
    // Vague or single-word generic names are hard to route on.
    expect(name).toContain("-");

    expect(skill.description.length).toBeLessThanOrEqual(1024);
    // Both halves: what it covers, and when to reach for it.
    expect(skill.description).toMatch(/^Covers /);
    expect(skill.description).toMatch(/Use wh(en|enever) /);
    // Third person — first or second person in a description hurts discovery.
    expect(skill.description).not.toMatch(/\b(I can|I will|you can use|You can)\b/);

    // Under the 500-line guidance, and no references to split out.
    expect(skill.markdown.split("\n").length).toBeLessThan(500);
  }
});

test("every skill file is discovered and carries a routing description", () => {
  const files = readdirSync(SKILLS_DIR).filter((f) => f.endsWith(".md"));
  expect(files.length).toBeGreaterThan(5);
  expect(skillNames.sort()).toEqual(files.map((f) => f.replace(/\.md$/, "")).sort());

  for (const name of skillNames) {
    const skill = getSkill(name)!;
    expect(skill.description.length).toBeGreaterThan(20);
    expect(skill.markdown.length).toBeGreaterThan(100);
    // Frontmatter is stripped, not handed to the model.
    expect(skill.markdown).not.toContain("description:");
  }
});

test("the load_skill description lists every guide, so the model can route", () => {
  const menu = skillMenu();
  for (const name of skillNames) expect(menu).toContain(`\`${name}\``);
  expect(TOOLS.load_skill?.description).toContain(menu);
});

test("load_skill returns a guide's markdown and rejects an unknown name", async () => {
  const ok = await runServerTool("load_skill", { skill: "control-center" });
  expect(ok.ok).toBe(true);
  expect(ok.content).toContain("Draft");
  expect(ok.summary).toContain("control-center");

  const bad = await runServerTool("load_skill", { skill: "nope" });
  expect(bad.ok).toBe(false);
  expect(bad.content).toContain("Available:");
});

// The domain depth moved out of the always-on prompt; if a section drifts back
// in, the guides stop being the single source for it.
test("instructions.md keeps only the always-on sections", () => {
  const prompt = readFileSync(new URL("../src/agent/instructions.md", import.meta.url), "utf8");
  const headings = [...prompt.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  // Peers is deliberately still inline while every other domain sits behind
  // `load_skill`: nearly every question is about a device, so a guide would be
  // loaded on almost every turn and cost a step to say what the prompt can
  // carry for the price of a paragraph.
  expect(headings).toEqual(["Style", "Tools", "Account data", "Peers"]);
  expect(prompt).toContain("load_skill");
});
