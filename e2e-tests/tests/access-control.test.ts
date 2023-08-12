import { test, expect } from '@playwright/test';
import {AddPeerModal} from '../pages/modals/add-peer-modal'

const URL = 'https://app.netbird.io/'
const localUrl = 'http://localhost:3000/'
let addPeerModal: AddPeerModal;

test.beforeEach(async ({ page }) => {
  addPeerModal = new AddPeerModal(page);
  await page.goto(localUrl);
  await page.getByPlaceholder('username@domain').fill('admin@localhost');
  await page.getByRole('button', { name: 'next' }).click();
  await page.getByLabel('Password').fill('testMe123@');
  await page.getByRole('button', { name: 'next' }).click();
  const skipButton = page.getByRole('button', { name: 'skip' });
  if (await skipButton.isVisible({ timeout: 300 })) {
      await skipButton.click();
  }
  await addPeerModal.assertPeerModalIsVisible();
});

 test('Confirm that new user has Default access', async ({ page }) => {
  await addPeerModal.closeAddPeerModal();
  await addPeerModal.assertPeerModalIsNotVisible();
  await page.getByTestId('access-control-page').click();
  await expect(page.getByRole('cell', { name: 'Default' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByTestId('confirm-delete-modal-title')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
 });