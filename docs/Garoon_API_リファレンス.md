# Garoon API リファレンス

Garoon REST API v1 を使用したスケジュール管理の実装ガイドです。

## 公式ドキュメント

- [Garoon REST API 公式リファレンス](https://cybozu.dev/ja/garoon/docs/rest-api/)

## APIエンドポイント

### ベースURL

```text
https://{subdomain}.cybozu.com/g/api/v1/
```

または

```text
https://{your-domain}/g/api/v1/
```

### 認証方式

**X-Cybozu-Authorization ヘッダー (Base64エンコード)**

```http
X-Cybozu-Authorization: {Base64エンコードされた "username:password"}
Content-Type: application/json
```

**認証例:**

```javascript
const username = 'your-username';
const password = 'your-password';
const credentials = Utilities.base64Encode(username + ':' + password);

const headers = {
  'Content-Type': 'application/json',
  'X-Cybozu-Authorization': credentials
};
```

## API操作詳細

---

## 1. スケジュールイベント取得 (GET)

### エンドポイント

```text
GET /schedule/events
```

### 完全なURL

```text
https://{your-domain}/g/api/v1/schedule/events
```

### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 | 例 |
|-----------|-----|------|------|-----|
| `rangeStart` | string | Yes | 検索開始日時 (ISO 8601形式) | `2024-01-01T00:00:00+09:00` |
| `rangeEnd` | string | Yes | 検索終了日時 (ISO 8601形式) | `2024-12-31T23:59:59+09:00` |
| `orderBy` | string | No | ソート順 | `start asc`, `start desc` |
| `limit` | number | No | 1ページあたりの取得件数<br>(最大500、推奨200) | `200` |
| `offset` | number | No | 取得開始位置 (ページネーション用) | `0`, `200`, `400` |
| `targetType` | string | No | 対象タイプ<br>(`user`, `organization`, `facility`) | `user` |
| `targetCode` | string | No | 対象コード (ユーザー名など) | `sato` |
| `fields` | string | No | 取得するフィールドを指定 | `id,subject,start,end` |
| `excludeFromSearch` | boolean | No | 検索対象外の予定を除外 | `true` |

### リクエスト例

**基本的な取得:**

```http
GET /schedule/events?rangeStart=2024-01-01T00:00:00%2B09:00&rangeEnd=2024-01-31T23:59:59%2B09:00&orderBy=start%20asc&limit=200
Host: {your-domain}
Content-Type: application/json
X-Cybozu-Authorization: {Base64エンコードされた認証情報}
```

**特定ユーザーの予定を取得:**

```http
GET /schedule/events?rangeStart=2024-01-01T00:00:00%2B09:00&rangeEnd=2024-01-31T23:59:59%2B09:00&targetType=user&targetCode=sato&limit=200
Host: {your-domain}
Content-Type: application/json
X-Cybozu-Authorization: {Base64エンコードされた認証情報}
```

### JavaScriptでの呼び出し例

```javascript
// クエリパラメータの構築
const params = {
  rangeStart: '2024-01-01T00:00:00+09:00',
  rangeEnd: '2024-01-31T23:59:59+09:00',
  orderBy: 'start asc',
  limit: 200,
  offset: 0
};

// URLSearchParamsを使ってクエリ文字列を生成
const queryString = new URLSearchParams(params).toString();
const url = `https://{your-domain}/g/api/v1/schedule/events?${queryString}`;

// リクエストヘッダー
const headers = {
  'Content-Type': 'application/json',
  'X-Cybozu-Authorization': Utilities.base64Encode('username:password')
};

// リクエスト送信 (Google Apps Script)
const options = {
  method: 'GET',
  headers: headers
};

const response = UrlFetchApp.fetch(url, options);
const result = JSON.parse(response.getContentText('UTF-8'));
```

### ページネーション処理

大量のイベントを取得する場合は、`limit`と`offset`を使用してページネーション処理を行います。

```javascript
let allEvents = [];
let offset = 0;
const limit = 200;
let hasMore = true;

while (hasMore) {
  const params = {
    rangeStart: '2024-01-01T00:00:00+09:00',
    rangeEnd: '2024-12-31T23:59:59+09:00',
    orderBy: 'start asc',
    limit: limit,
    offset: offset
  };

  const queryString = new URLSearchParams(params).toString();
  const url = `https://{your-domain}/g/api/v1/schedule/events?${queryString}`;

  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText('UTF-8'));

  allEvents = allEvents.concat(result.events);

  // 取得件数がlimit未満なら最後のページ
  hasMore = result.events.length >= limit;
  offset += result.events.length;

  // API制限を考慮して待機
  if (hasMore) {
    Utilities.sleep(1000);
  }
}
```

### レスポンス

**レスポンス例 (概要):**

```json
{
  "events": [
    {
      "id": "12345",
      "subject": "定例会議",
      "start": {
        "dateTime": "2024-01-15T10:00:00+09:00",
        "timeZone": "Asia/Tokyo"
      },
      "end": {
        "dateTime": "2024-01-15T11:00:00+09:00",
        "timeZone": "Asia/Tokyo"
      },
      "isAllDay": false,
      "eventMenu": "会議",
      "notes": "議題: Q4レビュー",
      "attendees": [...],
      "updatedAt": "2024-01-10T09:00:00+09:00"
    }
  ]
}
```

---

## 2. スケジュールイベント作成 (POST)

### エンドポイント

```text
POST /schedule/events
```

### 完全なURL

```text
https://{your-domain}/g/api/v1/schedule/events
```

### リクエストボディ

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `eventType` | string | Yes | イベントタイプ<br>`REGULAR` (通常), `ALL_DAY` (終日), `BANNER` (期間) |
| `eventMenu` | string | No | イベントメニュー (例: `会議`, `打ち合わせ`) |
| `subject` | string | Yes | 件名 |
| `notes` | string | No | メモ・説明 |
| `start` | object | Yes | 開始日時情報 |
| `start.dateTime` | string | Yes | 開始日時 (ISO 8601形式) |
| `start.timeZone` | string | Yes | タイムゾーン (例: `Asia/Tokyo`) |
| `end` | object | Yes | 終了日時情報 |
| `end.dateTime` | string | Yes | 終了日時 (ISO 8601形式) |
| `end.timeZone` | string | Yes | タイムゾーン |
| `isAllDay` | boolean | No | 終日イベントフラグ (デフォルト: `false`) |
| `isStartOnly` | boolean | No | 開始時刻のみ (デフォルト: `false`) |
| `attendees` | array | No | 参加者リスト |
| `attendees[].type` | string | Yes | 参加者タイプ<br>(`USER`, `ORGANIZATION`, `FACILITY`) |
| `attendees[].code` | string | Yes | 参加者コード (ユーザー名など) |
| `facilities` | array | No | 施設リスト |
| `visibilityType` | string | No | 公開範囲<br>(`PUBLIC`, `PRIVATE`, `QUALIFIED`) |

### リクエスト例

**基本的なイベント作成:**

```http
POST /schedule/events
Host: {your-domain}
Content-Type: application/json
X-Cybozu-Authorization: {Base64エンコードされた認証情報}

