import { test, expect } from '@playwright/test';
import {AddPeerModal} from '../pages/modals/add-peer-modal'
import {TopMenu} from '../pages/top-menu';

const URL = 'https://app.netbird.io/'
const localUrl = 'http://localhost:3000/'
let addPeerModal: AddPeerModal;
let topMenu: TopMenu;

test.beforeEach(async ({ page }) => {
  addPeerModal = new AddPeerModal(page);
  await page.goto(localUrl);
  await page.getByPlaceholder('username@domain').fill('admin@localhost');
  await page.getByRole('button', { name: 'next' }).click();
  await page.getByLabel('Password').fill('testMe123@');
  await page.getByRole('button', { name: 'next' }).click();
  await addPeerModal.assertPeerModalIsVisible();
});

 test('Confirm that new user has Default access', async ({ page }) => {
  topMenu = new TopMenu(page);
  await addPeerModal.closeAddPeerModal();
  await addPeerModal.assertPeerModalIsNotVisible();
  await topMenu.clickOnAccessControlOnTopMenu();
  await expect(page.getByRole('cell', { name: 'Default' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByTestId('confirm-delete-modal-title')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
 });