import { Page, test, expect } from "@playwright/test";

export class PeersPage {
    private readonly addNewPeerButton = this.page.getByTestId('add-new-peer-button')

    constructor(private readonly page: Page) {}

      async clickOnAddNewPeerButton() {
        await test.step('Click on Add new peer Button to open Add peer modal', async () => {
            await this.addNewPeerButton.click();
        })
      }
    }

export default PeersPage;