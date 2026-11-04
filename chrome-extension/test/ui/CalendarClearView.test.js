import assert from 'node:assert/strict';
import test from 'node:test';
import { CalendarClearView } from '../../ui/CalendarClearView.js';
import { createUi } from '../support/UiFixture.js';
import { until } from '../support/Async.js';
import { loadDocument } from '../support/Ui.js';

const preview = {
  exists: true,
  name: 'Garoon',
  calendarId: 'work',
  count: 2,
  token: 'confirmed-token',
};

for (const cancel of ['button', 'escape'])
  test(`${cancel}で全削除を取り消すと実行を依頼しない`, async (t) => {
    const f = createUi(t);
    f.handle(async () => preview);
    const view = new CalendarClearView(f.request, () => {});
    const pending = view.clear('Garoon');
    await until(() => f.element('clear-dialog').open);
    if (cancel === 'button') await f.element('clear-cancel').click();
    else f.element('clear-dialog').dispatch('cancel');
    await pending;
    assert.deepEqual(
      f.messages.map(({ type }) => type),
      ['prepareCalendarClear'],
    );
    assert.equal(f.element('clear-dialog').open, false);
    assert.match(f.element('clear-message').textContent, /キャンセル/);
  });
for (const target of [
  { exists: false, count: 0 },
  { exists: true, count: 0 },
])
  test(`対象が${target.exists ? '0件' : '存在しない'}場合は確認と実行を省く`, async (t) => {
    const f = createUi(t);
    f.handle(async () => ({ name: 'Garoon', ...target }));
    await new CalendarClearView(f.request, () => {}).clear('Garoon');
    assert.equal(f.element('clear-dialog').open, false);
    assert.equal(f.messages.length, 1);
    assert.equal(f.element('clear-progress').hidden, false);
  });
test('開始前の失敗を一覧直下に保存し、古い成功通知や画面の再表示で消さない', async (t) => {
  const f = createUi(t);
  f.handle(async (message) => {
    if (message.type === 'prepareCalendarClear') return preview;
    throw new Error('確認中に予定が変更されました。');
  });
  const view = new CalendarClearView(f.request, () => {});
  const pending = view.clear('Garoon');
  await until(() => f.element('clear-dialog').open);
  await f.element('clear-confirm').click();
  await pending;
  assert.match(f.element('clear-message').textContent, /削除開始.*予定が変更/);
  const oldState = {
    kind: 'paused',
    clearResult: { status: 'complete', message: '前回の削除完了' },
  };
  view.update({ state: { newValue: oldState } });
  assert.match(f.element('clear-message').textContent, /予定が変更/);
  const reopened = loadDocument(
    new URL('../../ui/options.html', import.meta.url),
  );
  globalThis.document = reopened.document;
  await new CalendarClearView(f.request, () => {}).restore(oldState);
  assert.equal(reopened.elements.get('clear-progress').hidden, false);
  assert.match(
    reopened.elements.get('clear-message').textContent,
    /予定が変更/,
  );
});
