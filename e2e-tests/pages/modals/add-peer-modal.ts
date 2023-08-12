import { Page, test, expect } from "@playwright/test";

export class AddPeerModal {
    private readonly addPeerModal = this.page.getByTestId('add-peer-modal').locator('div').nth(2)
    private readonly linuxTab = this.page.getByTestId('add-peer-modal-linux-tab')
    private readonly windowsTab = this.page.getByTestId('add-peer-modal-windows-tab')
    private readonly macTab = this.page.getByTestId('add-peer-modal-mac-tab')
    private readonly androidTab = this.page.getByTestId('add-peer-modal-android-tab')
    private readonly dockerTab = this.page.getByTestId('add-peer-modal-docker-tab')
    private readonly linuxTabText = this.page.locator('pre').filter({ hasText: 'curl -fsSL https://pkgs.netbird.io/install.sh | sh' })
    private readonly windowsDownloadButton = this.page.getByTestId('download-windows-button')
    private readonly intelDownloadButton = this.page.getByTestId('download-intel-button')
    private readonly m1M2DownloadButton = this.page.getByTestId('download-m1-m2-button')
    private readonly androidDownloadButton = this.page.getByTestId('download-android-button')
    private readonly dockerDownloadButton = this.page.getByTestId('download-docker-button')
    private readonly closeButton = this.page.getByLabel('Close', { exact: true })

    constructor(private readonly page: Page) {}

    async assertPeerModalIsVisible() {
        await test.step('Assert that add peer modal is visible', async () => {
            await expect(this.addPeerModal).toBeVisible();
        })
      }

      async assertPeerModalIsNotVisible() {
        await test.step('Assert that add peer modal is not visible', async () => {
            await expect(this.addPeerModal).not.toBeVisible();
        })
      }

      async openLinuxTab() {
        await test.step('Open Linux tab on add peer modal', async () => {
            await this.linuxTab.click();
            
        })
      }

      async openWindowsTab() {
        await test.step('Open Windows tab on add peer modal', async () => {
            await this.windowsTab.click();
            
        })
      }

      async openMacTab() {
        await test.step('Open MacOS tab on add peer modal', async () => {
            await this.macTab.click();
            
        })
      }

      async openAndroidTab() {
        await test.step('Open Android tab on add peer modal', async () => {
            await this.androidTab.click();
            
        })
      }

      async openDockerTab() {
        await test.step('Open Docker tab on add peer modal', async () => {
            await this.dockerTab.click();
            
        })
      }

      async assertLinuxTabHasCorrectText() {
        await test.step('Assert Linux tab has correct installation text', async () => {
            await expect(this.linuxTabText).toBeVisible();
        })
      }

      async assertWindowsDownloadButtonHasCorrectLink() {
        await test.step('Assert Windows download button has a correct link', async () => {
            await expect(this.windowsDownloadButton).toHaveAttribute('href', 'https://pkgs.netbird.io/windows/x64');
        })
      }

      async assertIntelDownloadButtonHasCorrectLink() {
        await test.step('Assert Intel download button has a correct link', async () => {
            await expect(this.intelDownloadButton).toHaveAttribute('href', 'https://pkgs.netbird.io/macos/amd64');
        })
      }

      async assertM1M2DownloadButtonHasCorrectLink() {
        await test.step('Assert M1 & M2 download button has a correct link', async () => {
            await expect(this.m1M2DownloadButton).toHaveAttribute('href', 'https://pkgs.netbird.io/macos/arm64');
        })
      }

      async assertAndroidDownloadButtonHasCorrectLink() {
        await test.step('Assert Android download button has a correct link', async () => {
            await expect(this.androidDownloadButton).toHaveAttribute('href', 'https://play.google.com/store/apps/details?id=io.netbird.client');
        })
      }

      async assertDockerDownloadButtonHasCorrectLink() {
        await test.step('Assert Docker download button has a correct link', async () => {
            await expect(this.dockerDownloadButton).toHaveAttribute('href', 'https://docs.docker.com/engine/install/');
        })
      }

      async closeAddPeerModal() {
        await test.step('Close Add peer modal', async () => {
          await this.closeButton.click();
        })
      }
      
    }

export default AddPeerModal;