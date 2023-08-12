import { test } from '@playwright/test';
import {AddPeerModal} from '../pages/modals/add-peer-modal'
import {PeersPage} from '../pages/peers-page'

const URL = 'https://app.netbird.io/'
const localUrl = 'http://localhost:3000/'
let addPeerModal: AddPeerModal;
let peersPage: PeersPage;

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

test('Test Linux tab on a first access add peer modal / @bc', async function ({ }) {
    await addPeerModal.openLinuxTab();
    await addPeerModal.assertLinuxTabHasCorrectText();
  });

test('Test Windows tab on a first access add peer modal / @bc', async ({ }) => {
  await addPeerModal.openWindowsTab();
  await addPeerModal.assertWindowsDownloadButtonHasCorrectLink();
});

test('Test MacOS tab on a first access add peer modal / @bc', async ({ }) => {
  await addPeerModal.openMacTab();
  await addPeerModal.assertIntelDownloadButtonHasCorrectLink();
  await addPeerModal.assertM1M2DownloadButtonHasCorrectLink();
});

test('Test Android tab on a first access add peer modal', async ({  }) => {
  await addPeerModal.openAndroidTab();
  await addPeerModal.assertAndroidDownloadButtonHasCorrectLink();
});

 test('Test Docker tab on a first access add peer modal', async ({  }) => {
  await addPeerModal.openDockerTab();
  await addPeerModal.assertDockerDownloadButtonHasCorrectLink();
 });

 test('Close and open Add peer modal', async ({ page }) => {
  peersPage = new PeersPage(page);
  await addPeerModal.closeAddPeerModal();
  await addPeerModal.assertPeerModalIsNotVisible();
  await peersPage.clickOnAddNewPeerButton();
  await addPeerModal.assertPeerModalIsVisible();
 });