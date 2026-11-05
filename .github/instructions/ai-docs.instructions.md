---
description: "AI向け文書の役割と参照を確認する。Use when: instructions, skills, agents, promptsの変更。"
applyTo: ".github/**/*.md,AGENTS.md"
---

# AI向け文書の保守

配置と重複の判断は[Markdown規約](markdown.instructions.md)、共通の変更条件は[実装指示の索引](maintenance.md)を正本にします。

## 入口の形式

| 種類         | 必要な情報                                   |
| ------------ | -------------------------------------------- |
| instructions | `description`と`applyTo`                     |
| skills       | フォルダー名に一致する`name`と`description`  |
| agents       | 名前と説明。利用できるツールと役割も記載する |
| prompts      | `description`と確認する作業                  |
| 共通の索引   | frontmatterは不要                            |

descriptionは参照すべき変更の種類を具体的に示します。各文書の本文では、入口と詳細のどちらを担うかを明確にしてください。

## 内容を確認する

1. 対象の変更で誤りやすい判断か確認する。
1. 人間の保守担当者にも必要な設計なら、通常の設計文書を正本にする。
1. 同じ規則の所有文書を検索し、重複を追加せず参照する。
1. パスと見出し、ツールの前提を確認する。
1. 対応する索引と参照元を更新する。

hookの説明を変更した場合は、JSONの定義と呼び出すスクリプトを照合します。設定が存在することだけで、その環境で実行済みとは判断しません。
