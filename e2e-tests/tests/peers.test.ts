import { test } from '@playwright/test'
import {AddPeerModal} from '../pages/modals/add-peer-modal'
import {PeersPage} from '../pages/peers-page'
import {LoginPage} from '../pages/login-page'

let addPeerModal: AddPeerModal
let peersPage: PeersPage
let loginPage: LoginPage

test.beforeEach(async ({ page }) => {
  addPeerModal = new AddPeerModal(page);
  loginPage = new LoginPage(page);
  await loginPage.doLogin();
  await addPeerModal.assertPeerModalIsVisible();
});

test('Test Linux tab on a first access add peer modal / @bc', async function () {
    await addPeerModal.openLinuxTab();
    await addPeerModal.assertLinuxTabHasCorrectText();
  });

test('Test Windows tab on a first access add peer modal / @bc', async () => {
  await addPeerModal.openWindowsTab();
  await addPeerModal.assertWindowsDownloadButtonHasCorrectLink();
});

test('Test MacOS tab on a first access add peer modal / @bc', async () => {
  await addPeerModal.openMacTab();
  await addPeerModal.assertIntelDownloadButtonHasCorrectLink();
  await addPeerModal.assertM1M2DownloadButtonHasCorrectLink();
});

test('Test iOS tab on a first access add peer modal', async () => {
  await addPeerModal.openIOSTab();
  await addPeerModal.assertiOSDownloadButtonHasCorrectLink();
});

test('Test Android tab on a first access add peer modal', async () => {
  await addPeerModal.openAndroidTab();
  await addPeerModal.assertAndroidDownloadButtonHasCorrectLink();
});

 test('Test Docker tab on a first access add peer modal', async () => {
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