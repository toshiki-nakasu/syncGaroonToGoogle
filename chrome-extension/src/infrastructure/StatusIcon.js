const STYLES = {
  ready: { text: 'OK', label: '同期可', color: '#15803d' },
  syncing: { text: '…', label: '同期中', color: '#1d4ed8' },
  clearing: { text: 'CLR', label: '予定を全削除中', color: '#b45309' },
  unavailable: { text: '!', label: '同期不可', color: '#b91c1c' },
  paused: { text: 'OFF', label: '自動同期停止', color: '#64748b' },
};

/** 文字バッジとカレンダーアイコンで同期状態を表示する。 */
export async function renderStatus(state, api = chrome) {
  const style = STYLES[state.kind] || STYLES.unavailable;
  const images = {};
  for (const size of [16, 32]) {
    const canvas = new OffscreenCanvas(size, size);
    const context = canvas.getContext('2d');
    context.scale(size / 16, size / 16);
    context.fillStyle = style.color;
    context.fillRect(1, 2, 14, 13);
    context.fillStyle = '#ffffff';
    context.fillRect(3, 6, 10, 7);
    context.fillStyle = style.color;
    context.fillRect(5, 8, 2, 2);
    context.fillRect(9, 8, 2, 2);
    images[size] = context.getImageData(0, 0, size, size);
  }
  await Promise.all([
    api.action.setIcon({ imageData: images }),
    api.action.setBadgeText({ text: style.text }),
    api.action.setBadgeBackgroundColor({ color: style.color }),
    api.action.setTitle({ title: `${style.label}: ${state.message}` }),
  ]);
}
