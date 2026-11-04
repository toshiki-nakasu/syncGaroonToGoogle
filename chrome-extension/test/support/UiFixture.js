import { loadDocument } from './Ui.js';
import { createChrome } from './Chrome.js';
import { makeSettings } from './Schedules.js';
import { installGlobals } from './Globals.js';

/** UIテストにDOMと保存領域を提供し、Workerへの依頼だけを差し替え可能にする。 */
export function createUi(t, page = 'options', initial = {}) {
  const view = loadDocument(new URL(`../../ui/${page}.html`, import.meta.url));
  const fixture = createChrome({
    settings: makeSettings(),
    state: { kind: 'paused', message: '停止中' },
    ...initial,
  });
  installGlobals(t, { document: view.document, chrome: fixture.chrome });
  const messages = [];
  let handler = async () => ({ message: '完了しました。' });
  const request = async (message) => {
    messages.push(message);
    return handler(message);
  };
  fixture.chrome.runtime.sendMessage = async (message) => {
    try {
      return { ok: true, value: await request(message) };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  };
  return {
    ...fixture,
    ...view,
    messages,
    request,
    handle: (action) => {
      handler = action;
    },
    element: (id) => view.elements.get(id),
  };
}
