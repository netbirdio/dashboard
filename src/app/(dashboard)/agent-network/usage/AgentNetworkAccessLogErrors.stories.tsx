import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import UsagePage from "@/app/(dashboard)/agent-network/usage/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import { MOCK_ERROR_ACCESS_LOGS } from "@/modules/agent-network/data/mockData";
import { currentUser, USER } from "@/storybook/fixtures";
import { click, findText, settle } from "@/storybook/platform";

// Access-log rows with error attribution. A file of its own so the other
// Usage stories still build against a baseline without these exports.
const meta: Meta = {
  title: "Pages/Platform/Agent Network/Usage/Access Log Errors",
  render: () => (
    <DashboardLayout>
      <UsagePage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const logs = {
  nextjs: {
    navigation: {
      pathname: "/agent-network/usage",
      query: { tab: "access-logs" },
    },
  },
};

// The failed rows with error attribution (policy, global limit, provider,
// proxy, auth) next to one successful row.
const errorRows = [
  ...MOCK_ERROR_ACCESS_LOGS.map((e) => ({
    ...e,
    user_id: USER.developer,
    group_ids: [],
  })),
  {
    id: "anlog-ok",
    service_id: "svc-agent-network",
    timestamp: "2026-10-08T12:02:00Z",
    status_code: 200,
    duration_ms: 820,
    input_tokens: 1840,
    output_tokens: 610,
    total_tokens: 2450,
    cost_usd: 0.0107,
    user_id: USER.developer,
    method: "POST",
    path: "/v1/chat/completions",
    provider: "openai",
    model: "gpt-4o",
    decision: "allow",
    selected_policy_id: "anpol-eng",
    request_prompt: "Refactor this Go handler to return early.",
    response_completion: "Here's the refactored handler…",
  },
];
const errorLogs = {
  ...logs,
  api: {
    "GET /agent-network/access-logs": {
      data: errorRows,
      page: 1,
      page_size: 25,
      total_pages: 1,
      total_records: errorRows.length,
    },
  },
};
const errorLogsLoaded = async () => {
  await findText(/Proxy error/);
  await settle();
};
const expandRow = async (text: RegExp) => {
  await errorLogsLoaded();
  await click((await findText(text)).closest("tr")?.querySelector("td"));
  await settle(500);
};

export const Table: Story = {
  parameters: errorLogs,
  play: errorLogsLoaded,
};

export const PolicyBlockExpanded: Story = {
  parameters: errorLogs,
  play: () => expandRow(/^Budget limit exceeded$/),
};

export const GlobalLimitBlockExpanded: Story = {
  parameters: errorLogs,
  play: () => expandRow(/^Account token limit exceeded$/),
};

export const ProviderErrorExpanded: Story = {
  parameters: errorLogs,
  play: () => expandRow(/^Provider error \(401\)$/),
};

export const ProxyErrorExpanded: Story = {
  parameters: errorLogs,
  play: () => expandRow(/^Proxy error: Destination Not Allowed$/),
};

export const AuthErrorExpanded: Story = {
  parameters: errorLogs,
  play: () => expandRow(/^Authentication$/),
};

// A member without the account-wide Agent Network grants: the server
// self-scopes the log to their own requests and leaves error_detail out.
const noAccess = { create: false, read: false, update: false, delete: false };
const selfScopedUser = {
  ...currentUser,
  role: "user",
  permissions: {
    ...currentUser.permissions,
    modules: {
      ...currentUser.permissions.modules,
      "agent_network.providers": noAccess,
      "agent_network.policies": noAccess,
      "agent_network.guardrails": noAccess,
      "agent_network.budgets": noAccess,
      "agent_network.usage": noAccess,
      "agent_network.logs": noAccess,
      "agent_network.settings": noAccess,
    },
  },
};
const selfScopedRows = errorRows.map((row) => {
  const { error_detail: _, ...rest } = row as { error_detail?: string };
  return rest;
});

export const SelfScopedPolicyBlockExpanded: Story = {
  parameters: {
    ...logs,
    api: {
      "GET /users/current": selfScopedUser,
      "GET /agent-network/access-logs": {
        data: selfScopedRows,
        page: 1,
        page_size: 25,
        total_pages: 1,
        total_records: selfScopedRows.length,
      },
    },
  },
  play: async () => {
    await expandRow(/^Budget limit exceeded$/);
    // Without the policies grant the name falls back to the id, as plain text.
    const blockedBy = await findText("Blocked by");
    const section = blockedBy.parentElement;
    await expect(section?.textContent).toContain("anpol-contractors");
    await expect(section?.querySelector("a")).toBeNull();
    await expect(document.body.textContent).not.toContain("Error detail");
  },
};
