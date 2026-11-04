import assert from 'node:assert/strict';
import test from 'node:test';
import { OptionsController } from '../../ui/OptionsController.js';
import { createUi } from '../support/UiFixture.js';

test('タグとカレンダー名を編集し、同じカレンダーへの複数ルールと間隔を保存する', async (t) => {
  const f = createUi(t);
  const controller = new OptionsController();
  await controller.start();
  const first = f.element('calendar-rows').children[0];
  const plus = first
    .querySelectorAll('button')
    .find((button) => button.attributes['aria-label'] === '同期先を追加');
  await plus.click();
  const added = f.element('calendar-rows').children.at(-1);
  added.querySelector('.calendar-tag').value = 'work';
  added.querySelector('.calendar-name').value = 'Garoon';
  f.element('syncIntervalMinutes').value = '11';
  await f.element('settings').dispatch('submit');
  const saved = f.messages.at(-1).settings;
  assert.deepEqual(f.calls.permissionRequests, [
    { origins: ['https://example.cybozu.com/*'] },
  ]);
  assert.equal(saved.syncIntervalMinutes, 11);
  assert.deepEqual(saved.calendarMappings.at(-1), {
    tag: 'work',
    calendarName: 'Garoon',
  });
  const minus = first
    .querySelectorAll('button')
    .find(
      (button) =>
        button.attributes['aria-label'] === 'この同期先の設定行を削除',
    );
  await minus.click();
  await f.element('settings').dispatch('submit');
  assert.equal(
    f.messages.at(-1).settings.calendarMappings.some(({ tag }) => tag === ''),
    false,
  );
});
test('入力が不正な場合とホスト許可がない場合は保存を依頼しない', async (t) => {
  const f = createUi(t);
  await new OptionsController().start();
  f.element('syncIntervalMinutes').value = '0';
  await f.element('settings').dispatch('submit');
  assert.equal(f.messages.length, 0);
  assert.match(f.element('feedback').textContent, /1分以上の整数/);
  f.element('syncIntervalMinutes').value = '5';
  f.controls.permissionsGranted = false;
  await f.element('settings').dispatch('submit');
  assert.equal(f.messages.length, 0);
  assert.match(f.element('feedback').textContent, /アクセスが許可されません/);
});
