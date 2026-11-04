import assert from 'node:assert/strict';
import test from 'node:test';
import { SyncService } from '../../../src/application/SyncService.js';
import { toGoogleEvent } from '../../../src/domain/EventMapping.js';
import {
  sourceKey,
  TAG_ID,
  TAG_UPDATED,
  TAG_SOURCE,
} from '../../../src/config/Settings.js';
import {
  settings,
  range,
  calendars,
  event,
  googleEvent,
} from '../../support/Schedules.js';

test('取得失敗を空配列にせず、Googleへの書き込みを開始しない', async () => {
  let touched = false;
  const garoon = {
    connect: async () => {},
    listEvents: async () => {
      throw new Error('ログイン切れ');
    },
  };
  const google = {
    resolveCalendars: async () => {
      touched = true;
    },
  };
  await assert.rejects(
    new SyncService(garoon, google, settings).sync(range, async () => {}),
    /ログイン切れ/,
  );
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
    deleteEvent: async () => {
      touched = true;
    },
    patchEvent: async () => {
      touched = true;
    },
  };
  const garoon = { connect: async () => {}, listEvents: async () => [] };
  await assert.rejects(
    new SyncService(garoon, google, settings).sync(range, async () => {}),
    /ページ取得失敗/,
  );
  assert.equal(touched, false);
});

test('同じ識別子の予定が複数ある場合は何も反映せずID付きで停止する', async () => {
  let writes = 0;
  const duplicate = googleEvent(event(), {
    id: 'existing',
    extendedProperties: { shared: { [TAG_ID]: '123-202611040900' } },
  });
  const garoon = { connect: async () => {}, listEvents: async () => [event()] };
  const google = {
    resolveCalendars: async () => calendars,
    listEvents: async (id) => (id === 'work' ? [duplicate, googleEvent()] : []),
    insertEvent: async () => {
      writes++;
    },
    patchEvent: async () => {
      writes++;
    },
    deleteEvent: async () => {
      writes++;
    },
  };
  await assert.rejects(
    new SyncService(garoon, google, settings).sync(range, async () => {}),
    /123-202611040900.*重複/,
  );
  assert.equal(writes, 0);
});

test('既存のGoogleイベントIDをGaroon識別子で特定して更新し、再実行でも新規作成しない', async () => {
  let current = googleEvent(event(), {
    id: 'existing-google-event-id',
    extendedProperties: {
      shared: {
        [TAG_ID]: '123-202611040900',
        [TAG_UPDATED]: event().updatedAt,
      },
    },
  });
  let creates = 0;
  let updates = 0;
  const service = new SyncService(
    {
      connect: async () => {},
      listEvents: async () => [event()],
    },
    {
      resolveCalendars: async () => calendars,
      listEvents: async (id) =>
        id === 'work' ? [structuredClone(current)] : [],
      getEvent: async (calendarId, id) => {
        assert.equal(id, 'existing-google-event-id');
        return structuredClone(current);
      },
      patchEvent: async (calendarId, id, body) => {
        assert.equal(id, 'existing-google-event-id');
        updates++;
        current = { ...current, ...body };
      },
      insertEvent: async () => {
        creates++;
      },
    },
    settings,
  );
  const first = await service.sync(range, async () => {});
  assert.equal(first.created, 0);
  assert.equal(first.updated, 1);
  const second = await service.sync(range, async () => {});
  assert.equal(second.created, 0);
  assert.equal(second.updated, 0);
  assert.equal(creates, 0);
  assert.equal(updates, 1);
});

test('更新対象の取得中に停止したらPATCHを送らない', async () => {
  let stopped = false;
  let writes = 0;
  const service = new SyncService(
    null,
    {
      getEvent: async () => {
        stopped = true;
        return googleEvent();
      },
      patchEvent: async () => {
        writes++;
      },
    },
    settings,
  );
  const check = async () => {
    if (stopped) throw new Error('停止要求');
  };
  await assert.rejects(
    service.update(
      'work',
      'google123',
      toGoogleEvent(event(), settings),
      check,
    ),
    /停止要求/,
  );
  assert.equal(writes, 0);
});

test('削除対象の取得中に停止したらDELETEを送らない', async () => {
  let stopped = false;
  let writes = 0;
  const service = new SyncService(
    null,
    {
      getEvent: async () => {
        stopped = true;
        return googleEvent();
      },
      deleteEvent: async () => {
        writes++;
      },
    },
    settings,
  );
  const check = async () => {
    if (stopped) throw new Error('停止要求');
  };
  await assert.rejects(
    service.remove({ calendarId: 'work', event: googleEvent() }, check),
    /停止要求/,
  );
  assert.equal(writes, 0);
});

test('移動先の作成失敗では移動元を削除しない', async () => {
  let deleted = false;
  const garoon = {
    connect: async () => {},
    listEvents: async () => [event({ notes: '#family' })],
  };
  const google = {
    resolveCalendars: async () => calendars,
    listEvents: async (id) => (id === 'work' ? [googleEvent()] : []),
    insertEvent: async () => {
      throw new Error('作成失敗');
    },
    deleteEvent: async () => {
      deleted = true;
    },
  };
  await assert.rejects(
    new SyncService(garoon, google, settings).sync(range, async () => {}),
    /作成失敗/,
  );
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
    patchEvent: async () => {
      patched++;
    },
  };
  const service = new SyncService(null, google, settings);
  await service.insert('work', toGoogleEvent(event(), settings));
  await service.insert('work', toGoogleEvent(event(), settings));
  assert.equal(ids[0], ids[1]);
  assert.equal(typeof ids[0], 'string');
  assert.notEqual(ids[0], '');
  assert.equal(patched, 1);
});

test('カレンダーの全削除後は削除済みIDを再使用せず、同じ世代での再試行は同じIDを使う', async () => {
  const ids = [];
  const google = {
    insertEvent: async (calendarId, body) => {
      ids.push(body.id);
    },
  };
  await new SyncService(null, google, settings).insert(
    'work',
    toGoogleEvent(event(), settings),
  );
  const cleared = {
    ...settings,
    calendarWriteGenerations: { work: 'confirmed-clear-token' },
  };
  const service = new SyncService(null, google, cleared);
  await service.insert('work', toGoogleEvent(event(), settings));
  await service.insert('work', toGoogleEvent(event(), settings));
  assert.notEqual(ids[0], ids[1]);
  assert.equal(ids[1], ids[2]);
});

test('更新時には他の拡張プロパティを保持する', async () => {
  const existing = googleEvent();
  existing.extendedProperties.private.OTHER = 'keep';
  existing.extendedProperties.shared = { SHARED: 'keep' };
  let patched;
  const service = new SyncService(
    null,
    {
      getEvent: async () => existing,
      patchEvent: async (calendarId, id, body) => {
        patched = body;
      },
    },
    settings,
  );
  await service.update(
    'work',
    existing.id,
    toGoogleEvent(event({ subject: '変更' }), settings),
  );
  assert.equal(patched.extendedProperties.private.OTHER, 'keep');
  assert.equal(patched.extendedProperties.shared.SHARED, 'keep');
  assert.equal(
    patched.extendedProperties.private[TAG_SOURCE],
    sourceKey(settings),
  );
});
