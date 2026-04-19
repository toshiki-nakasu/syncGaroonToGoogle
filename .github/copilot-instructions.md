# copilot-instructions

## 書式ルール

- 全ての回答は日本語で記述する
- 全角丸括弧 `（）` は使用せず、半角 `()` を使用する

## 編集方針

ファイルを修正するエージェント (implementer, doc-editor) に適用する:

- 指示された変更だけを機械的に適用しない
- 変更対象について、以下の観点で精査してから修正する
    - 構造が最適であること
    - 分離性が適切であること
    - 役割が明確であること
    - 整合性が保たれていること
    - 重複しない記述であること
- ファイルの編集にはエディタツールのみ使用する
    - エージェントが対話中にターミナルコマンドでファイルを書き換えること (`sed -i`, `perl -i` 等) は禁止
    - hook による自動整形や検証のための決定的な後処理は、この禁止の対象外とする
    - チェックポイントに変更履歴を残すため

## AI モデル運用方針

- リポジトリの AI 文書と運用ルールの既定方針として、実装, 編集, 最終判断の主担当モデルは `Claude Code` とする
- 相談, 壁打ち, 調査, ナレッジ整理では `ChatGPT`, `Gemini` の利用を許可する
- `ChatGPT`, `Gemini` から得た提案をそのまま規約化せず、必ず本リポジトリの instructions, skills, agents, 実ファイルに照らして再検証する
- AI 文書にモデル利用方針を記載する場合は、主担当モデル, 補助利用モデル, 利用目的, 再検証責任を明示する
- 実際の対話環境で別のモデルを利用していても、リポジトリへ反映する内容はこの既定方針で扱う

## エージェント運用方針

### 共通原則

- 全エージェントに共通する原則, 判断基準, 制約は `copilot-instructions.md` に集約する
- [main.agent.md](agents/main.agent.md) はタスク振り分け, 質問方法, handoff 管理に集中し、共通原則を重複記載しない
- 個別エージェントには役割固有の進め方のみを記載し、共通原則は参照で扱う
- サブエージェントは着手前に、対象領域に応じた instructions / skills を読み込む

### 対話継続と実施方針

対話は原則として以下の 5 フェーズの順で進める。このフェーズは特定の agent, skill, prompt に依存せず、全てのやり取りに適用する。

1. `状況把握`
2. `フィードバックと確認`
3. `回答受付`
4. `対応`
5. `ネクストアクションの提案`

- `フィードバックと確認` と `回答受付` は、必要に応じて複数回繰り返してよい
- `状況把握`: 依頼内容, 対象範囲, 未確定事項, 問題の有無を整理する
- `フィードバックと確認`: 問題が見つかった場合は、その場で修正や操作に進まず、まず問題点, 影響, 対応候補, 推奨する次のアクションをユーザーへ共有する
- `回答受付`
    - 問題があり、かつ具体的な次のアクションがある場合は、会話の区切りをまたいでも原則 `vscode_askQuestions` を提示して実施方針を確認する
    - `vscode_askQuestions` を提示しないのは、問題が見つからなかった場合、または具体的な次のアクションが特にない場合に限る
    - `main` は確認を出した後、回答を受ける前に修正, 操作, 委譲へ進まない
    - 対象範囲に複数解釈が残る場合や、別の未確定な分岐が残る場合は追加確認を行う
- `対応`
    - ユーザーへの確認と実施方針の確定は `main` が担い、サブエージェントは handoff に含まれる承認状態を前提に動く
    - 修正や操作を行うサブエージェントは、実施指示付きの handoff では直接進め、実施方針が未確定の handoff では候補や不足情報の報告にとどめる
    - 対応中に新たな問題や未確定事項が発生した場合は、`フィードバックと確認` (フェーズ 2) へ戻る
- `ネクストアクションの提案`: 実施後は、結果, 未対応事項, 必要なら次の候補アクションをユーザーへ提示する
- review / validation 系 prompt, agent, skill は、この 5 フェーズにそのまま接続でき、かつ `vscode_askQuestions` で確認しやすいよう、対応候補の粒度を整理して提示する

### handoff の必須項目

- サブエージェントへ委譲する際は、少なくとも以下を含める
    - `作業目的`
    - `完了条件`
    - `非対象`
    - `必読文書`
    - `制約 / 前提`
    - `期待する出力形式`
- サブエージェントは着手前に handoff を確認し、不足があれば推測せずに不足情報として報告する

### ルールの参照順と配置先

ルールの適用順序と AI 文書の配置先は同じ優先度に従う。

- 常時適用の原則: `copilot-instructions.md`
- ファイル種別や技術領域にまたがる規約: instructions
- 再利用可能な手順, 判断フロー, ドメイン知識: skills
- 役割固有の進め方: agents
- 定期精査, 編集後検証, 監査手順: prompts

## AI 文書の更新原則

### Capture, Triage, Promote

