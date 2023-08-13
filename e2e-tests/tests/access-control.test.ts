import { test, expect } from '@playwright/test'
import {LoginPage} from '../pages/login-page'

let loginPage: LoginPage

test.beforeEach(async ({ page }) => {
  loginPage = new LoginPage(page);
  await loginPage.doLogin();
});

 test('Confirm that new user has Default access', async ({ page }) => {
  await page.goto('http://localhost:3000/acls');
  await expect(page.getByRole('cell', { name: 'Default' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByTestId('confirm-delete-modal-title')).toBeVisible();
  await page.getByRole('button', { name: 'OK' }).click();
 });