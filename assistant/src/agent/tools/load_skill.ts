import { getSkill, skillMenu, skillNames } from "@/agent/skills.ts";
import { defineTool, type ServerToolResult } from "@/agent/tools/_contract.ts";

// Pull one domain guide into the turn on demand, so the always-on prompt stays
// short and every subject still gets its full depth when it comes up.
export default defineTool({
  runtime: "server",
  description:
    "Load the NetBird domain guide for a subject before you answer or act on it. Each guide carries the " +
    "vocabulary, the field meanings and the triage order for its area — read the one that matches, then " +
    "answer. Call it in your first tool batch, alongside the account reads, not after them. " +
    "Available guides:\n" +
    skillMenu(),
  inputSchema: {
    type: "object",
    properties: {
      skill: { type: "string", enum: skillNames, description: "Which guide to load." },
    },
    required: ["skill"],
  },
  execute: (input): ServerToolResult => {
    const name = (input as { skill?: unknown })?.skill;
    if (typeof name !== "string" || !getSkill(name)) {
      return {
        ok: false,
        content: `No such guide: ${String(name)}. Available: ${skillNames.join(", ")}.`,
        summary: "Unknown guide",
      };
    }
    const skill = getSkill(name)!;
    return { ok: true, content: skill.markdown, summary: `Read the ${name} guide` };
  },
});
