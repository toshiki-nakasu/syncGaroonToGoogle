import { loadSettings, validateSettings } from '../src/Settings.js';

const form = document.querySelector('#settings');
const feedback = document.querySelector('#feedback');
const fields = ['origin', 'userCode', 'calendarName', 'daysAgo', 'daysAfter', 'timeZone'];

async function load() {
  const settings = await loadSettings();
  for (const key of fields) document.getElementById(key).value = settings[key];
  document.querySelector('#tagCalendars').value = settings.tagCalendars.join('\n');
  for (const key of ['autoSync', 'adoptLegacy']) document.getElementById(key).checked = settings[key];
}

async function send(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response.ok) throw new Error(response.error);
  feedback.textContent = response.value.message;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  feedback.textContent = '';
  try {
    const input = Object.fromEntries(fields.map((key) => [key, document.getElementById(key).value]));
    const settings = validateSettings({
      ...input,
      daysAgo: Number(input.daysAgo), daysAfter: Number(input.daysAfter),
      tagCalendars: document.querySelector('#tagCalendars').value.split('\n').map((line) => line.trim()).filter(Boolean),
      autoSync: document.querySelector('#autoSync').checked,
      adoptLegacy: document.querySelector('#adoptLegacy').checked,
    });
    // ユーザー操作内で、指定したGaroonのホストだけにアクセス権を要求する。
    const granted = await chrome.permissions.request({ origins: [`${settings.origin}/*`] });
    if (!granted) throw new Error('Garoonへのアクセスが許可されませんでした。');
    await send({ type: 'saveSettings', settings });
  } catch (error) {
    feedback.textContent = error.message;
  }
});

for (const [id, type] of [['probe', 'probe'], ['google', 'connectGoogle']]) {
  document.getElementById(id).addEventListener('click', async () => {
    feedback.textContent = '接続を確認しています。';
    document.getElementById(id).disabled = true;
    try {
      await send({ type });
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      document.getElementById(id).disabled = false;
    }
  });
}
load().catch((error) => { feedback.textContent = error.message; });
