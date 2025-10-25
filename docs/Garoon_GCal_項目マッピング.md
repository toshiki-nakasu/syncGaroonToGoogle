# Garoon → Google Calendar 項目マッピング仕様

Garoonのスケジュールイベントを Google Calendar に同期する際の項目変換仕様書です。

## 概要

このシステムは、Garoonのスケジュール情報を一方向でGoogle Calendarに同期します。各項目がどのように変換されるかを定義します。

---

## 1. タイトル (subject → summary)

### 変換ロジック

Garoonの `subject` と `eventMenu` を組み合わせてGoogle Calendarの `summary` を生成します。

```javascript
// 実装: GaroonEventService.createTitle()
【{eventMenu}】{subject}
```

### 変換例

| Garoon eventMenu | Garoon subject | GCal summary |
|-----------------|----------------|--------------|
| `"会議"` | `"定例ミーティング"` | `"【会議】定例ミーティング"` |
| `"打ち合わせ"` | `"顧客訪問"` | `"【打ち合わせ】顧客訪問"` |
| `null` または `""` | `"ランチ"` | `"ランチ"` |
| `"外出"` | `"営業活動"` | `"【外出】営業活動"` |

### 仕様

- `eventMenu` が存在する場合、`【{eventMenu}】` を接頭辞として付加
- `eventMenu` が `null` または空文字列の場合、`subject` のみを使用
- 全角の墨付きカッコ `【】` を使用

---

## 2. 日時 (start/end → start/end)

### 2.1 通常イベント (時刻指定)

**変換ロジック:**

```javascript
// 実装: GaroonEventService.createTerm()
start: new Date(garoonEvent.start.dateTime)
end: new Date(garoonEvent.end.dateTime)
```

**変換例:**

| Garoon | Google Calendar |
|--------|----------------|
| `start.dateTime: "2024-01-15T10:00:00+09:00"` | `start: Date(2024-01-15 10:00)` |
| `end.dateTime: "2024-01-15T11:00:00+09:00"` | `end: Date(2024-01-15 11:00)` |

### 2.2 終日イベント

**変換ロジック:**

```javascript
// 実装: GaroonEventService.createTerm()
start: new Date(garoonEvent.start.dateTime)
end: new Date(garoonEvent.end.dateTime) + 1秒
```

**注意点:**

- Garoonの終日イベントは終了時刻が `23:59:59` で返される
- Google Calendarの終日イベントは翌日の `00:00:00` で設定する必要がある
- そのため、終了時刻に **1秒加算** する

**変換例:**

| Garoon | Google Calendar |
|--------|----------------|
| `start.dateTime: "2024-01-15T00:00:00+09:00"` | `start: Date(2024-01-15 00:00)` |
| `end.dateTime: "2024-01-15T23:59:59+09:00"` | `end: Date(2024-01-16 00:00)` ← +1秒 |
| `isAllDay: true` | 終日イベントとして作成 |

### 2.3 開始時刻のみのイベント

**変換ロジック:**

```javascript
// 実装: GaroonEventService.createTerm()
if (garoonEvent.isStartOnly) {
  end = new Date(garoonEvent.start.dateTime);  // 終了 = 開始
}
```

**変換例:**

| Garoon | Google Calendar |
|--------|----------------|
| `start.dateTime: "2024-01-15T14:00:00+09:00"` | `start: Date(2024-01-15 14:00)` |
| `isStartOnly: true` | `end: Date(2024-01-15 14:00)` |

---

## 3. 終日フラグ (isAllDay)

### 変換ロジック

Garoonの `isAllDay` フラグによって、Google Calendarのイベント作成メソッドを使い分けます。

```javascript
// 実装: GCalDao.createEvent()
if (garoonEvent.isAllDay) {
  gCal.createAllDayEvent(title, start, end, options);
} else {
  gCal.createEvent(title, start, end, options);
}
```

### 仕様

| Garoon isAllDay | Google Calendar 作成方法 |
|----------------|------------------------|
| `true` | `createAllDayEvent()` |
| `false` | `createEvent()` (時刻指定) |

---

## 4. 説明/メモ (notes → description)

### 変換ロジック

Garoonの `notes` と `attendees` を組み合わせて、構造化されたdescriptionを生成します。

```javascript
// 実装: GaroonEventService.createDescription()
【参加者】
{attendee1}, {attendee2}, {attendee3}

【メモ】
{notes}
```

### 実装詳細

```javascript
const description = [
  '【参加者】',
  this.getAttendee(garoonEvent),  // カンマ区切りの参加者リスト
  null,                            // 空行
  '【メモ】',
  garoonEvent.notes
].join('\n');
```

### 変換例

**Garoon入力:**

```javascript
{
  attendees: [
    { name: "山田 太郎" },
    { name: "佐藤 花子" },
    { name: "鈴木 一郎" }
  ],
  notes: "議題:\n1. Q4進捗レビュー\n2. 来期計画"
}
```

