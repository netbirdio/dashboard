import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Account } from "@/interfaces/Account";
import { UserEmailMappingSetting } from "@/modules/integrations/event-streaming/UserEmailMappingSetting";

const put = vi.fn();
const confirm = vi.fn();

vi.mock("@utils/api", () => ({
  useApiCall: () => ({ put }),
}));
vi.mock("@components/Notification", () => ({
  notify: ({ promise }: { promise: Promise<unknown> }) => promise,
}));
vi.mock("swr", () => ({
  useSWRConfig: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/contexts/DialogProvider", () => ({
  useDialog: () => ({ confirm }),
}));
vi.mock("@/contexts/PermissionsProvider", () => ({
  usePermissions: () => ({ permission: { settings: { update: true } } }),
}));

const buildAccount = (enabled: boolean) =>
  ({
    id: "acc-1",
    settings: { extra: { user_email_mapping_enabled: enabled } },
  }) as unknown as Account;

beforeEach(() => {
  put.mockReset().mockResolvedValue({});
  confirm.mockReset().mockResolvedValue(true);
});

afterEach(cleanup);

describe("UserEmailMappingSetting", () => {
  it("does not toggle the setting when the Learn more link is clicked", () => {
    render(<UserEmailMappingSetting account={buildAccount(true)} />);

    fireEvent.click(screen.getByRole("link", { name: /learn more/i }));

    expect(put).not.toHaveBeenCalled();
    expect(
      screen
        .getByTestId("event-streaming-user-emails")
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("still toggles the setting when the row is clicked", () => {
    render(<UserEmailMappingSetting account={buildAccount(true)} />);

    fireEvent.click(screen.getByText("Include user emails"));

    expect(put).toHaveBeenCalledTimes(1);
    expect(put.mock.calls[0][0].settings.extra.user_email_mapping_enabled).toBe(
      false,
    );
  });
});
