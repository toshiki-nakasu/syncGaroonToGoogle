import { ExtensionApplication } from '../../src/application/ExtensionApplication.js';
import { createChrome, TestCanvas } from './Chrome.js';
import { makeSettings } from './Schedules.js';
import { GoogleCalendarFake } from './GoogleCalendarFake.js';
import { installGlobals } from './Globals.js';

/** 保存領域とAPIの境界を共有し、操作ごとに実際のアプリケーションを通す。 */
export async function createApplication(t, overrides = {}) {
  const fixture = createChrome({ settings: makeSettings(overrides) });
  const google = new GoogleCalendarFake();
  installGlobals(t, {
    chrome: fixture.chrome,
    fetch: google.fetch,
    OffscreenCanvas: TestCanvas,
  });
  let application;
  const restart = async () => {
    application = new ExtensionApplication(fixture.chrome);
    await application.ready;
  };
  await restart();
  const sender = {
    id: fixture.chrome.runtime.id,
    url: fixture.chrome.runtime.getURL('ui/options.html'),
  };
  const send = async (message, from = sender) => {
    try {
      return {
        ok: true,
        value: await application.handleMessage(message, from),
      };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  };
  fixture.chrome.runtime.sendMessage = send;
  return {
    ...fixture,
    google,
    send,
    restart,
    alarm: (name) => application.handleAlarm({ name }),
    get application() {
      return application;
    },
  };
}
