<img width="1200" height="630" alt="ogp" src="https://github.com/user-attachments/assets/52dfc032-efe6-4089-a231-07713c2adfbf" />
# ローカル開発環境

- Docker v29.5.2 以降推奨
- Docker Compose v5.1.4 以降推奨<br>
  <sub>※ コンテナ内：Node.js 24 LTS 系を使用（`node:24-alpine`）</sub><br>
  <sub>※ コンテナ内：MySQL 8.4 LTS 系を使用（`mysql:8.4`）</sub>
  <br><br>

# 初回セットアップ

compose.yaml ファイルがある場所でターミナルを開き、以下のコマンドを叩く　　

<sub>※ ポート番号は　80　/　3000　をそれぞれ使用</sub>

```bash
cp .env.example .env

docker compose build
docker compose up -d
```

上記コマンド成功後、ローカルフォルダ `app` 内に `dist` & `node_modules` フォルダが自動生成される
<br>
<sub>（裏でコンパイルおよびシンクが走っているため2~3分、要待ち）</sub>
<br>
<br>
↓↓↓↓↓
<br>
<br>
自動生成されたのを確認できた後、以下のコマンドを叩く　

```bash
docker compose exec dockerexpress npm run migrate
docker compose exec dockerexpress npm run seed
```

↓↓↓↓↓
<br>

## Open in your browser

- アプリ： <http://localhost:3000>
- phpMyAdmin： <http://localhost:8080><br>
  <sub>※ phpMyAdmin はアイパス『 root 』でログイン可</sub>

<br>

## アプリが開けない場合、追加で以下のコマンドを叩く

```bash
docker compose exec dockerexpress npm run typecheck
docker compose exec dockerexpress npm run build
docker compose exec dockerexpress npm run dev
```

<br>

## Google Cloud を使用する場合

- Google Cloud リソース用リポジトリ： <a href="https://github.com/kazuyaTakahashi1988/docker-express/tree/for-google-cloud" target="_blank">for-google-cloud</a>