**GCal description:**

```text
【参加者】
山田 太郎, 佐藤 花子, 鈴木 一郎

【メモ】
議題:
1. Q4進捗レビュー
2. 来期計画
```

### 仕様

- **参加者セクション**:
    - `attendees[].name` を取得
    - 全角スペース `　` を半角スペース ` ` に置換
    - カンマ + 半角スペース `,` で結合

- **メモセクション**:
    - `notes` の内容をそのまま転記
    - 改行や書式は保持

---

## 5. 参加者 (attendees)

### 変換ロジック

**description への埋め込み:**

```javascript
// 実装: GaroonEventService.getAttendee()
attendees.map(user => user.name.replace('　', ' ')).join(', ')
```

**注意事項:**

- Google Calendarの `attendees` プロパティには設定 **しない**
- `description` 内にテキストとして埋め込むのみ
- 理由: 招待メール送信などの副作用を避けるため

### 変換例

| Garoon attendees | GCal description (参加者セクション) |
|-----------------|----------------------------------|
| `[{name: "山田　太郎"}, {name: "佐藤　花子"}]` | `"山田 太郎, 佐藤 花子"` |
| `[{name: "鈴木一郎"}]` | `"鈴木一郎"` |
| `[]` | `""` (空文字列) |

---

## 6. イベントメニュー (eventMenu)

### 変換ロジック

`eventMenu` は独立したプロパティとしては存在せず、**タイトルの接頭辞**として表現されます。

```javascript
// 実装: GaroonEventService.createTitle()
const eventMenuPrefix = garoonEvent.eventMenu ? `【${garoonEvent.eventMenu}】` : '';
const title = eventMenuPrefix + garoonEvent.subject;
```

### 対応表

| Garoon eventMenu | GCal summaryへの影響 |
|-----------------|---------------------|
| `"会議"` | `summary` の先頭に `"【会議】"` を付加 |
| `"打ち合わせ"` | `summary` の先頭に `"【打ち合わせ】"` を付加 |
| `null` | 接頭辞なし |
| `""` (空文字列) | 接頭辞なし |

---

## 7. 拡張プロパティ (タグ情報)

Google Calendarの `extendedProperties` にGaroon固有の情報を保存します。

### 7.1 GAROON_UNIQUE_EVENT_ID

**目的:** Garoonイベントとの紐づけ管理

**生成ロジック:**

```javascript
// 実装: GaroonEventService.createUniqueId()
const repeatId = garoonEvent.repeatId ? '-' + garoonEvent.repeatId : '';
return garoonEvent.id + repeatId;
```

**設定方法:**

```javascript
// 実装: GCalEventService.setTagToEvent()
gCalEvent.setTag('GAROON_UNIQUE_EVENT_ID', uniqueId);
```

**例:**

| Garoon | uniqueId |
|--------|----------|
| `id: "12345"`, `repeatId: null` | `"12345"` |
| `id: "12345"`, `repeatId: "67890"` | `"12345-67890"` |

### 7.2 GAROON_SYNC_DATETIME

**目的:** 同期状態の管理（更新検知）

**設定値:** Garoonの `updatedAt` タイムスタンプ

**設定方法:**

```javascript
// 実装: GCalEventService.setTagToEvent()
gCalEvent.setTag('GAROON_SYNC_DATETIME', garoonEvent.updatedAt);
```

**例:**

```javascript
{
  extendedProperties: {
    shared: {
      'GAROON_UNIQUE_EVENT_ID': '12345',
      'GAROON_SYNC_DATETIME': '2024-01-10T09:00:00+09:00'
    }
  }
}
```

---

## 8. イベントタイプ (eventType)

### 変換仕様

Garoonには複数のイベントタイプが存在しますが、**Google Calendarには該当する概念がありません**。

### マッピング方法

| Garoon eventType | Google Calendar での表現 |
|-----------------|------------------------|
| `REGULAR` (通常) | 時刻指定イベント |
| `ALL_DAY` (終日) | 終日イベント (`createAllDayEvent`) |
| `BANNER` (期間) | 終日イベント |

**実装上の対応:**

- `isAllDay` フラグでイベントタイプを判定
- `eventType` 自体は転送しない

---

## 9. 同期対象外フラグ

### 判定ロジック

Garoonの `notes` に特定のハッシュタグが含まれる場合、同期対象外として除外します。

```javascript
// 実装: GaroonEventService.isNoSyncEvent()
if (garoonEvent.notes.includes('#nosync')) {
  return true;  // 同期しない
}
```

### 仕様

- **検索対象:** `notes` フィールド
- **除外タグ:** `#nosync`
- **マッチング:** 部分一致
- **動作:** このタグを含むイベントは同期処理から除外される

### 使用例

