# docker-express

Docker Desktop の新しい Compose V2+ 環境向けに更新した Express / MySQL / phpMyAdmin のローカル開発用アプリです。

## 前提バージョン

- Docker Engine 29.5.2 以降
- Docker Compose v5.1.4 以降
- Node.js 24 LTS 系（コンテナ内は `node:24-alpine`）
- MySQL 8.4 LTS 系（コンテナは `mysql:8.4`）

## 初回セットアップ

Compose は `compose.yaml` を自動検出します。旧 `docker-compose` コマンドではなく、スペース区切りの `docker compose` を使ってください。

```bash
cp .env.example .env
```

`.env` の `MYSQL_ROOT_PASSWORD`, `SESSION_SECRET`, `APP_KEY` はローカル用途でも必要に応じて変更してください。

```bash
docker compose build
docker compose up -d
```

## アクセス URL

- アプリ: <http://localhost:3000>
- phpMyAdmin: <http://localhost:8080>

phpMyAdmin のポートは `.env` の `PHPMYADMIN_PORT` で変更できます。

## DB 作成・マイグレーション・Seeder

`compose.yaml` の `MYSQL_DATABASE` により、初回起動時に `express_db` が作成されます。

```bash
docker compose exec dockerexpress npm run migrate
docker compose exec dockerexpress npm run seed
```

DB を作り直す場合は以下を実行します。

```bash
docker compose exec dockerexpress npm run db:reset
```


## TypeScript / EJS 開発

バックエンドの Express ロジックは TypeScript で記述し、`npm run build` で `app/dist` にコンパイルして実行します。静的 HTML のレンダリングは引き続き EJS テンプレートを使用します。

```bash
docker compose exec dockerexpress npm run typecheck
docker compose exec dockerexpress npm run build
docker compose exec dockerexpress npm run dev
```

開発時の `npm run dev` は nodemon が TypeScript / EJS / 静的アセットの変更を監視し、ビルド後の `dist/bin/www.js` を起動します。EJS へ渡す locals の形は `app/types/ejs-locals.d.ts` に ViewModel として定義しているため、テンプレートに渡すデータ構造を TypeScript 側から確認しやすくしています。

## MySQL 5.7 から MySQL 8.4 への移行メモ

このリポジトリは MySQL 5.7 の既存データディレクトリを直接 MySQL 8.4 にマウントしないよう、デフォルトのデータ保存先を `./.data/mysql8.4` に変更しています。

既存 DB を移行する場合は、旧環境で dump を取得してから新環境へ restore してください。

```bash
# 旧 MySQL 5.7 環境で実行
docker compose exec mysql mysqldump -uroot -p --databases express_db > backups/express_db-mysql57.sql

# 新 MySQL 8.4 環境で実行
docker compose exec -T mysql mysql -uroot -p < backups/express_db-mysql57.sql
```

## よく使うコマンド

```bash
docker compose ps
docker compose logs -f
docker compose down
docker compose exec dockerexpress sh
docker compose exec mysql mysql -uroot -p
```

## メンテナンス資料

- Docker / Node / MySQL / npm / CKEditor の更新方針: [`docs/maintenance.md`](docs/maintenance.md)
