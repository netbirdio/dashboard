import { test, expect } from '@playwright/test'
import {LoginPage} from '../pages/login-page'
import {AccessControlPage} from '../pages/access-control-page'

let loginPage: LoginPage
let accessControlPage: AccessControlPage

test.beforeEach(async ({ page }) => {
  loginPage = new LoginPage(page);
  await loginPage.doLogin();
});

 test('Confirm that new user has Default access', async ({ page }) => {
  accessControlPage = new AccessControlPage(page);
  await accessControlPage.openAccessControlPage();
  await accessControlPage.assertDefaultAccessCotrolIsCreated();
  await accessControlPage.pressDeleteButton();
  await accessControlPage.assertDeleteModalIsVisibile();
  await accessControlPage.pressConfirmButton();
  await accessControlPage.assertDefaultAccessCotrolIsDeleted();
 });