import { DEFAULT_SETTINGS } from '../../src/config/Settings.js';
import { toGoogleEvent } from '../../src/domain/EventMapping.js';

export const settings = {
  ...DEFAULT_SETTINGS,
  origin: 'https://example.cybozu.com',
  userCode: 'user1',
  calendarMappings: [
    { tag: '', calendarName: 'Garoon' },
    { tag: 'family', calendarName: 'family' },
  ],
};
export const range = {
  start: '2026-11-01T15:00:00.000Z',
  end: '2026-11-10T15:00:00.000Z',
};
export const calendars = new Map([
  ['Garoon', 'work'],
  ['family', 'home'],
]);

export function event(overrides = {}) {
  return {
    id: '123',
    repeatId: '202611040900',
    subject: '定例',
    eventMenu: '会議',
    start: { dateTime: '2026-11-04T09:00:00+09:00', timeZone: 'Asia/Tokyo' },
    end: { dateTime: '2026-11-04T10:00:00+09:00', timeZone: 'Asia/Tokyo' },
    updatedAt: '2026-11-03T12:00:00Z',
    attendees: [{ name: '田中　太郎' }],
    notes: 'メモ',
    ...overrides,
  };
}

export function googleEvent(input = event(), overrides = {}) {
  return {
    ...toGoogleEvent(input, settings),
    id: 'google123',
    status: 'confirmed',
    ...overrides,
  };
}

/** テストごとに設定をコピーし、前のケースからの変更を持ち越さない。 */
export function makeSettings(overrides = {}) {
  return { ...structuredClone(settings), ...structuredClone(overrides) };
}
