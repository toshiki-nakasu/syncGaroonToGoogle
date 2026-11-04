import assert from 'node:assert/strict';
import test from 'node:test';
import { PopupController } from '../../ui/PopupController.js';
import { createUi } from '../support/UiFixture.js';
import { deferred, until } from '../support/Async.js';

test('接続先ごとの認証結果を分けて表示し、保存領域の更新を追従する', async (t) => {
  const f = createUi(t, 'popup', {
    garoonConnection: { kind: 'unavailable', message: 'タブがありません。' },
    googleConnection: { kind: 'connected' },
  });
  f.handle(async () => ({
    kind: 'unavailable',
    message: 'タブがありません。',
    autoSync: true,
  }));
  await new PopupController(f.chrome, f.document).start();
  assert.equal(f.element('garoon-connection').textContent, '接続不可');
  assert.equal(f.element('google-connection').textContent, '接続済み');
  assert.match(f.element('garoon-error').textContent, /タブがありません/);
  await f.storage.local.set({ garoonConnection: { kind: 'connected' } });
  assert.equal(f.element('garoon-error').hidden, true);
});
test('接続確認中でもON/OFFを変更でき、間隔の変更を送信しない', async (t) => {
  const f = createUi(t, 'popup');
  const status = deferred();
  f.handle(async (message) =>
    message.type === 'status'
      ? status.promise
      : {
          kind: message.enabled ? 'ready' : 'paused',
          autoSync: message.enabled,
        },
  );
  const starting = new PopupController(f.chrome, f.document).start();
  await until(() => f.messages.some(({ type }) => type === 'status'));
  assert.equal(f.element('auto-sync').disabled, false);
  await f.element('auto-sync').click();
  assert.deepEqual(f.messages.at(-1), { type: 'setAutoSync', enabled: false });
  assert.equal(f.element('auto-sync').textContent, '自動同期を再開');
  await f.element('auto-sync').click();
  assert.deepEqual(f.messages.at(-1), { type: 'setAutoSync', enabled: true });
  status.resolve({ kind: 'ready', autoSync: true });
  await starting;
});
test('同期の失敗を表示し、全削除中は手動同期と再開を受け付けない', async (t) => {
  const f = createUi(t, 'popup');
  f.handle(async ({ type }) => {
    if (type === 'sync') throw new Error('同期に失敗しました。');
    return { kind: 'ready', autoSync: true };
  });
  await new PopupController(f.chrome, f.document).start();
  await f.element('sync').click();
  assert.equal(f.element('feedback').hidden, false);
  assert.match(f.element('feedback').textContent, /同期に失敗/);
  await f.storage.local.set({
    state: { kind: 'clearing', message: '全削除中' },
  });
  assert.equal(f.element('sync').disabled, true);
  assert.equal(f.element('auto-sync').disabled, true);
});
