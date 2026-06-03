# メンテナンス方針

## 2026-06 Docker 環境更新

このアプリは Docker Desktop 更新後の以下のローカル環境を前提にしています。

- Docker Engine: 29.5.2
- Docker Compose: v5.1.4

## Compose ファイル

- `docker-compose.yml` は削除し、Compose Specification の標準ファイル名である `compose.yaml` に移行しました。
- 旧 Compose V1 の `version` 行は削除しました。
- phpMyAdmin のホスト側ポートは 80 番競合を避けるため、デフォルト `8080:80` に変更しました。
- DB パスワード、ポート、DB 名、セッション鍵は `.env` から変更できるようにしました。
- MySQL は `healthcheck` を設定し、アプリと phpMyAdmin は MySQL 起動完了後に起動するようにしました。

## Node.js

- Node.js 12 系から Node.js 24 LTS 系へ更新しました。
- Docker イメージは `node:24-alpine` を使います。
- `npm start` は本番寄りに `node ./bin/www` とし、ローカル開発用に `npm run dev` で `nodemon` を使います。

## npm 依存関係

`package.json` は 2026-06 時点の安定版を基準に更新しました。

主な更新方針:

- Express は 5 系へ更新。
- EJS は 3 系へ更新。
- Multer は 2 系へ更新。
- mysql2 は MySQL 8.4 の認証方式に対応しやすい 3 系へ更新。
- Sequelize は既存コードとの互換性を優先して 6 系の最新安定版へ更新。
- nodemon はアプリ実行依存から開発依存へ移動。

> 注意: この実行環境では npm registry へのアクセスがプロキシ制限で失敗したため、`package-lock.json` の完全な依存解決はローカル Docker 環境で `docker compose build` または `npm install` により再生成してください。

## MySQL

- MySQL 5.7 から MySQL 8.4 LTS へ更新しました。
- MySQL 5.7 の `./.data/mysql` を直接 MySQL 8.4 にマウントすると起動やアップグレードに失敗する可能性があるため、デフォルトの保存先は `./.data/mysql8.4` に変更しています。
- 既存データは `mysqldump` で dump を作成し、新しい MySQL 8.4 コンテナへ restore してください。

## CKEditor 棚卸し

現在同梱されている CKEditor は以下です。

- 配置場所: `app/public/modules/ckeditor/ckeditor`
- 現在の同梱バージョン: `4.19.0`
- 参照ファイル: `app/public/modules/ckeditor/ckeditor/package.json`

CKEditor 4 のオープンソース版は EOL のため、セキュリティ観点では以下のどちらかを次の対応候補にしてください。

1. CKEditor 5 など、現在メンテナンスされているエディタへ移行する。
2. CKEditor 4 LTS の利用条件・ライセンスを確認し、商用 LTS 版へ更新する。

今回の変更では CKEditor 本体の差し替えまでは行わず、バージョンと移行方針を明文化するところまでに留めています。
