# syncGaroonToGoogle

## initialize

```bash
npm install --global @google/clasp

cd sync-garoon-to-google
clasp login
# Googleドライブ直下にGAS作成
clasp create --type api
# clasp clone [script_id]
npm init -y
```

## publish

```bash
clasp login
clasp push
clasp open
```

## 注意点

- typescriptはclasp使ってgsコンパイルする
- exportに対応していない
- GCal -> Garoon: 繰り返し予定に未対応
