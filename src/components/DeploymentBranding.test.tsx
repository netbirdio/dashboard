import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DeploymentBranding } from "@/components/DeploymentBranding";

const favicon = () =>
  document.querySelector<HTMLLinkElement>('link[rel="icon"]');

beforeEach(() => {
  document.head.innerHTML =
    '<title>Peers - NetBird Dashboard</title><link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="16x16">';
});

afterEach(cleanup);

describe("DeploymentBranding", () => {
  it("changes nothing without branding", () => {
    render(<DeploymentBranding branding={{}} />);
    expect(document.title).toBe("Peers - NetBird Dashboard");
    expect(favicon()?.getAttribute("href")).toBe("/favicon.ico");
    expect(favicon()?.getAttribute("type")).toBe("image/x-icon");
  });

  it("applies the name and keeps it across navigation", async () => {
    render(<DeploymentBranding branding={{ name: "Acme Access" }} />);
    expect(document.title).toBe("Peers - Acme Access");
    expect(favicon()?.getAttribute("href")).toBe("/favicon.ico");

    document.title = "Groups - NetBird Dashboard";
    await waitFor(() => expect(document.title).toBe("Groups - Acme Access"));
  });

  it("applies the favicon, also to icons added later", async () => {
    render(
      <DeploymentBranding branding={{ faviconUrl: "/branding/icon.png" }} />,
    );
    expect(document.title).toBe("Peers - NetBird Dashboard");
    expect(favicon()?.getAttribute("href")).toBe("/branding/icon.png");
    expect(favicon()?.hasAttribute("type")).toBe(false);
    expect(favicon()?.hasAttribute("sizes")).toBe(false);

    favicon()?.remove();
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = "/favicon.ico";
    document.head.appendChild(link);
    await waitFor(() =>
      expect(favicon()?.getAttribute("href")).toBe("/branding/icon.png"),
    );
  });

  it("stops when unmounted", async () => {
    const { unmount } = render(
      <DeploymentBranding branding={{ name: "Acme Access" }} />,
    );
    unmount();
    document.title = "Groups - NetBird Dashboard";
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.title).toBe("Groups - NetBird Dashboard");
  });
});
