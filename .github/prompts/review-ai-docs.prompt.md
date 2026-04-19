---
description: "AI 文書の構造レビューと配置先精査を行う。Use when: AI 文書レビュー, 命名レビュー, 構造精査, 配置先判定。"
---

# AI 文書レビュー

`.github/` 配下の全 AI 文書 (agents, instructions, skills, prompts, hooks) を対象に、命名, 構造, 品質, 配置先を精査する。

## 対象ファイルの収集

- [copilot-instructions.md](../copilot-instructions.md) の構成マップに索引された全ファイルを読み込む
- 構成マップに未掲載のファイルがあれば、それ自体を不整合として報告する
- 運用整合性を確認する場合は、hooks が参照する shell script, AI 文書で説明する workflow, AI 文書本文で正本として参照する script も関連ファイルとして読み込む
- リポジトリ固有の整合性を確認する場合は、[README.md](../../README.md) と主要な project manifest を読み、AI 文書の project-specific guidance と照合する

## 精査の基準

- 構造, 命名, 責務境界: [ai-docs.instructions.md](../instructions/ai-docs.instructions.md)
- 共通原則, handoff, 更新原則: [copilot-instructions.md](../copilot-instructions.md)
- 文書品質, アウトライン, 可読性: [write-specification](../skills/write-specification/SKILL.md), [markdown.instructions.md](../instructions/markdown.instructions.md)

## 命名の精査

- ファイル名だけで対象と役割が分かるか
- frontmatter の `name` や `description` がファイル名と役割に一致しているか
- 構成マップ上のカテゴリ名, ファイル名, 概要が主要ユースケースを正しく表しているか
- `review`, `validation`, `audit` のような実行目的が名前に表れているか
- 旧来の役割を引きずる曖昧な名前が残っていないか

## 構造と責務の精査

- 全エージェント共通の原則が [copilot-instructions.md](../copilot-instructions.md) に集約されているか
- [main.agent.md](../agents/main.agent.md) が handoff の正本を重複記載せず [copilot-instructions.md](../copilot-instructions.md) を参照しているか
- 個別 agent が役割固有の進め方だけを記述しているか
- 1 つの文書に複数の主要ユースケースが混在していないか
- 共通原則とユースケース固有の手順が分離されているか
- AI 文書で参照するツール名, MCP サーバー名, ファイル名が実在する定義と一致しているか

## アウトラインと列挙構造の精査

- 見出し構成が主要ユースケースに対して自然な順序になっているか
- 1 つの節に複数の責務や複数の読者向け説明が混在していないか
- 箇条書きと番号付き手順の使い分けが妥当か
- 箇条書きの階層が深くなりすぎていないか
- 箇条書きの階層が浅すぎて、同一階層に項目が集まりすぎていないか
- 類似の要素や同じ導入文に属する項目が、親子関係を持たずに平坦に並んでいないか
- 列挙項目の粒度や文体がそろっているか

## 記法の精査

- 箇条書きや手順を `A → B → C` のような本文上の矢印列で書いていないか
- 長いインライン列挙を箇条書きや番号付きリストへ展開できないか
- 箇条書きと番号付き手順の使い分けが、文脈に対して自然か
- リポジトリ内の Markdown 文書やセクション参照が、リンク可能な場合に Markdown リンクになっているか
- リンクテキストに、参照先の文書名や skill 名が正確に残っているか

## 運用整合性の精査

- `ChatGPT`, `Gemini` など補助利用モデルの提案を再検証せずに規約化した記述が残っていないか
- [copilot-instructions.md](../copilot-instructions.md) に主担当モデルと補助利用モデルの方針があり、各 AI 文書と矛盾していないか
- hook JSON, hook 実装 script, workflow の説明と実装が相互に矛盾していないか
- 現行リポジトリの主要技術, ディレクトリ構成, 配備方式と合わない別リポジトリ固有記述が残っていないか
- 従来の運用前提や旧方針を説明するだけの記述が残っていないか
- task 別に必要な instructions / skills を参照する契機が description や本文に含まれているか

## 更新提案の方針

問題点を見つけた場合は、まず局所修正で足りるか、上位文書への昇格が必要かを切り分ける。

- 配置先の判断は [copilot-instructions.md](../copilot-instructions.md) の `## AI 文書の更新原則` に従う
- 重複や旧記述は、残す理由がない限り削除候補として扱う
- この prompt 自身は実施判断を確定せず、対応候補の整理と推奨配置先の提示までを担当する
- 出力構造は [ai-docs.instructions.md](../instructions/ai-docs.instructions.md) の「prompts の運用」に従い、5 フェーズへ自然につながる順で整理する

## 出力形式

出力は [ai-docs.instructions.md](../instructions/ai-docs.instructions.md) の「prompts の運用」に従う。個別要件は以下のみ追加する。

### 1. 状況把握

- 対象範囲
- 問題の有無
- 前提差分

### 2. フィードバックと確認

- 各指摘には共通項目に加えて `対象ファイル`, `推奨配置先` を含める
- 重複や旧記述は削除候補として明記する
- 問題がない場合は `状況把握` と `フィードバックと確認` のみで完了できる

### 3. 回答受付

- 一括で確認できる対応項目
- 個別に確認すべき対応項目

### 4. 対応

- この prompt 自身は実施判断を確定せず、対応候補の整理と推奨配置先の提示までを担当する

### 5. ネクストアクションの提案

- 次のアクション候補
