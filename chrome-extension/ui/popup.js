const labels = { ready: '同期可', syncing: '同期中', unavailable: '同期不可', paused: '自動同期停止' };
const feedback = document.querySelector('#feedback');

function render(state) {
  if (!state) return;
  document.querySelector('#status').dataset.kind = state.kind;
  document.querySelector('#label').textContent = labels[state.kind] || '同期不可';
  document.querySelector('#message').textContent = state.message;
  document.querySelector('#sync').disabled = state.kind === 'syncing';
  document.querySelector('#last-success').textContent = `最終同期: ${state.lastSuccessAt ? new Date(state.lastSuccessAt).toLocaleString('ja-JP') : '未実行'}`;
  const value = state.summary;
  document.querySelector('#summary').textContent = value ? `作成 ${value.created}件 / 更新 ${value.updated}件 / 移動 ${value.moved}件 / 削除 ${value.deleted}件` : '';
}

async function request(type) {
  feedback.textContent = '';
  const response = await chrome.runtime.sendMessage({ type });
  if (!response.ok) throw new Error(response.error);
  render(response.value);
}

document.querySelector('#sync').addEventListener('click', () => {
  document.querySelector('#sync').disabled = true;
  request('sync').catch((error) => { feedback.textContent = error.message; }).finally(async () => {
    render((await chrome.storage.local.get('state')).state);
  });
});
document.querySelector('#refresh').addEventListener('click', () => {
  request('status').catch((error) => { feedback.textContent = error.message; });
});
document.querySelector('#options').addEventListener('click', () => chrome.runtime.openOptionsPage());
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.state) render(changes.state.newValue);
});
request('status').catch((error) => { feedback.textContent = error.message; });
