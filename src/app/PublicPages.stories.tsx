import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ErrorPage from "@/app/error/page";
import InstallPage from "@/app/install/page";
import InviteAcceptPage from "@/app/invite/page";
import NotFound from "@/app/not-found";
import SetupPage from "@/app/setup/page";
import InstanceSetupProvider from "@/contexts/InstanceSetupProvider";
import { dialog, findText, settle, type } from "@/storybook/platform";

/* Public pages render outside DashboardLayout: their route layouts are blank. */
const meta: Meta = { title: "Pages/Platform/Public" };
export default meta;
type Story = StoryObj;

const nav = (pathname: string, query?: Record<string, string>) => ({
  nextjs: { navigation: { pathname, query } },
});

export const Install: Story = {
  parameters: nav("/install"),
  render: () => <InstallPage />,
  play: async () => {
    await dialog();
    await settle(600);
  },
};

const setup = {
  ...nav("/setup"),
  api: { "GET /instance": { setup_required: true } },
};

export const Setup: Story = {
  parameters: setup,
  render: () => (
    <InstanceSetupProvider>
      <SetupPage />
    </InstanceSetupProvider>
  ),
  play: async () => {
    await findText("Welcome to NetBird");
    await settle();
  },
};

export const SetupFilledPasswordMismatch: Story = {
  parameters: setup,
  render: Setup.render,
  play: async () => {
    await findText("Welcome to NetBird");
    const field = (placeholder: string) =>
      document.querySelector(`input[placeholder="${placeholder}"]`);
    await type(field("Your name"), "Olivia Owner");
    await type(field("admin@example.com"), "owner@netbird.io");
    await type(field("Enter a strong password"), "Correct-Horse-1");
    await type(field("Re-enter your password"), "Correct-Horse-2");
    await settle();
  },
};

export const Invite: Story = {
  parameters: nav("/invite", { token: "inv-token-valid" }),
  render: () => <InviteAcceptPage />,
  play: async () => {
    await findText(/nora\.new-hire@netbird\.io/);
    await settle();
  },
};

export const InvitePasswordChecks: Story = {
  parameters: Invite.parameters,
  render: Invite.render,
  play: async () => {
    await findText(/nora\.new-hire@netbird\.io/);
    const [password, confirm] = Array.from(
      document.querySelectorAll("input[type=password]"),
    );
    await type(password, "weakpass1");
    await type(confirm, "weakpass2");
    await settle();
  },
};

export const InviteExpired: Story = {
  parameters: nav("/invite", { token: "expired" }),
  render: Invite.render,
  play: async () => {
    await findText("Invite Expired");
    await settle();
  },
};

export const InviteWithoutToken: Story = {
  parameters: nav("/invite"),
  render: Invite.render,
  play: async () => {
    await findText("Invalid Invite");
    await settle();
  },
};

const errorStory = (code: string, message: string): Story => ({
  parameters: nav("/error", { code, message }),
  render: () => <ErrorPage />,
  play: async () => {
    await findText(/response_message|Waiting|approval|Blocked|Error/i);
    await settle();
  },
});
export const Error = errorStory("500", "internal server error");
export const ErrorUserBlocked = errorStory("403", "user is blocked");
export const ErrorPendingApproval = errorStory(
  "403",
  "user is pending approval",
);

export const NotFoundPage: Story = {
  name: "Not Found",
  parameters: nav("/does-not-exist"),
  render: () => <NotFound />,
};
