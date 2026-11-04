import assert from 'node:assert/strict';
import test from 'node:test';
import { OptionsController } from '../../ui/OptionsController.js';
import { CLEAR_ALARM } from '../../src/application/CalendarClearService.js';
import { createApplication } from '../support/ApplicationFixture.js';
import { loadDocument } from '../support/Ui.js';
import { installGlobals } from '../support/Globals.js';
import { until } from '../support/Async.js';

/** UIとWorkerが同じChrome境界を使い、操作要求を実際の処理へ渡す。 */
async function start(t, count) {
  const f = await createApplication(t);
  f.google.setEvents(
    'work',
    Array.from({ length: count }, (_, i) => ({
      id: `event${String(i).padStart(2, '0')}`,
      etag: `"etag-${i}"`,
    })),
  );
  const view = loadDocument(new URL('../../ui/options.html', import.meta.url));
  installGlobals(t, { document: view.document });
  await new OptionsController().start();
  return {
    ...f,
    element: (id) => view.elements.get(id),
    clearButton: view.elements
      .get('calendar-rows')
      .children[0].querySelector('.clear-button'),
  };
}

test('設定画面から27件を削除し、処理中のロックと完了後の残件数を表示する', async (t) => {
  const f = await start(t, 27);
  const pending = f.clearButton.click();
  await until(() => f.element('clear-dialog').open);
  assert.match(f.element('clear-count').textContent, /27件/);
  await f.element('clear-confirm').click();
  await pending;
  assert.equal(f.element('clear-meter').value, 25);
  assert.equal(f.clearButton.disabled, true);
  await f.alarm(CLEAR_ALARM);
  assert.equal(f.google.events('work').length, 0);
  assert.match(f.element('clear-message').textContent, /削除後の残件数: 0件/);
  assert.equal(f.clearButton.disabled, false);
  assert.equal(f.storage.data.settings.autoSync, false);
});
test('確認後に予定が変わると開始前に止め、設定画面の一覧直下へ理由を残す', async (t) => {
  const f = await start(t, 1);
  const pending = f.clearButton.click();
  await until(() => f.element('clear-dialog').open);
  f.google.setEvents('work', [{ id: 'new', etag: 'changed' }]);
  await f.element('clear-confirm').click();
  await pending;
  assert.equal(f.google.deleted.length, 0);
  assert.equal(f.element('clear-progress').hidden, false);
  assert.match(f.element('clear-message').textContent, /確認中に予定が変更/);
  await f.send({ type: 'status' });
  assert.match(f.element('clear-message').textContent, /確認中に予定が変更/);
});
test('削除APIの権限エラーを完了として扱わず、利用者へ表示する', async (t) => {
  const f = await start(t, 1);
  f.google.beforeRequest = async ({ method }) =>
    method === 'DELETE'
      ? Response.json(
          { error: { message: 'Permission denied' } },
          { status: 403 },
        )
      : undefined;
  const pending = f.clearButton.click();
  await until(() => f.element('clear-dialog').open);
  await f.element('clear-confirm').click();
  await pending;
  assert.equal(f.google.events('work').length, 1);
  assert.match(f.element('clear-message').textContent, /HTTP 403/);
  assert.equal(f.clearButton.disabled, false);
});
