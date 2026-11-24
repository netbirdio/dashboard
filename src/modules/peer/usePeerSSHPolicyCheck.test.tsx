import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Group } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";

let policies: unknown[] | undefined;
let policiesLoading = false;
let groupsLoaded = true;
let peerGroups: Group[] = [];

vi.mock("@utils/api", () => ({
  default: () => ({ data: policies, isLoading: policiesLoading }),
}));
vi.mock("@/contexts/GroupsProvider", () => ({
  useGroupsLoaded: () => groupsLoaded,
  useGroupsOfPeer: () => peerGroups,
}));

const { usePeerSSHPolicyCheck } = await import(
  "@/modules/peer/usePeerSSHPolicyCheck"
);

const peer = {
  id: "p1",
  ssh_enabled: true,
  version: "0.99.0",
} as unknown as Peer;

const sshPolicy = {
  enabled: true,
  rules: [{ protocol: "tcp", ports: ["22"], destinations: [{ id: "g1" }] }],
};

beforeEach(() => {
  policies = [sshPolicy];
  policiesLoading = false;
  groupsLoaded = true;
  peerGroups = [{ id: "g1" } as Group];
});

describe("usePeerSSHPolicyCheck", () => {
  it("holds the warning back while /groups is still loading", () => {
    groupsLoaded = false;
    peerGroups = [];
    const { result } = renderHook(() => usePeerSSHPolicyCheck(peer));
    expect(result.current.isCheckLoading).toBe(true);
    expect(result.current.showSSHPolicyInfo).toBe(false);
  });

  it("warns once groups are loaded and no policy reaches the peer", () => {
    peerGroups = [];
    const { result } = renderHook(() => usePeerSSHPolicyCheck(peer));
    expect(result.current.isCheckLoading).toBe(false);
    expect(result.current.showSSHPolicyInfo).toBe(true);
  });

  it("finds the policy through the peer's group and stays quiet", () => {
    const { result } = renderHook(() => usePeerSSHPolicyCheck(peer));
    expect(result.current.hasSSHPolicy).toBe(true);
    expect(result.current.showSSHPolicyInfo).toBe(false);
  });

  it("stays loading while /policies is loading", () => {
    policiesLoading = true;
    policies = undefined;
    const { result } = renderHook(() => usePeerSSHPolicyCheck(peer));
    expect(result.current.isCheckLoading).toBe(true);
    expect(result.current.showSSHPolicyInfo).toBe(false);
  });
});
