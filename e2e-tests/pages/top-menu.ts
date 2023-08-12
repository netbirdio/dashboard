import { Page, test} from "@playwright/test";

export class TopMenu {
    private readonly accessControlButton = this.page.getByTestId('access-control-page')

    constructor(private readonly page: Page) {}

      async clickOnAccessControlOnTopMenu() {
        await test.step('Click on Access Control page on a top menu', async () => {
          await this.accessControlButton.click();  
        })
      }
    }

export default TopMenu;