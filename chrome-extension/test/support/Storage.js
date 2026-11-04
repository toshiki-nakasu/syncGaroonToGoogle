/** Chrome storageでの辞書の並べ替えと値のコピーを再現する。 */
export function storageValue(value) {
  if (Array.isArray(value)) return value.map(storageValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, child]) => [key, storageValue(child)]),
    );
  }
  return value;
}

/** リスナーを複数登録できる、テスト用のChromeイベント。 */
export function createEvent() {
  const listeners = new Set();
  return {
    addListener: (listener) => listeners.add(listener),
    removeListener: (listener) => listeners.delete(listener),
    emit: (...args) =>
      Promise.all([...listeners].map((listener) => listener(...args))),
  };
}

/** コピーと変更通知を共有し、画面とWorkerで同じ保存領域を使う。 */
export function createStorage(initial = {}) {
  const data = storageValue(initial);
  const onChanged = createEvent();
  return {
    data,
    onChanged,
    local: {
      setAccessLevel: async () => {},
      get: async (keys) => {
        const names =
          keys == null
            ? Object.keys(data)
            : typeof keys === 'string'
              ? [keys]
              : Array.isArray(keys)
                ? keys
                : Object.keys(keys);
        return Object.fromEntries(
          names.map((key) => [
            key,
            storageValue(
              Object.hasOwn(data, key)
                ? data[key]
                : typeof keys === 'object' && !Array.isArray(keys)
                  ? keys?.[key]
                  : undefined,
            ),
          ]),
        );
      },
      set: async (values) => {
        const changes = {};
        for (const [key, value] of Object.entries(values)) {
          changes[key] = {
            oldValue: storageValue(data[key]),
            newValue: storageValue(value),
          };
          data[key] = storageValue(value);
        }
        await onChanged.emit(changes, 'local');
      },
    },
  };
}
