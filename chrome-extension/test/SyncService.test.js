import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPlan, managedTags, targetCalendar, toGoogleEvent, SyncService } from '../src/SyncService.js';
import { DEFAULT_SETTINGS, sourceKey, TAG_ID, TAG_SOURCE, TAG_UPDATED, syncRange, validateSettings } from '../src/Settings.js';

const settings = {
  ...DEFAULT_SETTINGS, origin: 'https://example.cybozu.com', userCode: 'user1', tagCalendars: ['family'],
};
const range = { start: '2026-11-01T15:00:00.000Z', end: '2026-11-10T15:00:00.000Z' };
const calendars = new Map([['Garoon', 'work'], ['family', 'home']]);

function event(overrides = {}) {
  return {
    id: '123', repeatId: '202611040900', subject: '定例', eventMenu: '会議',
    start: { dateTime: '2026-11-04T09:00:00+09:00', timeZone: 'Asia/Tokyo' },
    end: { dateTime: '2026-11-04T10:00:00+09:00', timeZone: 'Asia/Tokyo' },
    updatedAt: '2026-11-03T12:00:00Z', attendees: [{ name: '田中　太郎' }], notes: 'メモ',
    ...overrides,
  };
}

function googleEvent(input = event(), overrides = {}) {
  return { ...toGoogleEvent(input, settings), id: 'google123', status: 'confirmed', ...overrides };
}

test('登録タグはメモでの出現順、nosyncは大小文字を問わず最優先', () => {
  const config = { ...settings, tagCalendars: ['family', 'private'] };
  assert.equal(targetCalendar(event({ notes: '#private #FAMILY' }), config), 'private');
  assert.equal(targetCalendar(event({ notes: '#family #NoSync' }), config), null);
  assert.equal(targetCalendar(event({ notes: '#nosync_extra' }), config), 'Garoon');
  assert.equal(targetCalendar(event({ notes: null }), config), 'Garoon');
});

test('繰り返しID、タイトル、参加者とメモを移植し、招待者は追加しない', () => {
  const actual = toGoogleEvent(event(), settings);
  assert.equal(actual.summary, '【会議】定例');
  assert.equal(actual.description, '【参加者】\n田中 太郎\n\n【メモ】\nメモ');
  assert.equal(actual.extendedProperties.private[TAG_ID], '123-202611040900');
  assert.equal(actual.start.dateTime, '2026-11-04T00:00:00.000Z');
  assert.equal(actual.attendees, undefined);
});

test('終日予定の終了を翌日へ変換し、実行端末のタイムゾーンに依存しない', () => {
  const actual = toGoogleEvent(event({
    isAllDay: true,
    start: { dateTime: '2026-11-04T00:00:00+09:00', timeZone: 'Asia/Tokyo' },
    end: { dateTime: '2026-11-06T23:59:59+09:00', timeZone: 'Asia/Tokyo' },
  }), settings);
  assert.deepEqual(actual.start, { date: '2026-11-04' });
  assert.deepEqual(actual.end, { date: '2026-11-07' });
});

test('開始時刻のみの予定はAPIで有効な1分の予定になる', () => {
  const actual = toGoogleEvent(event({ isStartOnly: true, end: null }), settings);
  assert.equal(Date.parse(actual.end.dateTime) - Date.parse(actual.start.dateTime), 60000);
});

test('通常日はJSTで今日を含み、夏時間の切り替わりも日単位の範囲を使う', () => {
  assert.deepEqual(syncRange({ ...settings, daysAgo: 0, daysAfter: 0 }, new Date('2026-11-04T23:00:00Z')), {
    start: '2026-11-04T15:00:00.000Z', end: '2026-11-05T15:00:00.000Z',
  });
  const dst = syncRange({ ...settings, daysAgo: 0, daysAfter: 0, timeZone: 'America/New_York' }, new Date('2026-11-01T12:00:00Z'));
  assert.equal(Date.parse(dst.end) - Date.parse(dst.start), 25 * 60 * 60000);
});

test('取得失敗を空配列にせず、Googleへの書き込みを開始しない', async () => {
  let touched = false;
  const garoon = { connect: async () => {}, listEvents: async () => { throw new Error('ログイン切れ'); } };
  const google = { resolveCalendars: async () => { touched = true; } };
  await assert.rejects(new SyncService(garoon, google, settings).sync(range, async () => {}), /ログイン切れ/);
  assert.equal(touched, false);
});

test('Googleの一部カレンダー取得失敗でも予定の削除や更新を開始しない', async () => {
  let touched = false;
  const google = {
    resolveCalendars: async () => calendars,
    listEvents: async (id) => {
      if (id === 'home') throw new Error('ページ取得失敗');
      return [googleEvent()];
    },
    deleteEvent: async () => { touched = true; },
    patchEvent: async () => { touched = true; },
  };
  const garoon = { connect: async () => {}, listEvents: async () => [] };
  await assert.rejects(new SyncService(garoon, google, settings).sync(range, async () => {}), /ページ取得失敗/);
  assert.equal(touched, false);
});

test('手動予定、別同期元、未採用のGAS予定には触らない', () => {
  const manual = googleEvent(event(), { extendedProperties: {} });
  const foreign = googleEvent(event(), { extendedProperties: { private: { [TAG_ID]: '123', [TAG_SOURCE]: 'other' } } });
  const legacy = googleEvent(event(), { extendedProperties: { shared: { [TAG_ID]: '123' } } });
  const plan = buildPlan([], new Map([['work', [manual, foreign, legacy]]]), calendars, settings, range);
  assert.equal(plan.deletes.length, 0);
  assert.equal(managedTags(legacy, { ...settings, adoptLegacy: true }).id, '123');
  assert.equal(managedTags(foreign, { ...settings, adoptLegacy: true }), null);
});

