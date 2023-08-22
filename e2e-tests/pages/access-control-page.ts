import { Page, test, expect } from "@playwright/test";

export class AccessControlPage {
    private readonly accessControlUrl = 'http://localhost:3000/acls'
    private readonly defaulAccessControl = this.page.getByRole('cell', { name: 'Default' })
    private readonly deleteButton = this.page.getByRole('button', { name: 'Delete' })
    private readonly deleteModal = this.page.getByTestId('confirm-delete-modal-title')
    private readonly confirmButton = this.page.getByRole('button', { name: 'OK' })
    private readonly addRulesButton = this.page.getByTestId('add-rule-empty-state-button')

    constructor(private readonly page: Page) {}

      async openAccessControlPage() {
        await test.step('Open Access Control page', async () => {
            await this.page.goto(this.accessControlUrl);
        })
      }
  
    async assertDefaultAccessCotrolIsCreated() {
      await test.step('Assert that default cotrol access is created', async () => {
          await expect(this.defaulAccessControl).toBeVisible();
      })
    }

    async pressDeleteButton() {
      await test.step('Press delete button', async () => {
          await this.deleteButton.click();
      })
    }

    async assertDeleteModalIsVisibile() {
      await test.step('Assert access control deletion modal is visible', async () => {
          await expect(this.deleteModal).toBeVisible();
      })
    }

    async pressConfirmButton() {
      await test.step('Press confirm button on access control deletion modal', async () => {
        await this.confirmButton.click();
      })
    }

    async assertDefaultAccessCotrolIsDeleted() {
      await test.step('Assert default access control should be deleted', async () => {
          await expect(this.defaulAccessControl).not.toBeVisible();
      })
    }

    async assertAddRuleButtonIsVisile() {
      await test.step('Assert Add Rules button is visible', async () => {
          await expect(this.addRulesButton).toBeVisible();
      })
    }
  }

export default AccessControlPage;