{
  "eventType": "REGULAR",
  "eventMenu": "会議",
  "subject": "定例ミーティング",
  "notes": "議題:\n1. プロジェクト進捗\n2. 課題共有",
  "start": {
    "dateTime": "2024-01-15T10:00:00+09:00",
    "timeZone": "Asia/Tokyo"
  },
  "end": {
    "dateTime": "2024-01-15T11:00:00+09:00",
    "timeZone": "Asia/Tokyo"
  },
  "isAllDay": false,
  "attendees": [
    {
      "type": "USER",
      "code": "sato"
    },
    {
      "type": "USER",
      "code": "suzuki"
    }
  ]
}
```

**終日イベントの作成:**

```http
POST /schedule/events
Host: {your-domain}
Content-Type: application/json
X-Cybozu-Authorization: {Base64エンコードされた認証情報}

{
  "eventType": "ALL_DAY",
  "subject": "夏季休暇",
  "start": {
    "dateTime": "2024-08-13T00:00:00+09:00",
    "timeZone": "Asia/Tokyo"
  },
  "end": {
    "dateTime": "2024-08-16T00:00:00+09:00",
    "timeZone": "Asia/Tokyo"
  },
  "isAllDay": true,
  "attendees": [
    {
      "type": "USER",
      "code": "sato"
    }
  ]
}
```

### JavaScriptでの呼び出し例

```javascript
const requestBody = {
  eventType: 'REGULAR',
  eventMenu: '会議',
  subject: '定例ミーティング',
  notes: 'プロジェクトの進捗確認',
  start: {
    dateTime: '2024-01-15T10:00:00+09:00',
    timeZone: 'Asia/Tokyo'
  },
  end: {
    dateTime: '2024-01-15T11:00:00+09:00',
    timeZone: 'Asia/Tokyo'
  },
  isAllDay: false,
  attendees: [
    { type: 'USER', code: 'sato' },
    { type: 'USER', code: 'suzuki' }
  ]
};