- 個別タスクで繰り返し出る指示や判断基準は、まず観察結果として整理する
- 複数のファイルやエージェントにまたがる場合は、局所文書ではなく上位文書への昇格を検討する
- 再利用性が確認できたら、「ルールの参照順と配置先」に従って配置先を判断する

### 重複防止

- 同じ指示を複数の agent や skill に複製しない
- 参照で済む内容は上位文書へ集約し、下位文書では参照関係を明示する
- 索引や SkillNet 相当の仕組みを追加する場合も、discovery 用のメタデータにとどめ、規約本文を複製しない

## 構成マップ

本リポジトリの AI 運用資産は `.github/` 配下の instructions, skills, agents, prompts, hooks と、hooks が直接参照する scripts に分散して定義されている。以下の構成マップで全体像を把握できる。

この構成マップは GitHub Copilot 自体の必須要件ではなく、本リポジトリで人と AI エージェントが参照先を素早く特定するための索引として管理する。ユースケース別の読み順や組合せは [skills/discover-skills/SKILL.md](skills/discover-skills/SKILL.md) を正本とし、この構成マップはファイルの所在と責務の概要に集中する。

### instructions

| カテゴリ | ファイル | 概要 |
| --- | --- | --- |
| Python | [instructions/python.instructions.md](instructions/python.instructions.md) | Ruff, 型ヒント, pytest 配置, import 整理 |
| Markdown | [instructions/markdown.instructions.md](instructions/markdown.instructions.md) | Prettier, 箇条書き, 参照リンク, テーブル記法 |
| JavaScript / GAS | [instructions/javascript.instructions.md](instructions/javascript.instructions.md) | Prettier, JSDoc, GAS 制約, 定数管理 |
| YAML | [instructions/yaml.instructions.md](instructions/yaml.instructions.md) | Prettier, 2 スペース, 引用符, 配列整形 |
| AI 文書 | [instructions/ai-docs.instructions.md](instructions/ai-docs.instructions.md) | 共有インフラ原則, frontmatter, 命名, 品質観点 |

### skills

#### プロジェクト全般

| カテゴリ | ファイル | 概要 |
| --- | --- | --- |
| Skill 索引 | [skills/discover-skills/SKILL.md](skills/discover-skills/SKILL.md) | ユースケース選定, 読み順, skill 組合せ |
| ドキュメント | [skills/write-specification/SKILL.md](skills/write-specification/SKILL.md) | docs 命名, 品質基準, mermaid, 日本語ライティング |

#### プロジェクト固有

| カテゴリ | ファイル | 概要 |
| --- | --- | --- |
| Apps Script 開発 | [skills/sync-garoon-to-google-development/SKILL.md](skills/sync-garoon-to-google-development/SKILL.md) | ServiceContainer, ScriptProperties, Garoon GCal 同期, clasp 運用 |

### agents

詳細な委譲ルールは [agents/main.agent.md](agents/main.agent.md) を参照。

| カテゴリ | ファイル | 概要 |
| --- | --- | --- |
| main | [agents/main.agent.md](agents/main.agent.md) | ルーティング, 委譲判断, handoff 管理 |
| implementer | [agents/implementer.agent.md](agents/implementer.agent.md) | コード修正, repo 規約準拠, 検証 |
| design-reviewer | [agents/design-reviewer.agent.md](agents/design-reviewer.agent.md) | 仕様レビュー, データ構造整合, 設計検証 |
| doc-editor | [agents/doc-editor.agent.md](agents/doc-editor.agent.md) | 文書編集, AI 文書保守, 品質改善 |
| git-manager | [agents/git-manager.agent.md](agents/git-manager.agent.md) | 差分要約, コミット, PR |

### prompts

| カテゴリ | ファイル | 概要 |
| --- | --- | --- |
| 編集後検証 | [prompts/check-convention.prompt.md](prompts/check-convention.prompt.md) | 規約違反, 表記統一, JavaScript / GAS 観点 |
| AI 文書レビュー | [prompts/review-ai-docs.prompt.md](prompts/review-ai-docs.prompt.md) | 命名精査, 構造精査, legacy 排除, 配置先判定 |

### hooks

| カテゴリ | ファイル | 概要 |
| --- | --- | --- |
| 自動フォーマット | [hooks/format-on-edit.json](hooks/format-on-edit.json) | PostToolUse, 末尾スペース除去, Prettier, 簡易検証 |
| コマンド制御 | [hooks/command-guard.json](hooks/command-guard.json) | PreToolUse, 危険コマンド遮断, ターミナル編集禁止 |

### scripts

| カテゴリ | ファイル | 概要 |
| --- | --- | --- |
| フォーマット hook | [script/hooks/format-and-lint.sh](script/hooks/format-and-lint.sh) | 編集後整形, 末尾スペース除去, 構文チェック |
| コマンド制御 hook | [script/hooks/command-guard.sh](script/hooks/command-guard.sh) | 実行コマンド検査, 危険操作遮断 |
