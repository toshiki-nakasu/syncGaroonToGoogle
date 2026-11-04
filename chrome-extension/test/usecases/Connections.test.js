import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplication } from '../support/ApplicationFixture.js';

test('Garoonが利用できなくてもGoogleの認証結果を独立して表示できる', async (t) => {
  const f = await createApplication(t);
  f.controls.tabs = [];
  assert.equal((await f.send({ type: 'status' })).value.kind, 'unavailable');
  assert.equal(f.storage.data.garoonConnection.kind, 'unavailable');
  assert.equal(f.storage.data.googleConnection.kind, 'connected');
});
test('Googleの認証切れをGaroonの接続失敗として扱わない', async (t) => {
  const f = await createApplication(t);
  f.controls.authError = new Error('Google認証が必要です');
  await f.send({ type: 'status' });
  assert.equal(f.storage.data.garoonConnection.kind, 'connected');
  assert.equal(f.storage.data.googleConnection.kind, 'unavailable');
});
test('Googleへの同意画面は手動で接続するときだけ要求する', async (t) => {
  const f = await createApplication(t);
  await f.send({ type: 'probe' });
  assert.equal(f.calls.auth.length, 0);
  assert.equal((await f.send({ type: 'connectGoogle' })).ok, true);
  assert.ok(f.calls.auth.some(({ interactive }) => interactive === true));
  assert.equal(f.google.writes.length, 0);
});
test('Garoonページからの任意の操作要求を拒否する', async (t) => {
  const f = await createApplication(t);
  const response = await f.send(
    { type: 'sync' },
    { id: f.chrome.runtime.id, url: 'https://example.cybozu.com/g/' },
  );
  assert.equal(response.ok, false);
  assert.match(response.error, /許可されていない/);
  assert.equal(f.google.calls.length, 0);
});
