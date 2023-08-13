import { Page, test} from "@playwright/test";

export class LoginPage {
    private readonly localUrl = 'http://localhost:3000/'
    private readonly usernameField = this.page.getByPlaceholder('username@domain')
    private readonly nextButton = this.page.getByRole('button', { name: 'next' })
    private readonly passwordField = this.page.getByLabel('Password')
    private readonly skipButton = this.page.getByRole('button', { name: 'skip' });

    constructor(private readonly page: Page) {}

      async doLogin() {
        await test.step('Login to local enviroment', async () => {
          await this.page.goto(this.localUrl);
          await this.usernameField.fill('admin@localhost');
          await this.pressNextButton();
          await this.passwordField.fill('testMe123@');
          await this.pressNextButton();
          if (await this.skipButton.isVisible({ timeout: 300 })) {
              await this.skipButton.click();
          }
        })
      }

      async pressNextButton() {
        await test.step('Press next button', async () => {
          await this.nextButton.click();
        })
      }
    }

export default LoginPage;