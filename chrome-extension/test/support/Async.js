/** 外部応答を任意の地点で待たせ、競合の順序を明示する。 */
export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

/** 画面の非同期描画だけを待つ。バックエンドの完了待ちにはPromiseを使う。 */
export async function until(
  condition,
  message = '画面の更新が完了しませんでした。',
) {
  const deadline = Date.now() + 2000;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error(message);
    await new Promise((resolve) => setImmediate(resolve));
  }
}
