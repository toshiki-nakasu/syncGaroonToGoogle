import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowser } from '../support/Browser.js';

test('設定保存後、ポップアップで停止と再開を行っても同期間隔を保持する', async (t) => {
  const browser = await createBrowser(t);
  const { options, worker } = browser;
  await options.evaluate(() => {
    chrome.permissions.request = async () => true;
  });
  await options.locator('#syncIntervalMinutes').fill('7');
  await options.locator('#autoSync').check();
  await options
    .getByRole('button', { name: '設定を保存', exact: true })
    .click();
  await options.waitForFunction(
    () =>
      document.querySelector('#feedback').textContent ===
      '設定を保存しました。',
  );
  assert.equal(
    await worker.evaluate(
      async () =>
        (await chrome.alarms.get('garoon-calendar-sync')).periodInMinutes,
    ),
    7,
  );
  const popup = await browser.popup();
  await popup
    .getByRole('button', { name: '自動同期を停止', exact: true })
    .click();
  await popup
    .getByRole('button', { name: '自動同期を再開', exact: true })
    .waitFor();
  assert.equal(
    await worker.evaluate(() => chrome.alarms.get('garoon-calendar-sync')),
    undefined,
  );
  await popup
    .getByRole('button', { name: '自動同期を再開', exact: true })
    .click();
  await popup
    .getByRole('button', { name: '自動同期を停止', exact: true })
    .waitFor();
  assert.equal(
    await worker.evaluate(
      async () =>
        (await chrome.alarms.get('garoon-calendar-sync')).periodInMinutes,
    ),
    7,
  );
  await options.reload();
  await options.waitForFunction(
    () => document.querySelector('#syncIntervalMinutes').value === '7',
  );
  browser.assertNoPageErrors();
});

test('実Chromeの保存領域を通して確認した27件をバッチで全削除する', async (t) => {
  const browser = await createBrowser(t);
  const { options, worker } = browser;
  await worker.evaluate(() => {
    globalThis.browserTest.events = Array.from({ length: 27 }, (_, index) => ({
      id: `event${index}`,
      etag: `"etag-${index}"`,
    }));
  });
  await options.locator('.clear-button').click();
  await options.locator('#clear-dialog').waitFor({ state: 'visible' });
  await options.locator('#clear-confirm').click();
  await options
    .locator('#clear-progress[data-kind="clearing"]')
    .waitFor({ state: 'visible' });
  await options
    .locator('#clear-message')
    .filter({ hasText: '25 / 27件' })
    .waitFor();
  assert.equal(
    await worker.evaluate(() => globalThis.browserTest.deleted.length),
    25,
  );
  await worker.evaluate(() =>
    chrome.alarms.create('garoon-calendar-clear', { when: Date.now() + 100 }),
  );
  await options
    .locator('#clear-progress[data-kind="complete"]')
    .waitFor({ state: 'visible' });
  assert.equal(
    await worker.evaluate(() => globalThis.browserTest.events.length),
    0,
  );
  assert.match(
    await options.locator('#clear-message').innerText(),
    /27件を全削除/,
  );
  browser.assertNoPageErrors();
});

test('削除APIの失敗理由を表示し、設定画面を再読込しても保持する', async (t) => {
  const browser = await createBrowser(t);
  const { options, worker } = browser;
  await worker.evaluate(() => {
    globalThis.browserTest.events = [{ id: 'event1', etag: '"v1"' }];
    globalThis.browserTest.failDelete = true;
  });
  await options.locator('.clear-button').click();
  await options.locator('#clear-dialog').waitFor({ state: 'visible' });
  await options.locator('#clear-confirm').click();
  await options
    .locator('#clear-progress[data-kind="failed"]')
    .waitFor({ state: 'visible' });
  assert.match(await options.locator('#clear-message').innerText(), /HTTP 403/);
  await options.reload();
  await options
    .locator('#clear-progress[data-kind="failed"]')
    .waitFor({ state: 'visible' });
  assert.match(await options.locator('#clear-message').innerText(), /HTTP 403/);
  assert.equal(
    await worker.evaluate(() => globalThis.browserTest.events.length),
    1,
  );
  browser.assertNoPageErrors();
});