const url = 'https://{your-domain}/g/api/v1/schedule/events';
const headers = {
  'Content-Type': 'application/json',
  'X-Cybozu-Authorization': Utilities.base64Encode('username:password')
};

const options = {
  method: 'POST',
  headers: headers,
  payload: JSON.stringify(requestBody)
};

const response = UrlFetchApp.fetch(url, options);
const createdEvent = JSON.parse(response.getContentText('UTF-8'));
```

### レスポンス

作成されたイベントの情報が返されます。詳細は[公式ドキュメント](https://cybozu.dev/ja/garoon/docs/rest-api/schedule/events/add-event/)を参照してください。

### 制限事項

- **繰り返し予定の作成**: 別のAPIエンドポイント (`/schedule/events/repeat`) を使用する必要があります
- **仮予定 (Tentative)**: 作成時に直接指定できません
- **参加者の承認状態**: 作成時には設定できません

---

## 3. プレゼンス情報更新 (PATCH)

### エンドポイント

```text
PATCH /presence/users/code/{userCode}
```

### 完全なURL

```text
https://{your-domain}/g/api/v1/presence/users/code/{userCode}
```

### パスパラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `userCode` | string | Yes | ユーザーコード (ログイン名) |

### リクエストボディ

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `status` | object | No | ステータス情報 |
| `status.code` | string | No | ステータスコード<br>(空文字列でリセット) |
| `notes` | string | No | メモ (空文字列でリセット) |

### リクエスト例

**プレゼンス情報のリセット:**

```http
PATCH /presence/users/code/sato
Host: {your-domain}
Content-Type: application/json
X-Cybozu-Authorization: {Base64エンコードされた認証情報}

{
  "status": {
    "code": ""
  },
  "notes": ""
}
```

**ステータスの設定:**

```http
PATCH /presence/users/code/sato
Host: {your-domain}
Content-Type: application/json
X-Cybozu-Authorization: {Base64エンコードされた認証情報}

{
  "status": {
    "code": "meeting"
  },
  "notes": "15:00まで会議中"
}
```

### JavaScriptでの呼び出し例

```javascript
const userCode = 'sato';
const url = `https://{your-domain}/g/api/v1/presence/users/code/${encodeURIComponent(userCode)}`;

const requestBody = {
  status: {
    code: ''  // 空文字列でステータスをリセット
  },
  notes: ''   // 空文字列でメモをリセット
};

const headers = {
  'Content-Type': 'application/json',
  'X-Cybozu-Authorization': Utilities.base64Encode('username:password')
};

const options = {
  method: 'PATCH',
  headers: headers,
  payload: JSON.stringify(requestBody)
};

