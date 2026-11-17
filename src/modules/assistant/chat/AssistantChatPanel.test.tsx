import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantChatPanel } from "./AssistantChatPanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {} }),
  usePathname: () => "/peers",
}));
vi.mock("@/contexts/ApplicationProvider", () => ({
  useApplicationContext: () => ({}),
}));
vi.mock("@/contexts/UsersProvider", () => ({
  useLoggedInUser: () => ({}),
}));
const sidebar = { available: false, open: false };
const session = { headers: undefined as (() => Promise<Record<string, string>>) | undefined };
const pending = { approval: false };

vi.mock("@/modules/assistant/AssistantSidebarProvider", () => ({
  useAssistantSidebar: () => ({
    ...sidebar,
    setOpen: () => {},
    overlay: false,
    origin: "",
  }),
}));
vi.mock("@assistant-ui/react", () => ({
  AssistantRuntimeProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuiState: () => true,
}));
vi.mock("@/modules/assistant/contexts/AssistantContext", () => ({
  AssistantProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/modules/assistant/hooks/useAssistant", () => ({
  useAssistant: () => ({ runtime: {}, prewarm: () => {}, newChat: () => {} }),
}));
vi.mock("@/modules/assistant/chat/AssistantThread", () => ({
  AssistantThread: () =>
    pending.approval ? <div role="alertdialog" tabIndex={-1} /> : <textarea />,
}));
vi.mock("@/modules/assistant/AssistantChatContextProvider", () => ({
  useActivePageContext: () => ({ entry: null, dismiss: () => {} }),
  usePageContextString: () => () => null,
}));
vi.mock("@/modules/assistant/useAssistantHeaders", () => ({
  useAssistantHeaders: () => session.headers,
}));
vi.mock("@/modules/assistant/useAssistantManagementFetch", () => ({
  useAssistantManagementFetch: () => undefined,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sidebar.available = false;
  sidebar.open = false;
  session.headers = undefined;
  pending.approval = false;
});

const openPanel = () => {
  sidebar.available = true;
  session.headers = async () => ({});
  const view = render(<AssistantChatPanel />);
  sidebar.open = true;
  view.rerender(<AssistantChatPanel />);
};

describe("AssistantChatPanel", () => {
  it("renders nothing, rather than failing the layout, where crypto.randomUUID is missing", () => {
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });

    const { container } = render(<AssistantChatPanel />);

    expect(container.innerHTML).toBe("");
  });

  it("focuses the composer when it opens", async () => {
    openPanel();

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox")));
  });

  it("focuses a request waiting for an answer when it opens on one", async () => {
    pending.approval = true;
    openPanel();

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("alertdialog")));
  });
});