test('旧GASのprivate/sharedタグを引き継ぐ場合も二重作成しない', () => {
  for (const scope of ['private', 'shared']) {
    const legacy = googleEvent(event(), { extendedProperties: { [scope]: {
      [TAG_ID]: '123-202611040900', [TAG_UPDATED]: event().updatedAt,
    } } });
    const plan = buildPlan([event()], new Map([['work', [legacy]]]), calendars, { ...settings, adoptLegacy: true }, range);
    assert.equal(plan.upserts.length, 1);
    assert.equal(plan.upserts[0].kind, 'update');
    assert.equal(plan.deletes.length, 0);
  }
});

test('期間をまたぐ長期予定はGaroonにないと判断して削除しない', () => {
  const spanning = googleEvent(event(), { start: { dateTime: '2026-10-01T00:00:00Z' } });
  assert.equal(buildPlan([], new Map([['work', [spanning]]]), calendars, settings, range).deletes.length, 0);
});

test('nosync付与後は同期済み予定の削除だけを計画する', () => {
  const plan = buildPlan([event({ notes: '#nosync' })], new Map([['work', [googleEvent()]]]), calendars, settings, range);
  assert.equal(plan.upserts.length, 0);
  assert.equal(plan.deletes.length, 1);
});

test('同じスナップショットを再実行しても変更を計画しない', () => {
  const plan = buildPlan([event()], new Map([['work', [googleEvent()]]]), calendars, settings, range);
  assert.equal(plan.upserts.length, 0);
  assert.equal(plan.deletes.length, 0);
});

test('期間末尾の午前0時に終了する予定も、同期済み予定を誤削除しない', () => {
  const boundary = event({ end: { dateTime: range.end } });
  const plan = buildPlan([boundary], new Map([['work', [googleEvent(boundary)]]]), calendars, settings, range);
  assert.equal(plan.upserts.length, 0);
  assert.equal(plan.deletes.length, 0);
});

test('移動中断で両カレンダーに存在しても移動元だけを削除する', () => {
  const target = event({ notes: '#family', updatedAt: '2026-11-04T00:00:00Z' });
  const plan = buildPlan([target], new Map([
    ['work', [googleEvent()]], ['home', [googleEvent(target, { id: 'new' })]],
  ]), calendars, settings, range);
  assert.equal(plan.upserts.length, 0);
  assert.equal(plan.deletes.length, 1);
  assert.equal(plan.deletes[0].calendarId, 'work');
});

test('移動先の作成失敗では移動元を削除しない', async () => {
  let deleted = false;
  const garoon = { connect: async () => {}, listEvents: async () => [event({ notes: '#family' })] };
  const google = {
    resolveCalendars: async () => calendars,
    listEvents: async (id) => id === 'work' ? [googleEvent()] : [],
    insertEvent: async () => { throw new Error('作成失敗'); },
    deleteEvent: async () => { deleted = true; },
  };
  await assert.rejects(new SyncService(garoon, google, settings).sync(range, async () => {}), /作成失敗/);
  assert.equal(deleted, false);
});

test('作成後の再試行では同じIDを使い、409を検証して更新する', async () => {
  const ids = [];
  let stored;
  let patched = 0;
  const google = {
    insertEvent: async (calendarId, body) => {
      ids.push(body.id);
      if (stored) throw Object.assign(new Error('conflict'), { status: 409 });
      stored = body;
    },
    getEvent: async () => stored,
    patchEvent: async () => { patched++; },
  };
  const service = new SyncService(null, google, settings);
  await service.insert('work', toGoogleEvent(event(), settings));
  await service.insert('work', toGoogleEvent(event(), settings));
  assert.equal(ids[0], ids[1]);
  assert.match(ids[0], /^[0-9a-f]{64}$/);
  assert.equal(patched, 1);
});

test('更新時には他の拡張プロパティを保持する', async () => {
  const existing = googleEvent();
  existing.extendedProperties.private.OTHER = 'keep';
  existing.extendedProperties.shared = { SHARED: 'keep' };
  let patched;
  const service = new SyncService(null, {
    getEvent: async () => existing,
    patchEvent: async (calendarId, id, body) => { patched = body; },
  }, settings);
  await service.update('work', existing.id, toGoogleEvent(event({ subject: '変更' }), settings));
  assert.equal(patched.extendedProperties.private.OTHER, 'keep');
  assert.equal(patched.extendedProperties.shared.SHARED, 'keep');
  assert.equal(patched.extendedProperties.private[TAG_SOURCE], sourceKey(settings));
});

test('不正な予定や同じカレンダー内での重複は削除計画に流さない', () => {
  assert.throws(() => buildPlan([event({ start: null })], new Map(), calendars, settings, range), /日時が不正/);
  assert.throws(() => buildPlan([], new Map([['work', [googleEvent(), googleEvent()]]]), calendars, settings, range), /重複/);
});

test('接続先はHTTPSのcybozu.comに限定し、未定義設定や不正タグを拒否する', () => {
  assert.equal(validateSettings(settings).origin, settings.origin);
  assert.throws(() => validateSettings({ ...settings, origin: 'https://example.cybozu.com.evil.test' }));
  assert.throws(() => validateSettings({ ...settings, origin: 'https://example.cybozu.com/g/' }));
  assert.throws(() => validateSettings({ ...settings, tagCalendars: ['nosync'] }));
  assert.throws(() => validateSettings({ ...settings, daysAgo: -1 }));
});
