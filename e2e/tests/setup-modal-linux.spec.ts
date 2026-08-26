/**
 * Linux tab of the setup modal — distro selector spec.
 *
 * The manual-install accordion offers per-distro instructions via a
 * SelectDropdown (data-testid="linux-distro-select"). This validates that
 * switching distros swaps the repository and install commands, that
 * CLI-only distros render no desktop-app line, and that the copy button
 * emits commands without comment lines. Runs against /install, which
 * renders the setup modal without authentication.
 */
import { expect, test } from "@playwright/test";

async function openLinuxManualInstall(page: import("@playwright/test").Page) {
  await page.goto("/install");
  await page.getByTestId("setup-netbird-modal").waitFor();
  await page.getByRole("tab", { name: /linux/i }).click();
  await page.getByText("Install manually with a package manager").click();
  await page.getByTestId("linux-distro-select").waitFor();
}

async function selectDistro(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.getByTestId("linux-distro-select").click();
  await page.getByRole("option", { name }).click();
}

test.describe("Setup modal Linux distro instructions", () => {
  test("defaults to APT with repository, install and run steps", async ({
    page,
  }) => {
    await openLinuxManualInstall(page);

    const modal = page.getByTestId("setup-netbird-modal");
    await expect(modal.getByTestId("linux-distro-select")).toContainText(
      "Debian / Ubuntu (APT)",
    );
    await expect(modal).toContainText(
      "https://pkgs.netbird.io/debian stable main",
    );
    await expect(modal).toContainText("sudo apt-get install netbird");
    await expect(modal).toContainText(
      "sudo apt-get install netbird-ui libgtk-4-1 libwebkitgtk-6.0-4 xdg-utils",
    );
    // The run step stays present alongside the distro-specific steps
    await expect(modal.getByText("netbird up")).toHaveCount(2);
  });

  test("switches repository and install commands per distro", async ({
    page,
  }) => {
    await openLinuxManualInstall(page);
    const modal = page.getByTestId("setup-netbird-modal");

    await selectDistro(page, "Fedora (DNF)");
    await expect(modal).toContainText("/etc/yum.repos.d/netbird.repo");
    await expect(modal).toContainText("sudo dnf install netbird");
    await expect(modal).toContainText(
      "sudo dnf install netbird-ui gtk4 webkitgtk6.0 xdg-utils",
    );
    await expect(modal).not.toContainText("apt-get");
    await expect(modal).not.toContainText("epel-release");

    await selectDistro(page, "RHEL / AlmaLinux / Rocky (DNF)");
    await expect(modal).toContainText("sudo dnf install epel-release -y");
    await expect(modal).toContainText(
      "sudo dnf install netbird-ui gtk4 webkitgtk6.0 xdg-utils",
    );
  });

  test("imports the repository GPG key on openSUSE", async ({ page }) => {
    await openLinuxManualInstall(page);
    const modal = page.getByTestId("setup-netbird-modal");

    await selectDistro(page, "openSUSE (Zypper)");
    await expect(modal).toContainText(
      "sudo zypper --non-interactive addrepo -f -g https://pkgs.netbird.io/yum/ netbird",
    );
    await expect(modal).toContainText(
      "sudo zypper --gpg-auto-import-keys refresh netbird",
    );
    await expect(modal).toContainText("sudo zypper install netbird");
    await expect(modal).toContainText(
      "sudo zypper install netbird-ui libgtk-4-1 libwebkitgtk-6_0-4 xdg-utils",
    );
    // Zypper ignores gpgkey= in a .repo file, so that snippet must not appear
    await expect(modal).not.toContainText("/etc/yum.repos.d/netbird.repo");
  });

  test("offers CLI only on Amazon Linux", async ({ page }) => {
    await openLinuxManualInstall(page);
    const modal = page.getByTestId("setup-netbird-modal");

    await selectDistro(page, "Amazon Linux (YUM)");
    await expect(modal).toContainText("sudo yum install netbird");
    await expect(modal).not.toContainText("netbird-ui");
    await expect(modal).not.toContainText("for CLI only");
    await expect(modal).toContainText("only the CLI is available");
  });

  test("copies install commands without comment lines", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openLinuxManualInstall(page);
    const modal = page.getByTestId("setup-netbird-modal");

    // Copy buttons in DOM order: install script, run command, repository,
    // install step, run command (accordion).
    await modal.getByTestId("copy-to-clipboard").nth(3).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied, "clipboard should hold runnable commands only").toBe(
      [
        "sudo apt-get update",
        "sudo apt-get install netbird",
        "sudo apt-get install netbird-ui libgtk-4-1 libwebkitgtk-6.0-4 xdg-utils",
      ].join("\n"),
    );
  });
});
