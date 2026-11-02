import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const notify = vi.fn();
const post = vi.fn();

vi.mock("@components/Notification", () => ({
  notify: (props: unknown) => notify(props),
}));
vi.mock("@utils/api", () => ({
  default: () => ({ data: [], isLoading: false, mutate: vi.fn() }),
  useApiCall: () => ({ post }),
}));
vi.mock("@/contexts/PermissionsProvider", () => ({
  usePermissions: () => ({ permission: {} }),
}));
vi.mock("@/modules/agent-network/useAgentNetworkMode", () => ({
  useAgentNetworkMode: () => ({ enabled: true }),
}));
vi.mock("@/modules/agent-network/useMyAgentNetworkSetup", () => ({
  useMyAgentNetworkSetup: () => ({ configured: false }),
}));

const { default: AIProvidersProvider, useAIProviders } = await import(
  "@/modules/agent-network/AIProvidersProvider"
);
const { EMPTY_POLICY_LIMITS } = await import(
  "@/modules/agent-network/data/mockData"
);

const policy = {
  name: "Users to OpenAI",
  description: "Lets the Users group reach OpenAI",
  enabled: true,
  sourceGroups: ["g-users"],
  destinationProviderIds: ["p1"],
  guardrailIds: [],
  limits: EMPTY_POLICY_LIMITS,
};

// renderContext renders the real provider and hands back what it provides.
const renderContext = () =>
  renderHook(() => useAIProviders(), { wrapper: AIProvidersProvider }).result
    .current;

beforeEach(() => {
  notify.mockReset();
  post.mockReset();
  post.mockResolvedValue({
    id: "pol1",
    name: policy.name,
    description: policy.description,
    enabled: true,
    source_groups: ["g-users"],
    destination_provider_ids: ["p1"],
    guardrail_ids: [],
    created_at: "",
    updated_at: "",
  });
});
afterEach(cleanup);

describe("addPolicy", () => {
  it("announces the policy it creates", async () => {
    const { addPolicy } = renderContext();
    const created = await act(() => addPolicy(policy));

    expect(created?.id).toBe("pol1");
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Policy created" }),
    );
  });

  it("creates a quiet policy without a toast", async () => {
    const { addPolicy } = renderContext();
    const created = await act(() => addPolicy(policy, { quiet: true }));

    expect(created?.id, "the policy is still created").toBe("pol1");
    expect(notify).not.toHaveBeenCalled();
  });

  it("reports a quiet policy that cannot be created", async () => {
    post.mockRejectedValue(new Error("source group not found"));
    const { addPolicy } = renderContext();
    const created = await act(() => addPolicy(policy, { quiet: true }));

    expect(created).toBeUndefined();
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Failed to create policy",
        description: "source group not found",
      }),
    );
  });
});