```javascript
// Garoonイベント
{
  subject: "内部会議",
  notes: "社内向けの会議です。\n#nosync"
}
// → Google Calendarには同期されない
```

---

## 10. 繰り返し予定 (repeatId)

### 変換ロジック

繰り返し予定は **個別のイベントとして展開**され、それぞれに固有のIDが割り当てられます。

```javascript
// 実装: GaroonEventService.createUniqueId()
uniqueId = garoonEvent.id + '-' + garoonEvent.repeatId
```

### 仕様

- Garoon API は繰り返し予定を展開済みで返す
- 各インスタンスは `id` + `repeatId` の組み合わせで一意に識別
- Google Calendarには通常のイベントとして作成（繰り返しルールは設定しない）

### 例

**Garoon 毎週の定例会議:**

| インスタンス | id | repeatId | uniqueId |
|------------|-----|----------|----------|
| 第1回 | `"100"` | `"1001"` | `"100-1001"` |
| 第2回 | `"100"` | `"1002"` | `"100-1002"` |
| 第3回 | `"100"` | `"1003"` | `"100-1003"` |

**GCal への同期:**

- 3つの独立したイベントとして作成
- それぞれに異なる `GAROON_UNIQUE_EVENT_ID` タグを設定

---

## 項目マッピング一覧表

| # | Garoon項目 | 型 | Google Calendar項目 | 型 | 変換ロジック | 備考 |
|---|-----------|-----|-------------------|-----|------------|------|
| 1 | `subject` | string | `summary` | string | `【{eventMenu}】{subject}` | eventMenuは任意 |
| 2 | `eventMenu` | string | `summary` (接頭辞) | string | `【{eventMenu}】` | nullの場合は接頭辞なし |
| 3 | `start.dateTime` | string | `start` | Date | `new Date()` で変換 | ISO 8601形式 |
| 4 | `end.dateTime` | string | `end` | Date | `new Date()` で変換、終日は+1秒 | ISO 8601形式 |
| 5 | `isAllDay` | boolean | イベント種別 | - | `createAllDayEvent` / `createEvent` | メソッド選択に使用 |
| 6 | `isStartOnly` | boolean | `end` | Date | `end = start` | 終了時刻を開始時刻と同じに |
| 7 | `notes` | string | `description` (メモ部) | string | `【メモ】\n{notes}` | 構造化descriptionの一部 |
| 8 | `attendees[].name` | array | `description` (参加者部) | string | `【参加者】\n{names}` | カンマ区切りテキスト |
| 9 | `id` | string | `extendedProperties` | object | タグ `GAROON_UNIQUE_EVENT_ID` | 繰り返しはid-repeatId |
| 10 | `repeatId` | string | `extendedProperties` | object | タグ `GAROON_UNIQUE_EVENT_ID` | idと結合 |
| 11 | `updatedAt` | string | `extendedProperties` | object | タグ `GAROON_SYNC_DATETIME` | 更新検知用 |

---

## 変換されない項目

以下のGaroon項目は、Google Calendarへの同期時に **転送されません**:

| Garoon項目 | 理由 |
|-----------|------|
| `eventType` | GCalには該当概念なし (`isAllDay`で代替) |
| `facilities` | GCalのattendees機能を使用しないため |
| `visibilityType` | GCalの公開範囲は別途管理 |
| `companyInfo` | GCalに該当フィールドなし |
| `attachments` | 現バージョンでは未対応 |

---

## 注意事項

### 1. 日時の時差調整

- Garoon、Google Calendar共にタイムゾーン情報を保持
- 変換時は `Date` オブジェクトを介して自動的に調整される
- システムのタイムゾーン設定に依存

### 2. 終日イベントの終了時刻

**重要:** Garoonの終日イベント終了時刻は必ず +1秒 する

```javascript
// 誤り
end = new Date(garoonEvent.end.dateTime);

// 正しい
end = new Date(garoonEvent.end.dateTime);
end.setSeconds(end.getSeconds() + 1);
```

### 3. 参加者情報の制限

- Google Calendarの `attendees` プロパティは使用しない
- 招待メール送信などの副作用を避けるため
- あくまでdescription内にテキスト情報として保存

### 4. イベントメニューの抽出不可

- Garoon→GCalは `【eventMenu】` 形式で保存
- しかし、GCal→Garoonの逆変換時にのみ抽出可能
- 一方向同期のため、現状は問題なし

### 5. 繰り返し予定の個別管理

- Garoonの繰り返し予定は展開済みで取得される
- Google Calendarには繰り返しルールを設定せず、個別イベントとして作成
- 一括編集機能は提供されない

---

## 参考資料

- [Garoon REST API リファレンス](https://cybozu.dev/ja/garoon/docs/rest-api/)
- [Google Calendar API リファレンス](https://developers.google.com/calendar/api/v3/reference)