const response = UrlFetchApp.fetch(url, options);
```

### レスポンス

更新後のプレゼンス情報が返されます。詳細は[公式ドキュメント](https://cybozu.dev/ja/garoon/docs/rest-api/presence/users/update-user-presence/)を参照してください。

---

## エラーハンドリング

### リトライ対象のHTTPステータス

| ステータスコード | 説明 | 対処方法 |
|----------------|------|---------|
| `410` | Gone | Sync Tokenが無効 - 再取得が必要 |
| `429` | Too Many Requests | レート制限 - 待機後にリトライ |
| `500` | Internal Server Error | サーバーエラー - リトライ |
| `503` | Service Unavailable | サービス利用不可 - リトライ |

### リトライ処理の実装例

```javascript
function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();

      // 成功 (2xx)
      if (statusCode >= 200 && statusCode < 300) {
        return response;
      }

      // リトライ対象のエラー
      if ([410, 429, 500, 503].includes(statusCode)) {
        if (attempt < maxRetries) {
          const waitTime = 1000 * attempt; // 1秒、2秒、3秒...
          console.log(`リトライ ${attempt}/${maxRetries} (待機: ${waitTime}ms)`);
          Utilities.sleep(waitTime);
          continue;
        }
      }

      // その他のエラー
      throw new Error(`HTTP ${statusCode}: ${response.getContentText()}`);

    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        Utilities.sleep(1000 * attempt);
      }
    }
  }

  throw lastError;
}
```

---

## レート制限とベストプラクティス

### API制限

- **推奨**: リクエスト間に適切な待機時間 (1000ms程度) を設ける
- **ページネーション**: 1ページあたり200件を推奨 (最大500件)
- **最大ページ数**: 100ページまでの取得を推奨

### ベストプラクティス

1. **バッチ処理**: 大量データは複数回に分けて取得
2. **エラーハンドリング**: 必ずリトライロジックを実装
3. **ログ記録**: API呼び出しとエラーを記録
4. **待機時間**: 連続リクエスト時は必ず`Utilities.sleep()`を挿入

```javascript
// 良い例
for (let i = 0; i < requests.length; i++) {
  const response = UrlFetchApp.fetch(url, options);
  processResponse(response);

  if (i < requests.length - 1) {
    Utilities.sleep(1000); // 次のリクエストまで待機
  }
}
```

---

## 参考リンク

- [Garoon REST API リファレンス](https://cybozu.dev/ja/garoon/docs/rest-api/)
- [スケジュールイベント取得](https://cybozu.dev/ja/garoon/docs/rest-api/schedule/events/get-events/)
- [スケジュールイベント作成](https://cybozu.dev/ja/garoon/docs/rest-api/schedule/events/add-event/)
- [繰り返し予定の作成](https://cybozu.dev/ja/garoon/docs/rest-api/schedule/events/add-repeat-event/)
- [プレゼンス更新](https://cybozu.dev/ja/garoon/docs/rest-api/presence/users/update-user-presence/)
- [認証方法](https://cybozu.dev/ja/garoon/docs/rest-api/authentication/)
- [エラーレスポンス](https://cybozu.dev/ja/garoon/docs/rest-api/error-response/)

### 2. イベント作成 (POST)

`GaroonDao.js`の`createEvent()`メソッドで実装:

**リクエストボディの構造:**

```javascript
{
  eventType: 'REGULAR',              // イベントタイプ
  eventMenu: '会議',                  // イベントメニュー
  subject: '定例ミーティング',         // 件名
  notes: 'メモ内容',                   // メモ
  start: {
    dateTime: '2024-01-01T10:00:00+09:00',
    timeZone: 'Asia/Tokyo'
  },
  end: {
    dateTime: '2024-01-01T11:00:00+09:00',
    timeZone: 'Asia/Tokyo'
  },
  isAllDay: false,                    // 終日フラグ
  attendees: [
    { type: 'USER', code: 'user-name' }
  ]
}
```

### 3. プレゼンス更新 (PATCH)

`GaroonDao.js`の`updatePreference()`メソッドで実装:

**リクエストボディ:**

```javascript
{
  status: {
    code: ''  // ステータスコード (空文字でリセット)
  },
  notes: ''   // メモ (空文字でリセット)
}
```

## レスポンスデータの構造

### イベントオブジェクト

`GaroonDao.js`のJSDocで定義されているGaroonEventの構造:

```javascript
{
  id: '12345',                        // イベントID
  subject: '件名',
  start: {
    dateTime: '2024-01-01T10:00:00+09:00',
    timeZone: 'Asia/Tokyo'
  },
  end: {
    dateTime: '2024-01-01T11:00:00+09:00',
    timeZone: 'Asia/Tokyo'
  },
  isAllDay: false,
  isStartOnly: false,                 // 開始時刻のみ
  eventMenu: '会議',
  notes: 'メモ',
  attendees: [...],                   // 参加者リスト
  updatedAt: '2024-01-01T09:00:00+09:00',
  repeatId: null                      // 繰り返し予定のID
}
```

## ユニークID生成ロジック

`GaroonEventService.js`の`createUniqueId()`メソッド:

```javascript
createUniqueId(garoonEvent) {
  const repeatId = garoonEvent.repeatId ? '-' + garoonEvent.repeatId : '';
  return garoonEvent.id + repeatId;
}
```

- 通常のイベント: `id`のみ
- 繰り返しイベント: `id-repeatId`

## エラーハンドリング

`BaseDao.js`で共通のエラーハンドリングを実装:

- **リトライ対象のHTTPステータス**:
    - `410`: Sync Token無効
    - `429`: レート制限
    - `500`: 内部サーバーエラー
    - `503`: サービス利用不可

- **リトライ設定** (`Constants.js`):
    - 最大リトライ回数: 3回
    - クールタイム: 1000ms × 試行回数

## 制限事項

1. **作成処理の制限** (`GaroonDao.js`):
   - 繰り返し予定の作成: 未対応
   - 仮予定の作成: 未対応

2. **更新・削除処理**:
   - `updateEvent()`: 未実装
   - `deleteEvent()`: 未実装

3. **ページネーション**:
   - 1ページあたり最大200件 (`Constants.GAROON_MAX_RESULTS_PER_PAGE`)
   - 最大100ページまで取得 (`Constants.MAX_PAGINATION_PAGES`)

このような構造で、Garoon APIとの連携が実装されています。
