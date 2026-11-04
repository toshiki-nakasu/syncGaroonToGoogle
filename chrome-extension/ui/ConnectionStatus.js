const LABELS = {
  checking: '確認中',
  connected: '接続済み',
  unavailable: '接続不可',
  unchecked: '未確認',
};

/** 設定画面とポップアップに、同じ接続結果を表示する。 */
export function renderConnection(provider, value, root = document) {
  const element = root.querySelector(`#${provider}-connection`);
  const error = root.querySelector(`#${provider}-error`);
  element.textContent = LABELS[value?.kind] || '未確認';
  element.dataset.kind = value?.kind || 'unchecked';
  if (error) {
    error.hidden = value?.kind !== 'unavailable';
    error.textContent = error.hidden ? '' : value.message;
  } else if (value?.kind === 'unavailable') {
    element.textContent += `: ${value.message}`;
  }
}
