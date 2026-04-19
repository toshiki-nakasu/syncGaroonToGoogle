---
description: "AI 文書の構造規約。Use when: AI 文書の作成 / 修正, frontmatter 編集, 構成マップ更新。"
applyTo: ".github/**/*.md"
---

# AI 文書の構造規約

`.github/` 配下の agents, instructions, skills, prompts, hooks ファイルに適用する構造ルール。記法ルール (並列列挙, 矢印, コードブロック等) は [markdown.instructions.md](markdown.instructions.md) に従う。mermaid ノードテキスト, `plaintext` コードブロック内のコメントにも同じ表記ルールを適用する。

## AI 文書を共有インフラとして扱う原則

AI 文書は、チーム標準を実行可能な形で共有するためのバージョン管理対象の運用資産として扱う。外部記事や個人ノウハウから得た知見を取り込む場合も、個別メモとして増やすのではなく、以下の原則へ還元する。本セクションの設計は [Encoding Team Standards](https://martinfowler.com/articles/reduce-friction-ai/encoding-team-standards.html) (Martin Fowler, 2026-03-31) の知見を基にしている。

- 常時適用の文書には普遍原則だけを置き、ユースケース別の読み順や組合せは [discover-skills](../skills/discover-skills/SKILL.md) スキルを正本とする
- 1 つの文書は小さく保ち、単一の主要ユースケースに集中させる
- instruction / skill / prompt には、役割, 必要コンテキスト, 優先度付き基準, 構造化された出力のどれを担う文書かを明確にする
- review / validation は後工程だけでなく、生成時, 編集時, レビュー時の早い段階で適用できる配置を優先する
- AI 文書の変更は、コードや CI と同じく pull request で継続的に磨く共有インフラとして扱う

## ファイル種別ごとの frontmatter

### agents (`agents/*.agent.md`)

```yaml
name: エージェント名
description: "1 文の役割要約。Use when: トリガーキーワード"
user-invocable: false # main 以外
tools: [許可するツールカテゴリ]
agents: [委譲先エージェント] # main のみ
```

### instructions (`instructions/*.instructions.md`)

```yaml
description: "1 文の規約要約。Use when: トリガーキーワード"
applyTo: "globパターン"
```

### skills (`skills/スキル名/SKILL.md`)

```yaml
name: スキル名
description: "1 文のスキル要約。Use when: トリガーキーワード"
```

- `name` フィールドはフォルダ名と一致させる

### prompts (`prompts/*.prompt.md`)

```yaml
description: "1 文のプロンプト要約。Use when: トリガーキーワード"
```

### top-level shared docs (`.github/copilot-instructions.md`)

top-level shared doc は frontmatter を持たない。常時適用の共通原則, 構成マップ, 更新原則の正本として扱う。

### reference docs (`skills/*/references/*.md` など)

reference doc は frontmatter を持たない。親 skill / prompt / instruction から参照される補助資料として扱い、単体 discovery の対象にはしない。

### hooks (`hooks/*.json`)

hooks は JSON ファイルのため frontmatter を持たない。精査対象としては管理するが、構造規約は JSON スキーマに従う。

## description フィールドの書き方

```plaintext
"[1 文の要約]。Use when: [キーワード1], [キーワード2], [キーワード3]。"
```

- 要約文とトリガーキーワードを `Use when:` で区切る
- キーワードは `, ` 区切りで列挙する
- 具体的な操作名を使う (例: `ポート定義` > `設計`)
- 他スキルへの参照や補足説明は description ではなくスキル本文に記載する
- 目安: 要約文 + Use when で 100 文字程度以内に収める

## ファイル名の命名規則

- ファイル名だけで `対象` と `役割` が分かる名前にする
- 抽象的すぎる語より、主要ユースケースを表す語を優先する
- 役割が変わった場合は本文だけでなくファイル名も見直す

### agents

- 役割名をそのまま kebab-case で表す
- 例: `doc-editor.agent.md`, `design-reviewer.agent.md`

### instructions

- 対象領域や技術名を kebab-case で表す
- 例: `javascript.instructions.md`, `ai-docs.instructions.md`

### prompts

- `目的-対象.prompt.md` を基本とする (verb-first)
- `check`, `review`, `audit` など、実行目的を表す動詞を先頭に置く
- 例: `check-convention.prompt.md`, `review-ai-docs.prompt.md`

### skills

- フォルダ名は主要ユースケースかドメイン名を kebab-case で表す
- 共通 skill には 2 パターンがあり、内容の性質で使い分ける
    - 手順型: 動詞を先頭に置く (例: `write-specification`, `discover-skills`, `add-audit-docs-service`)
    - 知識型: `ref-` を先頭に付けてドメイン名を続ける (例: `ref-domain-principles`, `ref-testing-patterns`)
- プロジェクト固有 skill はプロジェクト名 + 用途で命名する
- skill の名前だけで分かりにくい場合は、`description` の Use when で補う

## セクション構成パターン

### agents

```plaintext
# 役割
  (1 文で責務を定義)

# ドメイン固有セクション (自由)
  (各エージェントの専門領域ごとのルール)
  (例: # 原則, # 進め方, # コミットメッセージ規約 等)

# 出力形式
  (レポート形式, 分類方法)
```

- main エージェントは例外として、以下の順で構成する
    1. `# 応答方針`
    2. `# 質問方法`
    3. `# サブエージェントへの委譲`

### instructions

```plaintext
# [言語・技術] 規約
  (フォーマッタ指定)

## セクション (自由)
  (命名規則, 記法ルール 等)
```

### skills

```plaintext
# [ドメイン名]
  (スコープの説明, 他スキルとの境界)
  (前提コンテキスト: この skill の適用前に読み込むべき文書やコード)

## セクション (自由)
  (手順, ルール, コード例)
```

- 前提コンテキストには、skill を正しく適用するために事前に読み込むべき instructions, 他の skills, ソースコードのパスを記載する
- 前提が不要な場合は省略してよい

### top-level shared docs

```plaintext
# 文書名
  (共通原則や構成マップの役割を 1-2 文で説明)

## セクション (自由)
  (全体原則, 更新原則, 構成マップ 等)
```

### reference docs

```plaintext
# 補助資料名
  (親文書との関係と参照タイミングを 1-2 文で説明)

## セクション (自由)
  (補足ルール, 対応表, テンプレート, 低レベル制約 等)
```

- reference doc は親文書からの参照で読む前提とし、単独の運用方針や discovery 用 description は持たせない
- reference doc の先頭では、どの親文書の補助資料かを明記する

## 優先度カテゴリ

instruction / skill 本文で基準やルールを列挙する際に、以下の 3 段階の優先度カテゴリを付与する。AI が判断の重みを区別し、違反時の対応を決定できるようにする。

| カテゴリ | 意味 | 違反時の扱い |
| --- | --- | --- |
| `必須` | アーキテクチャ準拠, セキュリティ等の必達項目 | ブロッカーとして報告する |
| `推奨` | 規約準拠, 品質向上のために従うべき項目 | 重要指摘として報告する |
| `任意` | スタイル選好, 改善提案レベルの項目 | 提案として報告する |

- 文書の種別に応じてカテゴリの具体的な表現を使い分けてよい
    - generation instruction: `必須` (architectural compliance), `推奨` (convention adherence), `任意` (style preferences)
    - security instruction: `必須` (critical vulnerabilities), `推奨` (important concerns), `任意` (advisories)
    - review prompt / skill: `必須` (breaking issues), `推奨` (important findings), `任意` (suggestions)
- 既存文書に一括でカテゴリを付与する必要はなく、新規作成や改訂の際に漸進的に適用する
- カテゴリの判断に迷う場合は `推奨` をデフォルトとする

## ユースケース単位の分離

- 1 つの文書には 1 つの主要ユースケースを持たせる
- 複数ユースケースで共通に使う規約は上位文書へ集約し、個別文書では参照にとどめる
- プロジェクト固有, サービス固有, ワークフロー固有の手順は、それぞれの skill や prompt に分離する
- ユースケースごとの skill 選定や組合せは `discover-skills` スキルへ集約し、各 skill 本文に同じ選定表を複製しない
- 常時適用の workspace instructions には task 固有の読み順や組合せを持ち込まず、必要な discovery は [discover-skills](../skills/discover-skills/SKILL.md) スキルを正本とする
- 共通原則とユースケース固有の実装例が同じ文書に混在する場合は、共通部分を上位文書へ切り出す

## 配置先と昇格判断

- AI 文書の配置順や昇格先の判断は [copilot-instructions.md](../copilot-instructions.md) の「AI 文書の更新原則」に従う
- この文書では、AI 文書の構造, 命名, 品質観点だけを補足する

## モデル利用方針の記載

モデル選定, 再検証の原則, 記載時の必須項目は [copilot-instructions.md](../copilot-instructions.md) の「AI モデル運用方針」に従う。

- 同じモデル方針を複数ファイルに複製せず、個別ファイルでは上位文書を参照する

## AI 文書の品質観点

- description に適切な `Use when:` キーワードが含まれているか
- 指示内容が実態と乖離していないか
- 不要になった定義や旧方針の説明だけが残っていないか
- 現行リポジトリの主要プロジェクト名, 技術スタック, ディレクトリ構成, 配備方式と整合しているか
- frontmatter がこの文書の規約に従っているか
- コード例や悪い例が 1 つの例に複数の違反を混在させていないか
- ルールの適用単位や判断基準が曖昧でないか
- モデル利用方針が [copilot-instructions.md](../copilot-instructions.md) の既定値と矛盾していないか
- アウトラインが主要ユースケースに対して過不足なく整理されているか
- 箇条書きや番号付き手順の階層, 粒度, 並び順が読みやすく保たれているか
- 箇条書きの階層が深すぎず浅すぎず、類似項目が適切にグルーピングされているか
- Markdown 文書やセクションへの参照が、リンク可能な場合に Markdown リンクで記述されているか
- 構成マップが AI 文書本体だけでなく、直接参照する運用資産まで追跡できるか
- review / validation 系 prompt / skill の指摘が重要度順で並び、少なくとも `種別`, `重要度`, `影響`, `理由`, `推奨変更` を含むか
- 新規作成や改訂の際に、優先度カテゴリ (`必須` / `推奨` / `任意`) が適用されているか
- review / validation 系 prompt / skill の出力が、[copilot-instructions.md](../copilot-instructions.md) の「対話継続と実施方針」の 5 フェーズへ自然につながる構造になっているか

## ファイル種別ごとの責務境界

エージェント間の原則 (共通原則の集約先, main の役割限定, 個別 agent の記載範囲) は [copilot-instructions.md](../copilot-instructions.md) の「共通原則」に従う。以下は構造面の補足:

- [copilot-instructions.md](../copilot-instructions.md): handoff 契約, AI 文書更新ループも共通原則として含める
- [main.agent.md](../agents/main.agent.md): 委譲条件の定義もスコープに含める
- 個別 agent
    - 承認の取得は自分で担わず、[copilot-instructions.md](../copilot-instructions.md) の「対話継続と実施方針」と handoff を前提にする
    - 出力形式を明記する
    - AI 文書の共通品質観点はこの文書を参照し、agent 固有の運用だけを補足する
- instructions / skills / prompts: 配置基準と優先度は [copilot-instructions.md](../copilot-instructions.md) の「ルールの参照順と配置先」に従う

## hooks と関連運用資産

- hook JSON, hook script, AI 文書の説明は 1 つの実行契約を共有する
- hook が対象にする event, tool, file type は、JSON 定義, shell script 実装, agent / prompt / skill の説明で一致させる
- hook JSON から参照される shell script と、AI 文書本文で正本として参照する workflow / script は構成マップへ索引する
- 実行契約を変更した場合は、関連する AI 文書の説明も同じ変更で更新する

## 構成マップの保守

[copilot-instructions.md](../copilot-instructions.md) の構成マップテーブルは、AI 文書本体と、それらが直接参照する運用資産 (hook script, workflow, 補助 script) の索引として機能する。ファイルの追加, 削除, リネーム時は対応するテーブル行を更新する。

- doc-editor が AI 文書を編集した場合、構成マップの概要列も確認する
- 概要列は `, ` 区切りで 3-4 キーワードを記載する
- ファイルパスは `.github/` からの相対パスとする
- ユースケース別の読み順や組合せは [discover-skills](../skills/discover-skills/SKILL.md) スキルを正本とし、構成マップではファイルの所在と責務の概要に集中する

## ファイル間の参照ルール

基本ルール (リンクの使用, アンカー安定時の見出しリンク, 併記) は [markdown.instructions.md](markdown.instructions.md) の「参照リンク」に従う。以下は AI 文書固有の補足:

- AI エージェントは Markdown リンクを平文として読めるため、リンク化しても利用上の問題はない
- skills / instructions / prompts / agents への参照では、リンクテキストに正確な名前を残す
    - 例: `[sync-garoon-to-google-development](../skills/sync-garoon-to-google-development/SKILL.md)` スキル
- 共通ルールへの委譲: 「`[スキル名]` スキルに従う」と記載し、内容を複製しない
- プロジェクト固有スキルからリポジトリ共通スキルへの参照で境界を明示する

## prompts の運用

`.github/prompts/` に配置する `.prompt.md` ファイルは、エージェントが特定のタイミングで実行する検証や作業手順を定義する。

- [check-convention.prompt.md](../prompts/check-convention.prompt.md): 編集後の規約違反を検証する
- [review-ai-docs.prompt.md](../prompts/review-ai-docs.prompt.md): AI 文書の定期精査 (命名, 構造, 重複, 配置先) を実行する
- 対応候補や違反項目を返す prompt / skill は、少なくとも以下のフェーズへ自然につながるよう、項目の単位を明確に分けて出力する
    1. `状況把握`: 対象範囲, 問題の有無, 前提差分
    2. `フィードバックと確認`: 問題点, 影響, 対応候補, 推奨する次のアクション
    3. `回答受付`: [main.agent.md](../agents/main.agent.md) が `vscode_askQuestions` で確認しやすい一括項目と個別項目
    4. `対応`: prompt / skill 自身は実施判断を確定せず、承認待ちでは候補整理にとどめる
    5. `ネクストアクションの提案`: 問題がない場合や対応後に確認すべき項目を示せる構造
- review / validation 系 prompt / skill の指摘項目は、少なくとも `種別`, `重要度`, `影響`, `理由`, `推奨変更` を含める
- `重要度` は `高`, `中`, `低` の 3 値を使用する
- ファイル単位の違反を返す場合は、`対象ファイル` と `行番号` も含める
- 指摘は `重要度` の高い順に並べる
- review / validation 系 skill でも、対応候補を返す場合は同じ粒度規約を適用し、実施判断の確定は行わず候補整理までを担当する
- review / validation 系 prompt / skill は、問題がない場合や具体的な次のアクションが特にない場合は、`状況把握` と `フィードバックと確認` を出力して完了できるようにする
- 問題がない場合の `フィードバックと確認` では、`問題なし` または `違反なし` を明記する
- review / validation 系 prompt で運用整合を扱う場合は、AI 文書が参照する hook script や workflow も関連ファイルとして確認対象に含める
