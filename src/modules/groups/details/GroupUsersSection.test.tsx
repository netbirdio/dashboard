import { TooltipProvider } from "@radix-ui/react-tooltip";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { User } from "@/interfaces/User";

// The generated password lives in UserInviteModal's own state. Creating the
// first user of a group swaps the empty state for the table, so the modal has
// to be mounted outside that empty state or it unmounts and takes the
// password with it (#742). The modal is replaced by a stub that keeps the
// same kind of local state.

const group = { id: "g1", name: "Empty", peers: [] };
const newUser = {
  id: "u1",
  name: "New User",
  email: "new@example.com",
  role: "user",
  status: "active",
  auto_groups: ["g1"],
} as unknown as User;

vi.mock("@utils/config", () => ({
  default: () => ({ apiOrigin: "http://localhost", redirectURI: "/" }),
}));
vi.mock("@utils/api", () => ({
  default: () => ({ data: [], isLoading: false }),
  useApiCall: () => ({ put: vi.fn(), post: vi.fn() }),
}));
vi.mock("@utils/netbird", () => ({ isNetBirdCloud: () => false }));
vi.mock("@/contexts/GroupProvider", () => ({
  useGroupContext: () => ({
    group,
    addUsersToGroup: vi.fn(),
    removeUsersFromGroup: vi.fn(),
  }),
}));
vi.mock("@/contexts/GroupsProvider", () => ({
  useGroups: () => ({ groups: [group] }),
}));
vi.mock("@/contexts/PermissionsProvider", () => ({
  usePermissions: () => ({
    permission: { users: { create: true, update: true, read: true } },
  }),
}));
vi.mock("@/modules/account/useAccount", () => ({
  useAccount: () => ({
    settings: { embedded_idp_enabled: true, local_auth_disabled: false },
  }),
}));
vi.mock("@/modules/agent-network/useAgentNetworkMode", () => ({
  useAgentNetworkMode: () => ({ enabled: false }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/group",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/modules/groups/AssignUserToGroupModal", () => ({
  AssignUserToGroupModal: () => null,
}));
// The last-login cell needs a dayjs plugin the app layout registers; only the
// name matters here.
vi.mock("@/modules/users/table-cells/UserNameCell", () => ({
  default: ({ user }: { user: User }) => <span>{user.name}</span>,
}));
vi.mock("@/modules/common-table-rows/LastTimeRow", () => ({
  default: () => null,
}));
vi.mock("@/modules/users/UserInviteModal", () => ({
  default: function UserInviteModalStub({
    children,
    open,
  }: {
    children?: React.ReactNode;
    open?: boolean;
  }) {
    const [password, setPassword] = useState<string | null>(null);
    return (
      <>
        {children}
        {(open ?? true) && !password && (
          <button onClick={() => setPassword("generated-password")}>
            Create User
          </button>
        )}
        {password && <p>Password: {password}</p>}
      </>
    );
  },
}));

const { GroupUsersSection } = await import(
  "@/modules/groups/details/GroupUsersSection"
);

afterEach(cleanup);

const renderSection = (users: User[]) => (
  <TooltipProvider>
    <GroupUsersSection users={users} isLoading={false} />
  </TooltipProvider>
);

describe("GroupUsersSection", () => {
  it("keeps the generated password visible after the first user is added", async () => {
    const { rerender } = render(renderSection([]));

    expect(
      await screen.findByText("This group has no assigned users yet"),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Add User/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create User" }));
    expect(screen.getByText("Password: generated-password")).toBeTruthy();

    // The users list refreshes and the group is no longer empty.
    rerender(renderSection([newUser]));

    expect(await screen.findByText("New User")).toBeTruthy();
    expect(screen.getByText("Password: generated-password")).toBeTruthy();
  });
});
