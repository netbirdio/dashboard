import { describe, expect, it } from "vitest";
import { agentNetworkNavAccess } from "@/modules/agent-network/agentNetworkNavigation";

const all = {
  "agent_network.providers": { read: true },
  "agent_network.policies": { read: true },
  "agent_network.usage": { read: true },
  "agent_network.logs": { read: true },
  "agent_network.settings": { read: true },
};

describe("agentNetworkNavAccess", () => {
  it("shows every entry to an Agent Network admin", () => {
    expect(
      agentNetworkNavAccess({
        permission: all,
        surface: true,
        configured: false,
        insightsPreview: true,
      }),
    ).toEqual({
      insights: true,
      usage: true,
      agents: true,
      connect: true,
      providers: true,
      policies: true,
      configuration: true,
    });
  });

  it("hides everything when the surface is off, configured caller or not", () => {
    const access = agentNetworkNavAccess({
      permission: all,
      surface: false,
      configured: true,
      insightsPreview: true,
    });
    expect(Object.values(access).some(Boolean)).toBe(false);
  });

  it("keeps Insights behind the preview flag", () => {
    expect(
      agentNetworkNavAccess({
        permission: all,
        surface: true,
        configured: false,
        insightsPreview: false,
      }).insights,
    ).toBe(false);
  });

  it("gives a configured plain user Connect Agent and their own Usage & Logs", () => {
    expect(
      agentNetworkNavAccess({
        permission: {},
        surface: true,
        configured: true,
        insightsPreview: true,
      }),
    ).toEqual({
      insights: false,
      usage: true,
      agents: true,
      connect: true,
      providers: false,
      policies: false,
      configuration: false,
    });
  });

  it("gives a usage viewer Insights, Usage & Logs and Connect Agent only", () => {
    expect(
      agentNetworkNavAccess({
        permission: { "agent_network.usage": { read: true } },
        surface: true,
        configured: false,
        insightsPreview: true,
      }),
    ).toEqual({
      insights: true,
      usage: true,
      agents: true,
      connect: true,
      providers: false,
      policies: false,
      configuration: false,
    });
  });

  it("shows nothing to a caller without grants or a setup", () => {
    const access = agentNetworkNavAccess({
      permission: {},
      surface: true,
      configured: false,
      insightsPreview: true,
    });
    expect(Object.values(access).some(Boolean)).toBe(false);
  });
});
